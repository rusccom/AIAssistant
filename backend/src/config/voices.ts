/**
 * Available OpenAI voices for Realtime API
 * This list contains verified and experimental voices
 */
export const AVAILABLE_VOICES = [
  { id: 'alloy', name: 'Alloy', description: 'Neutral, balanced voice (default)' },
  { id: 'echo', name: 'Echo', description: 'Clear, articulate voice' },
  { id: 'shimmer', name: 'Shimmer', description: 'Warm, friendly voice' },
  { id: 'ash', name: 'Ash', description: 'Dramatic, expressive voice' },
  { id: 'ballad', name: 'Ballad', description: 'Smooth, musical voice' },
  { id: 'coral', name: 'Coral', description: 'Bright, energetic voice' },
  { id: 'sage', name: 'Sage', description: 'Calm, wise voice' },
  { id: 'verse', name: 'Verse', description: 'Poetic, rhythmic voice' },
  { id: 'marin', name: 'Marin', description: 'Natural, friendly voice' }
] as const;

export const DEFAULT_VOICE = 'alloy';

export type VoiceId = typeof AVAILABLE_VOICES[number]['id'];

export const isValidVoice = (voice: string): voice is VoiceId => {
  return AVAILABLE_VOICES.some(v => v.id === voice);
}; 