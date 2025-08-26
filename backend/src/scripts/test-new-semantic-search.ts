import dotenv from 'dotenv';
import path from 'path';

// Загружаем переменные окружения
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { semanticSearchService } from '../services/semantic-search.service';
import { executeSearchProducts } from '../bot-functions/search-products';
import prisma from '../db/prisma';

async function testNewSemanticSearch() {
  console.log('🧪 Тестируем новую систему семантического поиска с pgvector...\n');

  try {
    // 1. Получаем тестовый домен
    console.log('📊 === ШАГ 1: ПОДГОТОВКА ===');
    const domain = await prisma.domain.findFirst();
    
    if (!domain) {
      console.log('❌ Домены не найдены. Создайте домен сначала.');
      return;
    }
    
    console.log(`✅ Используем домен: ${domain.hostname} (ID: ${domain.id})`);

    // 2. Тестируем прямой вызов semantic search
    console.log('\n🔍 === ШАГ 2: ПРЯМОЙ SEMANTIC SEARCH ===');
    
    const testQueries = [
      'iPhone',
      'кофе',
      'bluetooth наушники',
      'книга программирование',
      'керамическая кружка'
    ];

    for (const query of testQueries) {
      console.log(`\n🔍 Поиск: "${query}"`);
      
      const startTime = Date.now();
      const results = await semanticSearchService.searchProducts(query, domain.id, 3);
      const endTime = Date.now();
      
      console.log(`⏱️ Время поиска: ${endTime - startTime}ms`);
      console.log(`📊 Найдено результатов: ${results.length}`);
      
      results.forEach((result, idx) => {
        const type = result.type === 'product' ? '📦' : '🔖';
        const price = result.price ? ` - $${(result.price / 100).toFixed(2)}` : '';
        const similarity = `(${(result.similarity * 100).toFixed(1)}%)`;
        
        if (result.type === 'variant') {
          console.log(`   ${idx + 1}. ${type} ${result.productTitle} ${result.title}${price} ${similarity}`);
        } else {
          console.log(`   ${idx + 1}. ${type} ${result.title}${price} ${similarity}`);
        }
      });
    }

    // 3. Тестируем bot function
    console.log('\n🤖 === ШАГ 3: BOT FUNCTION SEARCH ===');
    
    for (const query of testQueries.slice(0, 3)) { // Тестируем первые 3 запроса
      console.log(`\n🤖 Bot поиск: "${query}"`);
      
      const botResult = await executeSearchProducts({ query }, domain.hostname);
      
      if (botResult.success) {
        console.log(`✅ Успех: ${botResult.message}`);
        console.log(`📊 Товаров найдено: ${botResult.totalFound || 0}`);
        
        if (botResult.products && botResult.products.length > 0) {
          botResult.products.slice(0, 2).forEach((product: any, idx: number) => {
            const price = product.price ? ` - $${product.price}` : '';
            console.log(`   ${idx + 1}. ${product.title}${price} (similarity: ${product.similarity})`);
          });
        }
      } else {
        console.log(`❌ Ошибка: ${botResult.error}`);
      }
    }

    // 4. Сравнение производительности
    console.log('\n⚡ === ШАГ 4: ТЕСТ ПРОИЗВОДИТЕЛЬНОСТИ ===');
    
    const perfTestQuery = 'iPhone черный';
    const iterations = 10;
    
    console.log(`🔄 Выполняем ${iterations} поисков для "${perfTestQuery}"`);
    
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await semanticSearchService.searchProducts(perfTestQuery, domain.id, 5);
      const end = Date.now();
      times.push(end - start);
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    console.log(`📊 Статистика производительности:`);
    console.log(`   Среднее время: ${avgTime.toFixed(1)}ms`);
    console.log(`   Минимальное: ${minTime}ms`);
    console.log(`   Максимальное: ${maxTime}ms`);
    console.log(`   Все времена: ${times.join(', ')}ms`);

    // 5. Проверка качества результатов
    console.log('\n🎯 === ШАГ 5: АНАЛИЗ КАЧЕСТВА ===');
    
    const qualityTests = [
      { query: 'iPhone 15', expectedInTitle: 'iPhone 15' },
      { query: 'кофе латте', expectedInTitle: 'кофе' },
      { query: 'bluetooth наушники', expectedInTitle: 'наушники' }
    ];
    
    for (const test of qualityTests) {
      console.log(`\n🔍 Тест качества: "${test.query}"`);
      
      const results = await semanticSearchService.searchProducts(test.query, domain.id, 5);
      
      if (results.length === 0) {
        console.log('❌ Результаты не найдены');
        continue;
      }
      
      const topResult = results[0];
      const foundExpected = topResult.title.toLowerCase().includes(test.expectedInTitle.toLowerCase()) ||
                           (topResult.productTitle && topResult.productTitle.toLowerCase().includes(test.expectedInTitle.toLowerCase()));
      
      if (foundExpected) {
        console.log(`✅ Топ результат содержит "${test.expectedInTitle}": ${topResult.title || topResult.productTitle}`);
        console.log(`   Similarity: ${(topResult.similarity * 100).toFixed(1)}%`);
      } else {
        console.log(`⚠️ Топ результат НЕ содержит "${test.expectedInTitle}": ${topResult.title || topResult.productTitle}`);
        console.log(`   Similarity: ${(topResult.similarity * 100).toFixed(1)}%`);
      }
    }

    console.log('\n🎉 ТЕСТИРОВАНИЕ ЗАВЕРШЕНО! 🎉');

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testNewSemanticSearch(); 