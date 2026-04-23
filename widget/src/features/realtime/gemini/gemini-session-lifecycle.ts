import { GoogleGenAI } from '@google/genai';
import { AudioPlayer } from '../shared/audio-player';
import { AudioRecorder } from '../shared/audio-recorder';
import { RealtimeLogger, summarizeState } from '../shared/realtime-logger';
import { LocalStateController } from '../shared/state-machine';
import {
  SessionStateDefinition,
  StartRuntimeInput
} from '../shared/realtime-session.types';
import { buildConnectConfig } from './gemini-session-config';

interface DisconnectHandlerContext {
  getGeneration: () => number;
  getTurnId: () => string | null;
  input: StartRuntimeInput;
  isClosed: () => boolean;
  logger: RealtimeLogger;
  setClosed: () => void;
  stateController: LocalStateController;
}

interface SessionOpenerContext {
  enqueueMessage: (generation: number, message: any) => void;
  getResumeHandle: () => string | null;
  input: StartRuntimeInput;
  logger: RealtimeLogger;
  onDisconnect: (generation: number) => (message: string) => void;
}

interface RecorderContext {
  canStreamInput: () => boolean;
  getSession: () => any;
  logger: RealtimeLogger;
  recorder: AudioRecorder;
}

interface CloseHandlerContext {
  getSession: () => any;
  getTurnId: () => string | null;
  logger: RealtimeLogger;
  player: AudioPlayer;
  recorder: AudioRecorder;
  setClosed: () => void;
  stateController: LocalStateController;
}

export const isGeminiSessionOpen = (session: any) => {
  const readyState = session?.conn?.ws?.readyState;
  return readyState === WebSocket.OPEN;
};

const createGeminiClient = (apiKey: string) => {
  return new GoogleGenAI({
    apiKey,
    httpOptions: { apiVersion: 'v1alpha' }
  });
};

const createDisconnectDetails = (
  context: DisconnectHandlerContext,
  generation: number,
  message: string
) => ({
  generation,
  message,
  stateEntryId: context.stateController.getCurrentStateTrace().entryId,
  stateId: context.stateController.getCurrentState().id,
  transitionId: context.stateController.getPendingTransition()?.id || null
});

export const createGeminiDisconnectHandler = (
  context: DisconnectHandlerContext
) => (generation: number) => (message: string) => {
  if (context.isClosed() || generation !== context.getGeneration()) return;

  context.setClosed();
  context.stateController.finalizeCurrentState({
    reason: message,
    source: 'gemini.session_disconnected',
    turnId: context.getTurnId()
  });
  context.logger.warn('session', 'disconnected', createDisconnectDetails(
    context,
    generation,
    message
  ));
  context.input.onDisconnect(message);
};

const logConnectRequested = (
  context: SessionOpenerContext,
  state: SessionStateDefinition,
  resumeHandle: string | null,
  generation: number
) => {
  context.logger.info('transport', 'connect_requested', {
    state: summarizeState(state),
    hasResumeHandle: !!resumeHandle,
    generation
  });
};

const createSessionCallbacks = (
  context: SessionOpenerContext,
  state: SessionStateDefinition,
  generation: number
) => {
  const disconnect = context.onDisconnect(generation);

  return {
    onopen: () => context.logger.info('transport', 'socket_opened', {
      stateId: state.id
    }),
    onmessage: (message: any) => context.enqueueMessage(generation, message),
    onerror: (error: ErrorEvent) => {
      const message = error.message || 'Unknown error';
      context.logger.error('transport', 'socket_error', { message });
      disconnect(`An error occurred: ${message}`);
    },
    onclose: (event: CloseEvent) => {
      const reason = event.reason || 'Session ended.';
      context.logger.info('transport', 'socket_closed', {
        code: event.code,
        reason
      });
      disconnect(reason);
    }
  };
};

export const createGeminiSessionOpener = (context: SessionOpenerContext) =>
  async (state: SessionStateDefinition, generation: number) => {
    const ai = createGeminiClient(context.input.sessionConfig.token);
    const resumeHandle = context.getResumeHandle();
    logConnectRequested(context, state, resumeHandle, generation);

    return ai.live.connect({
      model: context.input.sessionConfig.model,
      config: buildConnectConfig(context.input, state, resumeHandle),
      callbacks: createSessionCallbacks(context, state, generation)
    });
  };

export const startGeminiRecorder = async (context: RecorderContext) => {
  context.logger.info('audio', 'recorder_started');
  await context.recorder.start((chunk) => {
    const session = context.getSession();
    if (!context.canStreamInput() || !isGeminiSessionOpen(session)) return;

    session.sendRealtimeInput({
      audio: {
        data: chunk,
        mimeType: 'audio/pcm;rate=16000'
      }
    });
  });
};

export const createGeminiCloseHandler = (context: CloseHandlerContext) => () => {
  context.logger.info('session', 'closed_by_widget');
  context.setClosed();
  context.stateController.finalizeCurrentState({
    reason: 'closed_by_widget',
    source: 'gemini.closed_by_widget',
    turnId: context.getTurnId()
  });
  context.recorder.stop();
  context.player.close();
  context.getSession()?.close();
};
