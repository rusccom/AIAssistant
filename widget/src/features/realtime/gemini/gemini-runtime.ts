import { GoogleGenAI } from '@google/genai';
import { AudioPlayer } from '../shared/audio-player';
import { AudioRecorder } from '../shared/audio-recorder';
import {
  RealtimeLogger,
  summarizeState
} from '../shared/realtime-logger';
import { createLocalStateController } from '../shared/state-machine';
import { createTurnTracker } from '../shared/turn-tracker';
import { createUniversalExecute } from '../shared/universal-execute';
import { summarizeGeminiMessage } from './gemini-message-summary';
import { createGeminiResumeState } from './gemini-resume-state';
import { buildConnectConfig } from './gemini-session-config';
import {
  ActiveRealtimeSession,
  SessionStateDefinition,
  StartRuntimeInput
} from '../shared/realtime-session.types';

const playAudioParts = async (message: any, player: AudioPlayer) => {
  const parts = message.serverContent?.modelTurn?.parts || [];
  for (const part of parts) {
    if (typeof part.inlineData?.data === 'string') {
      await player.enqueue(part.inlineData.data);
    }
  }
};

const createDisconnectHandler = (
  input: StartRuntimeInput,
  logger: RealtimeLogger,
  stateController: ReturnType<typeof createLocalStateController>,
  isClosed: () => boolean,
  getGeneration: () => number,
  setClosed: () => void,
  getTurnId: () => string | null
) => (generation: number) => (message: string) => {
  if (isClosed() || generation !== getGeneration()) {
    return;
  }

  setClosed();
  stateController.finalizeCurrentState({
    reason: message,
    source: 'gemini.session_disconnected',
    turnId: getTurnId()
  });
  logger.warn('session', 'disconnected', {
    generation,
    message,
    stateEntryId: stateController.getCurrentStateTrace().entryId,
    stateId: stateController.getCurrentState().id,
    transitionId: stateController.getPendingTransition()?.id || null
  });
  input.onDisconnect(message);
};

const isSessionOpen = (session: any) => {
  const readyState = session?.conn?.ws?.readyState;
  return readyState === WebSocket.OPEN;
};

const createToolCallHandler = (
  execute: ReturnType<typeof createUniversalExecute>,
  getSession: () => any,
  canSend: () => boolean,
  logger: RealtimeLogger,
  getStateId: () => string
) => async (message: any) => {
  const functionCalls = message.toolCall?.functionCalls || [];
  if (functionCalls.length === 0) {
    return;
  }

  const functionResponses = await Promise.all(
    functionCalls.map(async (call: any) => ({
      id: call.id,
      name: call.name,
      response: { result: await execute((call.args || {}) as Record<string, unknown>, call.name) }
    }))
  );

  const session = getSession();
  if (!canSend() || !isSessionOpen(session)) {
    return;
  }

  logger.info('tool', 'response_sent', {
    stateId: getStateId(),
    toolNames: functionResponses.map((response) => response.name)
  });
  session.sendToolResponse({ functionResponses });
};

const createMessageQueue = (logger: RealtimeLogger) => {
  let chain = Promise.resolve();

  return (handler: (message: any) => Promise<void>) =>
    (message: any) => {
      chain = chain
        .then(() => handler(message))
        .catch((error) => {
          logger.error('transport', 'message_processing_failed', {
            message: error instanceof Error ? error.message : String(error)
          });
        });
    };
};

const createSessionOpener = (
  input: StartRuntimeInput,
  logger: RealtimeLogger,
  getResumeHandle: () => string | null,
  enqueueMessage: (message: any) => void,
  onDisconnect: (generation: number) => (message: string) => void
) => async (state: SessionStateDefinition, generation: number) => {
  const ai = new GoogleGenAI({
    apiKey: input.sessionConfig.token,
    httpOptions: { apiVersion: 'v1alpha' }
  });
  const resumeHandle = getResumeHandle();
  const disconnect = onDisconnect(generation);

  logger.info('transport', 'connect_requested', {
    state: summarizeState(state),
    hasResumeHandle: !!resumeHandle,
    generation
  });

  return ai.live.connect({
    model: input.sessionConfig.model,
    config: buildConnectConfig(input, state, resumeHandle),
    callbacks: {
      onopen: () => logger.info('transport', 'socket_opened', { stateId: state.id }),
      onmessage: enqueueMessage,
      onerror: (error) => {
        logger.error('transport', 'socket_error', {
          message: error.message || 'Unknown error'
        });
        disconnect(`An error occurred: ${error.message || 'Unknown error'}`);
      },
      onclose: (event) => {
        logger.info('transport', 'socket_closed', {
          code: event.code,
          reason: event.reason || 'Session ended.'
        });
        disconnect(event.reason || 'Session ended.');
      }
    }
  });
};

const startRecorder = async (
  recorder: AudioRecorder,
  getSession: () => any,
  canStreamInput: () => boolean,
  logger: RealtimeLogger
) => {
  logger.info('audio', 'recorder_started');
  await recorder.start((chunk) => {
    const session = getSession();
    if (!canStreamInput() || !isSessionOpen(session)) {
      return;
    }

    session.sendRealtimeInput({
      audio: {
        data: chunk,
        mimeType: 'audio/pcm;rate=16000'
      }
    });
  });
};

const createCloseHandler = (
  recorder: AudioRecorder,
  player: AudioPlayer,
  getSession: () => any,
  setClosed: () => void,
  logger: RealtimeLogger,
  stateController: ReturnType<typeof createLocalStateController>,
  getTurnId: () => string | null
) => () => {
  logger.info('session', 'closed_by_widget');
  setClosed();
  stateController.finalizeCurrentState({
    reason: 'closed_by_widget',
    source: 'gemini.closed_by_widget',
    turnId: getTurnId()
  });
  recorder.stop();
  player.close();
  getSession()?.close();
};

