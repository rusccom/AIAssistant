import { ENABLE_REALTIME_TRACE } from '../../../../../shared/realtime-trace.config';
import {
  captureExternalRealtimeLog,
  sanitizeForLog
} from '../shared/realtime-logger';

type ConsoleMethodName = 'error' | 'info' | 'warn';

const SCRIPT_HINTS = ['widget.js', 'widget/src'];
let installed = false;

const getCallerFrames = (stack: string) => {
  return stack
    .split('\n')
    .slice(2)
    .map((line) => line.trim())
    .filter(Boolean);
};

const framesLookLikeWidget = (frames: string[]) => {
  if (frames.length === 0) {
    return false;
  }

  return frames.some((frame) => SCRIPT_HINTS.some((hint) => frame.includes(hint)));
};

const textLooksLikeWidget = (value?: string) => {
  if (!value) {
    return false;
  }

  return SCRIPT_HINTS.some((hint) => value.includes(hint));
};

const stackLooksLikeWidget = (stack?: string) => {
  if (!stack) {
    return false;
  }

  return framesLookLikeWidget(getCallerFrames(stack));
};

const normalizeConsoleDetails = (args: unknown[], stack: string) => ({
  args: args.map((item) => sanitizeForLog(item)),
  stack
});

const installConsoleBridge = () => {
  const methods: ConsoleMethodName[] = ['info', 'warn', 'error'];

  methods.forEach((methodName) => {
    const original = console[methodName].bind(console);

    console[methodName] = (...args: unknown[]) => {
      const stack = new Error().stack || '';
      if (!stackLooksLikeWidget(stack)) {
        original(...args);
        return;
      }

      captureExternalRealtimeLog(methodName, 'console', methodName, normalizeConsoleDetails(args, stack));
    };
  });
};

const installWindowErrorBridge = () => {
  window.addEventListener('error', (event) => {
    const stack = event.error instanceof Error ? event.error.stack || '' : '';
    const source = event.filename || '';
    if (!stackLooksLikeWidget(stack) && !textLooksLikeWidget(source)) {
      return;
    }

    if (event.cancelable) {
      event.preventDefault();
    }

    captureExternalRealtimeLog('error', 'window', 'error', {
      column: event.colno || null,
      filename: source || null,
      line: event.lineno || null,
      message: event.message || 'Unknown window error',
      stack: stack || null
    });
  });
};

const installUnhandledRejectionBridge = () => {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const stack = reason instanceof Error ? reason.stack || '' : '';
    if (!stackLooksLikeWidget(stack)) {
      return;
    }

    event.preventDefault();

    captureExternalRealtimeLog('error', 'window', 'unhandledrejection', {
      reason: sanitizeForLog(reason),
      stack: stack || null
    });
  });
};

export const ensureWidgetConsoleBridge = () => {
  if (!ENABLE_REALTIME_TRACE || installed) {
    return;
  }

  installed = true;
  installConsoleBridge();
  installWindowErrorBridge();
  installUnhandledRejectionBridge();
};
