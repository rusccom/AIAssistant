export const transitionStateToolDefinition = {
  type: 'function' as const,
  function: {
    name: 'transition_state',
    description: 'Move the conversation to one of the allowed next states when the current state goal is complete.',
    parameters: {
      type: 'object' as const,
      properties: {
        nextStateId: {
          type: 'string' as const,
          description: 'The exact ID of the next state from the allowed transitions list.'
        },
        reason: {
          type: 'string' as const,
          description: 'Required short internal reason why the transition should happen now.'
        }
      },
      required: ['nextStateId', 'reason'] as const
    }
  }
};
