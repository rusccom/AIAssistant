import dotenv from 'dotenv';
import path from 'path';

// Загружаем переменные окружения
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { semanticSearchService } from '../services/semantic-search.service';

async function testSpecificIphoneSearch() {
  console.log('🎯 ТЕСТИРОВАНИЕ ТОЧНЫХ ЗАПРОСОВ iPhone\n');

  const testQueries = [
    // Общие запросы
    { query: 'айфон', expectation: 'Должен показать все 4 варианта' },
    { query: 'iPhone', expectation: 'Должен показать все 4 варианта' },
    { query: 'iPhone 15', expectation: 'Должен показать все 4 варианта' },
    
    // Частично специфичные
    { query: 'айфон черный', expectation: 'Должен показать 2 черных варианта' },
    { query: 'iPhone Black', expectation: 'Должен показать 2 черных варианта' },
    { query: 'айфон 256', expectation: 'Должен показать 2 варианта 256GB' },
    { query: 'iPhone 256GB', expectation: 'Должен показать 2 варианта 256GB' },
    
    // Очень специфичные
    { query: 'айфон черный 256', expectation: 'Должен показать 1 точный вариант' },
    { query: 'iPhone 15 256GB Black', expectation: 'Должен показать 1 точный вариант' },
    { query: 'iPhone 15 128GB Blue', expectation: 'Должен показать 1 точный вариант' },
    { query: 'айфон синий 128', expectation: 'Должен показать 1 точный вариант' },
    
    // Точные SKU/названия
    { query: 'IPH15-256-BLK', expectation: 'Должен найти по SKU' },
    { query: '256GB Black', expectation: 'Точное название варианта' }
  ];

  for (const test of testQueries) {
    console.log(`🔎 Запрос: "${test.query}"`);
    console.log(`💡 Ожидание: ${test.expectation}`);
    
    try {
      const result = await semanticSearchService.searchProductsForBot(test.query, 'localhost');
      
      console.log(`📊 Найдено: ${result.products.length} вариант(ов)`);
      console.log(`🤖 Ответ бота: "${result.response}"`);
      console.log(`🔧 Тип поиска: ${result.searchType}`);
      
      if (result.products.length > 0) {
        console.log(`📱 Варианты:`);
        result.products.forEach((product: any, idx: number) => {
          console.log(`   ${idx + 1}. ${product.productTitle} ${product.variantTitle} - $${(product.price / 100).toFixed(2)} (similarity: ${product.similarity?.toFixed(3) || 'N/A'})`);
        });
      }
      
      // Анализируем результат
      if (result.products.length === 1) {
        console.log(`✅ ТОЧНЫЙ ОТВЕТ - система вернула конкретный товар`);
      } else if (result.products.length > 1) {
        console.log(`📋 ВЫБОР - система предложила варианты на выбор`);
      } else {
        console.log(`❌ НИЧЕГО НЕ НАЙДЕНО`);
      }
      
    } catch (error) {
      console.log(`❌ Ошибка: ${error}`);
    }
    
    console.log('─'.repeat(80));
  }
}

testSpecificIphoneSearch(); 