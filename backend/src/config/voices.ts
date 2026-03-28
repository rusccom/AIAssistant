import { OPENAI_PROVIDER_CATALOG } from '../features/realtime/openai/openai-realtime.catalog';

export const AVAILABLE_VOICES = OPENAI_PROVIDER_CATALOG.voices;

export const DEFAULT_VOICE = OPENAI_PROVIDER_CATALOG.defaultVoice;

export type VoiceId = typeof AVAILABLE_VOICES[number]['id'];

export const isValidVoice = (voice: string): voice is VoiceId =>
  AVAILABLE_VOICES.some((item) => item.id === voice);
