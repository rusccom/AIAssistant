import { RealtimeAgent, RealtimeSession, OpenAIRealtimeWebRTC, tool } from '@openai/agents-realtime';
import { z } from 'zod';
import './style.css';

// Widget configuration interface
interface WidgetConfig {
  container: string;
  hostname?: string;
  apiHost?: string;
}

// Widget state
interface WidgetInstance {
  session: RealtimeSession | null;
  appState: 'idle' | 'connecting' | 'connected';
  statusElement: HTMLParagraphElement | null;
  talkButton: HTMLButtonElement | null;
  config: WidgetConfig;
  containerElement: HTMLElement | null;
}

// Universal execute function for all tools
const createUniversalExecute = (config: WidgetConfig) => {
  return async (params: any, toolName: string) => {
    try {
      // Определяем API host
      let apiHost = '';
      if (config.apiHost) {
        // Использовать кастомный хост
        apiHost = config.apiHost;
        console.log(`🔧 Using custom API host: ${config.apiHost}`);
      } else {
        // Автоопределение хоста
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        apiHost = isLocalhost ? 'http://localhost:3000' : `${window.location.protocol}//${window.location.host}`;
        console.log(`🔧 Auto-detected API host: ${apiHost}`);
      }

      // Добавляем hostname в параметры
      const enhancedParams = {
        ...params,
        hostname: config.hostname || window.location.hostname
      };

      console.log(`🚀 Widget executing function: ${toolName}`, enhancedParams);

      const response = await fetch(`${apiHost}/api/bot-execute/${toolName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enhancedParams),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to execute ${toolName}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      console.log(`📥 Widget received result from ${toolName}:`, result.success ? '✅ Success' : '❌ Failed');
      
      if (result.success) {
        return result.response;
      } else {
        console.error(`Function ${toolName} failed:`, result.error);
        return result.response || `Sorry, there was an error executing ${toolName}.`;
      }
    } catch (error) {
      console.error(`❌ Widget error executing ${toolName}:`, error);
      return `Sorry, there was an error executing ${toolName}.`;
    }
  };
};

// Create HTML structure for widget
const createWidgetHTML = (containerId: string): void => {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`❌ Container element with ID '${containerId}' not found`);
    return;
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

// Session Management
const createStartSession = (instance: WidgetInstance) => {
  const universalExecute = createUniversalExecute(instance.config);
  
  return async () => {
    if (instance.appState !== 'idle') return;
    if (!instance.statusElement || !instance.talkButton) return;

    instance.appState = 'connecting';
    instance.statusElement.textContent = 'Connecting...';
    instance.talkButton.textContent = 'Connecting...';
    instance.talkButton.disabled = true;

    try {
      // Определяем API host для токена
      let apiHost = '';
      if (instance.config.apiHost) {
        apiHost = instance.config.apiHost;
      } else {
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        apiHost = isLocalhost ? 'http://localhost:3000' : `${window.location.protocol}//${window.location.host}`;
      }

      // 0. Fetch token, config, and tools
      const response = await fetch(`${apiHost}/api/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostname: instance.config.hostname || window.location.hostname }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch token and config: ${response.statusText}`);
      }

      const { token: ephemeralApiKey, instructions, tools: enabledTools, voice, model } = await response.json();

      if (!ephemeralApiKey || !instructions || !enabledTools) {
        throw new Error('Token, instructions, or tools were not provided by the server.');
      }

      console.log('✅ Received config from backend:', {
        instructions: instructions.length + ' chars',
        tools: enabledTools.length + ' tools',
        voice: voice,
        model: model
      });

      // Create tools from backend configuration
      const schemas = {
        search_products: z.object({ query: z.string() }),
        add_to_cart: z.object({ variantId: z.string(), quantity: z.number().nullable() }),
        get_cart_info: z.object({}),
        browse_catalog: z.object({ action: z.string() })
      };

      const dynamicTools = enabledTools.map((toolInfo: { type: string; function: { name: string; description: string; parameters: any } }) => {
        return tool({
          name: toolInfo.function.name,
          description: toolInfo.function.description,
          parameters: schemas[toolInfo.function.name as keyof typeof schemas] || z.any(),
          execute: (params) => universalExecute(params, toolInfo.function.name),
        });
      });

      // Initialize audio components
      const userStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const assistantAudioElement = new Audio();
      assistantAudioElement.autoplay = true;
      
      // Create agent and transport
      const agent = new RealtimeAgent({
        name: 'Helpful Assistant',
        instructions: instructions,
        tools: dynamicTools,
      });

      const transport = new OpenAIRealtimeWebRTC({
        mediaStream: userStream,
        audioElement: assistantAudioElement,
        useInsecureApiKey: true,
      });

      // Create session
      instance.session = new RealtimeSession(agent, {
        transport,
        model: model || 'gpt-4o-realtime-preview',
        config: {
          inputAudioFormat: 'pcm16',
          outputAudioFormat: 'pcm16',
          turnDetection: {
            type: 'semantic_vad',
            eagerness: 'medium',
            createResponse: true,
            interruptResponse: true,
          },
          voice: voice || 'alloy'
        }
      });

      // Event listeners
      instance.session.transport.on('*', (event: any) => {
        if (event.type === 'response.function_call_arguments.delta' || 
            event.type === 'response.function_call_arguments.done') {
          console.log('🔧 OpenAI Function Call Event:', {
            type: event.type,
            call_id: event.call_id,
            name: event.name,
            arguments: event.arguments
          });
        }
        
        if (event.type === 'session.closed' || event.type === 'session.ended') {
          createStopSession(instance)('Session ended.');
        } else if (event.type === 'error') {
          createStopSession(instance)(`An error occurred: ${event.error?.message || 'Unknown error'}`);
        }
      });
      
      // 7. Connect
      await instance.session.connect({ apiKey: ephemeralApiKey });

      instance.appState = 'connected';
      instance.statusElement.textContent = 'Connected. You can speak now.';
      instance.talkButton.textContent = 'Stop Talking';
      instance.talkButton.classList.add('active');
      instance.talkButton.disabled = false;
      instance.talkButton.style.background = '#dc2626';

    } catch (error) {
      console.error('Error starting session:', error);
      createStopSession(instance)(`Connection failed. Please try again.`);
    }
  };
};

