import { formatTime } from '../debug/realtime-debug-panel.helpers';
import {
  ModalTraceStateGroup,
  ModalTraceToolCall
} from './modal-trace-grouping.helpers';

export const createElement = <T extends HTMLElement>(
  tag: string,
  styles: Partial<CSSStyleDeclaration> = {}
) => {
  const element = document.createElement(tag) as T;
  Object.assign(element.style, styles);
  return element;
};

const createSectionTitle = (text: string) => {
  const title = createElement<HTMLDivElement>('div', {
    color: '#334155',
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  });
  title.textContent = text;
  return title;
};

const renderChips = (items: string[], emptyText: string) => {
  const wrap = createElement<HTMLDivElement>('div', {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px'
  });

  if (items.length === 0) {
    const empty = createElement<HTMLSpanElement>('span', {
      fontSize: '11px',
      color: '#64748b'
    });
    empty.textContent = emptyText;
    wrap.appendChild(empty);
    return wrap;
  }

  items.forEach((item) => {
    const chip = createElement<HTMLSpanElement>('span', {
      padding: '4px 8px',
      borderRadius: '999px',
      background: '#eff6ff',
      color: '#1d4ed8',
      fontSize: '11px',
      fontWeight: '600'
    });
    chip.textContent = item;
    wrap.appendChild(chip);
  });

  return wrap;
};

const renderMetaRow = (labelText: string, valueText: string | null) => {
  if (!valueText) {
    return null;
  }

  const row = createElement<HTMLDivElement>('div', {
    display: 'grid',
    gridTemplateColumns: '110px 1fr',
    gap: '8px',
    alignItems: 'start'
  });

  const label = createElement<HTMLDivElement>('div', {
    color: '#64748b',
    fontSize: '12px',
    fontWeight: '700'
  });
  label.textContent = labelText;

  const value = createElement<HTMLDivElement>('div', {
    color: '#0f172a',
    fontSize: '12px',
    lineHeight: '1.45',
    wordBreak: 'break-word'
  });
  value.textContent = valueText;

  row.append(label, value);
  return row;
};

const renderTextBlock = (titleText: string, bodyText: string | null) => {
  const block = createElement<HTMLDivElement>('div', {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  });
  block.appendChild(createSectionTitle(titleText));

  const body = createElement<HTMLPreElement>('pre', {
    margin: '0',
    padding: '10px 12px',
    borderRadius: '12px',
    background: '#f8fafc',
    color: '#0f172a',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    fontSize: '12px',
    lineHeight: '1.5',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    maxHeight: '180px',
    overflowY: 'auto'
  });
  body.textContent = bodyText || 'No data';

  block.appendChild(body);
  return block;
};

const getStatusStyles = (status: ModalTraceStateGroup['status']) => {
  if (status === 'active') {
    return { background: '#dbeafe', color: '#1d4ed8' };
  }

  if (status === 'completed') {
    return { background: '#dcfce7', color: '#166534' };
  }

  return { background: '#e2e8f0', color: '#475569' };
};

const getToolStatusStyles = (status: ModalTraceToolCall['status']) => {
  if (status === 'completed') {
    return { background: '#dcfce7', color: '#166534' };
  }

  if (status === 'failed') {
    return { background: '#fee2e2', color: '#b91c1c' };
  }

  return { background: '#fef3c7', color: '#b45309' };
};

