import {
  SessionStateDefinition,
  SessionStateMachine
} from './realtime-session.types';

export interface LocalStateController {
  applyPendingState(): SessionStateDefinition | null;
  getCurrentState(): SessionStateDefinition;
  scheduleTransition(nextStateId?: string): string;
}

const resolveInitialState = (
  stateMachine: SessionStateMachine
): SessionStateDefinition => {
  const initialState = stateMachine.states.find(
    (state) => state.id === stateMachine.initialStateId
  );

  return initialState || stateMachine.states[0];
};

const canTransition = (
  state: SessionStateDefinition,
  nextStateId: string
) => state.transitions.some((transition) => transition.next_step === nextStateId);

export const createLocalStateController = (
  stateMachine: SessionStateMachine
): LocalStateController => {
  let currentState = resolveInitialState(stateMachine);
  let pendingStateId: string | null = null;

  return {
    getCurrentState: () => currentState,
    scheduleTransition: (nextStateId) => {
      if (!nextStateId) {
        return 'nextStateId is required for transition_state.';
      }

      if (pendingStateId) {
        return `A transition to "${pendingStateId}" is already scheduled. Finish the current turn first.`;
      }

      if (!canTransition(currentState, nextStateId)) {
        return `Transition to "${nextStateId}" is not allowed from "${currentState.id}".`;
      }

      pendingStateId = nextStateId;
      return `Transition to "${nextStateId}" is scheduled for the next assistant turn.`;
    },
    applyPendingState: () => {
      if (!pendingStateId) {
        return null;
      }

      const nextState = stateMachine.states.find((state) => state.id === pendingStateId);
      pendingStateId = null;
      if (!nextState) {
        return null;
      }

      currentState = nextState;
      return currentState;
    }
  };
};
