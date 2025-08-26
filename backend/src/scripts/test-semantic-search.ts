#!/usr/bin/env ts-node

import { semanticSearchService } from '../services/semantic-search.service';

async function testSemanticSearch() {
    console.log('🧪 Тестируем семантический поиск товаров...\n');

    const testQueries = [
        // Русские запросы
        'Сколько стоит айфон черный 256?',
        'Какая цена кружки?',
        'Покажи цену эспрессо',
        'Сколько стоит телефон apple большой',
        'Цена книги программирование',
        'Наушники беспроводные белые',
        
        // Английские запросы
        'iPhone black 256GB price',
        'ceramic mug cost',
        'coffee espresso price',
        'programming book cost',
        'bluetooth headphones white',
        
        // Сложные запросы
        'айфон синий память 128',
        'капучино кофе',
        'наушники серого цвета'
    ];

    const hostname = 'localhost'; // Используем localhost домен из результатов

    for (const query of testQueries) {
        console.log(`🔍 Запрос: "${query}"`);
        
        try {
            const result = await semanticSearchService.searchProductsForBot(query, hostname);
            
            if (result.products.length > 0) {
                console.log(`✅ Найдено ${result.products.length} результат(ов)`);
                console.log(`💬 Ответ бота: "${result.response}"`);
                console.log(`🔧 Тип поиска: ${result.searchType}`);
                
                // Показываем топ результаты с оценками
                result.products.slice(0, 2).forEach((product, index) => {
                    console.log(`   ${index + 1}. ${product.productTitle} ${product.variantTitle} - ${product.price / 100}$ (similarity: ${product.similarity.toFixed(3)})`);
                });
            } else {
                console.log(`❌ Ничего не найдено`);
                console.log(`💬 Ответ бота: "${result.response}"`);
            }
            
        } catch (error) {
            console.error(`💥 Ошибка: ${error}`);
        }
        
        console.log('─'.repeat(80) + '\n');
    }
}

if (require.main === module) {
    testSemanticSearch().catch(console.error);
} 