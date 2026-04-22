import { RealtimeLogEntry } from '../shared/realtime-logger';

export type ModalTraceStatus = 'active' | 'completed' | 'pending';
export type ModalTraceToolCallStatus = 'completed' | 'failed' | 'running';

export interface ModalTraceToolCall {
  completedAt: string | null;
  id: string;
  inputText: string | null;
  outputText: string | null;
  requestedAt: string;
  status: ModalTraceToolCallStatus;
  toolName: string;
}

export interface ModalTraceStateGroup {
  activationReason: string | null;
  activationSource: string | null;
  configuredToolNames: string[];
  endedAt: string | null;
  id: string;
  instructionVersion: string | null;
  instructions: string | null;
  lastUpdatedAt: string;
  startedAt: string | null;
  stateId: string;
  status: ModalTraceStatus;
  thinkingConfigText: string | null;
  toolCalls: ModalTraceToolCall[];
  transitionToolNames: string[];
}

export const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

export const toDetails = (entry: RealtimeLogEntry) => {
  return isObject(entry.details) ? entry.details : {};
};

export const getString = (value: unknown) => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const getNestedString = (value: unknown, key: string) => {
  if (!isObject(value)) {
    return null;
  }

  return getString(value[key]);
};

export const getStringArray = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => getString(item))
    .filter((item): item is string => Boolean(item));
};

export const getStateEntryId = (details: Record<string, unknown>) => {
  return getString(details.stateEntryId)
    || getNestedString(details.stateTrace, 'entryId')
    || getString(details.toStateEntryId)
    || null;
};

export const getStateId = (details: Record<string, unknown>) => {
  return getString(details.stateId)
    || getNestedString(details.stateTrace, 'stateId')
    || getString(details.toStateId)
    || null;
};

export const getToolName = (details: Record<string, unknown>) => {
  return getString(details.toolName) || getString(details.name) || null;
};

export const formatPayloadText = (value: unknown) => {
  if (value == null) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

export const extractStateConfig = (details: Record<string, unknown>) => {
  const state = isObject(details.state) ? details.state : {};
  const configuredToolSource = Array.isArray(state.tools)
    ? state.tools
    : state.toolNames;
  return {
    configuredToolNames: getStringArray(configuredToolSource),
    instructionVersion: getString(state.instructionVersion),
    instructions: getString(state.instructions),
    thinkingConfigText: formatPayloadText(state.geminiThinkingConfig),
    transitionToolNames: getStringArray(state.transitionToolNames)
  };
};
