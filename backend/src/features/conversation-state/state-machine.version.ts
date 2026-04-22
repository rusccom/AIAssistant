import { createHash } from 'crypto';
import { BotToolDefinition } from '../realtime/shared/realtime.types';
import { CompiledConversationTransition } from './state-machine.types';

interface StateVersionInput {
  id: string;
  instructions: string;
  tools: BotToolDefinition[];
  transitions: CompiledConversationTransition[];
}

const buildStateSignature = (input: StateVersionInput) => {
  return JSON.stringify({
    id: input.id,
    instructions: input.instructions,
    toolNames: input.tools.map((tool) => tool.function.name),
    transitionToolNames: input.transitions.map((transition) => transition.toolName)
  });
};

export const createStateInstructionVersion = (input: StateVersionInput) => {
  return createHash('sha1').update(buildStateSignature(input)).digest('hex').slice(0, 12);
};
