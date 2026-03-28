import './style.css';
import { fetchSessionConfig } from './features/realtime/shared/session-config';
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
  statusElement: HTMLParagraphElement | null;
  talkButton: HTMLButtonElement | null;
}

const createWidgetHTML = (containerId: string) => {
  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`Container element with ID '${containerId}' not found`);
  }

  container.innerHTML = `
    <div class="voice-widget" style="
      text-align: center;
      padding: 2rem;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    ">
      <h1 style="margin: 0 0 1rem 0; color: #1f2937;">Voice Assistant</h1>
      <p id="status" style="margin: 1.5rem 0; color: #6b7280;">Click the button to start the conversation.</p>
      <button id="talk-button" style="
        background: #3b82f6;
        color: white;
        border: none;
        padding: 1rem 2rem;
        font-size: 1rem;
        font-weight: 600;
        border-radius: 0.75rem;
        cursor: pointer;
        transition: all 0.2s ease;
      ">Start Talking</button>
    </div>
  `;
};

const setIdleState = (instance: WidgetInstance, message: string) => {
  if (!instance.statusElement || !instance.talkButton) {
    return;
  }

  instance.appState = 'idle';
  instance.statusElement.textContent = message;
  instance.talkButton.textContent = 'Start Talking';
  instance.talkButton.classList.remove('active');
  instance.talkButton.disabled = false;
  instance.talkButton.style.background = '#3b82f6';
};

const stopSession = (instance: WidgetInstance, message = 'Conversation ended.') => {
  if (instance.appState === 'idle') {
    return;
  }

  instance.runtime?.close();
  instance.runtime = null;
  setIdleState(instance, message);
};

const startSession = async (instance: WidgetInstance) => {
  if (instance.appState !== 'idle' || !instance.statusElement || !instance.talkButton) {
    return;
  }

  instance.appState = 'connecting';
  instance.statusElement.textContent = 'Connecting...';
  instance.talkButton.textContent = 'Connecting...';
  instance.talkButton.disabled = true;

  try {
    const sessionConfig = await fetchSessionConfig(instance.config);
    instance.runtime = await startRealtimeRuntime({
      config: instance.config,
      sessionConfig,
      onDisconnect: (message) => stopSession(instance, message)
    });

    instance.appState = 'connected';
    instance.statusElement.textContent = 'Connected. You can speak now.';
    instance.talkButton.textContent = 'Stop Talking';
    instance.talkButton.classList.add('active');
    instance.talkButton.disabled = false;
    instance.talkButton.style.background = '#dc2626';
  } catch (error) {
    console.error('Error starting session:', error);
    stopSession(instance, 'Connection failed. Please try again.');
  }
};

const createCenteredContainer = (id: string) => {
  const container = document.createElement('div');
  container.id = id;
  container.style.cssText = `
    position: fixed;
    top: ${window.innerHeight / 2}px;
    left: ${window.innerWidth / 2}px;
    transform: translate(-50%, -50%);
    z-index: 10000;
    max-width: 320px;
    width: 90%;
  `;

  document.body.appendChild(container);
  return container;
};

const addCloseButton = (container: HTMLElement, instance: WidgetInstance) => {
  const closeButton = document.createElement('button');
  closeButton.innerHTML = 'Г—';
  closeButton.style.cssText = `
    position: absolute;
    top: -10px;
    right: -10px;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: none;
    background: #dc2626;
    color: white;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  `;

  closeButton.onclick = () => {
    stopSession(instance);
    container.remove();
  };

  container.appendChild(closeButton);
};

const initWidget = (config: WidgetConfig) => {
  createWidgetHTML(config.container);
  const container = document.getElementById(config.container);
  const statusElement = container?.querySelector('#status') as HTMLParagraphElement | null;
  const talkButton = container?.querySelector('#talk-button') as HTMLButtonElement | null;

  if (!statusElement || !talkButton) {
    throw new Error('Failed to create widget DOM elements');
  }

  const instance: WidgetInstance = {
    runtime: null,
    appState: 'idle',
    config,
    statusElement,
    talkButton
  };

  talkButton.addEventListener('click', () => {
    if (instance.appState === 'idle') {
      void startSession(instance);
      return;
    }

    stopSession(instance);
  });

  const hostInfo = config.apiHost ? `Custom: ${config.apiHost}` : 'Auto-detected';
  const domainInfo = config.hostname || window.location.hostname;
  statusElement.textContent = `Ready for ${domainInfo} (${hostInfo}). Click to start!`;

  return instance;
};

const AIWidget = {
  init: (config: WidgetConfig) => {
    const instance = initWidget(config);
    AIWidget.instance = instance;
    return instance;
  },
  instance: null as WidgetInstance | null
};

 (window as any).AIWidget = AIWidget;

const initializeWidget = () => {
  const scripts = Array.from(document.getElementsByTagName('script'));
  const currentScript = scripts.find((script) => script.src.includes('widget.js'));
  if (!currentScript) {
    return;
  }

  const containerId = `ai-widget-${Date.now()}`;
  const container = createCenteredContainer(containerId);
  const customHost = currentScript.getAttribute('sethost');
  const config: WidgetConfig = {
    container: containerId,
    hostname: customHost || window.location.hostname
  };

  if (customHost) {
    const scriptUrl = new URL(currentScript.src);
    config.apiHost = `${scriptUrl.protocol}//${scriptUrl.host}`;
  }

  const instance = initWidget(config);
  AIWidget.instance = instance;
  addCloseButton(container, instance);
};

const initialize = () => {
  initializeWidget();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
