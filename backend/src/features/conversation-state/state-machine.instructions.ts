import { generateBaseAgentInstructions } from '../../services/instructions.service';
import { ConversationStateDefinition } from './state-machine.types';

const formatList = (items: string[]) => {
  if (items.length === 0) {
    return '- none';
  }

  return items.map((item) => `- ${item}`).join('\n');
};

const formatTransitions = (state: ConversationStateDefinition | null) => {
  if (!state || state.transitions.length === 0) {
    return '- No outgoing transitions. Conclude the conversation when this state is complete.';
  }

  return state.transitions
    .map((transition) => {
      const condition = transition.condition || 'when the state goal is complete';
      return `- ${transition.next_step}: ${condition}`;
    })
    .join('\n');
};

const buildStateBlock = (state: ConversationStateDefinition | null) => {
  if (!state) {
    return `
# Current Conversation State
You have reached the end of the conversation flow.

Rules:
- Wrap up politely and naturally.
- Do not call business tools unless the user starts a new task.
- Do not mention internal state IDs or system mechanics.
`.trim();
  }

  return `
# Current Conversation State
## State ID
${state.id}

## Goal
${state.description || 'Complete the current step before moving on.'}

## State Instructions
${formatList(state.instructions)}

## Example Phrases
${formatList(state.examples)}

## Allowed Next States
${formatTransitions(state)}

## State Rules
- You are currently in this state only.
- Do not mention internal state IDs or system mechanics to the user.
- Use \`transition_state\` only when one of the allowed next states should become active.
- If you ask a question that should be handled by the next state, call \`transition_state\` in the same assistant turn.
- Treat the current state as the instruction set for what you say now, and the next state as the instruction set for the user's next reply.
- If the state is not complete yet, stay in the current state.
`.trim();
};

export const buildStateScopedInstructions = (
  config: any,
  state: ConversationStateDefinition | null
) => {
  return `${generateBaseAgentInstructions(config)}\n\n${buildStateBlock(state)}`.trim();
};
