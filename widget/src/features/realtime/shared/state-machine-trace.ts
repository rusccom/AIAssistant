import type { RealtimeLogger } from './realtime-logger';
import { summarizeState } from './realtime-logger';
import type {
  SessionStateDefinition,
  SessionStateMachine
} from './realtime-session.types';

type StateSelectionSource =
  | 'first_state_fallback'
  | 'initial_current_state'
  | 'initial_state_id'
  | 'transition';

type StateLifecycleStatus = 'active' | 'ended' | 'selected';

export interface TransitionRequestInput {
  instructionVersion?: string | null;
  nextStateId?: string;
  reason?: string;
  source: string;
  toolName?: string | null;
  turnId?: string | null;
}

export interface ActivateStateInput {
  source: string;
  turnId?: string | null;
}

export interface ApplyPendingStateInput {
  source: string;
  turnId?: string | null;
}

export interface FinalizeStateInput {
  reason?: string | null;
  source: string;
  turnId?: string | null;
}

export interface StateTrace {
  activatedAt: string | null;
  entryId: string;
  fromStateId: string | null;
  selectedAt: string;
  selectedBy: string;
  selectedReason: string | null;
  selectedTurnId: string | null;
  stateId: string;
  status: StateLifecycleStatus;
  toolName: string | null;
  transitionId: string | null;
}

export interface PendingTransitionTrace {
  currentStateEntryId: string;
  currentStateId: string;
  id: string;
  instructionVersion: string | null;
  nextStateId: string;
  reason: string | null;
  requestedAt: string;
  requestedBy: string;
  toolName: string | null;
  turnId: string | null;
}

export interface ActiveStateEntry extends StateTrace {
  activatedAtMs: number | null;
  selectedAtMs: number;
}

export interface PendingTransition extends PendingTransitionTrace {
  requestedAtMs: number;
}

export interface ResolvedInitialState {
  source: StateSelectionSource;
  state: SessionStateDefinition;
}

const createEntityId = (prefix: string) => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

export const resolveInitialState = (
  stateMachine: SessionStateMachine,
  currentStateId?: string | null
): ResolvedInitialState => {
  const currentState = stateMachine.states.find((state) => state.id === currentStateId);
  if (currentState) return { source: 'initial_current_state', state: currentState };

  const initialState = stateMachine.states.find(
    (state) => state.id === stateMachine.initialStateId
  );
  if (initialState) return { source: 'initial_state_id', state: initialState };

  return { source: 'first_state_fallback', state: stateMachine.states[0] };
};

export const canTransition = (
  state: SessionStateDefinition,
  nextStateId: string
) => state.transitions.some((transition) => transition.next_step === nextStateId);

export const toStateTrace = (entry: ActiveStateEntry): StateTrace => ({
  activatedAt: entry.activatedAt,
  entryId: entry.entryId,
  fromStateId: entry.fromStateId,
  selectedAt: entry.selectedAt,
  selectedBy: entry.selectedBy,
  selectedReason: entry.selectedReason,
  selectedTurnId: entry.selectedTurnId,
  stateId: entry.stateId,
  status: entry.status,
  toolName: entry.toolName,
  transitionId: entry.transitionId
});

export const toPendingTransitionTrace = (
  pendingTransition: PendingTransition | null
): PendingTransitionTrace | null => {
  if (!pendingTransition) {
    return null;
  }

  const { requestedAtMs: _requestedAtMs, ...trace } = pendingTransition;
  return trace;
};

export const createStateEntry = (
  state: SessionStateDefinition,
  input: {
    fromStateId?: string | null;
    reason?: string | null;
    source: string;
    toolName?: string | null;
    transitionId?: string | null;
    turnId?: string | null;
  }
): ActiveStateEntry => {
  const selectedAtMs = Date.now();
  return {
    activatedAt: null,
    activatedAtMs: null,
    entryId: createEntityId('state'),
    fromStateId: input.fromStateId || null,
    selectedAt: new Date(selectedAtMs).toISOString(),
    selectedAtMs,
    selectedBy: input.source,
    selectedReason: input.reason || null,
    selectedTurnId: input.turnId || null,
    stateId: state.id,
    status: 'selected',
    toolName: input.toolName || null,
    transitionId: input.transitionId || null
  };
};

export const createPendingTransition = (
  state: SessionStateDefinition,
  entry: ActiveStateEntry,
  input: TransitionRequestInput
): PendingTransition => {
  const requestedAtMs = Date.now();
  return {
    currentStateEntryId: entry.entryId,
    currentStateId: state.id,
    id: createEntityId('transition'),
    instructionVersion: input.instructionVersion || null,
    nextStateId: input.nextStateId as string,
    reason: input.reason || null,
    requestedAt: new Date(requestedAtMs).toISOString(),
    requestedAtMs,
    requestedBy: input.source,
    toolName: input.toolName || null,
    turnId: input.turnId || null
  };
};

