import {
  OpenAIRealtimeWebRTC,
  RealtimeAgent,
  RealtimeSession,
  tool
} from '@openai/agents-realtime';
import { RealtimeLogger, summarizeResult, summarizeState } from '../shared/realtime-logger';
import { createLocalStateController } from '../shared/state-machine';
import { createTurnTracker } from '../shared/turn-tracker';
import { createUniversalExecute } from '../shared/universal-execute';
import { summarizeOpenAIOutput } from './openai-output-summary';
import { getAgentName, getToolCallArguments, getToolName, logTransportEvent } from './openai-runtime-helpers';
import { ActiveRealtimeSession, BotToolDefinition, ServerSessionConfig, SessionStateDefinition, StartRuntimeInput } from '../shared/realtime-session.types';

const buildTools = (
  config: StartRuntimeInput['config'],
  stateController: ReturnType<typeof createLocalStateController>,
  logger: RealtimeLogger,
  getTraceContext: () => Record<string, unknown>,
  state: SessionStateDefinition
) => {
  const execute = createUniversalExecute(
    config,
    stateController,
    logger,
    getTraceContext
  );

  return state.tools.map((toolInfo: BotToolDefinition) =>
    tool({
      name: toolInfo.function.name,
      description: toolInfo.function.description,
      parameters: (toolInfo.function.parameters || { type: 'object', properties: {} }) as any,
      strict: false,
      execute: (params) => execute(params as Record<string, unknown>, toolInfo.function.name)
    })
  );
};

const buildAgent = (
  input: StartRuntimeInput,
  stateController: ReturnType<typeof createLocalStateController>,
  logger: RealtimeLogger,
  getTraceContext: () => Record<string, unknown>,
  state: SessionStateDefinition
) => new RealtimeAgent({
  name: 'Helpful Assistant',
  instructions: state.instructions,
  tools: buildTools(input.config, stateController, logger, getTraceContext, state)
});

const buildSession = (
  agent: RealtimeAgent,
  userStream: MediaStream,
  audioElement: HTMLAudioElement,
  sessionConfig: ServerSessionConfig
) => {
  const transport = new OpenAIRealtimeWebRTC({
    mediaStream: userStream,
    audioElement,
    useInsecureApiKey: true
  });

  return new RealtimeSession(agent, {
    transport,
    model: sessionConfig.model,
    config: {
      inputAudioFormat: 'pcm16',
      outputAudioFormat: 'pcm16',
      turnDetection: {
        type: 'semantic_vad',
        eagerness: 'medium',
        createResponse: true,
        interruptResponse: true
      },
      voice: sessionConfig.voice
    }
  });
};

const applyPendingTransition = async (
  session: RealtimeSession,
  input: StartRuntimeInput,
  stateController: ReturnType<typeof createLocalStateController>,
  logger: RealtimeLogger,
  getTraceContext: () => Record<string, unknown>,
  turnId: string | null
) => {
  const nextState = stateController.applyPendingState({
    source: 'openai.turn_done',
    turnId
  });
  if (!nextState) {
    return;
  }

  logger.info('state', 'activation_requested', {
    source: 'openai.agent_update',
    stateEntryId: stateController.getCurrentStateTrace().entryId,
    stateId: nextState.id,
    stateTrace: stateController.getCurrentStateTrace(),
    transitionId: stateController.getCurrentStateTrace().transitionId
  });
  logger.info('runtime', 'agent_updating_for_state', {
    state: summarizeState(nextState),
    stateEntryId: stateController.getCurrentStateTrace().entryId,
    stateId: nextState.id,
    transitionId: stateController.getCurrentStateTrace().transitionId
  });
  await session.updateAgent(
    buildAgent(input, stateController, logger, getTraceContext, nextState)
  );
  stateController.activateCurrentState({
    source: 'openai.agent_updated',
    turnId
  });
};

