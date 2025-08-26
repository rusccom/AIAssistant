#!/usr/bin/env ts-node

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import prisma from '../db/prisma';
import openaiService from '../services/openai.service';

// Категории товаров с русскими названиями
const categories = [
  {
    name: 'Смартфоны и гаджеты',
    brands: ['iPhone', 'Samsung Galaxy', 'Xiaomi', 'Huawei', 'OnePlus', 'Google Pixel'],
    models: ['Pro', 'Max', 'Ultra', 'Plus', 'Lite', 'Mini'],
    colors: ['Черный', 'Белый', 'Синий', 'Золотой', 'Серый', 'Фиолетовый', 'Зеленый'],
    memory: ['64GB', '128GB', '256GB', '512GB', '1TB']
  },
  {
    name: 'Ноутбуки и компьютеры',
    brands: ['MacBook', 'ThinkPad', 'Dell XPS', 'HP Pavilion', 'ASUS ZenBook', 'Acer Aspire'],
    models: ['Air', 'Pro', 'Gaming', 'Business', 'Ultrabook', 'Workstation'],
    specs: ['Intel i5', 'Intel i7', 'AMD Ryzen 5', 'AMD Ryzen 7', '8GB RAM', '16GB RAM', '32GB RAM']
  },
  {
    name: 'Одежда',
    types: ['Футболка', 'Джинсы', 'Куртка', 'Платье', 'Свитер', 'Рубашка', 'Кроссовки', 'Ботинки'],
    brands: ['Nike', 'Adidas', 'Zara', 'H&M', 'Uniqlo', 'Tommy Hilfiger'],
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    colors: ['Черный', 'Белый', 'Синий', 'Красный', 'Серый', 'Бежевый', 'Зеленый']
  },
  {
    name: 'Книги',
    types: ['Роман', 'Детектив', 'Фантастика', 'Учебник', 'Биография', 'Поэзия', 'Справочник'],
    authors: ['Толстой', 'Достоевский', 'Пушкин', 'Чехов', 'Булгаков', 'Пастернак'],
    subjects: ['История', 'Программирование', 'Психология', 'Математика', 'Философия', 'Искусство']
  },
  {
    name: 'Товары для дома',
    types: ['Диван', 'Кресло', 'Стол', 'Лампа', 'Ковер', 'Шторы', 'Подушка', 'Ваза'],
    materials: ['Дерево', 'Металл', 'Стекло', 'Ткань', 'Кожа', 'Пластик'],
    colors: ['Коричневый', 'Черный', 'Белый', 'Серый', 'Бежевый', 'Синий']
  },
  {
    name: 'Спорт и фитнес',
    types: ['Кроссовки для бега', 'Теннисная ракетка', 'Футбольный мяч', 'Коврик для йоги', 'Гантели'],
    brands: ['Nike', 'Adidas', 'Puma', 'Reebok', 'Under Armour', 'Wilson'],
    weights: ['1кг', '2кг', '5кг', '10кг', '15кг', '20кг']
  },
  {
    name: 'Красота и уходе',
    types: ['Крем для лица', 'Шампунь', 'Помада', 'Духи', 'Лак для ногтей', 'Маска для лица'],
    brands: ['L\'Oreal', 'Maybelline', 'Chanel', 'Dior', 'MAC', 'Clinique'],
    volumes: ['50мл', '100мл', '150мл', '200мл', '250мл']
  },
  {
    name: 'Еда и напитки',
    types: ['Кофе в зернах', 'Шоколад', 'Макароны', 'Оливковое масло', 'Мед', 'Чай'],
    brands: ['Lavazza', 'Jacobs', 'Nestle', 'Barilla', 'Ahmad Tea', 'Lipton'],
    weights: ['100г', '250г', '500г', '1кг', '2кг']
  },
  {
    name: 'Автотовары',
    types: ['Автомобильное масло', 'Шины', 'Автохимия', 'GPS навигатор', 'Видеорегистратор'],
    brands: ['Michelin', 'Bridgestone', 'Garmin', 'TomTom', 'Shell', 'Mobil'],
    specs: ['5W-30', '10W-40', 'R16', 'R17', 'R18']
  },
  {
    name: 'Наушники и аудио',
    types: ['Наушники Bluetooth', 'Проводные наушники', 'Колонка портативная', 'Микрофон'],
    brands: ['Sony', 'Bose', 'JBL', 'Sennheiser', 'Audio-Technica', 'Beats'],
    features: ['Шумоподавление', 'Водонепроницаемые', 'Беспроводные', 'Складные']
  }
];

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

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function generatePrice(): number {
  // Цены от 500 рублей до 150,000 рублей (в копейках)
  const minPrice = 50000;
  const maxPrice = 15000000;
  return Math.floor(Math.random() * (maxPrice - minPrice)) + minPrice;
}

function generateSKU(categoryName: string, productIndex: number, variantIndex: number = 0): string {
  const categoryCode = categoryName.split(' ')[0].toUpperCase().slice(0, 3);
  const productCode = productIndex.toString().padStart(4, '0');
  const variantCode = variantIndex > 0 ? `-${variantIndex.toString().padStart(2, '0')}` : '';
  return `${categoryCode}${productCode}${variantCode}`;
}

