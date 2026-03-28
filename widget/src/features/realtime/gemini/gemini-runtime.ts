import { GoogleGenAI, Modality } from '@google/genai';
import { AudioPlayer } from '../shared/audio-player';
import { AudioRecorder } from '../shared/audio-recorder';
import { createLocalStateController } from '../shared/state-machine';
import { createUniversalExecute } from '../shared/universal-execute';
import {
  ActiveRealtimeSession,
  SessionStateDefinition,
  StartRuntimeInput
} from '../shared/realtime-session.types';

const buildTools = (state: SessionStateDefinition) => [
  {
    functionDeclarations: state.tools.map((tool) => ({
      name: tool.function.name,
      description: tool.function.description,
      parameters: tool.function.parameters
    }))
  }
];

const buildSpeechConfig = (voice: string) => ({
  voiceConfig: {
    prebuiltVoiceConfig: {
      voiceName: voice
    }
  }
});

const buildConnectConfig = (
  input: StartRuntimeInput,
  state: SessionStateDefinition,
  resumeHandle?: string | null
) => ({
  responseModalities: [Modality.AUDIO],
  systemInstruction: state.instructions,
  tools: buildTools(state),
  speechConfig: buildSpeechConfig(input.sessionConfig.voice),
  sessionResumption: resumeHandle ? { handle: resumeHandle } : {},
  ...(state.geminiThinkingConfig ? { thinkingConfig: state.geminiThinkingConfig as any } : {})
});

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
  isClosed: () => boolean,
  isReconnecting: () => boolean,
  setClosed: () => void
) => (message: string) => {
  if (isClosed() || isReconnecting()) {
    return;
  }

  setClosed();
  input.onDisconnect(message);
};

const createToolCallHandler = (
  execute: ReturnType<typeof createUniversalExecute>,
  getSession: () => any
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

  getSession().sendToolResponse({ functionResponses });
};

const createSessionOpener = (
  input: StartRuntimeInput,
  getResumeHandle: () => string | null,
  onMessage: (message: any) => Promise<void>,
  onDisconnect: (message: string) => void
) => async (state: SessionStateDefinition) => {
  const ai = new GoogleGenAI({
    apiKey: input.sessionConfig.token,
    httpOptions: { apiVersion: 'v1alpha' }
  });

  return ai.live.connect({
    model: input.sessionConfig.model,
    config: buildConnectConfig(input, state, getResumeHandle()),
    callbacks: {
      onopen: () => undefined,
      onmessage: (message) => {
        void onMessage(message).catch((error) => {
          console.error('Gemini message handling failed:', error);
        });
      },
      onerror: (error) => onDisconnect(`An error occurred: ${error.message || 'Unknown error'}`),
      onclose: (event) => onDisconnect(event.reason || 'Session ended.')
    }
  });
};

const startRecorder = async (recorder: AudioRecorder, getSession: () => any) => {
  await recorder.start((chunk) => {
    getSession()?.sendRealtimeInput({
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
  setClosed: () => void
) => () => {
  setClosed();
  recorder.stop();
  player.close();
  getSession()?.close();
};

export const startGeminiRuntime = async (
  input: StartRuntimeInput
): Promise<ActiveRealtimeSession> => {
  const player = new AudioPlayer();
  const recorder = new AudioRecorder();
  const stateController = createLocalStateController(input.sessionConfig.stateMachine);
  const execute = createUniversalExecute(input.config, stateController);
  let closed = false;
  let reconnecting = false;
  let resumeHandle: string | null = null;
  let liveSession: any;

  const setClosed = () => {
    closed = true;
  };
  const getSession = () => liveSession;
  const onDisconnect = createDisconnectHandler(
    input,
    () => closed,
    () => reconnecting,
    setClosed
  );
  const handleToolCall = createToolCallHandler(execute, getSession);

  const openSession = createSessionOpener(
    input,
    () => resumeHandle,
    async (message) => {
      if (closed) {
        return;
      }

      if (message.sessionResumptionUpdate?.newHandle) {
        resumeHandle = message.sessionResumptionUpdate.newHandle;
      }

      if (message.serverContent?.interrupted) {
        player.reset();
      }

      await playAudioParts(message, player);
      await handleToolCall(message);

      if (!message.serverContent?.turnComplete) {
        return;
      }

      const nextState = stateController.applyPendingState();
      if (!nextState || closed) {
        return;
      }

      reconnecting = true;
      try {
        getSession().close();
        liveSession = await openSession(nextState);
      } catch (error) {
        setClosed();
        input.onDisconnect('Session reconnect failed.');
      } finally {
        reconnecting = false;
      }
    },
    onDisconnect
  );

  liveSession = await openSession(stateController.getCurrentState());
  await startRecorder(recorder, getSession);
  return { close: createCloseHandler(recorder, player, getSession, setClosed) };
};
