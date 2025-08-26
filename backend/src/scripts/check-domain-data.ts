import dotenv from 'dotenv';
import path from 'path';

// Загружаем переменные окружения
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import prisma from '../db/prisma';

async function checkDomainData() {
  console.log('🔍 Проверяем данные доменов и товаров...\n');

  try {
    // 1. Проверяем все домены
    console.log('🌐 === ДОМЕНЫ В БАЗЕ ДАННЫХ ===');
    
    const domains = await prisma.domain.findMany({
      select: {
        id: true,
        hostname: true,
        userId: true,
        _count: {
          select: {
            products: true
          }
        }
      }
    });

    console.log(`📊 Найдено ${domains.length} доменов:`);
    domains.forEach(domain => {
      console.log(`   🌐 ID: ${domain.id}, Hostname: ${domain.hostname}, Товаров: ${domain._count.products}, User: ${domain.userId}`);
    });

    // 2. Проверяем товары и их embeddings
    console.log('\n📦 === ТОВАРЫ И EMBEDDINGS ===');
    
    const products = await prisma.$queryRaw<Array<{
      id: number;
      title: string;
      domain_id: string;
      hostname: string;
      has_embedding: boolean;
      has_embedding_small: boolean;
    }>>`
      SELECT 
        p.id,
        p.title,
        p."domainId" as domain_id,
        d.hostname,
        (p.embedding IS NOT NULL) as has_embedding,
        (p.embedding_small IS NOT NULL) as has_embedding_small
      FROM "Product" p
      JOIN "Domain" d ON d.id = p."domainId"
      ORDER BY p.id;
    `;

    console.log(`📊 Найдено ${products.length} товаров:`);
    products.forEach(product => {
      const embeddingStatus = product.has_embedding ? '✅' : '❌';
      const embeddingSmallStatus = product.has_embedding_small ? '✅' : '❌';
      console.log(`   📦 ${product.title} (Domain: ${product.hostname}, ID: ${product.domain_id})`);
      console.log(`      - embedding: ${embeddingStatus}, embedding_small: ${embeddingSmallStatus}`);
    });

    // 3. Проверяем варианты товаров
    console.log('\n🔧 === ВАРИАНТЫ ТОВАРОВ ===');
    
    const variants = await prisma.$queryRaw<Array<{
      id: number;
      title: string;
      product_title: string;
      domain_id: string;
      hostname: string;
      has_embedding: boolean;
      has_embedding_small: boolean;
    }>>`
      SELECT 
        pv.id,
        pv.title,
        p.title as product_title,
        p."domainId" as domain_id,
        d.hostname,
        (pv.embedding IS NOT NULL) as has_embedding,
        (pv.embedding_small IS NOT NULL) as has_embedding_small
      FROM "ProductVariant" pv
      JOIN "Product" p ON p.id = pv."productId"
      JOIN "Domain" d ON d.id = p."domainId"
      ORDER BY pv.id;
    `;

    console.log(`📊 Найдено ${variants.length} вариантов:`);
    variants.forEach(variant => {
      const embeddingStatus = variant.has_embedding ? '✅' : '❌';
      const embeddingSmallStatus = variant.has_embedding_small ? '✅' : '❌';
      console.log(`   🔧 ${variant.product_title} ${variant.title} (Domain: ${variant.hostname})`);
      console.log(`      - embedding: ${embeddingStatus}, embedding_small: ${embeddingSmallStatus}`);
    });

    // 4. Тестируем поиск с правильным domainId
    if (domains.length > 0) {
      const firstDomain = domains[0];
      console.log(`\n🔍 === ТЕСТ ПОИСКА (Domain: ${firstDomain.hostname}, ID: ${firstDomain.id}) ===`);
      
      const testQuery = 'iPhone';
      console.log(`Тестовый запрос: "${testQuery}"`);
      
      // Прямой SQL запрос для теста
      const testResults = await prisma.$queryRaw<Array<{
        id: number;
        title: string;
        distance: number;
      }>>`
        SELECT 
          p.id,
          p.title,
          CASE 
            WHEN p.embedding_small IS NOT NULL THEN 0.5
            ELSE 1.0
          END as distance
        FROM "Product" p
        WHERE p."domainId" = ${firstDomain.id}
        ORDER BY distance
        LIMIT 5;
      `;

      console.log(`📊 Найдено ${testResults.length} товаров для домена ${firstDomain.hostname}:`);
      testResults.forEach(result => {
        console.log(`   - ${result.title} (distance: ${result.distance})`);
      });
    }

    // 5. Рекомендации
    console.log('\n💡 === РЕКОМЕНДАЦИИ ===');
    
    if (domains.length === 0) {
      console.log('❌ Проблема: нет доменов в базе данных');
      console.log('   Решение: создайте домен или запустите seeder');
    } else {
      console.log(`✅ Найдено доменов: ${domains.length}`);
      const domainWithProducts = domains.find(d => d._count.products > 0);
      if (domainWithProducts) {
        console.log(`📦 Домен с товарами: ${domainWithProducts.hostname} (ID: ${domainWithProducts.id})`);
        console.log(`   Используйте domainId: "${domainWithProducts.id}" для тестирования`);
      } else {
        console.log('❌ Проблема: у доменов нет товаров');
      }
    }

  } catch (error) {
    console.error('❌ Ошибка проверки:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDomainData(); 