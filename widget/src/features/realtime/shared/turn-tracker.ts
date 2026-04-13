import { RealtimeLogger, summarizeState } from './realtime-logger';
import { SessionStateDefinition } from './realtime-session.types';

interface TurnOutputSummary {
  hasAudio: boolean;
  hasText: boolean;
  interrupted: boolean;
  textPreview: string | null;
  toolCallCount: number;
  toolNames: string[];
}

interface CreateTurnTrackerInput {
  getPendingTransitionId?: () => string | null;
  getState: () => SessionStateDefinition;
  logger: RealtimeLogger;
}

export interface TurnTracker {
  completeTurn(source: string): void;
  ensureTurnStarted(source: string): string;
  getCurrentTurnId(): string | null;
  recordOutput(summary: Partial<TurnOutputSummary>): void;
}

interface ActiveTurn {
  id: string;
  output: TurnOutputSummary;
  source: string;
  startedAt: number;
}

const createTurnId = () => {
  return `turn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const createEmptyOutput = (): TurnOutputSummary => ({
  hasAudio: false,
  hasText: false,
  interrupted: false,
  textPreview: null,
  toolCallCount: 0,
  toolNames: []
});

const mergeToolNames = (current: string[], next: string[]) => {
  return Array.from(new Set([...current, ...next]));
};

const mergePreview = (current: string | null, next?: string | null) => {
  return current || next || null;
};

const mergeOutput = (
  current: TurnOutputSummary,
  next: Partial<TurnOutputSummary>
): TurnOutputSummary => ({
  hasAudio: current.hasAudio || Boolean(next.hasAudio),
  hasText: current.hasText || Boolean(next.hasText),
  interrupted: current.interrupted || Boolean(next.interrupted),
  textPreview: mergePreview(current.textPreview, next.textPreview),
  toolCallCount: current.toolCallCount + (next.toolCallCount || 0),
  toolNames: mergeToolNames(current.toolNames, next.toolNames || [])
});

export const createTurnTracker = (
  input: CreateTurnTrackerInput
): TurnTracker => {
  let activeTurn: ActiveTurn | null = null;

  const ensureTurnStarted = (source: string) => {
    if (activeTurn) {
      return activeTurn.id;
    }

    activeTurn = {
      id: createTurnId(),
      output: createEmptyOutput(),
      source,
      startedAt: Date.now()
    };

    input.logger.info('turn', 'started', {
      turnId: activeTurn.id,
      source,
      state: summarizeState(input.getState())
    });

    return activeTurn.id;
  };

  return {
    getCurrentTurnId: () => activeTurn?.id || null,
    ensureTurnStarted,
    recordOutput: (summary) => {
      const turnId = ensureTurnStarted('implicit_output');
      if (!activeTurn || activeTurn.id !== turnId) {
        return;
      }

      activeTurn.output = mergeOutput(activeTurn.output, summary);
    },
    completeTurn: (source) => {
      if (!activeTurn) {
        return;
      }

      const state = input.getState();
      input.logger.info('turn', 'completed', {
        turnId: activeTurn.id,
        source,
        startedBy: activeTurn.source,
        durationMs: Date.now() - activeTurn.startedAt,
        pendingTransitionId: input.getPendingTransitionId?.() || null,
        state: summarizeState(state),
        output: activeTurn.output
      });

      activeTurn = null;
    }
  };
};
