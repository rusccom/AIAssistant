import { DEFAULT_VOICE } from './voices';

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
  voice: DEFAULT_VOICE
} as const;

export type BotDefaults = typeof BOT_DEFAULTS; 