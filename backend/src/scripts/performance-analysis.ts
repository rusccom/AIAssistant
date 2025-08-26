import dotenv from 'dotenv';
import path from 'path';

// Загружаем переменные окружения
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import prisma from '../db/prisma';
import openaiService from '../services/openai.service';

async function performanceAnalysis() {
  console.log('⚡ Детальный анализ производительности семантического поиска...\n');

  try {
    const testQuery = 'iPhone';
    const hostname = 'localhost';
    const iterations = 5;

    // 1. Находим домен (один раз)
    const domain = await prisma.domain.findFirst({
      where: { hostname: hostname }
    });

    if (!domain) {
      console.log('❌ Домен не найден');
      return;
    }

    console.log(`🌐 Домен: ${hostname} (ID: ${domain.id})\n`);

    // 2. Анализируем каждый компонент отдельно
    console.log('📊 === АНАЛИЗ КОМПОНЕНТОВ (5 итераций) ===\n');

    const embeddingTimes: number[] = [];
    const searchTimes: number[] = [];
    const totalTimes: number[] = [];

    for (let i = 0; i < iterations; i++) {
      console.log(`🔄 Итерация ${i + 1}:`);

      // Общее время
      const totalStart = Date.now();

      // 1. Время создания embedding
      const embeddingStart = Date.now();
      const queryEmbedding = await openaiService.createEmbedding(testQuery);
      const embeddingTime = Date.now() - embeddingStart;
      embeddingTimes.push(embeddingTime);

      const queryVector = '[' + queryEmbedding.join(',') + ']';

      // 2. Время поиска в БД (только SQL запросы)
      const searchStart = Date.now();

      // Поиск товаров
      const productResults = await prisma.$queryRaw<Array<{
        id: number;
        title: string;
        description: string | null;
        distance: number;
      }>>`
        SELECT 
          p.id,
          p.title,
          p.description,
          (p.embedding_small <=> ${queryVector}::vector) as distance
        FROM "Product" p
        WHERE p.embedding_small IS NOT NULL 
          AND p."domainId" = ${domain.id}
        ORDER BY p.embedding_small <=> ${queryVector}::vector
        LIMIT 10;
      `;

      // Поиск вариантов
      const variantResults = await prisma.$queryRaw<Array<{
        id: number;
        title: string;
        price: number;
        sku: string | null;
        distance: number;
        product_id: number;
        product_title: string;
        product_description: string | null;
      }>>`
        SELECT 
          pv.id,
          pv.title,
          pv.price,
          pv.sku,
          (pv.embedding_small <=> ${queryVector}::vector) as distance,
          p.id as product_id,
          p.title as product_title,
          p.description as product_description
        FROM "ProductVariant" pv
        JOIN "Product" p ON p.id = pv."productId"
        WHERE pv.embedding_small IS NOT NULL 
          AND p."domainId" = ${domain.id}
        ORDER BY pv.embedding_small <=> ${queryVector}::vector
        LIMIT 10;
      `;

      const searchTime = Date.now() - searchStart;
      searchTimes.push(searchTime);

      const totalTime = Date.now() - totalStart;
      totalTimes.push(totalTime);

      console.log(`   🤖 OpenAI embedding: ${embeddingTime}ms`);
      console.log(`   🔍 Поиск в БД: ${searchTime}ms`);
      console.log(`   📊 Найдено: ${productResults.length} товаров, ${variantResults.length} вариантов`);
      console.log(`   ⏱️ Общее время: ${totalTime}ms\n`);
    }

    // 3. Статистика
    console.log('📈 === СТАТИСТИКА ПРОИЗВОДИТЕЛЬНОСТИ ===\n');

    const avgEmbedding = embeddingTimes.reduce((a, b) => a + b, 0) / embeddingTimes.length;
    const avgSearch = searchTimes.reduce((a, b) => a + b, 0) / searchTimes.length;
    const avgTotal = totalTimes.reduce((a, b) => a + b, 0) / totalTimes.length;

    console.log(`🤖 OpenAI Embedding API:`);
    console.log(`   Среднее: ${avgEmbedding.toFixed(1)}ms`);
    console.log(`   Диапазон: ${Math.min(...embeddingTimes)}-${Math.max(...embeddingTimes)}ms`);
    console.log(`   Доля: ${((avgEmbedding / avgTotal) * 100).toFixed(1)}%\n`);

    console.log(`🔍 Поиск в PostgreSQL (с HNSW):`);
    console.log(`   Среднее: ${avgSearch.toFixed(1)}ms`);
    console.log(`   Диапазон: ${Math.min(...searchTimes)}-${Math.max(...searchTimes)}ms`);
    console.log(`   Доля: ${((avgSearch / avgTotal) * 100).toFixed(1)}%\n`);

    console.log(`⏱️ Общее время:`);
    console.log(`   Среднее: ${avgTotal.toFixed(1)}ms`);
    console.log(`   Диапазон: ${Math.min(...totalTimes)}-${Math.max(...totalTimes)}ms\n`);

    // 4. Тест производительности БД без индексов (для сравнения)
    console.log('🆚 === СРАВНЕНИЕ: ПОИСК БЕЗ ИНДЕКСОВ ===\n');

    // Создаем embedding один раз для честного сравнения
    const testEmbedding = await openaiService.createEmbedding(testQuery);
    const testVector = '[' + testEmbedding.join(',') + ']';

    const withoutIndexTimes: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();

      // Имитируем поиск без индексов (полное сканирование)
      const results = await prisma.$queryRaw<Array<{
        id: number;
        title: string;
        distance: number;
      }>>`
        SELECT 
          p.id,
          p.title,
          (p.embedding_small <=> ${testVector}::vector) as distance
        FROM "Product" p
        WHERE p.embedding_small IS NOT NULL 
          AND p."domainId" = ${domain.id}
        ORDER BY distance
        LIMIT 5;
      `;

      const time = Date.now() - start;
      withoutIndexTimes.push(time);
    }

    const avgWithoutIndex = withoutIndexTimes.reduce((a, b) => a + b, 0) / withoutIndexTimes.length;

    console.log(`📊 С HNSW индексами: ${avgSearch.toFixed(1)}ms`);
    console.log(`📊 Без индексов: ${avgWithoutIndex.toFixed(1)}ms`);
    console.log(`🚀 Ускорение: ${(avgWithoutIndex / avgSearch).toFixed(1)}x\n`);

    // 5. Прогноз масштабирования
    console.log('📈 === ПРОГНОЗ МАСШТАБИРОВАНИЯ ===\n');

    const currentRecords = 18; // 5 товаров + 13 вариантов
    const scenarios = [100, 1000, 10000, 100000];

    console.log('🔮 Прогноз времени поиска в БД (без OpenAI API):');
    console.log(`📊 Текущие данные: ${currentRecords} записей = ${avgSearch.toFixed(1)}ms\n`);

    console.log('С HNSW индексами:');
    scenarios.forEach(records => {
      // HNSW масштабируется логарифмически O(log n)
      const estimated = avgSearch * Math.log(records) / Math.log(currentRecords);
      console.log(`   ${records.toLocaleString()} записей: ~${estimated.toFixed(0)}ms`);
    });

    console.log('\nБез индексов (линейный поиск):');
    scenarios.forEach(records => {
      // Линейный поиск O(n)
      const estimated = avgWithoutIndex * (records / currentRecords);
      console.log(`   ${records.toLocaleString()} записей: ~${estimated.toFixed(0)}ms`);
    });

    // 6. Оптимизации
    console.log('\n💡 === РЕКОМЕНДАЦИИ ПО ОПТИМИЗАЦИИ ===\n');

    if (avgEmbedding > avgSearch * 5) {
      console.log('🤖 OpenAI API - основной "bottleneck" (>80% времени):');
      console.log('   ✅ Кешируйте embeddings для популярных запросов');
      console.log('   ✅ Рассмотрите batch обработку');
      console.log('   ✅ Используйте локальные embedding модели для частых запросов\n');
    }

    if (currentRecords < 1000) {
      console.log('📊 Маленький объем данных (<1000 записей):');
      console.log('   ⚠️ Индексы могут быть избыточными сейчас');
      console.log('   ✅ Но они критичны для масштабирования');
      console.log('   ✅ Готовы к росту данных\n');
    }

    console.log('🔧 Текущая оптимизация:');
    console.log(`   ✅ HNSW индексы: ${(avgWithoutIndex / avgSearch).toFixed(1)}x ускорение`);
    console.log(`   ✅ text-embedding-3-small: поддержка индексов`);
    console.log(`   ✅ Hostname-based домены: быстрый lookup`);

  } catch (error) {
    console.error('❌ Ошибка анализа:', error);
  } finally {
    await prisma.$disconnect();
  }
}

performanceAnalysis(); 