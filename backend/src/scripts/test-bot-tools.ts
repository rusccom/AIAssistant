#!/usr/bin/env ts-node

const BASE_URL = 'http://localhost:3000';
const HOSTNAME = 'localhost';

async function makeRequest(url: string, data: any) {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    
    const result = await response.json();
    return { status: response.status, data: result };
}

async function testBotToolsAPI() {
    console.log('🤖 Тестируем Bot Tools API для семантического поиска...\n');

    const testQueries = [
        'Сколько стоит айфон черный 256?',
        'Какая цена кружки?',
        'Покажи цену эспрессо',
        'iPhone black 256GB price',
        'bluetooth headphones white'
    ];

    // Тест 1: Семантический поиск товаров
    console.log('🔍 === ТЕСТ 1: Семантический поиск товаров ===\n');
    
    for (const query of testQueries) {
        console.log(`📝 Запрос: "${query}"`);
        
        try {
            const response = await makeRequest(`${BASE_URL}/api/bot-tools/search-products`, {
                query,
                hostname: HOSTNAME
            });

            if (response.data.success) {
                console.log(`✅ Успешно найдено ${response.data.products.length} товаров`);
                console.log(`💬 Ответ бота: "${response.data.response}"`);
                console.log(`🔧 Тип поиска: ${response.data.searchType}`);
            } else {
                console.log(`❌ Ошибка: ${response.data.error}`);
                console.log(`💬 Ответ: "${response.data.response}"`);
            }
        } catch (error: any) {
            console.error(`💥 HTTP ошибка: ${error.message}`);
        }
        
        console.log('─'.repeat(80) + '\n');
    }

    // Тест 2: Получение информации о конкретном товаре
    console.log('📦 === ТЕСТ 2: Информация о товаре ===\n');
    
    const productTests = [
        { productId: 1, description: 'Первый товар' },
        { productId: 2, variantId: 1, description: 'Второй товар, первый вариант' },
        { productId: 999, description: 'Несуществующий товар' }
    ];

    for (const test of productTests) {
        console.log(`📝 Тест: ${test.description} (Product ID: ${test.productId}${test.variantId ? `, Variant ID: ${test.variantId}` : ''})`);
        
        try {
            const response = await makeRequest(`${BASE_URL}/api/bot-tools/product-info`, {
                productId: test.productId,
                variantId: test.variantId,
                hostname: HOSTNAME
            });

            if (response.data.success) {
                console.log(`✅ Товар найден: ${response.data.product.title}`);
                console.log(`💬 Ответ бота: "${response.data.response}"`);
                console.log(`💰 Цена: $${(response.data.product.variant.price / 100).toFixed(2)}`);
            } else {
                console.log(`❌ Ошибка: ${response.data.error}`);
                console.log(`💬 Ответ: "${response.data.response}"`);
            }
        } catch (error: any) {
            console.error(`💥 HTTP ошибка: ${error.message}`);
        }
        
        console.log('─'.repeat(80) + '\n');
    }

    // Тест 3: Legacy API (теперь только семантический поиск)
    console.log('🔧 === ТЕСТ 3: Legacy API (только семантический поиск) ===\n');
    
    const legacyTests = [
        { item: 'айфон', hostname: HOSTNAME, description: 'Семантический поиск iPhone' },
        { item: 'кружка', hostname: HOSTNAME, description: 'Семантический поиск кружки' },
        { item: 'bluetooth наушники', hostname: HOSTNAME, description: 'Семантический поиск наушников' },
        { item: 'несуществующий товар', hostname: HOSTNAME, description: 'Товар которого нет' },
        { item: 'кофе', description: 'Без hostname (должна быть ошибка)' },
    ];

    for (const test of legacyTests) {
        console.log(`📝 Тест: ${test.description} - "${test.item}"`);
        
        try {
            const payload: any = { item: test.item };
            if (test.hostname) {
                payload.hostname = test.hostname;
            }

            const response = await makeRequest(`${BASE_URL}/api/bot-tools/get-price`, payload);
            
            console.log(`✅ Ответ получен`);
            console.log(`💬 Ответ бота: "${response.data.response}"`);
            
        } catch (error: any) {
            console.error(`💥 HTTP ошибка: ${error.message}`);
        }
        
        console.log('─'.repeat(80) + '\n');
    }

    console.log('🎉 Тестирование Bot Tools API завершено!');
}

if (require.main === module) {
    testBotToolsAPI().catch(console.error);
} 