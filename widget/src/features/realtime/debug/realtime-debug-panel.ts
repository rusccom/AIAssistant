import { ENABLE_REALTIME_TRACE } from '../../../../../shared/realtime-trace.config';
import {
  copyText,
  createEntryMeta,
  formatEntryForCopy,
  formatTime,
  getVisibleEntries,
  matchesFilter,
  stringifyDetails
} from './realtime-debug-panel.helpers';
import {
  RealtimeLogEntry,
  subscribeRealtimeLogs
} from '../shared/realtime-logger';

interface DebugPanelState {
  collapsed: boolean;
  entries: RealtimeLogEntry[];
  filter: string;
}

const PANEL_ID = 'ai-widget-realtime-debug-panel';
const MAX_ENTRIES = 200;

const createElement = <T extends HTMLElement>(
  tag: string,
  styles: Partial<CSSStyleDeclaration> = {}
) => {
  const element = document.createElement(tag) as T;
  Object.assign(element.style, styles);
  return element;
};

const renderEntry = (entry: RealtimeLogEntry) => {
  const row = createElement<HTMLDivElement>('div', {
    border: '1px solid #d1d5db',
    borderRadius: '10px',
    padding: '8px',
    background: '#ffffff'
  });

  const title = createElement<HTMLDivElement>('div', {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '8px',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: '11px',
    color: '#111827'
  });
  title.textContent = `${formatTime(entry.timestamp)} | ${entry.level.toUpperCase()} | ${entry.scope}.${entry.event}`;

  const meta = createElement<HTMLDivElement>('div', {
    marginTop: '4px',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: '10px',
    color: '#6b7280'
  });
  meta.textContent = createEntryMeta(entry);

  const pre = createElement<HTMLPreElement>('pre', {
    margin: '8px 0 0 0',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: '10px',
    color: '#1f2937'
  });
  pre.textContent = stringifyDetails(entry);

  row.append(title, meta, pre);
  return row;
};

const createPanel = () => {
  const state: DebugPanelState = {
    collapsed: false,
    entries: [],
    filter: ''
  };

  const root = createElement<HTMLDivElement>('div', {
    position: 'fixed',
    right: '16px',
    bottom: '16px',
    width: '420px',
    maxWidth: 'calc(100vw - 32px)',
    height: '360px',
    zIndex: '10001',
    display: 'flex',
    flexDirection: 'column',
    background: '#f8fafc',
    border: '1px solid #cbd5e1',
    borderRadius: '16px',
    boxShadow: '0 18px 48px rgba(15, 23, 42, 0.18)',
    overflow: 'hidden'
  });
  root.id = PANEL_ID;

  const header = createElement<HTMLDivElement>('div', {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    padding: '10px 12px',
    background: '#e2e8f0',
    borderBottom: '1px solid #cbd5e1'
  });

  const title = createElement<HTMLDivElement>('div', {
    fontSize: '12px',
    fontWeight: '700',
    color: '#0f172a'
  });
  title.textContent = 'Realtime Trace';

  const controls = createElement<HTMLDivElement>('div', {
    display: 'flex',
    gap: '8px'
  });

  const clearButton = createElement<HTMLButtonElement>('button', {
    border: 'none',
    borderRadius: '8px',
    background: '#ffffff',
    padding: '6px 10px',
    cursor: 'pointer',
    fontSize: '11px'
  });
  clearButton.textContent = 'Clear';

  const copyButton = createElement<HTMLButtonElement>('button', {
    border: 'none',
    borderRadius: '8px',
    background: '#ffffff',
    padding: '6px 10px',
    cursor: 'pointer',
    fontSize: '11px'
  });
  copyButton.textContent = 'Copy All';

  const collapseButton = createElement<HTMLButtonElement>('button', {
    border: 'none',
    borderRadius: '8px',
    background: '#ffffff',
    padding: '6px 10px',
    cursor: 'pointer',
    fontSize: '11px'
  });
  collapseButton.textContent = 'Hide';

  controls.append(clearButton, copyButton, collapseButton);
  header.append(title, controls);

  const filterWrap = createElement<HTMLDivElement>('div', {
    padding: '10px 12px',
    borderBottom: '1px solid #e2e8f0'
  });

  const filterInput = createElement<HTMLInputElement>('input', {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '8px 10px',
    fontSize: '12px'
  });
  filterInput.placeholder = 'Filter by traceId, turnId, state, tool, event...';

  filterWrap.appendChild(filterInput);

  const body = createElement<HTMLDivElement>('div', {
    flex: '1',
    overflowY: 'auto',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  });

  const render = () => {
    const visibleEntries = getVisibleEntries(state);
    filterWrap.style.display = state.collapsed ? 'none' : 'block';
    body.style.display = state.collapsed ? 'none' : 'flex';
    root.style.height = state.collapsed ? 'auto' : '360px';
    collapseButton.textContent = state.collapsed ? 'Show' : 'Hide';
    copyButton.disabled = visibleEntries.length === 0;
    copyButton.style.opacity = copyButton.disabled ? '0.55' : '1';
    copyButton.style.cursor = copyButton.disabled ? 'not-allowed' : 'pointer';

    if (state.collapsed) {
      return;
    }

    body.innerHTML = '';
    visibleEntries.forEach((entry) => body.appendChild(renderEntry(entry)));

    body.scrollTop = body.scrollHeight;
  };

  clearButton.addEventListener('click', () => {
    state.entries = [];
    render();
  });

  copyButton.addEventListener('click', async () => {
    const text = getVisibleEntries(state).map(formatEntryForCopy).join('\n\n');
    if (!text) {
      return;
    }

    try {
      await copyText(text);
      copyButton.textContent = 'Copied';
      window.setTimeout(() => {
        copyButton.textContent = 'Copy All';
      }, 1200);
    } catch {
      copyButton.textContent = 'Failed';
      window.setTimeout(() => {
        copyButton.textContent = 'Copy All';
      }, 1200);
    }
  });

  collapseButton.addEventListener('click', () => {
    state.collapsed = !state.collapsed;
    render();
  });

  filterInput.addEventListener('input', () => {
    state.filter = filterInput.value.trim().toLowerCase();
    render();
  });

  subscribeRealtimeLogs((entry) => {
    state.entries = [...state.entries.slice(-(MAX_ENTRIES - 1)), entry];
    render();
  });

  root.append(header, filterWrap, body);
  render();
  document.body.appendChild(root);
};

export const ensureRealtimeDebugPanel = () => {
  if (!ENABLE_REALTIME_TRACE) {
    return;
  }

  if (document.getElementById(PANEL_ID)) {
    return;
  }

  createPanel();
};
