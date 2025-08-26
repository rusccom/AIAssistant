#!/usr/bin/env ts-node

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import prisma from '../db/prisma';
import openaiService from '../services/openai.service';

// Простые массивы для генерации товаров
const categories = [
  'Смартфоны', 'Ноутбуки', 'Одежда', 'Книги', 'Товары для дома',
  'Спорт', 'Косметика', 'Еда', 'Автотовары', 'Наушники'
];

const brands = [
  'Apple', 'Samsung', 'Nike', 'Adidas', 'Sony', 'LG', 'Dell', 'HP', 
  'Zara', 'H&M', 'Coca-Cola', 'Pepsi', 'Toyota', 'BMW', 'Mercedes'
];

const adjectives = [
  'Премиум', 'Профессиональный', 'Стильный', 'Современный', 'Качественный',
  'Элегантный', 'Инновационный', 'Эксклюзивный', 'Универсальный', 'Надежный'
];

const colors = ['Черный', 'Белый', 'Синий', 'Красный', 'Серый', 'Зеленый', 'Желтый'];
const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const capacities = ['64GB', '128GB', '256GB', '512GB', '1TB'];

function getRandomElement(array: string[]): string {
  return array[Math.floor(Math.random() * array.length)];
}

async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openaiService.getClient().embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      encoding_format: 'float'
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

function generatePrice(): number {
  // Цены от 500 рублей до 150,000 рублей (в копейках)
  return Math.floor(Math.random() * 14500000) + 50000;
}

function generateSKU(index: number, variantIndex: number = 0): string {
  const productCode = index.toString().padStart(4, '0');
  const variantCode = variantIndex > 0 ? `-${variantIndex.toString().padStart(2, '0')}` : '';
  return `PROD${productCode}${variantCode}`;
}

function generateProductData(index: number): { title: string, description: string } {
  const category = getRandomElement(categories);
  const brand = getRandomElement(brands);
  const adjective = getRandomElement(adjectives);
  
  const title = `${adjective} ${category} ${brand}`;
  const description = `${adjective} товар из категории ${category} от бренда ${brand}. Высокое качество и современный дизайн.`;
  
  return { title, description };
}

async function generateSimple1000Products() {
  console.log('🚀 Начинаем генерацию 1000 товаров (упрощенная версия)...');

  // Проверяем домен localhost
  let domain = await prisma.domain.findFirst({
    where: { hostname: 'localhost' }
  });

  if (!domain) {
    console.log('❌ Домен localhost не найден. Создаем домен...');
    const user = await prisma.user.findFirst();
    if (!user) {
      console.error('❌ Пользователь не найден. Сначала создайте пользователя.');
      return;
    }

    domain = await prisma.domain.create({
      data: {
        hostname: 'localhost',
        userId: user.id
      }
    });
    console.log('✅ Домен localhost создан');
  }

  console.log(`🌐 Используем домен: ${domain.hostname} (ID: ${domain.id})`);

  let totalCreated = 0;

  for (let i = 0; i < 1000; i++) {
    try {
      const { title, description } = generateProductData(i + 1);

      // 60% вероятность создания товара с вариантами
      const hasVariants = Math.random() > 0.4;

      if (hasVariants) {
        // Создаем товар с вариантами
        const variantCount = Math.floor(Math.random() * 3) + 2; // 2-4 варианта
        const variants = [];

        for (let v = 0; v < variantCount; v++) {
          const color = getRandomElement(colors);
          const size = Math.random() > 0.5 ? getRandomElement(sizes) : '';
          const capacity = Math.random() > 0.7 ? getRandomElement(capacities) : '';
          
          let variantTitle = color;
          if (size) variantTitle += ` ${size}`;
          if (capacity) variantTitle += ` ${capacity}`;

          const basePrice = generatePrice();
          const sku = generateSKU(i + 1, v + 1);

          variants.push({
            title: variantTitle,
            price: basePrice + (v * 5000), // Небольшая разница в цене
            sku: sku
          });
        }

        // Создаем товар с вариантами
        const product = await prisma.product.create({
          data: {
            title,
            description,
            status: 'active',
            domainId: domain.id,
            variants: {
              create: variants
            }
          },
          include: { variants: true }
        });

        // Генерируем embedding для товара
        const productText = `${title} ${description}`;
        const productEmbedding = await generateEmbedding(productText);
        const productVector = '[' + productEmbedding.join(',') + ']';

        await prisma.$queryRaw`
          UPDATE "Product" 
          SET embedding_small = ${productVector}::vector 
          WHERE id = ${product.id};
        `;

        // Генерируем embeddings для вариантов
        for (const variant of product.variants) {
          const variantText = `${title} ${variant.title} ${description}`;
          const variantEmbedding = await generateEmbedding(variantText);
          const variantVector = '[' + variantEmbedding.join(',') + ']';

          await prisma.$queryRaw`
            UPDATE "ProductVariant" 
            SET embedding_small = ${variantVector}::vector 
            WHERE id = ${variant.id};
          `;
        }

        console.log(`✅ ${i + 1}/1000: Товар "${title}" создан с ${variants.length} вариантами`);
      } else {
        // Создаем простой товар
        const price = generatePrice();
        const sku = generateSKU(i + 1);

        const product = await prisma.product.create({
          data: {
            title,
            description,
            status: 'active',
            domainId: domain.id,
            variants: {
              create: {
                title: 'Default Title',
                price: price,
                sku: sku
              }
            }
          },
          include: { variants: true }
        });

        // Генерируем embedding для товара
        const productText = `${title} ${description}`;
        const productEmbedding = await generateEmbedding(productText);
        const productVector = '[' + productEmbedding.join(',') + ']';

        await prisma.$queryRaw`
          UPDATE "Product" 
          SET embedding_small = ${productVector}::vector 
          WHERE id = ${product.id};
        `;

        // Генерируем embedding для варианта
        const variant = product.variants[0];
        const variantEmbedding = await generateEmbedding(productText);
        const variantVector = '[' + variantEmbedding.join(',') + ']';

        await prisma.$queryRaw`
          UPDATE "ProductVariant" 
          SET embedding_small = ${variantVector}::vector 
          WHERE id = ${variant.id};
        `;

        console.log(`✅ ${i + 1}/1000: Товар "${title}" создан`);
      }

      totalCreated++;

      // Задержка между запросами к OpenAI
      await new Promise(resolve => setTimeout(resolve, 150));

      // Показываем прогресс каждые 25 товаров
      if ((i + 1) % 25 === 0) {
        console.log(`📊 Прогресс: ${i + 1}/1000 товаров создано`);
      }

    } catch (error) {
      console.error(`❌ Ошибка при создании товара ${i + 1}:`, error);
      continue;
    }
  }

  console.log(`🎉 Генерация завершена! Создано ${totalCreated} товаров с embeddings`);
  console.log('🔍 Теперь семантический поиск будет работать с расширенной базой товаров!');
  
  // Показываем общую статистику
  const totalProducts = await prisma.product.count({ where: { domainId: domain.id } });
  const totalVariants = await prisma.productVariant.count({
    where: { product: { domainId: domain.id } }
  });
  
  console.log(`📊 Итого в базе: ${totalProducts} товаров и ${totalVariants} вариантов`);
}

if (require.main === module) {
  generateSimple1000Products()
    .then(() => {
      console.log('✅ Скрипт завершен успешно');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Ошибка выполнения скрипта:', error);
      process.exit(1);
    });
}

export { generateSimple1000Products }; 