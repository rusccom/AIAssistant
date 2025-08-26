import { RealtimeAgent, RealtimeSession, OpenAIRealtimeWebRTC, tool } from '@openai/agents-realtime';
import { z } from 'zod';
import './style.css';

// --- DOM Elements ---
const statusElement = document.getElementById('status') as HTMLParagraphElement;
const talkButton = document.getElementById('talk-button') as HTMLButtonElement;

let session: RealtimeSession | null = null;
let appState: 'idle' | 'connecting' | 'connected' = 'idle';

// Виджет больше не содержит логику - только получает готовые данные

// Universal execute function for all tools
const universalExecute = async (params: any, toolName: string) => {
  try {
    // Добавляем hostname в параметры если его нет
    const enhancedParams = {
      ...params,
      hostname: params.hostname || window.location.hostname
    };

    console.log(`🚀 Widget executing function: ${toolName}`, enhancedParams);

    const response = await fetch(`http://localhost:3000/api/bot-execute/${toolName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enhancedParams), // Передаем параметры с hostname
    });
    if (!response.ok) {
      throw new Error(`Failed to execute ${toolName}: ${response.statusText}`);
    }
    const result = await response.json();
    
    console.log(`📥 Widget received result from ${toolName}:`, result.success ? '✅ Success' : '❌ Failed');
    
    // Новый API возвращает объект с success и response
    if (result.success) {
      return result.response; // Возвращаем готовый ответ для пользователя
    } else {
      console.error(`Function ${toolName} failed:`, result.error);
      return result.response || `Sorry, there was an error executing ${toolName}.`;
    }
  } catch (error) {
    console.error(`❌ Widget error executing ${toolName}:`, error);
    return `Sorry, there was an error executing ${toolName}.`;
  }
};

// --- Session Management ---
const startSession = async () => {
  if (appState !== 'idle') return;

  appState = 'connecting';
  statusElement.textContent = 'Connecting...';
  talkButton.textContent = 'Connecting...';
  talkButton.disabled = true;

  try {
    // 0. Fetch token, config, and tools
    const response = await fetch('http://localhost:3000/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostname: window.location.hostname }),
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch token and config: ${response.statusText}`);
    }
    // Получаем готовые данные с сервера (без логики на клиенте)
    const { token: ephemeralApiKey, instructions, tools: enabledTools, voice, model } = await response.json();

    if (!ephemeralApiKey || !instructions || !enabledTools) {
      throw new Error('Token, instructions, or tools were not provided by the server.');
    }

    // 🔍 ДИАГНОСТИКА: Логируем что получили от backend
    console.log('🔍 WIDGET RECEIVED FROM BACKEND:');
    console.log('📋 Instructions length:', instructions.length);
    console.log('🛠️ Tools count:', enabledTools.length);
    console.log('🔧 Tools structure:');
    enabledTools.forEach((tool: any, index: number) => {
      console.log(`  ${index + 1}. Tool:`, JSON.stringify(tool, null, 2));
    });


    // 1. Dynamically create tools based on the list from backend
    const dynamicTools = enabledTools.map((toolInfo: { type: string; function: { name: string; description: string; parameters: any } }) => {
      // Создаем статические Zod схемы для наших функций
      let zodSchema;
      
      if (toolInfo.function.name === 'search_products') {
        zodSchema = z.object({
          query: z.string()
        });
      } else if (toolInfo.function.name === 'add_to_cart') {
        zodSchema = z.object({
          variantId: z.string(),
          quantity: z.number().nullable()
        });
      } else if (toolInfo.function.name === 'get_cart_info') {
        zodSchema = z.object({});
      } else if (toolInfo.function.name === 'browse_catalog') {
        zodSchema = z.object({
          action: z.string()
        });
      } else {
        zodSchema = z.any();
      }
      
      return tool({
        name: toolInfo.function.name,
        description: toolInfo.function.description,
        parameters: zodSchema,
        execute: (params) => universalExecute(params, toolInfo.function.name),
      });
    });

    // 🔍 ДИАГНОСТИКА: Логируем созданные tools для SDK
    console.log('🛠️ CREATED DYNAMIC TOOLS FOR SDK:');
    dynamicTools.forEach((tool: any, index: number) => {
      console.log(`  ${index + 1}. SDK Tool:`, tool);
    });

    // 2. Get user media stream
    const userStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // 3. Create audio element
    const assistantAudioElement = new Audio();
    assistantAudioElement.autoplay = true;
    
    // 4. Create Agent with ready-made instructions from server
    console.log('Instructions:', instructions);
    const agent = new RealtimeAgent({
      name: 'Helpful Assistant',
      instructions: instructions, // Готовые инструкции с сервера
      tools: dynamicTools,
    });

    // 5. Create transport
    const transport = new OpenAIRealtimeWebRTC({
      mediaStream: userStream,
      audioElement: assistantAudioElement,
      useInsecureApiKey: true,
    });

    // 6. Create session with server-provided configuration
    session = new RealtimeSession(agent, {
      transport,
      model: model || 'gpt-4o-realtime-preview-2025-06-03',
      config: {
        inputAudioFormat: 'pcm16',
        outputAudioFormat: 'pcm16',
        turnDetection: { type: 'server_vad' },
        voice: voice || 'alloy' // Готовая настройка голоса с сервера
      }
    });

    // Event listeners
    session.transport.on('*', (event: any) => {
      // 🔇 Временно закомментировано избыточное логирование разговора
      // console.log('Transport event:', event);
      
      // 🤖 Специальное логирование для function calls
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
        stopSession('Session ended.');
      } else if (event.type === 'error') {
        stopSession(`An error occurred: ${event.error?.message || 'Unknown error'}`);
      }
    });
    
    // 7. Connect
    await session.connect({ apiKey: ephemeralApiKey });

    appState = 'connected';
    statusElement.textContent = 'Connected. You can speak now.';
    talkButton.textContent = 'Stop Talking';
    talkButton.classList.add('active');
    talkButton.disabled = false;

  } catch (error) {
    console.error('Error starting session:', error);
    stopSession(`Connection failed. Please try again.`);
  }
};

const stopSession = (endMessage: string = 'Conversation ended.') => {
  if (appState === 'idle') return;

  session?.close();
  session = null;

  appState = 'idle';
  statusElement.textContent = endMessage;
  talkButton.textContent = 'Start Talking';
  talkButton.classList.remove('active');
  talkButton.disabled = false;
};


// --- Button Event Listener ---
talkButton.addEventListener('click', () => {
  if (appState === 'idle') {
    startSession();
  } else if (appState === 'connected') {
    stopSession('Conversation ended.');
  }
}); 