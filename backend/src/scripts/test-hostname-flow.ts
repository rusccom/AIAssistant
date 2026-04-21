#!/usr/bin/env ts-node

import dotenv from 'dotenv';
import path from 'path';
import { createWidgetEmbedToken } from '../features/widget-embed/embed-token';

// Загружаем переменные окружения
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const BASE_URL = 'http://localhost:3000';

async function testHostnameFlow() {
    console.log('🌐 Тестируем передачу hostname через весь процесс...\n');

    const testCases = [
        { hostname: 'localhost', description: 'Стандартный локальный домен' },
        { hostname: 'example.com', description: 'Несуществующий домен' },
        { hostname: 'mamapack.pl', description: 'Домен без bot configuration' }
    ];

    for (const testCase of testCases) {
        console.log(`📋 === Тест для домена: ${testCase.hostname} ===`);
        console.log(`📝 Описание: ${testCase.description}\n`);

        try {
            const embedToken = createWidgetEmbedToken(testCase.hostname);

            // 1. Симуляция запроса токена от виджета
            console.log('🔑 Шаг 1: Виджет запрашивает токен...');
            const tokenResponse = await fetch(`${BASE_URL}/api/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    hostname: testCase.hostname,
                    embedToken
                })
            });

            if (tokenResponse.status === 200) {
                const tokenData = await tokenResponse.json();
                console.log(`✅ Токен получен для ${testCase.hostname}`);
                console.log(`🛠️ Tools доступно: ${tokenData.tools?.length || 0}`);
            } else {
                console.log(`❌ Ошибка получения токена: ${tokenResponse.status}`);
                const errorData = await tokenResponse.json();
                console.log(`💬 Ошибка: ${errorData.error}`);
                console.log('─'.repeat(80) + '\n');
                continue;
            }

            // 2. Симуляция OpenAI function call (без hostname)
            console.log('\n🤖 Шаг 2: OpenAI вызывает функцию (без hostname)...');
            const openaiParams = {
                query: 'айфон черный 256'
                // OpenAI НЕ передает hostname!
            };

            // 3. Симуляция обработки виджетом (добавление hostname)
            console.log('🔧 Шаг 3: Виджет добавляет hostname...');
            const enhancedParams = {
                ...openaiParams,
                hostname: testCase.hostname,
                embedToken
            };

            console.log(`📋 Параметры от OpenAI: ${JSON.stringify(openaiParams)}`);
            console.log(`📋 Параметры в backend: ${JSON.stringify(enhancedParams)}`);

            // 4. Тестируем вызов функции с правильными параметрами
            console.log('\n🎯 Шаг 4: Backend выполняет функцию...');
            const functionResponse = await fetch(`${BASE_URL}/api/bot-execute/search_products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(enhancedParams)
            });

            if (functionResponse.status === 200) {
                const result = await functionResponse.json();
                console.log(`✅ Функция выполнена успешно`);
                console.log(`📊 Success: ${result.success}`);
                console.log(`💬 Response: "${result.response}"`);
                if (result.success && result.products) {
                    console.log(`📦 Найдено товаров: ${result.products.length}`);
                }
            } else {
                console.log(`❌ Ошибка выполнения функции: ${functionResponse.status}`);
                const errorData = await functionResponse.json();
                console.log(`💬 Ошибка: ${errorData.error || errorData.response}`);
            }

            // 5. Тестируем ситуацию БЕЗ embed token (новый контракт должен отклонить запрос)
            console.log('\n🚫 Шаг 5: Тест БЕЗ embed token...');
            const noHostnameResponse = await fetch(`${BASE_URL}/api/bot-execute/search_products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...openaiParams,
                    hostname: testCase.hostname
                })
            });

            if (noHostnameResponse.status === 200) {
                const result = await noHostnameResponse.json();
                console.log(`⚠️ Функция выполнена без embed token`);
                console.log(`💬 Response: "${result.response}"`);
            } else {
                console.log(`❌ Ошибка без embed token: ${noHostnameResponse.status}`);
            }

        } catch (error: any) {
            console.error(`💥 Ошибка для ${testCase.hostname}:`, error.message);
        }

        console.log('\n' + '─'.repeat(80) + '\n');
    }

    // 6. Резюме
    console.log('📋 === РЕЗЮМЕ ТЕСТИРОВАНИЯ ===\n');
    console.log('✅ Процесс передачи widget identity:');
    console.log('   1. Страница подключает widget.js с hostname и embed в URL');
    console.log('   2. Виджет запрашивает токен с hostname и embed token');
    console.log('   3. OpenAI вызывает функцию БЕЗ hostname');
    console.log('   4. Виджет добавляет hostname и embed token в параметры');
    console.log('   5. Backend валидирует embed token для hostname');
    console.log('   6. Backend выполняет поиск в правильном домене');
    
    console.log('\n🔧 Технические детали:');
    console.log('   - OpenAI не знает о hostname (и не должен)');
    console.log('   - Виджет ответственен за добавление hostname и embed token');
    console.log('   - Backend получает hostname и embed token для каждого вызова');
    console.log('   - Поиск выполняется в контексте нужного домена');

    console.log('\n🎉 Hostname flow протестирован!');
}

if (require.main === module) {
    testHostnameFlow().catch(console.error);
} 
