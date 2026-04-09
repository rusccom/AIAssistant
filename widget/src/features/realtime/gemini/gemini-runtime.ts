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

const logGemini = (event: string, details?: Record<string, unknown>) => {
  if (details) {
    console.info('[GeminiRuntime]', event, details);
    return;
  }

  console.info('[GeminiRuntime]', event);
};

const describeState = (state: SessionStateDefinition) => ({
  stateId: state.id,
  toolNames: state.tools.map((tool) => tool.function.name),
  hasThinkingConfig: !!state.geminiThinkingConfig
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
  getGeneration: () => number,
  setClosed: () => void
) => (generation: number) => (message: string) => {
  if (isClosed() || generation !== getGeneration()) {
    return;
  }

  setClosed();
  input.onDisconnect(message);
};

const isSessionOpen = (session: any) => {
  const readyState = session?.conn?.ws?.readyState;
  return readyState === WebSocket.OPEN;
};

const createToolCallHandler = (
  execute: ReturnType<typeof createUniversalExecute>,
  getSession: () => any,
  canSend: () => boolean
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

  logGemini('Widget -> Gemini toolResponse', {
    toolNames: functionResponses.map((response) => response.name)
  });
  session.sendToolResponse({ functionResponses });
};

const createSessionOpener = (
  input: StartRuntimeInput,
  getResumeHandle: () => string | null,
  onMessage: (message: any) => Promise<void>,
  onDisconnect: (generation: number) => (message: string) => void
) => async (state: SessionStateDefinition, generation: number) => {
  const ai = new GoogleGenAI({
    apiKey: input.sessionConfig.token,
    httpOptions: { apiVersion: 'v1alpha' }
  });
  const resumeHandle = getResumeHandle();
  const disconnect = onDisconnect(generation);

  logGemini('Widget -> Gemini connect', {
    ...describeState(state),
    hasResumeHandle: !!resumeHandle,
    model: input.sessionConfig.model
  });

  return ai.live.connect({
    model: input.sessionConfig.model,
    config: buildConnectConfig(input, state, resumeHandle),
    callbacks: {
      onopen: () => logGemini('Gemini socket opened', { stateId: state.id }),
      onmessage: (message) => {
        void onMessage(message).catch((error) => {
          console.error('Gemini message handling failed:', error);
        });
      },
      onerror: (error) => {
        logGemini('Gemini socket error', { message: error.message || 'Unknown error' });
        disconnect(`An error occurred: ${error.message || 'Unknown error'}`);
      },
      onclose: (event) => {
        logGemini('Gemini socket closed', {
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
  canStreamInput: () => boolean
) => {
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
    () => closed,
    () => generation,
    setClosed
  );
  const canSend = () => !closed && sessionReady;
  const handleToolCall = createToolCallHandler(execute, getSession, canSend);

  const openSession = createSessionOpener(
    input,
    () => resumeHandle,
    async (message) => {
      if (closed) {
        return;
      }

      if (message.setupComplete) {
        sessionReady = true;
        logGemini('Gemini setup complete', {
          stateId: stateController.getCurrentState().id
        });
        return;
      }

      if (message.sessionResumptionUpdate?.newHandle) {
        resumeHandle = message.sessionResumptionUpdate.newHandle;
        logGemini('Gemini session handle updated', {
          resumable: message.sessionResumptionUpdate.resumable ?? null,
          stateId: stateController.getCurrentState().id
        });
      }

      if (message.serverContent?.interrupted) {
        logGemini('Gemini interrupted current output', {
          stateId: stateController.getCurrentState().id
        });
        player.reset();
      }

      if (message.toolCall?.functionCalls?.length) {
        logGemini('Gemini -> Widget toolCall', {
          toolNames: message.toolCall.functionCalls.map((call: any) => call.name),
          stateId: stateController.getCurrentState().id
        });
      }

      await playAudioParts(message, player);
      await handleToolCall(message);

      if (!message.serverContent?.turnComplete) {
        return;
      }

      const previousStateId = stateController.getCurrentState().id;
      logGemini('Gemini turn complete', { stateId: previousStateId });
      const nextState = stateController.applyPendingState();
      if (!nextState || closed) {
        return;
      }

      generation += 1;
      try {
        logGemini('Gemini reconnecting for state transition', {
          fromStateId: previousStateId,
          toStateId: nextState.id
        });
        sessionReady = false;
        const previousSession = getSession();
        liveSession = undefined;
        previousSession?.close();
        liveSession = await openSession(nextState, generation);
      } catch (error) {
        setClosed();
        input.onDisconnect('Session reconnect failed.');
      }
    },
    onDisconnect
  );

  sessionReady = false;
  liveSession = await openSession(stateController.getCurrentState(), generation);
  await startRecorder(recorder, getSession, () => !closed && sessionReady);
  return { close: createCloseHandler(recorder, player, getSession, setClosed) };
};
