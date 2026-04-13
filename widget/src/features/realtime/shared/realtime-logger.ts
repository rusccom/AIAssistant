import type {
  SessionStateDefinition,
  SessionStateMachine
} from './realtime-session.types';
import { ENABLE_REALTIME_TRACE } from '../../../../../shared/realtime-trace.config';

type RealtimeLogLevel = 'error' | 'info' | 'warn';

interface RealtimeLoggerContext {
  model?: string;
  provider?: string;
  traceId?: string;
  transport?: string;
}

export interface RealtimeLogger {
  child(context: Partial<RealtimeLoggerContext>): RealtimeLogger;
  error(scope: string, event: string, details?: unknown): void;
  info(scope: string, event: string, details?: unknown): void;
  warn(scope: string, event: string, details?: unknown): void;
}

const LOG_PREFIX = '[RealtimeTrace]';
const MAX_ARRAY_ITEMS = 10;
const MAX_DEPTH = 4;
const MAX_STRING_LENGTH = 400;

const getConsoleMethod = (level: RealtimeLogLevel) => {
  if (level === 'error') return console.error;
  if (level === 'warn') return console.warn;
  return console.info;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const truncateString = (value: string) => {
  if (value.length <= MAX_STRING_LENGTH) {
    return value;
  }

  return `${value.slice(0, MAX_STRING_LENGTH)}...`;
};

const sanitizeArray = (value: unknown[], depth: number) => {
  const sanitized = value
    .slice(0, MAX_ARRAY_ITEMS)
    .map((item) => sanitizeForLog(item, depth + 1));

  if (value.length > MAX_ARRAY_ITEMS) {
    sanitized.push(`[${value.length - MAX_ARRAY_ITEMS} more items]`);
  }

  return sanitized;
};

const sanitizeObject = (value: Record<string, unknown>, depth: number) => {
  const entries = Object.entries(value).map(([key, item]) => {
    return [key, sanitizeForLog(item, depth + 1)];
  });

  return Object.fromEntries(entries);
};

export const sanitizeForLog = (value: unknown, depth = 0): unknown => {
  if (typeof value === 'string') return truncateString(value);
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value;
  if (value == null) return value;
  if (depth >= MAX_DEPTH) return '[MaxDepth]';
  if (Array.isArray(value)) return sanitizeArray(value, depth);
  if (isPlainObject(value)) return sanitizeObject(value, depth);
  return String(value);
};

const buildPayload = (
  context: RealtimeLoggerContext,
  scope: string,
  event: string,
  details?: unknown
) => {
  const payload: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    scope,
    event,
    ...context
  };

  if (details !== undefined) {
    payload.details = sanitizeForLog(details);
  }

  return payload;
};

const writeLog = (
  level: RealtimeLogLevel,
  context: RealtimeLoggerContext,
  scope: string,
  event: string,
  details?: unknown
) => {
  if (!ENABLE_REALTIME_TRACE) {
    return;
  }

  getConsoleMethod(level)(LOG_PREFIX, buildPayload(context, scope, event, details));
};

export const createRealtimeLogger = (
  context: RealtimeLoggerContext
): RealtimeLogger => {
  const log = (level: RealtimeLogLevel) => {
    return (scope: string, event: string, details?: unknown) => {
      writeLog(level, context, scope, event, details);
    };
  };

  return {
    child: (nextContext) => createRealtimeLogger({ ...context, ...nextContext }),
    info: log('info'),
    warn: log('warn'),
    error: log('error')
  };
};

const createRandomTraceSuffix = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().slice(0, 8);
  }

  return Math.random().toString(36).slice(2, 10);
};

export const createTraceId = () => {
  return `rt-${Date.now()}-${createRandomTraceSuffix()}`;
};

const getToolNames = (state: SessionStateDefinition) => {
  return state.tools.map((tool) => tool.function.name);
};

const getTransitionIds = (state: SessionStateDefinition) => {
  return state.transitions.map((transition) => transition.next_step);
};

export const summarizeState = (state: SessionStateDefinition) => {
  return {
    stateId: state.id,
    instructionVersion: state.instructionVersion || null,
    instructionsLength: state.instructionsLength ?? state.instructions.length,
    toolNames: getToolNames(state),
    transitionIds: getTransitionIds(state),
    hasThinkingConfig: Boolean(state.geminiThinkingConfig)
  };
};

export const summarizeStateMachine = (stateMachine: SessionStateMachine) => {
  return stateMachine.states.map(summarizeState);
};

export const summarizeResult = (value: unknown) => {
  return sanitizeForLog(value);
};

export const parseSerializedJson = (value?: string) => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

export const logWidgetEvent = (
  scope: string,
  event: string,
  details?: unknown,
  context: RealtimeLoggerContext = {}
) => {
  createRealtimeLogger(context).info(scope, event, details);
};

export const logWidgetError = (
  scope: string,
  event: string,
  details?: unknown,
  context: RealtimeLoggerContext = {}
) => {
  createRealtimeLogger(context).error(scope, event, details);
};
