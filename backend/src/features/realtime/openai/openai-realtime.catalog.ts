import { RealtimeProviderCatalog, RealtimeVoiceOption } from '../shared/realtime.types';

export const OPENAI_VOICES: RealtimeVoiceOption[] = [
  { id: 'alloy', name: 'Alloy', description: 'Neutral, balanced voice.' },
  { id: 'echo', name: 'Echo', description: 'Clear, articulate voice.' },
  { id: 'shimmer', name: 'Shimmer', description: 'Warm, friendly voice.' },
  { id: 'ash', name: 'Ash', description: 'Dramatic, expressive voice.' },
  { id: 'ballad', name: 'Ballad', description: 'Smooth, musical voice.' },
  { id: 'coral', name: 'Coral', description: 'Bright, energetic voice.' },
  { id: 'sage', name: 'Sage', description: 'Calm, wise voice.' },
  { id: 'verse', name: 'Verse', description: 'Poetic, rhythmic voice.' },
  { id: 'marin', name: 'Marin', description: 'Natural, friendly voice.' }
];

export const OPENAI_PROVIDER_CATALOG: RealtimeProviderCatalog = {
  id: 'openai',
  label: 'OpenAI Realtime',
  description: 'OpenAI WebRTC realtime sessions with ephemeral tokens.',
  defaultModel: 'gpt-realtime',
  defaultVoice: 'alloy',
  models: [
    {
      id: 'gpt-realtime',
      label: 'GPT Realtime',
      description: 'Low-latency speech-to-speech model for live conversations.'
    }
  ],
  voices: OPENAI_VOICES
};
