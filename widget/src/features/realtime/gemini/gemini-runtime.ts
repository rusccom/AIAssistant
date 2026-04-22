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
  isClosed: () => boolean,
  getGeneration: () => number,
  setClosed: () => void
) => (generation: number) => (message: string) => {
  if (isClosed() || generation !== getGeneration()) {
    return;
  }

  setClosed();
  logger.warn('session', 'disconnected', { generation, message });
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
  logger: RealtimeLogger
) => () => {
  logger.info('session', 'closed_by_widget');
  setClosed();
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
    getPendingTransitionId: () => stateController.getPendingStateId(),
    getState: () => stateController.getCurrentState(),
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
  let resumeHandle: string | null = null;
  let liveSession: any;

  const setClosed = () => {
    closed = true;
  };
  const getSession = () => liveSession;
  const onDisconnect = createDisconnectHandler(
    input,
    logger,
    () => closed,
    () => generation,
    setClosed
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
    () => resumeHandle,
    enqueueMessage(async (message) => {
      if (closed) {
        return;
      }

      if (message.setupComplete) {
        sessionReady = true;
        logger.info('transport', 'setup_complete', {
          stateId: stateController.getCurrentState().id
        });
        return;
      }

      if (message.sessionResumptionUpdate?.newHandle) {
        resumeHandle = message.sessionResumptionUpdate.newHandle;
        logger.info('transport', 'session_handle_updated', {
          resumable: message.sessionResumptionUpdate.resumable ?? null,
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
      logger.info('transport', 'turn_done', { stateId: previousStateId });
      turnTracker.completeTurn('gemini.turn_complete');
      const nextState = stateController.applyPendingState();
      if (!nextState || closed) {
        return;
      }

      generation += 1;
      try {
        logger.info('runtime', 'reconnect_for_state_transition', {
          fromStateId: previousStateId,
          toStateId: nextState.id
        });
        sessionReady = false;
        resumeHandle = null;
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
  liveSession = await openSession(stateController.getCurrentState(), generation);
  await startRecorder(recorder, getSession, () => !closed && sessionReady, logger);
  return {
    close: createCloseHandler(recorder, player, getSession, setClosed, logger)
  };
};
