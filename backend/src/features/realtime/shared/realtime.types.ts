export type RealtimeProviderId = 'openai' | 'gemini';

export type RealtimeTransportId = 'openai-webrtc' | 'gemini-live';

export interface GeminiThinkingConfig {
  thinkingBudget?: number;
  thinkingLevel?: 'minimal' | 'low' | 'medium' | 'high';
}

export interface RealtimeModelOption {
  description: string;
  id: string;
  label: string;
}

export interface RealtimeVoiceOption {
  description: string;
  id: string;
  name: string;
}

export interface RealtimeProviderCatalog {
  defaultModel: string;
  defaultVoice: string;
  description: string;
  id: RealtimeProviderId;
  label: string;
  models: RealtimeModelOption[];
  voices: RealtimeVoiceOption[];
}

export interface BotToolDefinition {
  function: {
    description: string;
    name: string;
    parameters?: Record<string, unknown>;
  };
  type: 'function';
}

export interface PreparedRealtimeConfig {
  geminiThinkingConfig?: GeminiThinkingConfig | null;
  instructions: string;
  model: string;
  provider: RealtimeProviderId;
  tools: BotToolDefinition[];
  voice: string;
}

export interface CreatedRealtimeSession {
  expiresAt?: number | string | null;
  instructions: string;
  model: string;
  provider: RealtimeProviderId;
  token: string;
  tools: BotToolDefinition[];
  transport: RealtimeTransportId;
  voice: string;
}

export interface RealtimeProvider {
  createSession(config: PreparedRealtimeConfig): Promise<CreatedRealtimeSession>;
  id: RealtimeProviderId;
}
