import { RealtimeLogEntry } from '../shared/realtime-logger';
import {
  extractStateConfig,
  formatPayloadText,
  getStateEntryId,
  getStateId,
  getString,
  getToolName,
  ModalTraceStateGroup,
  ModalTraceToolCall,
  toDetails
} from './modal-trace-grouping.helpers';

interface GroupState {
  activeGroupId: string | null;
  groups: Map<string, ModalTraceStateGroup>;
  latestGroupIdByStateId: Map<string, string>;
  order: string[];
  pendingToolCalls: Map<string, string[]>;
  toolCallSequence: number;
}

const createGroup = (
  groupId: string,
  stateId: string,
  timestamp: string
): ModalTraceStateGroup => ({
  activationReason: null,
  activationSource: null,
  configuredToolNames: [],
  endedAt: null,
  id: groupId,
  instructionVersion: null,
  instructions: null,
  lastUpdatedAt: timestamp,
  startedAt: null,
  stateId,
  status: 'pending',
  thinkingConfigText: null,
  toolCalls: [],
  transitionToolNames: []
});

const ensureGroup = (
  state: GroupState,
  groupId: string,
  stateId: string,
  timestamp: string
) => {
  const existingGroup = state.groups.get(groupId);
  if (existingGroup) {
    return existingGroup;
  }

  const group = createGroup(groupId, stateId, timestamp);
  state.groups.set(groupId, group);
  state.latestGroupIdByStateId.set(stateId, groupId);
  state.order.push(groupId);
  return group;
};

const resolveGroupId = (state: GroupState, details: Record<string, unknown>) => {
  const stateEntryId = getStateEntryId(details);
  if (stateEntryId) {
    return stateEntryId;
  }

  const stateId = getStateId(details);
  if (stateId) {
    return state.latestGroupIdByStateId.get(stateId) || `state:${stateId}`;
  }

  return state.activeGroupId;
};

const updateStateConfig = (
  group: ModalTraceStateGroup,
  details: Record<string, unknown>
) => {
  const config = extractStateConfig(details);
  group.activationReason = getString(details.reason) || group.activationReason;
  group.activationSource = getString(details.source) || group.activationSource;
  group.configuredToolNames = config.configuredToolNames.length
    ? config.configuredToolNames
    : group.configuredToolNames;
  group.instructionVersion = config.instructionVersion || group.instructionVersion;
  group.instructions = config.instructions || group.instructions;
  group.thinkingConfigText = config.thinkingConfigText || group.thinkingConfigText;
  group.transitionToolNames = config.transitionToolNames.length
    ? config.transitionToolNames
    : group.transitionToolNames;
};

const createToolCall = (
  state: GroupState,
  entry: RealtimeLogEntry,
  toolName: string,
  inputText: string | null
): ModalTraceToolCall => ({
  completedAt: null,
  id: `tool-call-${++state.toolCallSequence}`,
  inputText,
  outputText: null,
  requestedAt: entry.timestamp,
  status: 'running',
  toolName
});

const getToolQueueKey = (groupId: string, toolName: string) => {
  return `${groupId}:${toolName}`;
};

const addPendingToolCall = (
  state: GroupState,
  groupId: string,
  toolCall: ModalTraceToolCall
) => {
  const queueKey = getToolQueueKey(groupId, toolCall.toolName);
  const queue = state.pendingToolCalls.get(queueKey) || [];
  state.pendingToolCalls.set(queueKey, [...queue, toolCall.id]);
};

const resolvePendingToolCallId = (
  state: GroupState,
  groupId: string,
  toolName: string
) => {
  const queueKey = getToolQueueKey(groupId, toolName);
  const queue = state.pendingToolCalls.get(queueKey) || [];
  const [toolCallId, ...rest] = queue;

  if (!toolCallId) {
    return null;
  }

  if (rest.length === 0) {
    state.pendingToolCalls.delete(queueKey);
  } else {
    state.pendingToolCalls.set(queueKey, rest);
  }

  return toolCallId;
};

const findToolCall = (group: ModalTraceStateGroup, toolCallId: string | null) => {
  if (!toolCallId) {
    return null;
  }

  return group.toolCalls.find((toolCall) => toolCall.id === toolCallId) || null;
};

