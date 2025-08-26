import dotenv from 'dotenv';
import path from 'path';

// Загружаем переменные окружения
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import prisma from '../db/prisma';
import openaiService from '../services/openai.service';

async function migrateToSmallEmbeddings() {
  console.log('🔄 Миграция на text-embedding-3-small (1536 измерений)...\n');

  try {
    // 1. Создаем новые колонки для маленьких embeddings
    console.log('📊 === ШАГ 1: СОЗДАНИЕ НОВЫХ КОЛОНОК ===');
    
    try {
      await prisma.$queryRaw`
        ALTER TABLE "Product" ADD COLUMN embedding_small vector(1536);
      `;
      console.log('✅ Создана колонка Product.embedding_small');
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log('⚠️ Колонка Product.embedding_small уже существует');
      } else {
        throw error;
      }
    }

    try {
      await prisma.$queryRaw`
        ALTER TABLE "ProductVariant" ADD COLUMN embedding_small vector(1536);
      `;
      console.log('✅ Создана колонка ProductVariant.embedding_small');
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log('⚠️ Колонка ProductVariant.embedding_small уже существует');
      } else {
        throw error;
      }
    }

    // 2. Получаем товары для обновления
    console.log('\n🔄 === ШАГ 2: ОБНОВЛЕНИЕ EMBEDDINGS ===');
    
    const products = await prisma.$queryRaw<Array<{
      id: number;
      title: string;
      description: string | null;
    }>>`
      SELECT id, title, description
      FROM "Product"
      WHERE embedding_small IS NULL;
    `;

    console.log(`📦 Найдено ${products.length} товаров для обновления`);

    // Обновляем embeddings для товаров
    for (const product of products) {
      const text = `${product.title} ${product.description || ''}`.trim();
      
      try {
        // Используем text-embedding-3-small вместо text-embedding-3-large
        const response = await openaiService.getClient().embeddings.create({
          model: 'text-embedding-3-small', // 1536 измерений
          input: text,
          encoding_format: 'float'
        });
        
        const embedding = response.data[0].embedding;
        const embeddingVector = '[' + embedding.join(',') + ']';
        
        await prisma.$queryRaw`
          UPDATE "Product" 
          SET embedding_small = ${embeddingVector}::vector 
          WHERE id = ${product.id};
        `;
        
        console.log(`✅ Обновлен embedding для товара: ${product.title}`);
      } catch (error: any) {
        console.log(`❌ Ошибка для товара ${product.title}: ${error.message}`);
      }
    }

    // 3. Получаем варианты для обновления
    const variants = await prisma.$queryRaw<Array<{
      id: number;
      title: string;
      product_id: number;
      product_title: string;
      product_description: string | null;
    }>>`
      SELECT 
        pv.id,
        pv.title,
        p.id as product_id,
        p.title as product_title,
        p.description as product_description
      FROM "ProductVariant" pv
      JOIN "Product" p ON p.id = pv."productId"
      WHERE pv.embedding_small IS NULL;
    `;

    console.log(`📦 Найдено ${variants.length} вариантов для обновления`);

    // Обновляем embeddings для вариантов
    for (const variant of variants) {
      const text = `${variant.product_title} ${variant.title} ${variant.product_description || ''}`.trim();
      
      try {
        const response = await openaiService.getClient().embeddings.create({
          model: 'text-embedding-3-small', // 1536 измерений
          input: text,
          encoding_format: 'float'
        });
        
        const embedding = response.data[0].embedding;
        const embeddingVector = '[' + embedding.join(',') + ']';
        
        await prisma.$queryRaw`
          UPDATE "ProductVariant" 
          SET embedding_small = ${embeddingVector}::vector 
          WHERE id = ${variant.id};
        `;
        
        console.log(`✅ Обновлен embedding для варианта: ${variant.product_title} ${variant.title}`);
      } catch (error: any) {
        console.log(`❌ Ошибка для варианта ${variant.title}: ${error.message}`);
      }
    }

    // 4. Создаем HNSW индексы для быстрого поиска
    console.log('\n🏗️ === ШАГ 3: СОЗДАНИЕ ИНДЕКСОВ ===');
    
    try {
      await prisma.$queryRaw`
        CREATE INDEX IF NOT EXISTS idx_product_embedding_small_hnsw 
        ON "Product" USING hnsw (embedding_small vector_cosine_ops);
      `;
      console.log('✅ HNSW индекс для Product.embedding_small создан');
    } catch (error: any) {
      console.log(`❌ Ошибка создания индекса Product: ${error.message}`);
    }

    try {
      await prisma.$queryRaw`
        CREATE INDEX IF NOT EXISTS idx_variant_embedding_small_hnsw 
        ON "ProductVariant" USING hnsw (embedding_small vector_cosine_ops);
      `;
      console.log('✅ HNSW индекс для ProductVariant.embedding_small создан');
    } catch (error: any) {
      console.log(`❌ Ошибка создания индекса ProductVariant: ${error.message}`);
    }

    // 5. Тестируем производительность с индексами
    console.log('\n⚡ === ШАГ 4: ТЕСТ ПРОИЗВОДИТЕЛЬНОСТИ ===');
    
    // Создаем тестовый вектор 1536 измерений
    const testResponse = await openaiService.getClient().embeddings.create({
      model: 'text-embedding-3-small',
      input: 'iPhone test query',
      encoding_format: 'float'
    });
    
    const testVector = '[' + testResponse.data[0].embedding.join(',') + ']';
    
    // Тестируем скорость с индексами
    const iterations = 5;
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      
      await prisma.$queryRaw`
        SELECT 
          id,
          title,
          (embedding_small <=> ${testVector}::vector) as distance
        FROM "Product"
        WHERE embedding_small IS NOT NULL
        ORDER BY embedding_small <=> ${testVector}::vector
        LIMIT 5;
      `;
      
      const end = Date.now();
      times.push(end - start);
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(`⚡ Среднее время поиска с индексами: ${avgTime.toFixed(1)}ms`);
    console.log(`📊 Времена: ${times.join(', ')}ms`);

    // 6. Сравнение качества результатов
    console.log('\n🎯 === ШАГ 5: СРАВНЕНИЕ КАЧЕСТВА ===');
    
    const testQueries = ['iPhone', 'кофе', 'наушники'];
    
    for (const query of testQueries) {
      console.log(`\n🔍 Тестовый запрос: "${query}"`);
      
      // Создаем embedding для запроса
      const queryResponse = await openaiService.getClient().embeddings.create({
        model: 'text-embedding-3-small',
        input: query,
        encoding_format: 'float'
      });
      
      const queryVector = '[' + queryResponse.data[0].embedding.join(',') + ']';
      
      // Поиск с новыми embeddings
      const smallResults = await prisma.$queryRaw<Array<{
        title: string;
        distance: number;
      }>>`
        SELECT 
          title,
          (embedding_small <=> ${queryVector}::vector) as distance
        FROM "Product"
        WHERE embedding_small IS NOT NULL
        ORDER BY embedding_small <=> ${queryVector}::vector
        LIMIT 3;
      `;
      
      console.log('   📊 Результаты с text-embedding-3-small:');
      smallResults.forEach((result, idx) => {
        const similarity = (1 - result.distance) * 100;
        console.log(`      ${idx + 1}. ${result.title} (${similarity.toFixed(1)}%)`);
      });
    }

    console.log('\n🎉 МИГРАЦИЯ ЗАВЕРШЕНА! 🎉');
    console.log('');
    console.log('💡 СЛЕДУЮЩИЕ ШАГИ:');
    console.log('1. Обновите openai.service.ts для использования text-embedding-3-small');
    console.log('2. Обновите semantic-search.service.ts для использования embedding_small');
    console.log('3. После тестирования удалите старые embedding колонки');

  } catch (error) {
    console.error('❌ Ошибка миграции:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateToSmallEmbeddings(); 