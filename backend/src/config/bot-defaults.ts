import { OPENAI_PROVIDER_CATALOG } from '../features/realtime/openai/openai-realtime.catalog';

/**
 * Default bot configuration values in English
 * These values are used when creating new bot configurations
 */
export const BOT_DEFAULTS = {
  demeanor: "Patient, positive, and always ready to help",
  tone: "Warm, conversational, and friendly. Use light 'mm', 'uh-huh'",
  levelOfEnthusiasm: "Moderately enthusiastic to sound positive but not overly energetic",
  formality: "professional",
  levelOfEmotion: "Moderately emotional but without exaggeration",
  fillerWords: "occasionally",
  pacing: "Normal speech rate",
  voice: OPENAI_PROVIDER_CATALOG.defaultVoice
} as const;

export type BotDefaults = typeof BOT_DEFAULTS; 
