import { SessionStateDefinition, SessionStateMachine } from './realtime-session.types';
import {
  ActiveStateEntry,
  ActivateStateInput,
  ApplyPendingStateInput,
  canTransition,
  createPendingTransition,
  createStateEntry,
  FinalizeStateInput,
  logStateActivated,
  logStateFinalized,
  logStateSelected,
  logTransitionApplied,
  logTransitionRejected,
  PendingTransition,
  PendingTransitionTrace,
  resolveInitialState,
  StateTrace,
  toPendingTransitionTrace,
  toStateTrace,
  TransitionRequestInput
} from './state-machine-trace';
import { summarizeState, type RealtimeLogger } from './realtime-logger';

export type {
  ActivateStateInput,
  ApplyPendingStateInput,
  FinalizeStateInput,
  PendingTransitionTrace,
  StateTrace,
  TransitionRequestInput
} from './state-machine-trace';

export interface LocalStateController {
  activateCurrentState(input: ActivateStateInput): void;
  applyPendingState(input: ApplyPendingStateInput): SessionStateDefinition | null;
  finalizeCurrentState(input: FinalizeStateInput): void;
  getCurrentState(): SessionStateDefinition;
  getCurrentStateTrace(): StateTrace;
  getPendingTransition(): PendingTransitionTrace | null;
  scheduleTransition(input: TransitionRequestInput): string;
}

const resolveNextState = (
  stateMachine: SessionStateMachine,
  pendingTransition: PendingTransition
) => {
  return stateMachine.states.find((state) => state.id === pendingTransition.nextStateId);
};

export const createLocalStateController = (
  stateMachine: SessionStateMachine,
  currentStateId?: string | null,
  logger?: RealtimeLogger
): LocalStateController => {
  const resolvedInitialState = resolveInitialState(stateMachine, currentStateId);
  let currentState = resolvedInitialState.state;
  let currentEntry: ActiveStateEntry = createStateEntry(currentState, {
    reason: resolvedInitialState.source,
    source: resolvedInitialState.source
  });
  let pendingTransition: PendingTransition | null = null;

  logger?.info('state', 'initialized', {
    currentStateEntryId: currentEntry.entryId,
    initialStateId: stateMachine.initialStateId || null,
    requestedCurrentStateId: currentStateId || null,
    resolutionSource: resolvedInitialState.source,
    state: summarizeState(currentState),
    stateEntryId: currentEntry.entryId,
    stateId: currentState.id
  });

  logStateSelected(logger, currentState, currentEntry, {
    currentStateEntryId: currentEntry.entryId,
    initialStateId: stateMachine.initialStateId || null,
    requestedCurrentStateId: currentStateId || null,
    resolutionSource: resolvedInitialState.source
  });

  return {
    activateCurrentState: (input) => {
      logStateActivated(logger, currentState, currentEntry, input);
    },
    applyPendingState: (input) => {
      if (!pendingTransition) return null;

      const nextTransition = pendingTransition;
      const nextState = resolveNextState(stateMachine, nextTransition);
      pendingTransition = null;

      if (!nextState) {
        logger?.warn('state', 'transition_missing_target', {
          pendingTransition: toPendingTransitionTrace(nextTransition),
          reason: 'missing_target_state',
          stateEntryId: currentEntry.entryId,
          stateId: currentState.id,
          transitionId: nextTransition.id
        });
        return null;
      }

      const previousStateId = currentState.id;
      const previousEntryId = currentEntry.entryId;

      logStateFinalized(logger, currentState, currentEntry, {
        reason: nextTransition.reason,
        source: input.source,
        turnId: input.turnId || nextTransition.turnId
      }, nextTransition);

      currentState = nextState;
      currentEntry = createStateEntry(currentState, {
        fromStateId: previousStateId,
        reason: nextTransition.reason,
        source: 'transition',
        toolName: nextTransition.toolName,
        transitionId: nextTransition.id,
        turnId: input.turnId || nextTransition.turnId
      });

      logTransitionApplied(
        logger,
        previousStateId,
        previousEntryId,
        currentState,
        currentEntry,
        nextTransition,
        input
      );

      logStateSelected(logger, currentState, currentEntry, {
        fromStateEntryId: previousEntryId,
        fromStateId: previousStateId,
        selectionSource: input.source
      });

      return currentState;
    },
    finalizeCurrentState: (input) => {
      logStateFinalized(logger, currentState, currentEntry, input, pendingTransition);
    },
    getCurrentState: () => currentState,
    getCurrentStateTrace: () => toStateTrace(currentEntry),
    getPendingTransition: () => toPendingTransitionTrace(pendingTransition),
    scheduleTransition: (input) => {
      if (!input.nextStateId) {
        logTransitionRejected(
          logger,
          currentState,
          currentEntry,
          input.nextStateId,
          pendingTransition,
          'nextStateId_missing'
        );
        return 'nextStateId is required for transition_state.';
      }

      if (pendingTransition) {
        logTransitionRejected(
          logger,
          currentState,
          currentEntry,
          input.nextStateId,
          pendingTransition,
          'pending_transition_exists'
        );
        return `A transition to "${pendingTransition.nextStateId}" is already scheduled. Finish the current turn first.`;
      }

      if (!canTransition(currentState, input.nextStateId)) {
        logTransitionRejected(
          logger,
          currentState,
          currentEntry,
          input.nextStateId,
          pendingTransition,
          'transition_not_allowed'
        );
        return `Transition to "${input.nextStateId}" is not allowed from "${currentState.id}".`;
      }

      pendingTransition = createPendingTransition(currentState, currentEntry, input);
      logger?.info('state', 'transition_requested', {
        allowedTransitionIds: currentState.transitions.map(
          (transition) => transition.next_step
        ),
        pendingTransition: toPendingTransitionTrace(pendingTransition),
        reason: pendingTransition.reason,
        state: summarizeState(currentState),
        stateEntryId: currentEntry.entryId,
        stateId: currentState.id,
        toolName: pendingTransition.toolName,
        transitionId: pendingTransition.id,
        turnId: pendingTransition.turnId
      });
      return `Transition to "${input.nextStateId}" is scheduled for the next assistant turn.`;
    }
  };
};
