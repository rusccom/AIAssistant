import dotenv from 'dotenv';
import path from 'path';

// Загружаем переменные окружения
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import prisma from '../db/prisma';
import { semanticSearchService } from '../services/semantic-search.service';

async function debugIphoneSearch() {
  console.log('🔍 ДЕТАЛЬНАЯ ДИАГНОСТИКА iPhone ПОИСКА\n');

  try {
    // 1. Проверяем все iPhone товары в базе
    console.log('📊 === ШАГ 1: ВСЕ iPhone В БАЗЕ ===');
    
    const allIphones = await prisma.product.findMany({
      where: {
        OR: [
          { title: { contains: 'iPhone', mode: 'insensitive' } },
          { title: { contains: 'айфон', mode: 'insensitive' } }
        ]
      },
      include: {
        variants: true,
        domain: true
      }
    });

    console.log(`📱 Всего iPhone товаров в базе: ${allIphones.length}\n`);
    
    allIphones.forEach((product, index) => {
      console.log(`${index + 1}. "${product.title}" (ID: ${product.id})`);
      console.log(`   Статус: ${product.status}`);
      console.log(`   Домен: ${product.domain?.hostname || 'не привязан'}`);
      console.log(`   Embedding: ${product.embedding.length > 0 ? '✅ есть' : '❌ нет'} (${product.embedding.length} dims)`);
      console.log(`   Вариантов: ${product.variants.length}`);
      
      product.variants.forEach((variant, vIndex) => {
        console.log(`   ${vIndex + 1}. "${variant.title}" - $${(variant.price / 100).toFixed(2)}`);
        console.log(`      SKU: ${variant.sku || 'не задан'}`);
        console.log(`      Embedding: ${variant.embedding.length > 0 ? '✅ есть' : '❌ нет'} (${variant.embedding.length} dims)`);
      });
      console.log('');
    });

    // 2. Тестируем семантический поиск
    console.log('🔍 === ШАГ 2: СЕМАНТИЧЕСКИЙ ПОИСК ===');
    
    const searchQueries = [
      'айфон черный 256',
      'iPhone 15',
      'iPhone',
      'айфон'
    ];

    for (const query of searchQueries) {
      console.log(`\n🔎 Поиск: "${query}"`);
      try {
        const searchResult = await semanticSearchService.searchProductsForBot(query, 'localhost');
        console.log(`   Результат: ✅ выполнен`);
        console.log(`   Найдено: ${searchResult.products?.length || 0} товаров`);
        console.log(`   Тип поиска: ${searchResult.searchType}`);
        console.log(`   Ответ: "${searchResult.response}"`);
        
        if (searchResult.products && searchResult.products.length > 0) {
          searchResult.products.forEach((product: any, idx: number) => {
            console.log(`   ${idx + 1}. ${product.productTitle} ${product.variantTitle} - $${(product.price / 100).toFixed(2)}`);
          });
        }
      } catch (error) {
        console.log(`   ❌ Ошибка: ${error}`);
      }
    }

    // 3. Проверяем домены
    console.log('\n🌐 === ШАГ 3: ПРОВЕРКА ДОМЕНОВ ===');
    
    const localhost = await prisma.domain.findUnique({
      where: { hostname: 'localhost' },
      include: {
        products: {
          where: {
            OR: [
              { title: { contains: 'iPhone', mode: 'insensitive' } },
              { title: { contains: 'айфон', mode: 'insensitive' } }
            ]
          },
          include: { variants: true }
        }
      }
    });

    if (localhost) {
      console.log(`📍 Домен localhost найден (ID: ${localhost.id})`);
      console.log(`📱 iPhone товаров в localhost: ${localhost.products.length}`);
      
      localhost.products.forEach((product, index) => {
        console.log(`   ${index + 1}. ${product.title} (${product.variants.length} вариантов)`);
      });
    } else {
      console.log('❌ Домен localhost не найден!');
    }

  } catch (error) {
    console.error('❌ Ошибка при диагностике:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugIphoneSearch(); 