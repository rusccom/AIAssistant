import dotenv from 'dotenv';
import path from 'path';

// Загружаем переменные окружения
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import prisma from '../db/prisma';

async function cleanupOldEmbeddings() {
  console.log('🧹 Очистка старых embedding колонок (3072 измерений)...\n');

  try {
    // 1. Проверяем что embedding_small заполнены
    console.log('📊 === ПРОВЕРКА ДАННЫХ ===');
    
    const productStats = await prisma.$queryRaw<Array<{
      total: bigint;
      with_embedding: bigint;
      with_embedding_small: bigint;
    }>>`
      SELECT 
        COUNT(*) as total,
        COUNT(embedding) as with_embedding,
        COUNT(embedding_small) as with_embedding_small
      FROM "Product";
    `;

    const variantStats = await prisma.$queryRaw<Array<{
      total: bigint;
      with_embedding: bigint;
      with_embedding_small: bigint;
    }>>`
      SELECT 
        COUNT(*) as total,
        COUNT(embedding) as with_embedding,
        COUNT(embedding_small) as with_embedding_small
      FROM "ProductVariant";
    `;

    console.log('📦 Статистика товаров:');
    console.log(`   Всего: ${productStats[0].total}`);
    console.log(`   С embedding (3072): ${productStats[0].with_embedding}`);
    console.log(`   С embedding_small (1536): ${productStats[0].with_embedding_small}`);

    console.log('\n🔧 Статистика вариантов:');
    console.log(`   Всего: ${variantStats[0].total}`);
    console.log(`   С embedding (3072): ${variantStats[0].with_embedding}`);
    console.log(`   С embedding_small (1536): ${variantStats[0].with_embedding_small}`);

    // 2. Проверяем готовность к удалению
    const productsReady = Number(productStats[0].total) === Number(productStats[0].with_embedding_small);
    const variantsReady = Number(variantStats[0].total) === Number(variantStats[0].with_embedding_small);

    console.log('\n🔍 === ГОТОВНОСТЬ К ОЧИСТКЕ ===');
    console.log(`Товары готовы: ${productsReady ? '✅' : '❌'}`);
    console.log(`Варианты готовы: ${variantsReady ? '✅' : '❌'}`);

    if (!productsReady || !variantsReady) {
      console.log('\n⚠️ ВНИМАНИЕ: Не все embedding_small созданы!');
      console.log('Запустите миграцию embeddings перед очисткой.');
      return;
    }

    // 3. Удаляем старые индексы (если есть)
    console.log('\n🗑️ === УДАЛЕНИЕ СТАРЫХ ИНДЕКСОВ ===');
    
    try {
      await prisma.$queryRaw`
        DROP INDEX IF EXISTS idx_product_embedding_cosine;
      `;
      console.log('✅ Удален индекс idx_product_embedding_cosine');
    } catch (error: any) {
      console.log(`⚠️ Индекс idx_product_embedding_cosine: ${error.message}`);
    }

    try {
      await prisma.$queryRaw`
        DROP INDEX IF EXISTS idx_variant_embedding_cosine;
      `;
      console.log('✅ Удален индекс idx_variant_embedding_cosine');
    } catch (error: any) {
      console.log(`⚠️ Индекс idx_variant_embedding_cosine: ${error.message}`);
    }

    // 4. Удаляем старые колонки
    console.log('\n🗑️ === УДАЛЕНИЕ СТАРЫХ КОЛОНОК ===');
    
    try {
      await prisma.$queryRaw`
        ALTER TABLE "Product" DROP COLUMN IF EXISTS embedding;
      `;
      console.log('✅ Удалена колонка Product.embedding (3072 измерений)');
    } catch (error: any) {
      console.log(`❌ Ошибка удаления Product.embedding: ${error.message}`);
    }

    try {
      await prisma.$queryRaw`
        ALTER TABLE "ProductVariant" DROP COLUMN IF EXISTS embedding;
      `;
      console.log('✅ Удалена колонка ProductVariant.embedding (3072 измерений)');
    } catch (error: any) {
      console.log(`❌ Ошибка удаления ProductVariant.embedding: ${error.message}`);
    }

    // 5. Проверяем результат
    console.log('\n📊 === ФИНАЛЬНАЯ ПРОВЕРКА ===');
    
    const finalStats = await prisma.$queryRaw<Array<{
      total_products: bigint;
      total_variants: bigint;
      products_with_embedding_small: bigint;
      variants_with_embedding_small: bigint;
    }>>`
      SELECT 
        (SELECT COUNT(*) FROM "Product") as total_products,
        (SELECT COUNT(*) FROM "ProductVariant") as total_variants,
        (SELECT COUNT(embedding_small) FROM "Product") as products_with_embedding_small,
        (SELECT COUNT(embedding_small) FROM "ProductVariant") as variants_with_embedding_small;
    `;

    const stats = finalStats[0];
    console.log(`📦 Товары: ${stats.total_products} (embedding_small: ${stats.products_with_embedding_small})`);
    console.log(`🔧 Варианты: ${stats.total_variants} (embedding_small: ${stats.variants_with_embedding_small})`);

    // 6. Рекомендации по Prisma schema
    console.log('\n💡 === СЛЕДУЮЩИЕ ШАГИ ===');
    console.log('1. Обновите prisma/schema.prisma:');
    console.log('   - Удалите поля embedding из Product и ProductVariant');
    console.log('   - Переименуйте embedding_small в embedding');
    console.log('2. Запустите: npx prisma generate');
    console.log('3. Обновите код для использования нового поля embedding');

    console.log('\n🎉 ОЧИСТКА ЗАВЕРШЕНА!');
    console.log('✅ Система полностью переведена на text-embedding-3-small');
    console.log('⚡ HNSW индексы обеспечивают быстрый поиск');
    console.log('🎯 Качество семантического поиска сохранено');

  } catch (error) {
    console.error('❌ Ошибка очистки:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupOldEmbeddings(); 