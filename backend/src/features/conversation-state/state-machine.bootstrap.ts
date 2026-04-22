import { getAllFunctionDefinitions } from '../../bot-functions';
import {
  BotToolDefinition,
  PreparedRealtimeConfig,
  RealtimeProviderId
} from '../realtime/shared/realtime.types';
import {
  getRealtimeProviderCatalog,
  resolveRealtimeModel,
  resolveRealtimeVoice
} from '../realtime/shared/realtime.catalog';
import { buildStateScopedInstructions } from './state-machine.instructions';
import { resolveStartStateId, parseConversationStates } from './state-machine.schema';
import { buildStateTransitionTools } from './state-transition-tools';
import { createStateInstructionVersion } from './state-machine.version';
import {
  CompiledConversationTransition,
  CompiledConversationState,
  ConversationStateDefinition,
  ConversationStateMachineBootstrap,
  ReasoningMode
} from './state-machine.types';

const REASONING_PRESETS = {
  fast: { thinkingLevel: 'minimal' },
  balanced: { thinkingLevel: 'medium' },
  deep: { thinkingLevel: 'high' }
} as const;

const buildAllowedTools = (
  state: ConversationStateDefinition,
  transitionTools: BotToolDefinition[]
): BotToolDefinition[] => {
  const definitions = getAllFunctionDefinitions() as BotToolDefinition[];
  const allowedTools = state.allowedTools || [];

  if (allowedTools.length === 0) {
    return [...definitions, ...transitionTools];
  }

  const tools = definitions.filter((tool) => allowedTools.includes(tool.function.name));
  return [...tools, ...transitionTools];
};

const resolveGeminiThinkingConfig = (
  provider: RealtimeProviderId,
  reasoningMode?: ReasoningMode
) => {
  if (provider !== 'gemini' || !reasoningMode || reasoningMode === 'inherit') {
    return null;
  }

  return REASONING_PRESETS[reasoningMode];
};

const buildCompiledState = (
  botConfig: any,
  provider: RealtimeProviderId,
  state: ConversationStateDefinition
): CompiledConversationState => {
  const compiledTransitions = buildStateTransitionTools(state);
  const instructions = buildStateScopedInstructions(botConfig, state);
  const tools = buildAllowedTools(state, compiledTransitions.tools);
  const transitions = compiledTransitions.transitions;

  return {
    id: state.id,
    instructions,
    instructionsLength: instructions.length,
    instructionVersion: createStateInstructionVersion({
      id: state.id,
      instructions,
      tools,
      transitions
    }),
    tools,
    transitions,
    geminiThinkingConfig: resolveGeminiThinkingConfig(provider, state.reasoningMode)
  };
};

const buildFallbackState = (
  botConfig: any,
  provider: RealtimeProviderId
): CompiledConversationState => {
  const instructions = buildStateScopedInstructions(botConfig, null);
  const tools = getAllFunctionDefinitions() as BotToolDefinition[];
  const transitions: CompiledConversationTransition[] = [];

  return {
    id: 'default',
    instructions,
    instructionsLength: instructions.length,
    instructionVersion: createStateInstructionVersion({
      id: 'default',
      instructions,
      tools,
      transitions
    }),
    tools,
    transitions,
    geminiThinkingConfig: resolveGeminiThinkingConfig(provider, 'inherit')
  };
};

export const buildStateMachineBootstrap = (
  botConfig: any
): ConversationStateMachineBootstrap => {
  const provider = getRealtimeProviderCatalog(botConfig.provider).id;
  const states = parseConversationStates(botConfig.conversationStates);

  if (states.length === 0) {
    return {
      initialStateId: 'default',
      states: [buildFallbackState(botConfig, provider)]
    };
  }

  return {
    initialStateId: resolveStartStateId(botConfig.editorSettings, states) || states[0].id,
    states: states.map((state) => buildCompiledState(botConfig, provider, state))
  };
};

export const resolveBootstrapState = (
  stateMachine: ConversationStateMachineBootstrap,
  stateId?: string | null
): CompiledConversationState => {
  const matchedState = stateMachine.states.find((state) => state.id === stateId);
  return matchedState || stateMachine.states[0];
};

export const buildRealtimeConfigFromState = (
  botConfig: any,
  state: CompiledConversationState
): PreparedRealtimeConfig => {
  const provider = getRealtimeProviderCatalog(botConfig.provider).id;

  return {
    provider,
    model: resolveRealtimeModel(provider, botConfig.model),
    voice: resolveRealtimeVoice(provider, botConfig.voice),
    instructions: state.instructions,
    tools: state.tools,
    geminiThinkingConfig: state.geminiThinkingConfig
  };
};
