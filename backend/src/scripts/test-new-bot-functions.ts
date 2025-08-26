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

async function testNewBotFunctions() {
    console.log('🧪 Тестируем НОВУЮ архитектуру Bot Functions...\n');

    try {
        // Тест 1: Получить список всех functions
        console.log('📋 === ТЕСТ 1: Список всех bot functions ===\n');
        
        const functionsResponse = await makeRequest(`${BASE_URL}/api/bot-execute`, {}, 'GET');
        
        if (functionsResponse.status === 200) {
            console.log('✅ Получен список функций');
            console.log(`🔢 Количество: ${functionsResponse.data.count}`);
            
            functionsResponse.data.functions.forEach((func: any, index: number) => {
                console.log(`${index + 1}. ${func.name}`);
                console.log(`   Описание: ${func.description}`);
                console.log(`   Параметры: ${JSON.stringify(func.parameters.required)}`);
            });
        } else {
            console.log(`❌ Ошибка получения списка: ${functionsResponse.status}`);
        }

        console.log('\n' + '─'.repeat(80) + '\n');

        // Тест 2: Выполнить search_products
        console.log('🔍 === ТЕСТ 2: Выполнение search_products ===\n');
        
        const testQueries = [
            'айфон черный 256',
            'кружка',
            'bluetooth наушники'
        ];

        for (const query of testQueries) {
            console.log(`📝 Запрос: "${query}"`);
            
            const searchResponse = await makeRequest(`${BASE_URL}/api/bot-execute/search_products`, {
                query,
                hostname: HOSTNAME
            });

            if (searchResponse.status === 200) {
                console.log(`✅ Функция выполнена успешно`);
                console.log(`💬 Ответ: "${searchResponse.data.response}"`);
                console.log(`📦 Найдено товаров: ${searchResponse.data.products?.length || 0}`);
            } else {
                console.log(`❌ Ошибка: ${searchResponse.status} - ${searchResponse.data.error}`);
            }
            
            console.log('');
        }

        console.log('─'.repeat(80) + '\n');

        // Тест 3: Выполнить get_product_info
        console.log('📦 === ТЕСТ 3: Выполнение get_product_info ===\n');
        
        const productTests = [
            { productId: 1, description: 'Первый товар' },
            { productId: 2, variantId: 2, description: 'Второй товар, второй вариант' },
            { productId: 999, description: 'Несуществующий товар' }
        ];

        for (const test of productTests) {
            console.log(`📝 Тест: ${test.description}`);
            
            const productResponse = await makeRequest(`${BASE_URL}/api/bot-execute/get_product_info`, {
                productId: test.productId,
                variantId: test.variantId,
                hostname: HOSTNAME
            });

            if (productResponse.status === 200) {
                console.log(`✅ Функция выполнена успешно`);
                console.log(`💬 Ответ: "${productResponse.data.response}"`);
                if (productResponse.data.product) {
                    console.log(`📦 Товар: ${productResponse.data.product.title}`);
                }
            } else {
                console.log(`❌ Ошибка: ${productResponse.status} - ${productResponse.data.error}`);
            }
            
            console.log('');
        }

        console.log('─'.repeat(80) + '\n');

        // Тест 4: Несуществующая функция
        console.log('❓ === ТЕСТ 4: Несуществующая функция ===\n');
        
        const unknownResponse = await makeRequest(`${BASE_URL}/api/bot-execute/unknown_function`, {
            test: 'data'
        });

        if (unknownResponse.status === 404) {
            console.log('✅ Правильная ошибка для несуществующей функции');
            console.log(`💬 Сообщение: ${unknownResponse.data.error}`);
        } else {
            console.log(`⚠️ Неожиданный статус: ${unknownResponse.status}`);
        }

        console.log('\n' + '─'.repeat(80) + '\n');

        // Тест 5: Token API с новыми functions
        console.log('🔑 === ТЕСТ 5: Token API с новыми functions ===\n');
        
        const tokenResponse = await makeRequest(`${BASE_URL}/api/token`, {
            hostname: HOSTNAME
        });

        if (tokenResponse.status === 200) {
            console.log('✅ Token API работает с новыми functions');
            console.log(`🛠️ Functions в ответе: ${tokenResponse.data.tools?.length || 0}`);
            
            if (tokenResponse.data.tools && tokenResponse.data.tools.length > 0) {
                console.log('\n📦 Functions для OpenAI:');
                tokenResponse.data.tools.forEach((tool: any, index: number) => {
                    console.log(`${index + 1}. ${tool.name} (${tool.type})`);
                });
            }
        } else {
            console.log(`❌ Ошибка Token API: ${tokenResponse.status}`);
        }

        console.log('\n🎉 Тестирование новой архитектуры Bot Functions завершено!');

    } catch (error: any) {
        console.error('💥 Ошибка при тестировании:', error.message);
    }
}

if (require.main === module) {
    testNewBotFunctions().catch(console.error);
} 