import { SessionStateDefinition, StateTransition } from './realtime-session.types';

export const findTransitionByToolName = (
  state: SessionStateDefinition,
  toolName: string
): StateTransition | null => {
  return state.transitions.find((transition) => transition.toolName === toolName) || null;
};