const createConnectionHandler = (
  input: StartRuntimeInput,
  logger: RealtimeLogger,
  stateController: ReturnType<typeof createLocalStateController>,
  isClosed: () => boolean,
  setClosed: () => void,
  getTurnId: () => string | null
) => (status: string) => {
  logger.info('transport', 'connection_change', { status });
  if (status !== 'disconnected' || isClosed()) {
    return;
  }

  setClosed();
  stateController.finalizeCurrentState({
    reason: 'transport_disconnected',
    source: 'openai.transport_disconnected',
    turnId: getTurnId()
  });
  input.onDisconnect('Session ended.');
};

const createSessionErrorHandler = (
  input: StartRuntimeInput,
  logger: RealtimeLogger,
  stateController: ReturnType<typeof createLocalStateController>,
  isClosed: () => boolean,
  setClosed: () => void,
  getTurnId: () => string | null
) => (error: { error?: unknown }) => {
  const message = error.error instanceof Error
    ? error.error.message
    : String(error.error || 'Unknown error');

  logger.error('session', 'error', { message });
  if (isClosed()) {
    return;
  }

  setClosed();
  stateController.finalizeCurrentState({
    reason: message,
    source: 'openai.session_error',
    turnId: getTurnId()
  });
  input.onDisconnect(`An error occurred: ${message}`);
};

const registerAgentEvents = (
  session: RealtimeSession,
  logger: RealtimeLogger,
  turnTracker: ReturnType<typeof createTurnTracker>
) => {
  session.on('agent_start', (_context, agent) => {
    turnTracker.ensureTurnStarted('agent_start');
    logger.info('agent', 'start', { agentName: getAgentName(agent) });
  });

  session.on('agent_end', (_context, agent, output) => {
    turnTracker.recordOutput(summarizeOpenAIOutput(output));
    logger.info('agent', 'end', {
      agentName: getAgentName(agent),
      output: summarizeResult(output)
    });
  });

  session.on('agent_tool_start', (_context, agent, toolInfo, details) => {
    turnTracker.ensureTurnStarted('agent_tool_start');
    turnTracker.recordOutput({
      toolCallCount: 1,
      toolNames: [getToolName(toolInfo)]
    });
    logger.info('tool', 'model_requested', {
      agentName: getAgentName(agent),
      toolName: getToolName(toolInfo),
      arguments: getToolCallArguments(details.toolCall as Record<string, unknown>)
    });
  });

  session.on('agent_tool_end', (_context, agent, toolInfo, result) => {
    logger.info('tool', 'model_finished', {
      agentName: getAgentName(agent),
      toolName: getToolName(toolInfo),
      result: summarizeResult(result)
    });
  });

  session.on('audio_start', () => {
    turnTracker.ensureTurnStarted('audio_start');
    turnTracker.recordOutput({ hasAudio: true });
    logger.info('audio', 'output_started');
  });

  session.on('audio_stopped', () => {
    logger.info('audio', 'output_stopped');
  });
};

const registerTransportEvents = (
  session: RealtimeSession,
  input: StartRuntimeInput,
  stateController: ReturnType<typeof createLocalStateController>,
  logger: RealtimeLogger,
  turnTracker: ReturnType<typeof createTurnTracker>,
  getTraceContext: () => Record<string, unknown>,
  isClosed: () => boolean,
  setClosed: () => void
) => {
  session.transport.on('connection_change', createConnectionHandler(
    input,
    logger,
    stateController,
    isClosed,
    setClosed,
    () => turnTracker.getCurrentTurnId()
  ));

  session.transport.on('turn_started', (event) => {
    turnTracker.ensureTurnStarted('transport.turn_started');
    logger.info('transport', 'turn_started', { event });
  });

  session.transport.on('turn_done', (event) => {
    logger.info('transport', 'turn_done', { event });
    const completedTurnId = turnTracker.getCurrentTurnId();
    turnTracker.completeTurn('transport.turn_done');
    void applyPendingTransition(
      session,
      input,
      stateController,
      logger,
      getTraceContext,
      completedTurnId
    );
  });

  session.transport.on('audio_interrupted', () => {
    turnTracker.recordOutput({ interrupted: true });
    logger.warn('audio', 'output_interrupted', {
      stateId: stateController.getCurrentState().id
    });
  });

  session.on('transport_event', (event) => logTransportEvent(logger, event as any));
};

