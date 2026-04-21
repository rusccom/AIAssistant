import { logError, logInfo } from '../../../utils/logger';
import { ConversationStateMachineBootstrap } from '../../conversation-state/state-machine.types';
import { BotToolDefinition } from './realtime.types';
import { ENABLE_REALTIME_TRACE } from '../../../config/realtime-trace.config';

const MAX_ARRAY_ITEMS = 10;
const MAX_DEPTH = 4;
const MAX_STRING_LENGTH = 400;

const truncateString = (value: string) => {
  if (value.length <= MAX_STRING_LENGTH) {
    return value;
  }

  return `${value.slice(0, MAX_STRING_LENGTH)}...`;
};

const sanitizeArray = (value: unknown[], depth: number) => {
  const items = value
    .slice(0, MAX_ARRAY_ITEMS)
    .map((item) => sanitizeRealtimeLogValue(item, depth + 1));

  if (value.length > MAX_ARRAY_ITEMS) {
    items.push(`[${value.length - MAX_ARRAY_ITEMS} more items]`);
  }

  return items;
};

const sanitizeObject = (value: Record<string, unknown>, depth: number) => {
  const entries = Object.entries(value).map(([key, item]) => {
    return [key, sanitizeRealtimeLogValue(item, depth + 1)];
  });

  return Object.fromEntries(entries);
};

export const sanitizeRealtimeLogValue = (value: unknown, depth = 0): unknown => {
  if (typeof value === 'string') return truncateString(value);
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value;
  if (value == null) return value;
  if (depth >= MAX_DEPTH) return '[MaxDepth]';
  if (Array.isArray(value)) return sanitizeArray(value, depth);
  if (typeof value === 'object') return sanitizeObject(value as Record<string, unknown>, depth);
  return String(value);
};

export const summarizeRealtimeTools = (tools: BotToolDefinition[]) => {
  return tools.map((tool) => tool.function.name);
};

export const summarizeRealtimeStateMachine = (
  stateMachine: ConversationStateMachineBootstrap
) => {
  return stateMachine.states.map((state) => ({
    stateId: state.id,
    instructionVersion: state.instructionVersion,
    instructionsLength: state.instructionsLength,
    toolNames: summarizeRealtimeTools(state.tools),
    transitionIds: state.transitions.map((transition) => transition.next_step),
    hasThinkingConfig: Boolean(state.geminiThinkingConfig)
  }));
};

export const logRealtimeInfo = (event: string, details?: unknown) => {
  if (!ENABLE_REALTIME_TRACE) {
    return;
  }

  logInfo('REALTIME', event, sanitizeRealtimeLogValue(details));
};

export const logRealtimeError = (event: string, details?: unknown) => {
  if (!ENABLE_REALTIME_TRACE) {
    return;
  }

  logError('REALTIME', event, sanitizeRealtimeLogValue(details));
};
