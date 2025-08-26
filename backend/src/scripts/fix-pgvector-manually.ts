import dotenv from 'dotenv';
import path from 'path';

// Загружаем переменные окружения
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import prisma from '../db/prisma';

async function fixPgvectorManually() {
  console.log('🔧 Исправляем pgvector настройки вручную...\n');

  try {
    // 1. Проверяем текущее состояние
    console.log('📊 === ШАГ 1: ПРОВЕРКА ТЕКУЩЕГО СОСТОЯНИЯ ===');
    
    try {
      const productColumns = await prisma.$queryRaw<Array<{ column_name: string; data_type: string }>>`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'Product' AND column_name = 'embedding';
      `;
      
      console.log('Product embedding колонка:', productColumns[0] || 'не найдена');
    } catch (error: any) {
      console.log(`❌ Ошибка проверки колонок: ${error.message}`);
    }

    // 2. Удаляем старые индексы если есть
    console.log('\n🗑️ === ШАГ 2: УДАЛЕНИЕ СТАРЫХ ИНДЕКСОВ ===');
    
    const indicesToDrop = [
      'idx_product_embedding_cosine',
      'idx_variant_embedding_cosine', 
      'idx_product_embedding_l2',
      'idx_variant_embedding_l2'
    ];

    for (const indexName of indicesToDrop) {
      try {
        await prisma.$queryRaw`DROP INDEX IF EXISTS ${indexName}`;
        console.log(`✅ Удален индекс: ${indexName}`);
      } catch (error: any) {
        console.log(`⚠️ Индекс ${indexName} не найден или не удален: ${error.message}`);
      }
    }

    // 3. Проверяем поддержку HNSW
    console.log('\n🔍 === ШАГ 3: ПРОВЕРКА ПОДДЕРЖКИ HNSW ===');
    
    try {
      const hnsw = await prisma.$queryRaw<Array<{ name: string }>>`
        SELECT amname as name 
        FROM pg_am 
        WHERE amname = 'hnsw';
      `;
      
      if (hnsw.length > 0) {
        console.log('✅ HNSW метод доступен');
      } else {
        console.log('❌ HNSW метод недоступен, будем использовать простые индексы');
      }
    } catch (error: any) {
      console.log(`❌ Ошибка проверки HNSW: ${error.message}`);
    }

    // 4. Создаем HNSW индексы если поддерживаются
    console.log('\n🏗️ === ШАГ 4: СОЗДАНИЕ HNSW ИНДЕКСОВ ===');
    
    try {
      // Пробуем создать HNSW индекс для косинусного расстояния
      await prisma.$queryRaw`
        CREATE INDEX IF NOT EXISTS idx_product_embedding_hnsw_cosine 
        ON "Product" USING hnsw (embedding vector_cosine_ops);
      `;
      console.log('✅ Создан HNSW индекс для Product (cosine)');

      await prisma.$queryRaw`
        CREATE INDEX IF NOT EXISTS idx_variant_embedding_hnsw_cosine 
        ON "ProductVariant" USING hnsw (embedding vector_cosine_ops);
      `;
      console.log('✅ Создан HNSW индекс для ProductVariant (cosine)');

    } catch (error: any) {
      console.log(`❌ Не удалось создать HNSW индексы: ${error.message}`);
      
      // Fallback: создаем простые B-tree индексы
      console.log('\n📝 Создаем простые индексы как fallback...');
      try {
        await prisma.$queryRaw`
          CREATE INDEX IF NOT EXISTS idx_product_embedding_btree 
          ON "Product" (embedding);
        `;
        console.log('✅ Создан B-tree индекс для Product');

        await prisma.$queryRaw`
          CREATE INDEX IF NOT EXISTS idx_variant_embedding_btree 
          ON "ProductVariant" (embedding);
        `;
        console.log('✅ Создан B-tree индекс для ProductVariant');
      } catch (fallbackError: any) {
        console.log(`❌ Даже простые индексы не создались: ${fallbackError.message}`);
      }
    }

    // 5. Тестируем работу векторного поиска
    console.log('\n🧪 === ШАГ 5: ТЕСТ ВЕКТОРНОГО ПОИСКА ===');
    
    try {
      // Создаем тестовый вектор
      const testVector = Array(3072).fill(0).map(() => Math.random());
      const testVectorStr = '[' + testVector.join(',') + ']';

      // Тестируем косинусное расстояние
      const testResult = await prisma.$queryRaw<Array<{ distance: number }>>`
        SELECT (embedding <=> ${testVectorStr}::vector) as distance 
        FROM "Product" 
        WHERE embedding IS NOT NULL 
        LIMIT 1;
      `;

      if (testResult.length > 0) {
        console.log(`✅ Векторный поиск работает! Тестовое расстояние: ${testResult[0].distance}`);
      } else {
        console.log('⚠️ Нет данных для тестирования, но синтаксис правильный');
      }

    } catch (error: any) {
      console.log(`❌ Ошибка тестирования векторного поиска: ${error.message}`);
    }

  } catch (error) {
    console.error('❌ Общая ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPgvectorManually(); 