import {
  RealtimeAgent,
  RealtimeSession,
  tool
} from '@openai/agents-realtime';
import { RealtimeLogger, summarizeResult, summarizeState } from '../shared/realtime-logger';
import { createLocalStateController } from '../shared/state-machine';
import { createTurnTracker } from '../shared/turn-tracker';
import { createUniversalExecute } from '../shared/universal-execute';
import { notifyRuntimeStatus } from '../shared/initial-assistant-turn';
import { summarizeOpenAIOutput } from './openai-output-summary';
import { getAgentName, getToolCallArguments, getToolName, logTransportEvent } from './openai-runtime-helpers';
import {
  connectOpenAISession,
  createOpenAICloseHandler,
  createOpenAIConnectionHandler,
  createOpenAISessionErrorHandler
} from './openai-session-lifecycle';
import { sendOpenAIStartupTurn } from './openai-startup-turn';
import { ActiveRealtimeSession, BotToolDefinition, SessionStateDefinition, StartRuntimeInput } from '../shared/realtime-session.types';

interface ApplyPendingTransitionContext {
  getTraceContext: () => Record<string, unknown>;
  input: StartRuntimeInput;
  logger: RealtimeLogger;
  session: RealtimeSession;
  stateController: ReturnType<typeof createLocalStateController>;
  turnId: string | null;
}

interface RegisterTransportEventsContext {
  getTraceContext: () => Record<string, unknown>;
  input: StartRuntimeInput;
  isClosed: () => boolean;
  logger: RealtimeLogger;
  session: RealtimeSession;
  setClosed: () => void;
  stateController: ReturnType<typeof createLocalStateController>;
  turnTracker: ReturnType<typeof createTurnTracker>;
}

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

const applyPendingTransition = async (context: ApplyPendingTransitionContext) => {
  const nextState = context.stateController.applyPendingState({
    source: 'openai.turn_done',
    turnId: context.turnId
  });
  if (!nextState) {
    return;
  }

  context.logger.info('state', 'activation_requested', {
    source: 'openai.agent_update',
    stateEntryId: context.stateController.getCurrentStateTrace().entryId,
    stateId: nextState.id,
    stateTrace: context.stateController.getCurrentStateTrace(),
    transitionId: context.stateController.getCurrentStateTrace().transitionId
  });
  context.logger.info('runtime', 'agent_updating_for_state', {
    state: summarizeState(nextState),
    stateEntryId: context.stateController.getCurrentStateTrace().entryId,
    stateId: nextState.id,
    transitionId: context.stateController.getCurrentStateTrace().transitionId
  });
  await context.session.updateAgent(
    buildAgent(context.input, context.stateController, context.logger,
      context.getTraceContext, nextState)
  );
  context.stateController.activateCurrentState({
    source: 'openai.agent_updated',
    turnId: context.turnId
  });
};

const registerAgentEvents = (
  session: RealtimeSession,
  input: StartRuntimeInput,
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
    notifyRuntimeStatus(input, 'assistant_speaking');
    logger.info('audio', 'output_started');
  });

  session.on('audio_stopped', () => {
    notifyRuntimeStatus(input, 'listening');
    logger.info('audio', 'output_stopped');
  });
};

const registerTransportEvents = (context: RegisterTransportEventsContext) => {
  context.session.transport.on('connection_change', createOpenAIConnectionHandler({
    input: context.input,
    logger: context.logger,
    stateController: context.stateController,
    isClosed: context.isClosed,
    setClosed: context.setClosed,
    getTurnId: () => context.turnTracker.getCurrentTurnId()
  }));

  context.session.transport.on('turn_started', (event) => {
    context.turnTracker.ensureTurnStarted('transport.turn_started');
    context.logger.info('transport', 'turn_started', { event });
  });

  context.session.transport.on('turn_done', (event) => {
    context.logger.info('transport', 'turn_done', { event });
    const completedTurnId = context.turnTracker.getCurrentTurnId();
    context.turnTracker.completeTurn('transport.turn_done');
    void applyPendingTransition({ ...context, turnId: completedTurnId });
  });

  context.session.transport.on('audio_interrupted', () => {
    context.turnTracker.recordOutput({ interrupted: true });
    context.logger.warn('audio', 'output_interrupted', {
      stateId: context.stateController.getCurrentState().id
    });
  });

  context.session.on('transport_event', (event) => {
    logTransportEvent(context.logger, event as any);
  });
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
  const session = await connectOpenAISession({
    input,
    agent: buildAgent(
      input,
      stateController,
      logger,
      getTraceContext,
      stateController.getCurrentState()
    ),
    userStream,
    audioElement,
    sessionConfig: input.sessionConfig,
    stateController,
    logger
  });
  stateController.activateCurrentState({
    source: 'openai.connected',
    turnId: turnTracker.getCurrentTurnId()
  });
  notifyRuntimeStatus(input, 'connected');

  registerAgentEvents(session, input, logger, turnTracker);
  registerTransportEvents({
    session,
    input,
    stateController,
    logger,
    turnTracker,
    getTraceContext,
    isClosed,
    setClosed
  });
  session.on('error', createOpenAISessionErrorHandler({
    input,
    logger,
    stateController,
    isClosed,
    setClosed,
    getTurnId: () => turnTracker.getCurrentTurnId()
  }));
  sendOpenAIStartupTurn(session, input, logger);

  return {
    close: createOpenAICloseHandler({
      session,
      userStream,
      setClosed,
      logger,
      stateController,
      getTurnId: () => turnTracker.getCurrentTurnId()
    })
  };
};
