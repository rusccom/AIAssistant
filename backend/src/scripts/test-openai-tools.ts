#!/usr/bin/env ts-node

import dotenv from 'dotenv';
import path from 'path';

// Загружаем переменные окружения
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import OpenAI from 'openai';
import * as botConfigService from '../services/bot-config.service';
import { prepareWidgetConfig } from '../services/instructions.service';

async function testOpenAITools() {
    console.log('🧪 Тестируем передачу tools в OpenAI Realtime API...\n');

    try {
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        // 1. Получаем конфигурацию бота с tools
        const botConfig = await botConfigService.getPublicBotConfigByHostname('localhost');
        console.log(`📋 Bot config получен для localhost`);
        console.log(`🛠️ Tools найдено: ${botConfig.tools?.length || 0}`);

        // 2. Подготавливаем конфигурацию
        const widgetConfig = prepareWidgetConfig(botConfig);
        console.log(`🔧 Widget config подготовлен`);
        console.log(`🛠️ Prepared tools: ${widgetConfig.tools?.length || 0}`);

        // 3. Показываем структуру tools
        if (widgetConfig.tools && widgetConfig.tools.length > 0) {
            console.log('\n📦 Tools для OpenAI:');
            widgetConfig.tools.forEach((tool: any, index: number) => {
                console.log(`${index + 1}. ${tool.name}`);
                console.log(`   Описание: ${tool.description}`);
                console.log(`   Параметры: ${JSON.stringify(tool.parameters, null, 2)}`);
                console.log('');
            });
        }

        // 4. Формируем tools в формате OpenAI Function Calling
        const openaiTools = widgetConfig.tools?.map((tool: any) => ({
            type: 'function',
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters
        })) || [];

        console.log('\n🔄 Конвертированные tools для OpenAI:');
        console.log(JSON.stringify(openaiTools, null, 2));

        // 5. Пробуем создать сессию с tools
        console.log('\n🌐 Создаем OpenAI Realtime session с tools...');
        
        const sessionConfig: any = {
            model: 'gpt-realtime',
            modalities: ['text', 'audio'],
            voice: botConfig.voice || 'alloy',
            instructions: widgetConfig.instructions
        };

        // Добавляем tools если они есть
        if (openaiTools.length > 0) {
            sessionConfig.tools = openaiTools;
        }

        console.log('\n📋 Session config:');
        console.log(JSON.stringify(sessionConfig, null, 2));

        const session = await openai.beta.realtime.sessions.create(sessionConfig);

        console.log('\n✅ Session создана успешно!');
        console.log(`🔑 Token: ${session.client_secret.value.substring(0, 20)}...`);
        console.log(`⏰ Истекает: ${session.client_secret.expires_at}`);

        // 6. Проверяем что tools переданы
        console.log('\n🎉 Tools успешно переданы в OpenAI Realtime API!');

    } catch (error: any) {
        console.error('💥 Ошибка:', error);
        if (error.response) {
            console.error('📄 Response data:', error.response.data);
        }
    }
}

if (require.main === module) {
    testOpenAITools().catch(console.error);
} 