async function generateProductName(category: any): Promise<{ title: string, description: string }> {
  let title = '';
  let description = '';

  switch (category.name) {
    case 'Смартфоны и гаджеты':
      const brand = getRandomElement(category.brands);
      const model = getRandomElement(category.models);
      const memory = getRandomElement(category.memory);
      title = `${brand} ${model} ${memory}`;
      description = `Современный смартфон ${brand} с ${memory} памяти, высококачественный дисплей и мощный процессор`;
      break;

    case 'Ноутбуки и компьютеры':
      const laptop = getRandomElement(category.brands);
      const spec = getRandomElement(category.specs);
      title = `${laptop} ${spec}`;
      description = `Производительный ноутбук ${laptop} с процессором ${spec}, идеально подходит для работы и развлечений`;
      break;

    case 'Одежда':
      const clothing = getRandomElement(category.types) as string;
      const clothingBrand = getRandomElement(category.brands) as string;
      title = `${clothing} ${clothingBrand}`;
      description = `Стильная ${clothing.toLowerCase()} от ${clothingBrand}, высокое качество материалов и современный дизайн`;
      break;

    case 'Книги':
      const bookType = getRandomElement(category.types) as string;
      const topic = getRandomElement(category.subjects) as string;
      title = `${bookType} по ${topic}`;
      description = `Увлекательная книга в жанре "${bookType.toLowerCase()}" на тему ${topic.toLowerCase()}, обязательно к прочтению`;
      break;

    case 'Товары для дома':
      const homeItem = getRandomElement(category.types) as string;
      const material = getRandomElement(category.materials) as string;
      title = `${homeItem} из ${material.toLowerCase()}а`;
      description = `Качественная ${homeItem.toLowerCase()} из ${material.toLowerCase()}а, отличное дополнение к интерьеру`;
      break;

    case 'Спорт и фитнес':
      const sportItem = getRandomElement(category.types) as string;
      const sportBrand = getRandomElement(category.brands) as string;
      title = `${sportItem} ${sportBrand}`;
      description = `Профессиональное спортивное оборудование ${sportItem.toLowerCase()} от ${sportBrand}`;
      break;

    case 'Красота и уходе':
      const beautyItem = getRandomElement(category.types) as string;
      const beautyBrand = getRandomElement(category.brands) as string;
      const volume = getRandomElement(category.volumes) as string;
      title = `${beautyItem} ${beautyBrand} ${volume}`;
      description = `Качественная косметика ${beautyItem.toLowerCase()} от ${beautyBrand}, объем ${volume}`;
      break;

    case 'Еда и напитки':
      const foodItem = getRandomElement(category.types) as string;
      const foodBrand = getRandomElement(category.brands) as string;
      const weight = getRandomElement(category.weights) as string;
      title = `${foodItem} ${foodBrand} ${weight}`;
      description = `Высококачественные продукты питания ${foodItem.toLowerCase()} от ${foodBrand}, вес ${weight}`;
      break;

    case 'Автотовары':
      const autoItem = getRandomElement(category.types) as string;
      const autoBrand = getRandomElement(category.brands) as string;
      title = `${autoItem} ${autoBrand}`;
      description = `Надежные автотовары ${autoItem.toLowerCase()} от ${autoBrand}, проверенное качество`;
      break;

    case 'Наушники и аудио':
      const audioItem = getRandomElement(category.types) as string;
      const audioBrand = getRandomElement(category.brands) as string;
      const feature = getRandomElement(category.features) as string;
      title = `${audioItem} ${audioBrand} ${feature}`;
      description = `Высококачественная аудиотехника ${audioItem.toLowerCase()} от ${audioBrand} с функцией ${feature.toLowerCase()}`;
      break;

    default:
      title = 'Товар';
      description = 'Описание товара';
  }

  return { title, description };
}

async function generate1000Products() {
  console.log('🚀 Начинаем генерацию 1000 товаров...');

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
      const category = getRandomElement(categories);
      const { title, description } = await generateProductName(category);

      // 70% вероятность создания товара с вариантами
      const hasVariants = Math.random() > 0.3;

      if (hasVariants && (category.colors || category.sizes || category.memory)) {
        // Создаем товар с вариантами
        const variantCount = Math.floor(Math.random() * 4) + 2; // 2-5 вариантов
        const variants = [];

        for (let v = 0; v < variantCount; v++) {
          let variantTitle = '';
          const basePrice = generatePrice();

          if (category.colors) {
            const color = getRandomElement(category.colors);
            variantTitle = color;
          }

          if (category.sizes) {
            const size = getRandomElement(category.sizes);
            variantTitle = variantTitle ? `${variantTitle} ${size}` : size;
          }

          if (category.memory) {
            const memory = getRandomElement(category.memory);
            variantTitle = variantTitle ? `${variantTitle} ${memory}` : memory;
          }

          if (!variantTitle) {
            variantTitle = `Вариант ${v + 1}`;
          }

          const sku = generateSKU(category.name, i + 1, v + 1);

          variants.push({
            title: variantTitle,
            price: basePrice + (v * 1000), // Небольшая разница в цене
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
        const sku = generateSKU(category.name, i + 1);

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
      await new Promise(resolve => setTimeout(resolve, 100));

      // Показываем прогресс каждые 50 товаров
      if ((i + 1) % 50 === 0) {
        console.log(`📊 Прогресс: ${i + 1}/1000 товаров создано`);
      }

    } catch (error) {
      console.error(`❌ Ошибка при создании товара ${i + 1}:`, error);
      continue;
    }
  }

  console.log(`🎉 Генерация завершена! Создано ${totalCreated} товаров с embeddings`);
  console.log('🔍 Теперь семантический поиск будет работать с расширенной базой товаров!');
}

if (require.main === module) {
  generate1000Products()
    .then(() => {
      console.log('✅ Скрипт завершен успешно');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Ошибка выполнения скрипта:', error);
      process.exit(1);
    });
}

export { generate1000Products }; 