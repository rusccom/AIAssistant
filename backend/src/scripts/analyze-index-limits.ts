import dotenv from 'dotenv';
import path from 'path';

// Загружаем переменные окружения
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import prisma from '../db/prisma';

async function analyzeIndexLimits() {
  console.log('🔍 Анализируем ограничения индексов pgvector...\n');

  try {
    // 1. Проверяем поддерживаемые методы индексации
    console.log('📊 === ШАГ 1: ДОСТУПНЫЕ МЕТОДЫ ИНДЕКСАЦИИ ===');
    
    const indexMethods = await prisma.$queryRaw<Array<{ amname: string }>>`
      SELECT amname 
      FROM pg_am 
      WHERE amname IN ('ivfflat', 'hnsw', 'btree', 'gin', 'gist');
    `;
    
    console.log('Доступные методы индексации:');
    indexMethods.forEach(method => {
      console.log(`   ✅ ${method.amname}`);
    });

    // 2. Проверяем ограничения размерности
    console.log('\n📏 === ШАГ 2: ОГРАНИЧЕНИЯ РАЗМЕРНОСТИ ===');
    
    console.log('🔢 Известные ограничения pgvector:');
    console.log('   📌 IVFFlat: максимум 2000 измерений');
    console.log('   📌 HNSW: максимум 2000 измерений');
    console.log('   📌 Наши embeddings: 3072 измерения (text-embedding-3-large)');
    console.log('   ❌ ПРОБЛЕМА: 3072 > 2000 = нет индексов!');

    // 3. Тестируем создание индексов с разными размерностями
    console.log('\n🧪 === ШАГ 3: ТЕСТИРОВАНИЕ СОЗДАНИЯ ИНДЕКСОВ ===');
    
    // Создаем тестовую таблицу
    await prisma.$queryRaw`
      CREATE TABLE IF NOT EXISTS test_vectors (
        id SERIAL PRIMARY KEY,
        vec_1536 vector(1536),
        vec_2000 vector(2000),
        vec_3072 vector(3072)
      );
    `;
    console.log('✅ Тестовая таблица создана');

    // Тест 1: 1536 измерений (text-embedding-3-small)
    try {
      await prisma.$queryRaw`
        CREATE INDEX IF NOT EXISTS test_idx_1536_hnsw 
        ON test_vectors USING hnsw (vec_1536 vector_cosine_ops);
      `;
      console.log('✅ HNSW индекс для 1536 измерений: УСПЕШНО');
    } catch (error: any) {
      console.log(`❌ HNSW индекс для 1536 измерений: ${error.message}`);
    }

    // Тест 2: 2000 измерений (граница)
    try {
      await prisma.$queryRaw`
        CREATE INDEX IF NOT EXISTS test_idx_2000_hnsw 
        ON test_vectors USING hnsw (vec_2000 vector_cosine_ops);
      `;
      console.log('✅ HNSW индекс для 2000 измерений: УСПЕШНО');
    } catch (error: any) {
      console.log(`❌ HNSW индекс для 2000 измерений: ${error.message}`);
    }

    // Тест 3: 3072 измерения (наши текущие)
    try {
      await prisma.$queryRaw`
        CREATE INDEX IF NOT EXISTS test_idx_3072_hnsw 
        ON test_vectors USING hnsw (vec_3072 vector_cosine_ops);
      `;
      console.log('✅ HNSW индекс для 3072 измерений: УСПЕШНО');
    } catch (error: any) {
      console.log(`❌ HNSW индекс для 3072 измерений: ${error.message}`);
    }

    // 4. Проверяем версию pgvector
    console.log('\n📦 === ШАГ 4: ВЕРСИЯ PGVECTOR ===');
    
    try {
      const extensions = await prisma.$queryRaw<Array<{ extname: string; extversion: string }>>`
        SELECT extname, extversion 
        FROM pg_extension 
        WHERE extname = 'vector';
      `;
      
      if (extensions.length > 0) {
        console.log(`pgvector версия: ${extensions[0].extversion}`);
        
        // Версии и их ограничения
        const version = extensions[0].extversion;
        if (version.startsWith('0.4') || version.startsWith('0.5')) {
          console.log('📋 Ограничения этой версии:');
          console.log('   - IVFFlat: до 2000 измерений');
          console.log('   - HNSW: до 2000 измерений');
        } else if (version.startsWith('0.6') || version.startsWith('0.7')) {
          console.log('📋 Возможные улучшения в новых версиях:');
          console.log('   - Проверьте документацию для актуальных лимитов');
        }
      }
    } catch (error: any) {
      console.log(`❌ Не удалось определить версию: ${error.message}`);
    }

    // 5. Оценка производительности без индексов
    console.log('\n⚡ === ШАГ 5: АНАЛИЗ ПРОИЗВОДИТЕЛЬНОСТИ ===');
    
    const productCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM "Product" WHERE embedding IS NOT NULL;
    `;
    
    const variantCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM "ProductVariant" WHERE embedding IS NOT NULL;
    `;

    const totalRecords = Number(productCount[0].count) + Number(variantCount[0].count);
    console.log(`📊 Текущие данные: ${totalRecords} записей с embeddings`);
    console.log(`⚡ Текущее время поиска: ~620ms (без индексов)`);
    
    // Прогноз масштабирования
    const projections = [1000, 10000, 100000];
    console.log('\n📈 Прогноз времени поиска без индексов:');
    projections.forEach(records => {
      const estimatedTime = Math.round((620 * records) / totalRecords);
      console.log(`   ${records.toLocaleString()} записей: ~${estimatedTime}ms`);
    });

    // 6. Рекомендации по решению
    console.log('\n💡 === ШАГ 6: РЕКОМЕНДАЦИИ ===');
    
    console.log('🎯 ВАРИАНТЫ РЕШЕНИЯ:');
    console.log('');
    console.log('1️⃣ ПЕРЕХОД НА text-embedding-3-small (1536 измерений):');
    console.log('   ✅ Поддерживает HNSW/IVFFlat индексы');
    console.log('   ✅ Быстрый поиск с индексами');
    console.log('   ❌ Чуть меньшая точность embeddings');
    console.log('   💰 Дешевле в использовании OpenAI API');
    console.log('');
    console.log('2️⃣ REDUCTION/PCA до 2000 измерений:');
    console.log('   ✅ Сохраняет большую часть информации');
    console.log('   ✅ Поддерживает индексы');
    console.log('   ❌ Сложность в реализации');
    console.log('   ❌ Потеря некоторой точности');
    console.log('');
    console.log('3️⃣ ПРОДОЛЖИТЬ БЕЗ ИНДЕКСОВ:');
    console.log('   ✅ Максимальная точность');
    console.log('   ✅ Простота реализации');
    console.log('   ❌ Медленный поиск при росте данных');
    console.log('   ❌ Не масштабируется');

    // Очистка тестовой таблицы
    await prisma.$queryRaw`DROP TABLE IF EXISTS test_vectors;`;
    console.log('\n🧹 Тестовая таблица удалена');

  } catch (error) {
    console.error('❌ Ошибка анализа:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeIndexLimits(); 