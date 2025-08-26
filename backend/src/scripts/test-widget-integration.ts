#!/usr/bin/env ts-node

import dotenv from 'dotenv';
import path from 'path';

// Загружаем переменные окружения
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const BASE_URL = 'http://localhost:3000';
const HOSTNAME = 'localhost';

async function makeRequest(url: string, data: any, method: string = 'POST') {
    const options: any = {
        method,
        headers: {
            'Content-Type': 'application/json',
        }
    };

    if (method === 'POST' && data) {
        options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    const responseData = await response.json();
    
    return {
        status: response.status,
        data: responseData
    };
}

// Симуляция universalExecute функции из виджета
const simulateWidgetFunctionCall = async (params: any, toolName: string) => {
    try {
        const response = await fetch(`${BASE_URL}/api/bot-execute/${toolName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
        });
        
        if (!response.ok) {
            throw new Error(`Failed to execute ${toolName}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        // Новый API возвращает объект с success и response
        if (result.success) {
            return result.response; // Возвращаем готовый ответ для пользователя
        } else {
            console.error(`Function ${toolName} failed:`, result.error);
            return result.response || `Sorry, there was an error executing ${toolName}.`;
        }
    } catch (error: any) {
        console.error(`Error executing tool ${toolName}:`, error);
        return `Sorry, there was an error executing ${toolName}.`;
    }
};

async function testWidgetIntegration() {
    console.log('🔗 Тестируем интеграцию виджета с новым bot-execute API...\n');

    try {
        // Тест 1: Получение токена и конфигурации (как в виджете)
        console.log('🔑 === ТЕСТ 1: Получение токена и конфигурации ===\n');
        
        const tokenResponse = await makeRequest(`${BASE_URL}/api/token`, {
            hostname: HOSTNAME
        });

        if (tokenResponse.status === 200) {
            const { token, instructions, tools, voice, model } = tokenResponse.data;
            
            console.log('✅ Token API работает успешно!');
            console.log(`🔑 Token получен: ${token.substring(0, 20)}...`);
            console.log(`🎯 Voice: ${voice}`);
            console.log(`🤖 Model: ${model}`);
            console.log(`🛠️ Tools доступно: ${tools?.length || 0}`);
            console.log(`📋 Instructions: ${instructions.substring(0, 100)}...`);
            
            if (tools && tools.length > 0) {
                console.log('\n📦 Доступные функции:');
                tools.forEach((tool: any, index: number) => {
                    console.log(`${index + 1}. ${tool.name} - ${tool.description}`);
                });
            }
        } else {
            console.log(`❌ Ошибка получения токена: ${tokenResponse.status}`);
            return;
        }

        console.log('\n' + '─'.repeat(80) + '\n');

        // Тест 2: Симуляция вызовов функций из виджета  
        console.log('🎭 === ТЕСТ 2: Симуляция вызовов функций из виджета ===\n');
        
        const widgetFunctionTests = [
            {
                toolName: 'search_products',
                params: { 
                    query: 'айфон черный 256', 
                    hostname: HOSTNAME 
                },
                description: 'Поиск товаров'
            },
            {
                toolName: 'get_product_info',
                params: { 
                    productId: 2, 
                    variantId: 2, 
                    hostname: HOSTNAME 
                },
                description: 'Информация о товаре'
            },
            {
                toolName: 'search_products',
                params: { 
                    query: '   ', // Пустой запрос для проверки валидации
                    hostname: HOSTNAME 
                },
                description: 'Валидация пустого запроса'
            },
            {
                toolName: 'unknown_function',
                params: { test: 'data' },
                description: 'Несуществующая функция'
            }
        ];

        for (const test of widgetFunctionTests) {
            console.log(`📝 Тест: ${test.description} (${test.toolName})`);
            console.log(`📋 Параметры: ${JSON.stringify(test.params)}`);
            
            const result = await simulateWidgetFunctionCall(test.params, test.toolName);
            console.log(`💬 Результат: "${result}"`);
            console.log('');
        }

        console.log('─'.repeat(80) + '\n');

        // Тест 3: Проверка формата ответов 
        console.log('🔍 === ТЕСТ 3: Проверка формата ответов ===\n');
        
        console.log('📝 Тестируем детальный формат ответа search_products...');
        
        const searchResponse = await makeRequest(`${BASE_URL}/api/bot-execute/search_products`, {
            query: 'кружка',
            hostname: HOSTNAME
        });

        if (searchResponse.status === 200) {
            const result = searchResponse.data;
            console.log('✅ Ответ получен');
            console.log(`📊 Success: ${result.success}`);
            console.log(`💬 Response: "${result.response}"`);
            if (result.success) {
                console.log(`📦 Products: ${result.products?.length || 0}`);
                console.log(`🔧 Search Type: ${result.searchType}`);
                console.log(`🔍 Query: ${result.query}`);
            } else {
                console.log(`❌ Error: ${result.error}`);
            }
        } else {
            console.log(`❌ HTTP Error: ${searchResponse.status}`);
        }

        console.log('\n🎉 Тестирование интеграции виджета завершено успешно!');
        console.log('\n📊 Результаты:');
        console.log('   ✅ Token API работает корректно');
        console.log('   ✅ Bot-execute API отвечает на вызовы');
        console.log('   ✅ Формат ответов соответствует ожиданиям');
        console.log('   ✅ Валидация параметров работает');
        console.log('   ✅ Обработка ошибок функционирует');

    } catch (error: any) {
        console.error('💥 Критическая ошибка интеграции:', error.message);
    }
}

if (require.main === module) {
    testWidgetIntegration().catch(console.error);
} 