export const startGeminiRuntime = async (
  input: StartRuntimeInput,
  logger: RealtimeLogger
): Promise<ActiveRealtimeSession> => {
  const player = new AudioPlayer();
  const recorder = new AudioRecorder();
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
  const execute = createUniversalExecute(
    input.config,
    stateController,
    logger,
    () => ({
      instructionVersion: stateController.getCurrentState().instructionVersion || null,
      turnId: turnTracker.getCurrentTurnId()
    })
  );
  let closed = false;
  let generation = 0;
  let sessionReady = false;
  let liveSession: any;
  const resumeState = createGeminiResumeState();

  const setClosed = () => {
    closed = true;
  };
  const getSession = () => liveSession;
  const onDisconnect = createDisconnectHandler(
    input,
    logger,
    stateController,
    () => closed,
    () => generation,
    setClosed,
    () => turnTracker.getCurrentTurnId()
  );
  const canSend = () => !closed && sessionReady;
  const handleToolCall = createToolCallHandler(
    execute,
    getSession,
    canSend,
    logger,
    () => stateController.getCurrentState().id
  );
  const enqueueMessage = createMessageQueue(logger);

  const openSession = createSessionOpener(
    input,
    logger,
    resumeState.getResumeHandle,
    enqueueMessage(async (message) => {
      if (closed) {
        return;
      }

      if (message.setupComplete) {
        sessionReady = true;
        stateController.activateCurrentState({
          source: 'gemini.setup_complete',
          turnId: turnTracker.getCurrentTurnId()
        });
        logger.info('transport', 'setup_complete', {
          stateEntryId: stateController.getCurrentStateTrace().entryId,
          stateId: stateController.getCurrentState().id
        });
        return;
      }

      if (message.sessionResumptionUpdate) {
        const resumeTrace = resumeState.update(message.sessionResumptionUpdate);
        logger.info('transport', 'session_handle_updated', {
          canResume: resumeTrace.canResume,
          hasResumeHandle: Boolean(resumeTrace.handle),
          resumable: resumeTrace.resumable,
          stateId: stateController.getCurrentState().id
        });
      }

      if (message.serverContent?.interrupted) {
        turnTracker.recordOutput({ interrupted: true });
        logger.warn('audio', 'output_interrupted', {
          stateId: stateController.getCurrentState().id
        });
        player.reset();
      }

      if (message.serverContent?.modelTurn?.parts?.length || message.toolCall?.functionCalls?.length) {
        turnTracker.ensureTurnStarted('gemini.message');
        turnTracker.recordOutput(summarizeGeminiMessage(message));
      }

      if (message.toolCall?.functionCalls?.length) {
        logger.info('transport', 'tool_call_received', {
          stateId: stateController.getCurrentState().id,
          toolCalls: message.toolCall.functionCalls.map((call: any) => ({
            id: call.id,
            name: call.name,
            args: call.args || {}
          }))
        });
      }

      await playAudioParts(message, player);
      await handleToolCall(message);

      if (!message.serverContent?.turnComplete) {
        return;
      }

      const previousStateId = stateController.getCurrentState().id;
      const completedTurnId = turnTracker.getCurrentTurnId();
      logger.info('transport', 'turn_done', { stateId: previousStateId });
      turnTracker.completeTurn('gemini.turn_complete');
      const nextState = stateController.applyPendingState({
        source: 'gemini.turn_complete',
        turnId: completedTurnId
      });
      if (!nextState || closed) {
        return;
      }

      generation += 1;
      try {
        const resumeTrace = resumeState.getTrace();
        logger.info('runtime', 'reconnect_for_state_transition', {
          fromStateId: previousStateId,
          hasResumeHandle: Boolean(resumeTrace.handle),
          resumeStrategy: resumeTrace.canResume
            ? 'session_resume'
            : 'cold_reconnect',
          resumable: resumeTrace.resumable,
          stateEntryId: stateController.getCurrentStateTrace().entryId,
          toStateId: nextState.id,
          transitionId: stateController.getCurrentStateTrace().transitionId
        });
        logger.info('state', 'activation_requested', {
          source: 'gemini.transition_reconnect',
          stateEntryId: stateController.getCurrentStateTrace().entryId,
          stateId: stateController.getCurrentState().id,
          stateTrace: stateController.getCurrentStateTrace(),
          transitionId: stateController.getCurrentStateTrace().transitionId
        });
        sessionReady = false;
        const previousSession = getSession();
        liveSession = undefined;
        previousSession?.close();
        liveSession = await openSession(nextState, generation);
      } catch (error) {
        logger.error('runtime', 'reconnect_failed', {
          message: error instanceof Error ? error.message : String(error)
        });
        setClosed();
        input.onDisconnect('Session reconnect failed.');
      }
    }),
    onDisconnect
  );

  sessionReady = false;
  logger.info('state', 'activation_requested', {
    source: 'gemini.initial_connect',
    stateEntryId: stateController.getCurrentStateTrace().entryId,
    stateId: stateController.getCurrentState().id,
    stateTrace: stateController.getCurrentStateTrace(),
    transitionId: stateController.getCurrentStateTrace().transitionId
  });
  liveSession = await openSession(stateController.getCurrentState(), generation);
  await startRecorder(recorder, getSession, () => !closed && sessionReady, logger);
  return {
    close: createCloseHandler(
      recorder,
      player,
      getSession,
      setClosed,
      logger,
      stateController,
      () => turnTracker.getCurrentTurnId()
    )
  };
};
