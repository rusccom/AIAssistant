import { BotToolDefinition } from '../realtime/shared/realtime.types';
import {
  CompiledConversationTransition,
  ConversationStateDefinition
} from './state-machine.types';

interface CompiledTransitionTools {
  tools: BotToolDefinition[];
  transitions: CompiledConversationTransition[];
}

const createTransitionToolName = (index: number) => {
  return `state_transition_option_${index + 1}`;
};

const normalizeCondition = (condition?: string) => {
  if (!condition) {
    return 'the current state goal is complete and the conversation should continue';
  }

  return condition.trim().replace(/[.]+$/u, '');
};

const createTransitionTool = (
  toolName: string,
  condition?: string
): BotToolDefinition => ({
  type: 'function',
  function: {
    name: toolName,
    description: `Use this only when ${normalizeCondition(condition)}.`,
    parameters: {
      type: 'object' as const,
      properties: {
        reason: {
          type: 'string' as const,
          description: 'Required short internal reason why this transition should happen now.'
        }
      },
      required: ['reason'] as const
    }
  }
});

const compileTransition = (
  transition: ConversationStateDefinition['transitions'][number],
  index: number
): CompiledConversationTransition => ({
  ...transition,
  toolName: createTransitionToolName(index)
});

export const buildStateTransitionTools = (
  state: ConversationStateDefinition
): CompiledTransitionTools => {
  const transitions = state.transitions.map(compileTransition);
  const tools = transitions.map((transition) => {
    return createTransitionTool(transition.toolName, transition.condition);
  });

  return { tools, transitions };
};
