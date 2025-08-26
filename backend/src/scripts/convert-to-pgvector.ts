import dotenv from 'dotenv';
import path from 'path';

// Загружаем переменные окружения
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import prisma from '../db/prisma';

async function convertToPgvector() {
  console.log('🚀 Конвертируем Float[] в pgvector...\n');

  try {
    // 1. Включаем pgvector расширение
    console.log('📦 === ШАГ 1: ВКЛЮЧЕНИЕ PGVECTOR ===');
    await prisma.$queryRaw`CREATE EXTENSION IF NOT EXISTS vector`;
    console.log('✅ pgvector расширение подключено');

    // 2. Проверяем текущие колонки
    console.log('\n📊 === ШАГ 2: ПРОВЕРКА ТЕКУЩИХ КОЛОНОК ===');
    const productCol = await prisma.$queryRaw<Array<{ data_type: string }>>`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Product' AND column_name = 'embedding';
    `;
    console.log(`Product embedding тип: ${productCol[0]?.data_type}`);

    // 3. Переименовываем существующие колонки
    console.log('\n🔄 === ШАГ 3: ПЕРЕИМЕНОВАНИЕ КОЛОНОК ===');
    try {
      await prisma.$queryRaw`ALTER TABLE "Product" RENAME COLUMN "embedding" TO "embedding_old"`;
      console.log('✅ Product.embedding → embedding_old');
    } catch (error: any) {
      if (error.message.includes('does not exist')) {
        console.log('⚠️ Колонка Product.embedding_old уже существует');
      } else {
        throw error;
      }
    }

    try {
      await prisma.$queryRaw`ALTER TABLE "ProductVariant" RENAME COLUMN "embedding" TO "embedding_old"`;
      console.log('✅ ProductVariant.embedding → embedding_old');
    } catch (error: any) {
      if (error.message.includes('does not exist')) {
        console.log('⚠️ Колонка ProductVariant.embedding_old уже существует');
      } else {
        throw error;
      }
    }

    // 4. Создаем новые vector колонки
    console.log('\n➕ === ШАГ 4: СОЗДАНИЕ VECTOR КОЛОНОК ===');
    try {
      await prisma.$queryRaw`ALTER TABLE "Product" ADD COLUMN "embedding" vector(3072)`;
      console.log('✅ Создана Product.embedding vector(3072)');
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log('⚠️ Колонка Product.embedding уже существует');
      } else {
        throw error;
      }
    }

    try {
      await prisma.$queryRaw`ALTER TABLE "ProductVariant" ADD COLUMN "embedding" vector(3072)`;
      console.log('✅ Создана ProductVariant.embedding vector(3072)');
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log('⚠️ Колонка ProductVariant.embedding уже существует');
      } else {
        throw error;
      }
    }

    // 5. Копируем данные
    console.log('\n📋 === ШАГ 5: КОПИРОВАНИЕ ДАННЫХ ===');
    
    // Подсчет записей для копирования
    const productCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count 
      FROM "Product" 
      WHERE "embedding_old" IS NOT NULL 
      AND array_length("embedding_old", 1) = 3072;
    `;
    console.log(`Товаров для копирования: ${productCount[0].count}`);

    const variantCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count 
      FROM "ProductVariant" 
      WHERE "embedding_old" IS NOT NULL 
      AND array_length("embedding_old", 1) = 3072;
    `;
    console.log(`Вариантов для копирования: ${variantCount[0].count}`);

    // Копируем данные
    if (Number(productCount[0].count) > 0) {
      await prisma.$queryRaw`
        UPDATE "Product" 
        SET "embedding" = "embedding_old"::vector 
        WHERE "embedding_old" IS NOT NULL 
        AND array_length("embedding_old", 1) = 3072;
      `;
      console.log('✅ Данные Product скопированы');
    }

    if (Number(variantCount[0].count) > 0) {
      await prisma.$queryRaw`
        UPDATE "ProductVariant" 
        SET "embedding" = "embedding_old"::vector 
        WHERE "embedding_old" IS NOT NULL 
        AND array_length("embedding_old", 1) = 3072;
      `;
      console.log('✅ Данные ProductVariant скопированы');
    }

    // 6. Удаляем старые колонки
    console.log('\n🗑️ === ШАГ 6: УДАЛЕНИЕ СТАРЫХ КОЛОНОК ===');
    await prisma.$queryRaw`ALTER TABLE "Product" DROP COLUMN IF EXISTS "embedding_old"`;
    await prisma.$queryRaw`ALTER TABLE "ProductVariant" DROP COLUMN IF EXISTS "embedding_old"`;
    console.log('✅ Старые колонки удалены');

    // 7. Создаем HNSW индексы
    console.log('\n🏗️ === ШАГ 7: СОЗДАНИЕ HNSW ИНДЕКСОВ ===');
    
    await prisma.$queryRaw`
      CREATE INDEX IF NOT EXISTS idx_product_embedding_hnsw_cosine 
      ON "Product" USING hnsw (embedding vector_cosine_ops);
    `;
    console.log('✅ HNSW индекс для Product (cosine)');

    await prisma.$queryRaw`
      CREATE INDEX IF NOT EXISTS idx_variant_embedding_hnsw_cosine 
      ON "ProductVariant" USING hnsw (embedding vector_cosine_ops);
    `;
    console.log('✅ HNSW индекс для ProductVariant (cosine)');

    // 8. Тестируем векторный поиск
    console.log('\n🧪 === ШАГ 8: ТЕСТ ВЕКТОРНОГО ПОИСКА ===');
    
    const testVector = Array(3072).fill(0).map(() => Math.random());
    const testVectorStr = '[' + testVector.join(',') + ']';

    const testResult = await prisma.$queryRaw<Array<{ id: number; distance: number }>>`
      SELECT id, (embedding <=> ${testVectorStr}::vector) as distance 
      FROM "Product" 
      WHERE embedding IS NOT NULL 
      ORDER BY embedding <=> ${testVectorStr}::vector
      LIMIT 3;
    `;

    if (testResult.length > 0) {
      console.log('✅ Векторный поиск работает!');
      testResult.forEach((result, idx) => {
        console.log(`   ${idx + 1}. Product ID ${result.id}, distance: ${result.distance.toFixed(4)}`);
      });
    } else {
      console.log('⚠️ Нет данных для тестирования, но синтаксис работает');
    }

    console.log('\n🎉 КОНВЕРТАЦИЯ В PGVECTOR ЗАВЕРШЕНА УСПЕШНО! 🎉');

  } catch (error) {
    console.error('❌ Ошибка конвертации:', error);
  } finally {
    await prisma.$disconnect();
  }
}

convertToPgvector(); 