const createStopSession = (instance: WidgetInstance) => {
  return (endMessage: string = 'Conversation ended.') => {
    if (instance.appState === 'idle') return;
    if (!instance.statusElement || !instance.talkButton) return;

    instance.session?.close();
    instance.session = null;

    instance.appState = 'idle';
    instance.statusElement.textContent = endMessage;
    instance.talkButton.textContent = 'Start Talking';
    instance.talkButton.classList.remove('active');
    instance.talkButton.disabled = false;
    instance.talkButton.style.background = '#3b82f6';
  };
};

// Widget initialization function
const initWidget = (config: WidgetConfig): WidgetInstance | null => {
  console.log(`🎯 Initializing AIWidget with config:`, config);

  // Create HTML structure
  createWidgetHTML(config.container);

  // Get DOM elements after creation
  const containerElement = document.getElementById(config.container);
  const statusElement = containerElement?.querySelector('#status') as HTMLParagraphElement;
  const talkButton = containerElement?.querySelector('#talk-button') as HTMLButtonElement;

  if (!statusElement || !talkButton) {
    console.error('❌ Failed to create widget DOM elements');
    return null;
  }

  // Create widget instance
  const instance: WidgetInstance = {
    session: null,
    appState: 'idle',
    statusElement,
    talkButton,
    config,
    containerElement
  };

  // Create session management functions
  const startSession = createStartSession(instance);
  const stopSession = createStopSession(instance);

  // Add button event listener
  talkButton.addEventListener('click', () => {
    if (instance.appState === 'idle') {
      startSession();
    } else if (instance.appState === 'connected') {
      stopSession('Conversation ended.');
    }
  });

  // Update status to show configuration
  const hostInfo = config.apiHost ? `Custom: ${config.apiHost}` : 'Auto-detected';
  const domainInfo = config.hostname || window.location.hostname;
  statusElement.textContent = `Ready for ${domainInfo} (${hostInfo}). Click to start!`;

  console.log('✅ Widget initialized successfully');
  return instance;
};

// Global AIWidget API
const AIWidget = {
  init: (config: WidgetConfig): WidgetInstance | null => {
    if (!config.container) {
      console.error('❌ AIWidget.init: container is required');
      return null;
    }

    return initWidget(config);
  }
};

// Export to global scope
(window as any).AIWidget = AIWidget;

// Универсальная функция создания центрированного контейнера
function createCenteredContainer(id: string): HTMLElement {
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;
  
  const container = document.createElement('div');
  container.id = id;
  container.style.cssText = `
    position: fixed;
    top: ${viewportHeight / 2}px;
    left: ${viewportWidth / 2}px;
    transform: translate(-50%, -50%);
    z-index: 10000;
    max-width: 320px;
    width: 90%;
  `;
  document.body.appendChild(container);
  return container;
}

// Единая функция инициализации виджета
function initializeWidget() {
  console.log('🚀 AIWidget: Starting initialization...');
  
  // Find our script tag
  const scripts = Array.from(document.getElementsByTagName('script'));
  const currentScript = scripts.find(script => script.src && script.src.includes('widget.js'));
  
  if (!currentScript) {
    console.error('❌ Widget script tag not found');
    return;
  }
  
  // Get configuration
  const customHost = currentScript.getAttribute('sethost');
  const currentHostname = window.location.hostname;
  
  // Create centered container
  const containerId = 'ai-widget-' + Date.now();
  const container = createCenteredContainer(containerId);
  
  // Prepare configuration
  const widgetConfig: WidgetConfig = {
    container: containerId,
    hostname: customHost || currentHostname
  };
  
  if (customHost) {
    const scriptUrl = new URL(currentScript.src);
    widgetConfig.apiHost = `${scriptUrl.protocol}//${scriptUrl.host}`;
  }
  
  // Initialize widget
  const instance = initWidget(widgetConfig);
  if (instance) {
    (window as any).AIWidget.instance = instance;
    addCloseButton(container, instance);
  }
}

// Add close button for auto-created widget
function addCloseButton(container: HTMLElement, instance: WidgetInstance) {
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '×';
  closeBtn.style.cssText = `
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
  
  closeBtn.onclick = () => {
    if (instance.session) instance.session.close();
    container.remove();
  };
  
  // НЕ меняем position - контейнер уже правильно настроен как fixed
  container.appendChild(closeBtn);
}

// Удалена legacy функция - теперь используем универсальное решение

// Initialize widget - простое универсальное решение
const initialize = () => {
  initializeWidget();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}