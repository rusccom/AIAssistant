import { ENABLE_REALTIME_TRACE } from '../../shared/realtime-trace.config';
import { resolveEmbedBootstrap } from './features/embed/embed-config';
import { createWidgetShell, WidgetShell } from './features/embed/widget-shell';
import { ensureRealtimeDebugPanel } from './features/realtime/debug/realtime-debug-panel';
import { fetchSessionConfig } from './features/realtime/shared/session-config';
import {
  createTraceId,
  logWidgetError,
  logWidgetEvent
} from './features/realtime/shared/realtime-logger';
import { startRealtimeRuntime } from './features/realtime/shared/runtime-factory';
import {
  ActiveRealtimeSession,
  WidgetConfig
} from './features/realtime/shared/realtime-session.types';

type AppState = 'idle' | 'connecting' | 'connected';

interface WidgetInstance {
  appState: AppState;
  config: WidgetConfig;
  runtime: ActiveRealtimeSession | null;
  shell: WidgetShell;
}

interface AIWidgetApi {
  destroy(message?: string): void;
}

const updateButton = (button: HTMLButtonElement, label: string, color: string) => {
  button.textContent = label;
  button.style.background = color;
};

const setIdleState = (instance: WidgetInstance, message: string) => {
  instance.appState = 'idle';
  instance.runtime = null;

  if (instance.shell.isDestroyed) {
    return;
  }

  instance.shell.statusElement.textContent = message;
  instance.shell.talkButton.disabled = false;
  updateButton(instance.shell.talkButton, 'Start Talking', '#2563eb');
};

const stopSession = (instance: WidgetInstance, message = 'Conversation ended.') => {
  if (instance.appState !== 'idle') {
    logWidgetEvent(
      'session',
      'stop_requested',
      { appState: instance.appState, message },
      { traceId: instance.config.traceId }
    );
  }

  instance.runtime?.close();
  instance.config.traceId = undefined;
  setIdleState(instance, message);
};

const connectSession = async (instance: WidgetInstance) => {
  const sessionConfig = await fetchSessionConfig(instance.config);
  if (instance.appState !== 'connecting' || instance.shell.isDestroyed) {
    return;
  }

  const runtime = await startRealtimeRuntime({
    config: instance.config,
    sessionConfig,
    onDisconnect: (message) => stopSession(instance, message)
  });

  if (instance.appState !== 'connecting' || instance.shell.isDestroyed) {
    runtime.close();
    return;
  }

  instance.runtime = runtime;
  instance.appState = 'connected';
  instance.shell.statusElement.textContent = 'Connected. You can speak now.';
  instance.shell.talkButton.disabled = false;
  updateButton(instance.shell.talkButton, 'Stop Talking', '#dc2626');
  logWidgetEvent(
    'session',
    'connected',
    {
      currentStateId: sessionConfig.currentStateId || null,
      transport: sessionConfig.transport,
      voice: sessionConfig.voice
    },
    {
      traceId: instance.config.traceId,
      provider: sessionConfig.provider,
      model: sessionConfig.model
    }
  );
};

const startSession = async (instance: WidgetInstance) => {
  if (instance.appState !== 'idle' || instance.shell.isDestroyed) {
    return;
  }

  instance.config.traceId = ENABLE_REALTIME_TRACE ? createTraceId() : undefined;
  instance.appState = 'connecting';
  instance.shell.statusElement.textContent = 'Connecting...';
  instance.shell.talkButton.disabled = true;
  updateButton(instance.shell.talkButton, 'Connecting...', '#1d4ed8');
  logWidgetEvent(
    'session',
    'start_requested',
    { hostname: instance.config.hostname },
    { traceId: instance.config.traceId }
  );

  try {
    await connectSession(instance);
  } catch (error) {
    if (instance.shell.isDestroyed) {
      return;
    }

    logWidgetError(
      'session',
      'start_failed',
      { message: error instanceof Error ? error.message : String(error) },
      { traceId: instance.config.traceId }
    );
    console.error('Error starting session:', error);
    stopSession(instance, 'Connection failed. Please try again.');
  }
};

const normalizeRequiredValue = (value: string | undefined, label: string) => {
  const normalizedValue = value?.trim();
  if (!normalizedValue) {
    throw new Error(`${label} is required.`);
  }

  return normalizedValue;
};

const normalizeConfig = (config: WidgetConfig): WidgetConfig => {
  return {
    apiHost: config.apiHost || window.location.origin,
    embedToken: normalizeRequiredValue(config.embedToken, 'Widget embed token'),
    hostname: normalizeRequiredValue(config.hostname, 'Widget hostname'),
    traceId: config.traceId
  };
};

const initWidget = (inputConfig: WidgetConfig) => {
  const config = normalizeConfig(inputConfig);
  ensureRealtimeDebugPanel();

  let instance!: WidgetInstance;
  const shell = createWidgetShell({
    hostname: config.hostname,
    onRequestClose: () => {
      if (instance) {
        destroyWidget('Widget closed.');
      }
    }
  });

  instance = {
    runtime: null,
    appState: 'idle',
    config,
    shell
  };

  shell.talkButton.addEventListener('click', () => {
    const activeInstance = instance;
    if (activeInstance.appState === 'idle') {
      void startSession(activeInstance);
      return;
    }

    stopSession(activeInstance);
  });

  const hostInfo = config.apiHost ? `Custom: ${config.apiHost}` : 'Auto-detected';
  const domainInfo = config.hostname;
  shell.statusElement.textContent = `Ready for ${domainInfo} (${hostInfo}). Click to start!`;
  updateButton(shell.talkButton, 'Start Talking', '#2563eb');
  logWidgetEvent('widget', 'initialized', { domainInfo, hostInfo });

  return instance;
};

let activeInstance: WidgetInstance | null = null;

const destroyWidget = (message = 'Conversation ended.') => {
  if (!activeInstance) {
    return;
  }

  const currentInstance = activeInstance;
  activeInstance = null;
  stopSession(currentInstance, message);
  currentInstance.shell.destroy();
};

const mountWidget = (config: WidgetConfig) => {
  destroyWidget('Widget reloaded.');
  activeInstance = initWidget(config);
};

const AIWidget: AIWidgetApi = {
  destroy: destroyWidget
};

const globalWindow = window as Window & { AIWidget?: AIWidgetApi };

globalWindow.AIWidget = AIWidget;

const initializeWidget = () => {
  const bootstrap = resolveEmbedBootstrap();
  if (!bootstrap) {
    return;
  }

  mountWidget(bootstrap);
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeWidget);
} else {
  initializeWidget();
}