const ensureToolCall = (
  state: GroupState,
  group: ModalTraceStateGroup,
  entry: RealtimeLogEntry,
  toolName: string
) => {
  const toolCallId = resolvePendingToolCallId(state, group.id, toolName);
  const existingToolCall = findToolCall(group, toolCallId);
  if (existingToolCall) {
    return existingToolCall;
  }

  const toolCall = createToolCall(state, entry, toolName, null);
  group.toolCalls.push(toolCall);
  return toolCall;
};

const recordStateEntered = (
  state: GroupState,
  entry: RealtimeLogEntry,
  details: Record<string, unknown>
) => {
  const groupId = resolveGroupId(state, details);
  const stateId = getStateId(details);
  if (!groupId || !stateId) {
    return;
  }

  const group = ensureGroup(state, groupId, stateId, entry.timestamp);
  group.startedAt ||= entry.timestamp;
  group.status = 'active';
  group.lastUpdatedAt = entry.timestamp;
  state.activeGroupId = group.id;
  updateStateConfig(group, details);
};

const recordStateExited = (
  state: GroupState,
  entry: RealtimeLogEntry,
  details: Record<string, unknown>
) => {
  const groupId = resolveGroupId(state, details);
  const stateId = getStateId(details);
  if (!groupId || !stateId) {
    return;
  }

  const group = ensureGroup(state, groupId, stateId, entry.timestamp);
  group.endedAt = entry.timestamp;
  group.status = 'completed';
  group.lastUpdatedAt = entry.timestamp;
  if (state.activeGroupId === group.id) {
    state.activeGroupId = null;
  }
};

const recordToolStarted = (
  state: GroupState,
  entry: RealtimeLogEntry,
  details: Record<string, unknown>
) => {
  const groupId = resolveGroupId(state, details);
  const stateId = getStateId(details);
  const toolName = getToolName(details);
  if (!groupId || !stateId || !toolName) {
    return;
  }

  const group = ensureGroup(state, groupId, stateId, entry.timestamp);
  const toolCall = createToolCall(
    state,
    entry,
    toolName,
    formatPayloadText(details.params)
  );

  group.toolCalls.push(toolCall);
  group.lastUpdatedAt = entry.timestamp;
  addPendingToolCall(state, group.id, toolCall);
};

const updateToolResult = (
  state: GroupState,
  entry: RealtimeLogEntry,
  details: Record<string, unknown>,
  status: 'completed' | 'failed'
) => {
  const groupId = resolveGroupId(state, details);
  const stateId = getStateId(details);
  const toolName = getToolName(details);
  if (!groupId || !stateId || !toolName) {
    return;
  }

  const group = ensureGroup(state, groupId, stateId, entry.timestamp);
  const toolCall = ensureToolCall(state, group, entry, toolName);
  toolCall.completedAt = entry.timestamp;
  toolCall.outputText = status === 'completed'
    ? formatPayloadText(details.result)
    : getString(details.message) || formatPayloadText(details);
  toolCall.status = status;
  group.lastUpdatedAt = entry.timestamp;
};

const recordEntry = (state: GroupState, entry: RealtimeLogEntry) => {
  const details = toDetails(entry);

  if (entry.scope === 'state' && entry.event === 'entered') {
    recordStateEntered(state, entry, details);
    return;
  }

  if (entry.scope === 'state' && entry.event === 'exited') {
    recordStateExited(state, entry, details);
    return;
  }

  if (entry.scope === 'tool' && entry.event === 'execute_started') {
    recordToolStarted(state, entry, details);
    return;
  }

  if (entry.scope === 'tool' && entry.event === 'execute_finished') {
    updateToolResult(state, entry, details, 'completed');
    return;
  }

  if (entry.scope === 'tool' && entry.event === 'execute_failed') {
    updateToolResult(state, entry, details, 'failed');
  }
};

const createGroupState = (): GroupState => ({
  activeGroupId: null,
  groups: new Map(),
  latestGroupIdByStateId: new Map(),
  order: [],
  pendingToolCalls: new Map(),
  toolCallSequence: 0
});

export const buildModalTraceGroups = (
  entries: RealtimeLogEntry[],
  activeTraceId: string | null
) => {
  const state = createGroupState();
  const filteredEntries = activeTraceId
    ? entries.filter((entry) => entry.traceId === activeTraceId)
    : entries;

  filteredEntries.forEach((entry) => recordEntry(state, entry));

  return state.order
    .map((groupId) => state.groups.get(groupId))
    .filter((group): group is ModalTraceStateGroup => Boolean(group));
};
