import { RealtimeProviderCatalog, RealtimeVoiceOption } from '../shared/realtime.types';

export const GEMINI_VOICES: RealtimeVoiceOption[] = [
  { id: 'Puck', name: 'Puck', description: 'Upbeat, energetic voice.' },
  { id: 'Charon', name: 'Charon', description: 'Informative, focused voice.' },
  { id: 'Kore', name: 'Kore', description: 'Firm, clear voice.' },
  { id: 'Aoede', name: 'Aoede', description: 'Light, breezy voice.' },
  { id: 'Sulafat', name: 'Sulafat', description: 'Warm, relaxed voice.' }
];

export const GEMINI_PROVIDER_CATALOG: RealtimeProviderCatalog = {
  id: 'gemini',
  label: 'Gemini Live Preview',
  description: 'Gemini 3.1 Flash Live preview sessions with ephemeral tokens.',
  defaultModel: 'gemini-3.1-flash-live-preview',
  defaultVoice: 'Puck',
  models: [
    {
      id: 'gemini-3.1-flash-live-preview',
      label: 'Gemini 3.1 Flash Live Preview',
      description: 'Preview live audio-to-audio model with tool use.'
    }
  ],
  voices: GEMINI_VOICES
};
