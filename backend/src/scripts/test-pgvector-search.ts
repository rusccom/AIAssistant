import dotenv from 'dotenv';
import path from 'path';

// Загружаем переменные окружения
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import prisma from '../db/prisma';

async function testPgvectorSearch() {
  console.log('🧪 Тестируем pgvector поиск без индексов...\n');

  try {
    // 1. Создаем тестовый поисковый вектор (симуляция embedding для "iPhone")
    console.log('📱 === ШАГ 1: ПОИСК iPhone ===');
    
    // Используем embedding слова "iPhone" (упрощенный тест)
    const iphoneQuery = Array(3072).fill(0);
    // Добавляем некоторые "характерные" значения для iPhone
    for (let i = 0; i < 100; i++) {
      iphoneQuery[i] = Math.random() * 0.5 + 0.3; // числа от 0.3 до 0.8
    }
    const iphoneVector = '[' + iphoneQuery.join(',') + ']';

    // Прямой SQL поиск с pgvector
    const pgvectorResults = await prisma.$queryRaw<Array<{
      id: number;
      title: string;
      distance: number;
    }>>`
      SELECT 
        p.id,
        p.title,
        (p.embedding <=> ${iphoneVector}::vector) as distance
      FROM "Product" p
      WHERE p.embedding IS NOT NULL
      ORDER BY p.embedding <=> ${iphoneVector}::vector
      LIMIT 5;
    `;

    console.log('🔍 Результаты pgvector поиска:');
    pgvectorResults.forEach((result, idx) => {
      console.log(`   ${idx + 1}. ${result.title} (distance: ${result.distance.toFixed(4)})`);
    });

    // 2. Тестируем поиск по вариантам
    console.log('\n📦 === ШАГ 2: ПОИСК ПО ВАРИАНТАМ ===');
    
    const variantResults = await prisma.$queryRaw<Array<{
      product_title: string;
      variant_title: string;
      distance: number;
    }>>`
      SELECT 
        p.title as product_title,
        pv.title as variant_title,
        (pv.embedding <=> ${iphoneVector}::vector) as distance
      FROM "ProductVariant" pv
      JOIN "Product" p ON p.id = pv."productId"
      WHERE pv.embedding IS NOT NULL
      ORDER BY pv.embedding <=> ${iphoneVector}::vector
      LIMIT 5;
    `;

    console.log('🔍 Результаты поиска по вариантам:');
    variantResults.forEach((result, idx) => {
      console.log(`   ${idx + 1}. ${result.product_title} ${result.variant_title} (distance: ${result.distance.toFixed(4)})`);
    });

    // 3. Тестируем разные функции расстояния
    console.log('\n📏 === ШАГ 3: РАЗНЫЕ ФУНКЦИИ РАССТОЯНИЯ ===');
    
    const distanceFunctions = [
      { name: 'Косинусное', operator: '<=>', description: 'Лучше для семантического поиска' },
      { name: 'L2 (Евклидово)', operator: '<->', description: 'Геометрическое расстояние' },
      { name: 'Скалярное произведение', operator: '<#>', description: 'Внутреннее произведение' }
    ];

    for (const func of distanceFunctions) {
      try {
        const result = await prisma.$queryRaw<Array<{
          title: string;
          distance: number;
        }>>`
          SELECT 
            p.title,
            (p.embedding ${func.operator} ${iphoneVector}::vector) as distance
          FROM "Product" p
          WHERE p.embedding IS NOT NULL
          ORDER BY p.embedding ${func.operator} ${iphoneVector}::vector
          LIMIT 1;
        `;

        if (result.length > 0) {
          console.log(`✅ ${func.name}: ${result[0].title} (${result[0].distance.toFixed(4)})`);
          console.log(`   📖 ${func.description}`);
        }
      } catch (error: any) {
        console.log(`❌ ${func.name}: ${error.message}`);
      }
    }

    // 4. Производительность
    console.log('\n⚡ === ШАГ 4: ТЕСТ ПРОИЗВОДИТЕЛЬНОСТИ ===');
    
    const startTime = Date.now();
    
    // Выполняем несколько поисков подряд
    for (let i = 0; i < 5; i++) {
      const randomVector = Array(3072).fill(0).map(() => Math.random());
      const vectorStr = '[' + randomVector.join(',') + ']';
      
      await prisma.$queryRaw`
        SELECT id
        FROM "Product" 
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> ${vectorStr}::vector
        LIMIT 3;
      `;
    }
    
    const endTime = Date.now();
    console.log(`⏱️ 5 поисков заняли: ${endTime - startTime}ms`);
    console.log(`📊 Среднее время поиска: ${(endTime - startTime) / 5}ms`);

    // 5. Статистика базы
    console.log('\n📊 === ШАГ 5: СТАТИСТИКА БАЗЫ ===');
    
    const stats = await prisma.$queryRaw<Array<{
      table_name: string;
      total_rows: bigint;
      with_embeddings: bigint;
      avg_dimensions: number;
    }>>`
      SELECT 
        'Product' as table_name,
        COUNT(*) as total_rows,
        COUNT(embedding) as with_embeddings,
        AVG(array_length(embedding::float[], 1)) as avg_dimensions
      FROM "Product"
      UNION ALL
      SELECT 
        'ProductVariant' as table_name,
        COUNT(*) as total_rows,
        COUNT(embedding) as with_embeddings,
        AVG(array_length(embedding::float[], 1)) as avg_dimensions
      FROM "ProductVariant";
    `;

    stats.forEach(stat => {
      console.log(`📋 ${stat.table_name}:`);
      console.log(`   Всего записей: ${stat.total_rows}`);
      console.log(`   С embeddings: ${stat.with_embeddings}`);
      console.log(`   Средняя размерность: ${stat.avg_dimensions || 'N/A'}`);
    });

    console.log('\n🎉 PGVECTOR РАБОТАЕТ УСПЕШНО! 🎉');
    console.log('💡 Хотя индексы не созданы из-за ограничения 2000 измерений,');
    console.log('   векторный поиск работает и будет быстрее чем наш старый подход!');

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPgvectorSearch(); 