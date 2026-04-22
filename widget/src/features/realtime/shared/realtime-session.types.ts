export interface WidgetConfig {
  apiHost?: string;
  embedToken: string;
  hostname: string;
  traceId?: string;
}

export interface GeminiThinkingConfig {
  thinkingBudget?: number;
  thinkingLevel?: 'minimal' | 'low' | 'medium' | 'high';
}

export interface StateTransition {
  condition?: string;
  next_step: string;
  toolName?: string | null;
}

export interface BotToolDefinition {
  function: {
    description: string;
    name: string;
    parameters?: Record<string, unknown>;
  };
  type: 'function';
}

export interface SessionStateDefinition {
  geminiThinkingConfig?: GeminiThinkingConfig | null;
  id: string;
  instructionVersion?: string | null;
  instructions: string;
  instructionsLength?: number | null;
  tools: BotToolDefinition[];
  transitions: StateTransition[];
}

export interface SessionStateMachine {
  initialStateId: string | null;
  states: SessionStateDefinition[];
}

export interface ServerSessionConfig {
  currentStateId?: string | null;
  expiresAt?: number | string | null;
  instructions: string;
  model: string;
  provider: 'openai' | 'gemini';
  stateMachine: SessionStateMachine;
  token: string;
  tools: BotToolDefinition[];
  transport: 'openai-webrtc' | 'gemini-live';
  voice: string;
}

export interface ActiveRealtimeSession {
  close(): void;
}

export interface StartRuntimeInput {
  config: WidgetConfig;
  onDisconnect: (message: string) => void;
  sessionConfig: ServerSessionConfig;
}
