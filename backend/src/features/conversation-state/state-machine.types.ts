import {
  BotToolDefinition,
  GeminiThinkingConfig
} from '../realtime/shared/realtime.types';

export type ReasoningMode = 'inherit' | 'fast' | 'balanced' | 'deep';

export interface ConversationTransition {
  condition?: string;
  next_step: string;
}

export interface CompiledConversationTransition extends ConversationTransition {
  toolName: string;
}

export interface ConversationStateDefinition {
  allowedTools?: string[];
  description: string;
  examples: string[];
  id: string;
  instructions: string[];
  reasoningMode?: ReasoningMode;
  transitions: ConversationTransition[];
}

export interface CompiledConversationState {
  geminiThinkingConfig?: GeminiThinkingConfig | null;
  id: string;
  instructionVersion: string;
  instructions: string;
  instructionsLength: number;
  tools: BotToolDefinition[];
  transitions: CompiledConversationTransition[];
}

export interface ConversationStateMachineBootstrap {
  initialStateId: string | null;
  states: CompiledConversationState[];
}
