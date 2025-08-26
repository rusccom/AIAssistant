import dotenv from 'dotenv';
import path from 'path';

// Загружаем переменные окружения
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import prisma from '../db/prisma';

async function createAdaptiveSearch() {
  console.log('🔧 Создаем адаптивный поиск для оптимизации малых данных...\n');

  try {
    // Создаем SQL функцию для адаптивного поиска
    await prisma.$queryRaw`
      CREATE OR REPLACE FUNCTION adaptive_product_search(
        domain_id TEXT,
        query_vector vector(1536),
        search_limit INTEGER DEFAULT 10
      )
      RETURNS TABLE(
        id INTEGER,
        title TEXT,
        description TEXT,
        distance FLOAT
      ) AS $$
      DECLARE
        record_count INTEGER;
      BEGIN
        -- Считаем количество записей для домена
        SELECT COUNT(*) INTO record_count
        FROM "Product" p
        WHERE p."domainId" = domain_id AND p.embedding_small IS NOT NULL;
        
        -- Если записей мало (<100), используем полное сканирование
        -- Если много (>=100), используем HNSW индекс
        IF record_count < 100 THEN
          -- Полное сканирование (быстрее для малых данных)
          RETURN QUERY
          SELECT 
            p.id::INTEGER,
            p.title::TEXT,
            p.description::TEXT,
            (p.embedding_small <=> query_vector)::FLOAT as distance
          FROM "Product" p
          WHERE p."domainId" = domain_id 
            AND p.embedding_small IS NOT NULL
          ORDER BY distance
          LIMIT search_limit;
        ELSE
          -- HNSW индекс (быстрее для больших данных)
          RETURN QUERY
          SELECT 
            p.id::INTEGER,
            p.title::TEXT,
            p.description::TEXT,
            (p.embedding_small <=> query_vector)::FLOAT as distance
          FROM "Product" p
          WHERE p."domainId" = domain_id 
            AND p.embedding_small IS NOT NULL
          ORDER BY p.embedding_small <=> query_vector
          LIMIT search_limit;
        END IF;
      END;
      $$ LANGUAGE plpgsql;
    `;

    console.log('✅ Создана функция adaptive_product_search');

    // Аналогично для вариантов
    await prisma.$queryRaw`
      CREATE OR REPLACE FUNCTION adaptive_variant_search(
        domain_id TEXT,
        query_vector vector(1536),
        search_limit INTEGER DEFAULT 10
      )
      RETURNS TABLE(
        id INTEGER,
        title TEXT,
        price DECIMAL,
        sku TEXT,
        distance FLOAT,
        product_id INTEGER,
        product_title TEXT,
        product_description TEXT
      ) AS $$
      DECLARE
        record_count INTEGER;
      BEGIN
        -- Считаем количество записей для домена
        SELECT COUNT(*) INTO record_count
        FROM "ProductVariant" pv
        JOIN "Product" p ON p.id = pv."productId"
        WHERE p."domainId" = domain_id AND pv.embedding_small IS NOT NULL;
        
        -- Адаптивный выбор стратегии
        IF record_count < 100 THEN
          -- Полное сканирование
          RETURN QUERY
          SELECT 
            pv.id::INTEGER,
            pv.title::TEXT,
            pv.price::DECIMAL,
            pv.sku::TEXT,
            (pv.embedding_small <=> query_vector)::FLOAT as distance,
            p.id::INTEGER as product_id,
            p.title::TEXT as product_title,
            p.description::TEXT as product_description
          FROM "ProductVariant" pv
          JOIN "Product" p ON p.id = pv."productId"
          WHERE p."domainId" = domain_id 
            AND pv.embedding_small IS NOT NULL
          ORDER BY distance
          LIMIT search_limit;
        ELSE
          -- HNSW индекс
          RETURN QUERY
          SELECT 
            pv.id::INTEGER,
            pv.title::TEXT,
            pv.price::DECIMAL,
            pv.sku::TEXT,
            (pv.embedding_small <=> query_vector)::FLOAT as distance,
            p.id::INTEGER as product_id,
            p.title::TEXT as product_title,
            p.description::TEXT as product_description
          FROM "ProductVariant" pv
          JOIN "Product" p ON p.id = pv."productId"
          WHERE p."domainId" = domain_id 
            AND pv.embedding_small IS NOT NULL
          ORDER BY pv.embedding_small <=> query_vector
          LIMIT search_limit;
        END IF;
      END;
      $$ LANGUAGE plpgsql;
    `;

    console.log('✅ Создана функция adaptive_variant_search');

    // Тестируем новые функции
    console.log('\n🧪 === ТЕСТ АДАПТИВНЫХ ФУНКЦИЙ ===');

    const domain = await prisma.domain.findFirst({
      where: { hostname: 'localhost' }
    });

    if (!domain) {
      console.log('❌ Домен не найден');
      return;
    }

    // Тестовый вектор
    const testVector = '[' + Array(1536).fill(0.1).join(',') + ']';

    const iterations = 5;
    const adaptiveTimes: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();

      const products = await prisma.$queryRaw<Array<{
        id: number;
        title: string;
        description: string | null;
        distance: number;
      }>>`
        SELECT * FROM adaptive_product_search(${domain.id}, ${testVector}::vector, 10);
      `;

      const variants = await prisma.$queryRaw<Array<{
        id: number;
        title: string;
        price: number;
        sku: string | null;
        distance: number;
        product_id: number;
        product_title: string;
        product_description: string | null;
      }>>`
        SELECT * FROM adaptive_variant_search(${domain.id}, ${testVector}::vector, 10);
      `;

      const time = Date.now() - start;
      adaptiveTimes.push(time);

      console.log(`Итерация ${i + 1}: ${time}ms (${products.length} товаров, ${variants.length} вариантов)`);
    }

    const avgAdaptive = adaptiveTimes.reduce((a, b) => a + b, 0) / adaptiveTimes.length;
    console.log(`\n⚡ Среднее время с адаптивным поиском: ${avgAdaptive.toFixed(1)}ms`);

    console.log('\n💡 === РЕКОМЕНДАЦИИ ===');
    console.log('1. Используйте адаптивные функции в production:');
    console.log('   - Автоматически выбирают оптимальную стратегию');
    console.log('   - Быстрые для малых данных');
    console.log('   - Масштабируются для больших данных');
    console.log('');
    console.log('2. Порог переключения: 100 записей');
    console.log('   - Настраивается в функции');
    console.log('   - Можно адаптировать под ваши данные');
    console.log('');
    console.log('3. Интеграция с semantic-search.service.ts:');
    console.log('   - Замените прямые SQL запросы на функции');
    console.log('   - Получите лучшую производительность');

  } catch (error) {
    console.error('❌ Ошибка создания адаптивного поиска:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdaptiveSearch(); 