export const logStateSelected = (
  logger: RealtimeLogger | undefined,
  state: SessionStateDefinition,
  entry: ActiveStateEntry,
  details?: Record<string, unknown>
) => {
  logger?.info('state', 'selected', {
    reason: entry.selectedReason,
    state: summarizeState(state),
    stateEntryId: entry.entryId,
    stateId: state.id,
    stateTrace: toStateTrace(entry),
    toolName: entry.toolName,
    transitionId: entry.transitionId,
    turnId: entry.selectedTurnId,
    ...details
  });
};

export const logStateActivated = (
  logger: RealtimeLogger | undefined,
  state: SessionStateDefinition,
  entry: ActiveStateEntry,
  input: ActivateStateInput
) => {
  if (entry.status === 'active') {
    return;
  }

  entry.status = 'active';
  entry.activatedAtMs = Date.now();
  entry.activatedAt = new Date(entry.activatedAtMs).toISOString();

  logger?.info('state', 'entered', {
    activationDelayMs: entry.activatedAtMs - entry.selectedAtMs,
    reason: entry.selectedReason,
    source: input.source,
    state: summarizeState(state),
    stateEntryId: entry.entryId,
    stateId: state.id,
    stateTrace: toStateTrace(entry),
    toolName: entry.toolName,
    transitionId: entry.transitionId,
    turnId: input.turnId || entry.selectedTurnId || null
  });
};

export const logStateFinalized = (
  logger: RealtimeLogger | undefined,
  state: SessionStateDefinition,
  entry: ActiveStateEntry,
  input: FinalizeStateInput,
  pendingTransition: PendingTransition | null
) => {
  if (entry.status === 'ended') {
    return;
  }

  const finalizedAtMs = Date.now();
  entry.status = 'ended';

  logger?.info('state', 'exited', {
    activeDurationMs: entry.activatedAtMs ? finalizedAtMs - entry.activatedAtMs : null,
    pendingTransition: toPendingTransitionTrace(pendingTransition),
    reason: input.reason || entry.selectedReason || null,
    selectedDurationMs: finalizedAtMs - entry.selectedAtMs,
    source: input.source,
    state: summarizeState(state),
    stateEntryId: entry.entryId,
    stateId: state.id,
    stateTrace: toStateTrace(entry),
    toolName: entry.toolName,
    transitionId: entry.transitionId,
    turnId: input.turnId || entry.selectedTurnId || null,
    wasActivated: Boolean(entry.activatedAtMs)
  });
};

export const logTransitionRejected = (
  logger: RealtimeLogger | undefined,
  state: SessionStateDefinition,
  entry: ActiveStateEntry,
  nextStateId: string | undefined,
  pendingTransition: PendingTransition | null,
  reason: string
) => {
  logger?.warn('state', 'transition_rejected', {
    allowedTransitionToolNames: state.transitions.map(
      (transition) => transition.toolName || null
    ),
    currentState: summarizeState(state),
    currentStateEntryId: entry.entryId,
    pendingTransition: toPendingTransitionTrace(pendingTransition),
    reason,
    requestedStateId: nextStateId || null,
    stateEntryId: entry.entryId,
    stateId: state.id,
    toolName: entry.toolName,
    transitionId: pendingTransition?.id || null
  });
};

export const logTransitionApplied = (
  logger: RealtimeLogger | undefined,
  previousStateId: string,
  previousEntryId: string,
  nextState: SessionStateDefinition,
  nextEntry: ActiveStateEntry,
  pendingTransition: PendingTransition,
  input: ApplyPendingStateInput
) => {
  logger?.info('state', 'transition_applied', {
    applySource: input.source,
    fromStateEntryId: previousEntryId,
    fromStateId: previousStateId,
    pendingTransition: toPendingTransitionTrace(pendingTransition),
    reason: pendingTransition.reason,
    stateEntryId: nextEntry.entryId,
    stateId: nextState.id,
    stateTrace: toStateTrace(nextEntry),
    toState: summarizeState(nextState),
    toStateEntryId: nextEntry.entryId,
    toStateId: nextState.id,
    toolName: pendingTransition.toolName,
    transitionId: pendingTransition.id,
    turnId: input.turnId || pendingTransition.turnId || null,
    waitMs: Date.now() - pendingTransition.requestedAtMs
  });
};
