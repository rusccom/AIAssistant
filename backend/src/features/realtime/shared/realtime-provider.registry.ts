import { geminiLiveProvider } from '../gemini/gemini-live.provider';
import { openaiRealtimeProvider } from '../openai/openai-realtime.provider';
import { PreparedRealtimeConfig } from './realtime.types';

const PROVIDERS = {
  openai: openaiRealtimeProvider,
  gemini: geminiLiveProvider
} as const;

export const createRealtimeSession = async (config: PreparedRealtimeConfig) => {
  return PROVIDERS[config.provider].createSession(config);
};