const renderToolCall = (toolCall: ModalTraceToolCall) => {
  const card = createElement<HTMLDivElement>('div', {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    padding: '12px',
    borderRadius: '14px',
    border: '1px solid rgba(148, 163, 184, 0.22)',
    background: '#ffffff'
  });

  const header = createElement<HTMLDivElement>('div', {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '10px',
    alignItems: 'flex-start'
  });

  const titleWrap = createElement<HTMLDivElement>('div', {
    minWidth: '0'
  });
  const title = createElement<HTMLDivElement>('div', {
    color: '#0f172a',
    fontSize: '13px',
    fontWeight: '700'
  });
  title.textContent = toolCall.toolName;

  const meta = createElement<HTMLDivElement>('div', {
    marginTop: '4px',
    color: '#64748b',
    fontSize: '11px'
  });
  meta.textContent = `Requested ${formatTime(toolCall.requestedAt)}`;

  const status = createElement<HTMLSpanElement>('span', {
    padding: '4px 8px',
    borderRadius: '999px',
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    ...getToolStatusStyles(toolCall.status)
  });
  status.textContent = toolCall.status;

  titleWrap.append(title, meta);
  header.append(titleWrap, status);

  card.append(
    header,
    renderTextBlock('Input', toolCall.inputText),
    renderTextBlock(
      toolCall.status === 'failed' ? 'Error' : 'Output',
      toolCall.outputText || (toolCall.status === 'running' ? 'Waiting for result...' : 'No data')
    )
  );

  return card;
};

const renderToolCalls = (toolCalls: ModalTraceToolCall[]) => {
  const wrap = createElement<HTMLDivElement>('div', {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  });

  if (toolCalls.length === 0) {
    const empty = createElement<HTMLDivElement>('div', {
      padding: '12px',
      borderRadius: '12px',
      background: '#ffffff',
      color: '#64748b',
      fontSize: '12px'
    });
    empty.textContent = 'No tool calls yet for this state.';
    wrap.appendChild(empty);
    return wrap;
  }

  toolCalls.forEach((toolCall) => wrap.appendChild(renderToolCall(toolCall)));
  return wrap;
};

export const renderTraceGroup = (group: ModalTraceStateGroup) => {
  const card = createElement<HTMLDivElement>('section', {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '14px',
    borderRadius: '16px',
    border: group.status === 'active'
      ? '1px solid rgba(37, 99, 235, 0.28)'
      : '1px solid rgba(148, 163, 184, 0.25)',
    background: group.status === 'active'
      ? 'linear-gradient(180deg, rgba(239, 246, 255, 0.96), rgba(255, 255, 255, 0.98))'
      : '#ffffff'
  });

  const header = createElement<HTMLDivElement>('div', {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '10px',
    alignItems: 'flex-start'
  });

  const titleWrap = createElement<HTMLDivElement>('div', { minWidth: '0' });
  const title = createElement<HTMLHeadingElement>('h2', {
    margin: '0',
    color: '#0f172a',
    fontSize: '14px',
    lineHeight: '1.3'
  });
  title.textContent = group.stateId;

  const meta = createElement<HTMLDivElement>('div', {
    marginTop: '4px',
    color: '#64748b',
    fontSize: '11px'
  });
  meta.textContent = group.startedAt
    ? `Connected ${formatTime(group.startedAt)}`
    : `Updated ${formatTime(group.lastUpdatedAt)}`;

  const status = createElement<HTMLSpanElement>('span', {
    padding: '4px 8px',
    borderRadius: '999px',
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    ...getStatusStyles(group.status)
  });
  status.textContent = group.status;

  const metaList = createElement<HTMLDivElement>('div', {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  });

  const rows = [
    renderMetaRow('Source', group.activationSource),
    renderMetaRow('Reason', group.activationReason),
    renderMetaRow('Version', group.instructionVersion)
  ].filter((row): row is HTMLDivElement => Boolean(row));
  rows.forEach((row) => metaList.appendChild(row));

  titleWrap.append(title, meta);
  header.append(titleWrap, status);
  card.append(header);

  if (rows.length > 0) {
    card.append(metaList);
  }

  card.append(
    createSectionTitle('Configured Tools'),
    renderChips(group.configuredToolNames, 'No configured tools'),
    createSectionTitle('Transition Tools'),
    renderChips(group.transitionToolNames, 'No transition tools'),
    renderTextBlock('Instructions', group.instructions)
  );

  if (group.thinkingConfigText) {
    card.append(renderTextBlock('Thinking Config', group.thinkingConfigText));
  }

  card.append(createSectionTitle('Tool Calls'), renderToolCalls(group.toolCalls));
  return card;
};
