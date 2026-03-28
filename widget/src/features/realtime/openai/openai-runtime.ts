import {
  OpenAIRealtimeWebRTC,
  RealtimeAgent,
  RealtimeSession,
  tool
} from '@openai/agents-realtime';
import { createLocalStateController } from '../shared/state-machine';
import { createUniversalExecute } from '../shared/universal-execute';
import {
  ActiveRealtimeSession,
  BotToolDefinition,
  ServerSessionConfig,
  SessionStateDefinition,
  StartRuntimeInput
} from '../shared/realtime-session.types';

const buildTools = (
  config: StartRuntimeInput['config'],
  stateController: ReturnType<typeof createLocalStateController>,
  state: SessionStateDefinition
) => {
  const execute = createUniversalExecute(config, stateController);

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
  state: SessionStateDefinition
) => new RealtimeAgent({
  name: 'Helpful Assistant',
  instructions: state.instructions,
  tools: buildTools(input.config, stateController, state)
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
  stateController: ReturnType<typeof createLocalStateController>
) => {
  const nextState = stateController.applyPendingState();
  if (!nextState) {
    return;
  }

  await session.updateAgent(buildAgent(input, stateController, nextState));
};

const registerSessionEvents = (
  session: RealtimeSession,
  input: StartRuntimeInput,
  stateController: ReturnType<typeof createLocalStateController>,
  isClosed: () => boolean,
  setClosed: () => void
) => {
  session.transport.on('turn_done', () => {
    void applyPendingTransition(session, input, stateController);
  });

  session.transport.on('*', (event: any) => {
    if (isClosed()) {
      return;
    }

    if (event.type === 'session.closed' || event.type === 'session.ended') {
      setClosed();
      input.onDisconnect('Session ended.');
    }

    if (event.type === 'error') {
      setClosed();
      input.onDisconnect(`An error occurred: ${event.error?.message || 'Unknown error'}`);
    }
  });
};

const connectSession = async (
  input: StartRuntimeInput,
  userStream: MediaStream,
  audioElement: HTMLAudioElement,
  stateController: ReturnType<typeof createLocalStateController>
) => {
  const session = buildSession(
    buildAgent(input, stateController, stateController.getCurrentState()),
    userStream,
    audioElement,
    input.sessionConfig
  );

  await session.connect({ apiKey: input.sessionConfig.token });
  return session;
};

const createCloseHandler = (
  session: RealtimeSession,
  userStream: MediaStream,
  setClosed: () => void
) => () => {
  setClosed();
  userStream.getTracks().forEach((track) => track.stop());
  session.close();
};

export const startOpenAIRuntime = async (
  input: StartRuntimeInput
): Promise<ActiveRealtimeSession> => {
  const userStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const audioElement = new Audio();
  const stateController = createLocalStateController(input.sessionConfig.stateMachine);
  let closed = false;
  const isClosed = () => closed;
  const setClosed = () => {
    closed = true;
  };

  audioElement.autoplay = true;
  const session = await connectSession(input, userStream, audioElement, stateController);
  registerSessionEvents(session, input, stateController, isClosed, setClosed);
  return { close: createCloseHandler(session, userStream, setClosed) };
};
