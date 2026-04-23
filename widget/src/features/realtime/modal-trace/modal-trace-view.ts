import { ENABLE_REALTIME_TRACE } from '../../../../../shared/realtime-trace.config';
import {
  RealtimeLogEntry,
  subscribeRealtimeLogs
} from '../shared/realtime-logger';
import { buildModalTraceGroups } from './modal-trace-grouping';
import { ModalTraceStateGroup } from './modal-trace-grouping.helpers';
import { createElement, renderTraceGroup } from './modal-trace-render';

interface CreateWidgetModalTraceViewOptions {
  getTraceId: () => string | null | undefined;
}

interface ModalTraceViewState {
  activeTraceId: string | null;
  entries: RealtimeLogEntry[];
}

export interface WidgetModalTraceView {
  destroy(): void;
  element: HTMLDivElement;
}

const MAX_ENTRIES = 300;

const normalizeTraceId = (value: string | null | undefined) => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

const syncTraceId = (
  state: ModalTraceViewState,
  options: CreateWidgetModalTraceViewOptions,
  nextTraceId?: string | null
) => {
  const resolvedTraceId = normalizeTraceId(options.getTraceId()) || normalizeTraceId(nextTraceId);
  if (!resolvedTraceId || resolvedTraceId === state.activeTraceId) {
    return;
  }

  state.activeTraceId = resolvedTraceId;
  state.entries = [];
};

const isSessionStartEvent = (entry: RealtimeLogEntry) => {
  return entry.scope === 'session' && entry.event === 'start_requested';
};

const isStateTreeEvent = (entry: RealtimeLogEntry) => {
  return entry.scope === 'state'
    && (entry.event === 'entered' || entry.event === 'exited');
};

const isToolTreeEvent = (entry: RealtimeLogEntry) => {
  return entry.scope === 'tool'
    && [
      'execute_started',
      'execute_finished',
      'execute_failed'
    ].includes(entry.event);
};

const shouldKeepEntry = (entry: RealtimeLogEntry) => {
  return isSessionStartEvent(entry) || isStateTreeEvent(entry) || isToolTreeEvent(entry);
};

const renderEmptyState = (
  body: HTMLDivElement,
  text: string
) => {
  const empty = createElement<HTMLDivElement>('div', {
    padding: '12px',
    borderRadius: '14px',
    background: '#ffffff',
    color: '#64748b',
    fontSize: '12px',
    lineHeight: '1.5'
  });
  empty.textContent = text;
  body.appendChild(empty);
};

const renderGroups = (body: HTMLDivElement, groups: ModalTraceStateGroup[]) => {
  groups.forEach((group) => body.appendChild(renderTraceGroup(group)));
  body.scrollTop = body.scrollHeight;
};

export const createWidgetModalTraceView = (
  options: CreateWidgetModalTraceViewOptions
): WidgetModalTraceView => {
  const state: ModalTraceViewState = {
    activeTraceId: normalizeTraceId(options.getTraceId()),
    entries: []
  };

  const root = createElement<HTMLDivElement>('div', {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    minHeight: '0',
    maxHeight: '100%',
    padding: '16px',
    borderRadius: '20px',
    border: '1px solid rgba(148, 163, 184, 0.22)',
    background: 'linear-gradient(180deg, rgba(248, 250, 252, 0.92), rgba(241, 245, 249, 0.88))',
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.7)'
  });

  const header = createElement<HTMLDivElement>('div', {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    paddingBottom: '12px'
  });

  const title = createElement<HTMLDivElement>('div', {
    color: '#0f172a',
    fontSize: '15px',
    fontWeight: '700'
  });
  title.textContent = 'State Trace';

  const subtitle = createElement<HTMLDivElement>('div', {
    color: '#64748b',
    fontSize: '11px',
    lineHeight: '1.45',
    wordBreak: 'break-word'
  });

  const body = createElement<HTMLDivElement>('div', {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    minHeight: '220px',
    maxHeight: '420px',
    overflowY: 'auto',
    paddingRight: '4px'
  });

  const render = () => {
    syncTraceId(state, options);
    subtitle.textContent = state.activeTraceId
      ? `Trace: ${state.activeTraceId}`
      : 'Start a conversation to see grouped states and tool calls.';
    body.innerHTML = '';

    if (!ENABLE_REALTIME_TRACE) {
      renderEmptyState(
        body,
        'Realtime trace is disabled. Enable it to inspect state blocks here.'
      );
      return;
    }

    const groups = buildModalTraceGroups(state.entries, state.activeTraceId);
    if (groups.length === 0) {
      renderEmptyState(
        body,
        state.activeTraceId ? 'Waiting for state activity...' : 'No session trace yet.'
      );
      return;
    }

    renderGroups(body, groups);
  };

  const unsubscribe = subscribeRealtimeLogs((entry) => {
    if (isSessionStartEvent(entry)) {
      syncTraceId(state, options, entry.traceId);
    }

    if (!state.activeTraceId || entry.traceId !== state.activeTraceId) {
      return;
    }

    if (!shouldKeepEntry(entry)) {
      return;
    }

    state.entries = [...state.entries.slice(-(MAX_ENTRIES - 1)), entry];
    render();
  });

  header.append(title, subtitle);
  root.append(header, body);
  render();

  return {
    element: root,
    destroy: () => {
      unsubscribe();
    }
  };
};
