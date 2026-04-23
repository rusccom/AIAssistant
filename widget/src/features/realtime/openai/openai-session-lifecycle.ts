import {
  OpenAIRealtimeWebRTC,
  RealtimeAgent,
  RealtimeSession
} from '@openai/agents-realtime';
import { RealtimeLogger, summarizeState } from '../shared/realtime-logger';
import { LocalStateController } from '../shared/state-machine';
import {
  ServerSessionConfig,
  StartRuntimeInput
} from '../shared/realtime-session.types';

interface BuildOpenAISessionInput {
  agent: RealtimeAgent;
  audioElement: HTMLAudioElement;
  sessionConfig: ServerSessionConfig;
  userStream: MediaStream;
}

interface ConnectOpenAISessionInput extends BuildOpenAISessionInput {
  input: StartRuntimeInput;
  logger: RealtimeLogger;
  stateController: LocalStateController;
}

interface OpenAILifecycleContext {
  getTurnId: () => string | null;
  input: StartRuntimeInput;
  isClosed: () => boolean;
  logger: RealtimeLogger;
  setClosed: () => void;
  stateController: LocalStateController;
}

interface OpenAICloseContext {
  getTurnId: () => string | null;
  logger: RealtimeLogger;
  session: RealtimeSession;
  setClosed: () => void;
  stateController: LocalStateController;
  userStream: MediaStream;
}

const buildTransport = (
  userStream: MediaStream,
  audioElement: HTMLAudioElement
) => new OpenAIRealtimeWebRTC({
  mediaStream: userStream,
  audioElement,
  useInsecureApiKey: true
});

const buildSessionConfig = (sessionConfig: ServerSessionConfig) => ({
  inputAudioFormat: 'pcm16' as const,
  outputAudioFormat: 'pcm16' as const,
  turnDetection: {
    type: 'semantic_vad' as const,
    eagerness: 'medium' as const,
    createResponse: true,
    interruptResponse: true
  },
  voice: sessionConfig.voice
});

const buildOpenAISession = (input: BuildOpenAISessionInput) => {
  return new RealtimeSession(input.agent, {
    transport: buildTransport(input.userStream, input.audioElement),
    model: input.sessionConfig.model,
    config: buildSessionConfig(input.sessionConfig)
  });
};

export const connectOpenAISession = async (
  input: ConnectOpenAISessionInput
) => {
  const session = buildOpenAISession(input);
  input.logger.info('transport', 'connect_requested', {
    state: summarizeState(input.stateController.getCurrentState()),
    stateEntryId: input.stateController.getCurrentStateTrace().entryId,
    stateId: input.stateController.getCurrentState().id,
    transitionId: input.stateController.getCurrentStateTrace().transitionId
  });
  await session.connect({ apiKey: input.input.sessionConfig.token });
  input.logger.info('transport', 'connected');
  return session;
};

export const createOpenAIConnectionHandler = (
  context: OpenAILifecycleContext
) => (status: string) => {
  context.logger.info('transport', 'connection_change', { status });
  if (status !== 'disconnected' || context.isClosed()) return;

  context.setClosed();
  context.stateController.finalizeCurrentState({
    reason: 'transport_disconnected',
    source: 'openai.transport_disconnected',
    turnId: context.getTurnId()
  });
  context.input.onDisconnect('Session ended.');
};

const getErrorMessage = (error: { error?: unknown }) => {
  return error.error instanceof Error
    ? error.error.message
    : String(error.error || 'Unknown error');
};

export const createOpenAISessionErrorHandler = (
  context: OpenAILifecycleContext
) => (error: { error?: unknown }) => {
  const message = getErrorMessage(error);
  context.logger.error('session', 'error', { message });
  if (context.isClosed()) return;

  context.setClosed();
  context.stateController.finalizeCurrentState({
    reason: message,
    source: 'openai.session_error',
    turnId: context.getTurnId()
  });
  context.input.onDisconnect(`An error occurred: ${message}`);
};

export const createOpenAICloseHandler = (context: OpenAICloseContext) => () => {
  context.logger.info('session', 'closed_by_widget');
  context.setClosed();
  context.stateController.finalizeCurrentState({
    reason: 'closed_by_widget',
    source: 'openai.closed_by_widget',
    turnId: context.getTurnId()
  });
  context.userStream.getTracks().forEach((track) => track.stop());
  context.session.close();
};
