import { RealtimeLogEntry } from '../shared/realtime-logger';

interface DebugPanelStateLike {
  entries: RealtimeLogEntry[];
  filter: string;
}

export const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

export const stringifyDetails = (entry: RealtimeLogEntry) => {
  return JSON.stringify(entry.details ?? {}, null, 2);
};

const getFilterableText = (entry: RealtimeLogEntry) => {
  return JSON.stringify(entry).toLowerCase();
};

export const matchesFilter = (entry: RealtimeLogEntry, filter: string) => {
  if (!filter) {
    return true;
  }

  return getFilterableText(entry).includes(filter);
};

export const createEntryMeta = (entry: RealtimeLogEntry) => {
  const details = (entry.details || {}) as Record<string, unknown>;
  const parts = [
    `#${entry.sequence}`,
    entry.traceId ? `trace=${entry.traceId}` : null,
    typeof details.turnId === 'string' ? `turn=${details.turnId}` : null,
    typeof details.stateId === 'string' ? `state=${details.stateId}` : null,
    typeof details.stateEntryId === 'string' ? `entry=${details.stateEntryId}` : null,
    typeof details.transitionId === 'string' ? `transition=${details.transitionId}` : null,
    entry.provider ? `provider=${entry.provider}` : null,
    entry.model ? `model=${entry.model}` : null
  ].filter(Boolean);

  return parts.join(' | ');
};

export const formatEntryForCopy = (entry: RealtimeLogEntry) => {
  return [
    `${formatTime(entry.timestamp)} | ${entry.level.toUpperCase()} | ${entry.scope}.${entry.event}`,
    createEntryMeta(entry),
    stringifyDetails(entry)
  ].join('\n');
};

export const getVisibleEntries = (state: DebugPanelStateLike) => {
  return state.entries.filter((entry) => matchesFilter(entry, state.filter));
};

export const copyText = async (text: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
};
