import { AudioPlayer } from '../shared/audio-player';
import { AudioRecorder } from '../shared/audio-recorder';
import { RealtimeLogger } from '../shared/realtime-logger';
import { createLocalStateController } from '../shared/state-machine';
import { createTurnTracker } from '../shared/turn-tracker';
import { createUniversalExecute } from '../shared/universal-execute';
import { summarizeGeminiMessage } from './gemini-message-summary';
import { createGeminiResumeState } from './gemini-resume-state';
import { applyPendingGeminiState } from './gemini-state-transition';
import {
  createGeminiCloseHandler,
  createGeminiDisconnectHandler,
  createGeminiSessionOpener,
  startGeminiRecorder
} from './gemini-session-lifecycle';
import { createGeminiToolCallHandler } from './gemini-tool-call-handler';
import {
  ActiveRealtimeSession,
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

const createMessageQueue = (logger: RealtimeLogger) => {
  let chain = Promise.resolve();

  return (handler: (message: any, generation: number) => Promise<void>) =>
    (generation: number, message: any) => {
      chain = chain
        .then(() => handler(message, generation))
        .catch((error) => {
          logger.error('transport', 'message_processing_failed', {
            message: error instanceof Error ? error.message : String(error)
          });
        });
    };
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
  const setSession = (session: any) => {
    liveSession = session;
  };
  const setSessionReady = (ready: boolean) => {
    sessionReady = ready;
  };
  const nextGeneration = () => {
    generation += 1;
    return generation;
  };
  const getSession = () => liveSession;
  const onDisconnect = createGeminiDisconnectHandler({
    input,
    logger,
    stateController,
    isClosed: () => closed,
    getGeneration: () => generation,
    setClosed,
    getTurnId: () => turnTracker.getCurrentTurnId()
  });
  const canSend = () => !closed && sessionReady;
  let handleToolCall: (message: any) => Promise<boolean> = async () => false;
  const enqueueMessage = createMessageQueue(logger)(async (message, messageGeneration) => {
      if (closed || messageGeneration !== generation) {
        logger.info('transport', 'stale_message_ignored', {
          currentGeneration: generation,
          messageGeneration
        });
        return;
      }

      if (message.setupComplete) {
        setSessionReady(true);
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
      const changedState = await handleToolCall(message);
      if (changedState) {
        return;
      }

      if (!message.serverContent?.turnComplete) {
        return;
      }

      const previousStateId = stateController.getCurrentState().id;
      const completedTurnId = turnTracker.getCurrentTurnId();
      logger.info('transport', 'turn_done', { stateId: previousStateId });
      turnTracker.completeTurn('gemini.turn_complete');
      await applyPendingTransition('gemini.turn_complete', completedTurnId);
    });

  const openSession = createGeminiSessionOpener({
    input,
    logger,
    getResumeHandle: resumeState.getResumeHandle,
    enqueueMessage,
    onDisconnect
  });
  const transitionContext = {
    input,
    logger,
    stateController,
    getResumeTrace: resumeState.getTrace,
    getSession,
    setSession,
    openSession,
    isClosed: () => closed,
    setClosed,
    setSessionReady,
    nextGeneration
  };
  const applyPendingTransition = (source: string, turnId: string | null) => {
    return applyPendingGeminiState(transitionContext, source, turnId);
  };
  handleToolCall = createGeminiToolCallHandler({
    execute,
    getSession,
    canSend,
    logger,
    getStateId: () => stateController.getCurrentState().id,
    hasPendingTransition: () => Boolean(stateController.getPendingTransition()),
    onPendingTransition: async () => {
      const turnId = turnTracker.getCurrentTurnId();
      turnTracker.completeTurn('gemini.transition_tool_response');
      await applyPendingTransition('gemini.transition_tool_response', turnId);
    }
  });

  sessionReady = false;
  logger.info('state', 'activation_requested', {
    source: 'gemini.initial_connect',
    stateEntryId: stateController.getCurrentStateTrace().entryId,
    stateId: stateController.getCurrentState().id,
    stateTrace: stateController.getCurrentStateTrace(),
    transitionId: stateController.getCurrentStateTrace().transitionId
  });
  liveSession = await openSession(stateController.getCurrentState(), generation);
  await startGeminiRecorder({
    recorder,
    getSession,
    canStreamInput: () => !closed && sessionReady,
    logger
  });
  return {
    close: createGeminiCloseHandler({
      recorder,
      player,
      getSession,
      setClosed,
      logger,
      stateController,
      getTurnId: () => turnTracker.getCurrentTurnId()
    })
  };
};
