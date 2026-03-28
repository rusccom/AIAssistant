import { startGeminiRuntime } from '../gemini/gemini-runtime';
import { startOpenAIRuntime } from '../openai/openai-runtime';
import { StartRuntimeInput } from './realtime-session.types';

export const startRealtimeRuntime = (input: StartRuntimeInput) => {
  return input.sessionConfig.provider === 'gemini'
    ? startGeminiRuntime(input)
    : startOpenAIRuntime(input);
};
