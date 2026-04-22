import {
  SessionStateDefinition,
  SessionStateMachine
} from './realtime-session.types';
import { RealtimeLogger, summarizeState } from './realtime-logger';

export interface LocalStateController {
  applyPendingState(): SessionStateDefinition | null;
  getCurrentState(): SessionStateDefinition;
  getPendingStateId(): string | null;
  scheduleTransition(nextStateId?: string, reason?: string): string;
}

const resolveInitialState = (
  stateMachine: SessionStateMachine,
  currentStateId?: string | null
): SessionStateDefinition => {
  const currentState = stateMachine.states.find(
    (state) => state.id === currentStateId
  );
  if (currentState) {
    return currentState;
  }

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
  stateMachine: SessionStateMachine,
  currentStateId?: string | null,
  logger?: RealtimeLogger
): LocalStateController => {
  let currentState = resolveInitialState(stateMachine, currentStateId);
  let pendingStateId: string | null = null;

  logger?.info('state', 'initialized', {
    initialStateId: stateMachine.initialStateId || null,
    currentStateId: currentStateId || null,
    state: summarizeState(currentState)
  });

  return {
    getCurrentState: () => currentState,
    getPendingStateId: () => pendingStateId,
    scheduleTransition: (nextStateId, reason) => {
      if (!nextStateId) {
        logger?.warn('state', 'transition_rejected', {
          currentStateId: currentState.id,
          reason: 'nextStateId_missing'
        });
        return 'nextStateId is required for transition_state.';
      }

      if (pendingStateId) {
        logger?.warn('state', 'transition_rejected', {
          currentStateId: currentState.id,
          pendingStateId,
          requestedStateId: nextStateId,
          reason: 'pending_transition_exists'
        });
        return `A transition to "${pendingStateId}" is already scheduled. Finish the current turn first.`;
      }

      if (!canTransition(currentState, nextStateId)) {
        logger?.warn('state', 'transition_rejected', {
          currentState: summarizeState(currentState),
          requestedStateId: nextStateId,
          reason: 'transition_not_allowed'
        });
        return `Transition to "${nextStateId}" is not allowed from "${currentState.id}".`;
      }

      pendingStateId = nextStateId;
      logger?.info('state', 'transition_requested', {
        currentStateId: currentState.id,
        nextStateId,
        reason: reason || null
      });
      return `Transition to "${nextStateId}" is scheduled for the next assistant turn.`;
    },
    applyPendingState: () => {
      if (!pendingStateId) {
        return null;
      }

      const nextStateId = pendingStateId;
      const nextState = stateMachine.states.find((state) => state.id === nextStateId);
      pendingStateId = null;
      if (!nextState) {
        logger?.warn('state', 'transition_missing_target', { nextStateId });
        return null;
      }

      const previousStateId = currentState.id;
      currentState = nextState;
      logger?.info('state', 'transition_applied', {
        fromStateId: previousStateId,
        toState: summarizeState(currentState)
      });
      return currentState;
    }
  };
};