const connectSession = async (
  input: StartRuntimeInput,
  userStream: MediaStream,
  audioElement: HTMLAudioElement,
  stateController: ReturnType<typeof createLocalStateController>,
  logger: RealtimeLogger,
  getTraceContext: () => Record<string, unknown>
) => {
  const session = buildSession(
    buildAgent(
      input,
      stateController,
      logger,
      getTraceContext,
      stateController.getCurrentState()
    ),
    userStream,
    audioElement,
    input.sessionConfig
  );

  logger.info('transport', 'connect_requested', {
    state: summarizeState(stateController.getCurrentState()),
    stateEntryId: stateController.getCurrentStateTrace().entryId,
    stateId: stateController.getCurrentState().id,
    transitionId: stateController.getCurrentStateTrace().transitionId
  });
  await session.connect({ apiKey: input.sessionConfig.token });
  logger.info('transport', 'connected');
  return session;
};

const createCloseHandler = (
  session: RealtimeSession,
  userStream: MediaStream,
  setClosed: () => void,
  logger: RealtimeLogger,
  stateController: ReturnType<typeof createLocalStateController>,
  getTurnId: () => string | null
) => () => {
  logger.info('session', 'closed_by_widget');
  setClosed();
  stateController.finalizeCurrentState({
    reason: 'closed_by_widget',
    source: 'openai.closed_by_widget',
    turnId: getTurnId()
  });
  userStream.getTracks().forEach((track) => track.stop());
  session.close();
};

export const startOpenAIRuntime = async (
  input: StartRuntimeInput,
  logger: RealtimeLogger
): Promise<ActiveRealtimeSession> => {
  const userStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const audioElement = new Audio();
  const stateController = createLocalStateController(
    input.sessionConfig.stateMachine,
    input.sessionConfig.currentStateId,
    logger
  );
  const turnTracker = createTurnTracker({
    getPendingTransition: () => stateController.getPendingTransition(),
    getState: () => stateController.getCurrentState(),
    getStateTrace: () => stateController.getCurrentStateTrace(),
    logger
  });
  let closed = false;
  const isClosed = () => closed;
  const setClosed = () => {
    closed = true;
  };
  const getTraceContext = () => ({
    instructionVersion: stateController.getCurrentState().instructionVersion || null,
    turnId: turnTracker.getCurrentTurnId()
  });

  audioElement.autoplay = true;
  logger.info('state', 'activation_requested', {
    source: 'openai.initial_connect',
    stateEntryId: stateController.getCurrentStateTrace().entryId,
    stateId: stateController.getCurrentState().id,
    stateTrace: stateController.getCurrentStateTrace(),
    transitionId: stateController.getCurrentStateTrace().transitionId
  });
  const session = await connectSession(
    input,
    userStream,
    audioElement,
    stateController,
    logger,
    getTraceContext
  );
  stateController.activateCurrentState({
    source: 'openai.connected',
    turnId: turnTracker.getCurrentTurnId()
  });

  registerAgentEvents(session, logger, turnTracker);
  registerTransportEvents(
    session,
    input,
    stateController,
    logger,
    turnTracker,
    getTraceContext,
    isClosed,
    setClosed
  );
  session.on('error', createSessionErrorHandler(
    input,
    logger,
    stateController,
    isClosed,
    setClosed,
    () => turnTracker.getCurrentTurnId()
  ));

  return {
    close: createCloseHandler(
      session,
      userStream,
      setClosed,
      logger,
      stateController,
      () => turnTracker.getCurrentTurnId()
    )
  };
};
