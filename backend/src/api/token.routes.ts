import { Router, Request, Response } from 'express';
import OpenAI from 'openai';
import * as botConfigService from '../services/bot-config.service';
import { prepareWidgetConfig } from '../services/instructions.service';
import { getAllFunctionDefinitions } from '../bot-functions';

const router = Router();

// Убедимся, что OpenAI клиент инициализируется с ключом из .env
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.post('/', async (req: Request, res: Response) => {
  const { hostname } = req.body;
  if (!hostname) {
    return res.status(400).json({ error: 'Hostname is required' });
  }

  try {
    // 1. Fetch the bot configuration for the given hostname
    const botConfig = await botConfigService.getPublicBotConfigByHostname(hostname);

    // 2. Prepare complete widget configuration (server-side logic)
    const widgetConfig = prepareWidgetConfig(botConfig);

    // 3. Получаем все определения функций из файлов
    const botFunctionDefinitions = getAllFunctionDefinitions();

    // 4. Create the real-time session with OpenAI (включая tools)
    const sessionConfig: any = {
      model: 'gpt-realtime',
      modalities: ['text', 'audio'],
      voice: (botConfig as any).voice || 'alloy',
      instructions: widgetConfig.instructions
    };

    // Добавляем bot functions как tools
    if (botFunctionDefinitions.length > 0) {
      // Конвертируем формат для OpenAI session creation API
      sessionConfig.tools = botFunctionDefinitions.map(func => ({
        type: func.type,
        name: func.function.name,
        description: func.function.description,
        parameters: func.function.parameters
      }));
      
      console.log(`🛠️ Передаем ${botFunctionDefinitions.length} bot functions в OpenAI session для ${hostname}`);
      console.log('🔍 Детальная информация о tools:');
      sessionConfig.tools.forEach((tool: any, index: number) => {
        console.log(`  ${index + 1}. ${tool.name}:`);
        console.log(`     type: ${tool.type}`);
        console.log(`     parameters.type: ${tool.parameters?.type}`);
        console.log(`     parameters:`, JSON.stringify(tool.parameters, null, 4));
      });
    }

    const session = await openai.beta.realtime.sessions.create(sessionConfig);

    // 5. Return token and ready-to-use configuration
    res.json({
      token: session.client_secret.value,
      expires_at: session.client_secret.expires_at,
      // Готовые данные для виджета (без логики на клиенте)
      instructions: widgetConfig.instructions,
      tools: botFunctionDefinitions, // Передаем bot functions вместо старых tools
      voice: widgetConfig.voice,
      model: widgetConfig.model,
      modalities: widgetConfig.modalities,
      // Сырая конфигурация (если нужна)
      rawConfig: widgetConfig.rawConfig
    });
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

export default router; 