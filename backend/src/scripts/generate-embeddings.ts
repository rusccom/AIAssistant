#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client';
import { embeddingService } from '../services/embedding.service';

const prisma = new PrismaClient();

async function generateEmbeddingsForAllProducts() {
    console.log('🚀 Начинаем генерацию embeddings для всех товаров...');
    
    try {
        // Получаем все домены с товарами
        const domains = await prisma.domain.findMany({
            include: {
                products: {
                    include: {
                        variants: true
                    }
                }
            }
        });

        console.log(`📦 Найдено доменов: ${domains.length}`);

        let totalProducts = 0;
        let processedProducts = 0;

        // Подсчет общего количества товаров
        for (const domain of domains) {
            totalProducts += domain.products.length;
        }

        console.log(`📦 Всего товаров для обработки: ${totalProducts}`);

        if (totalProducts === 0) {
            console.log('❌ Товары не найдены. Сначала добавьте товары в базу данных.');
            return;
        }

        // Обрабатываем каждый домен
        for (const domain of domains) {
            if (domain.products.length === 0) {
                console.log(`⏭️  Домен ${domain.hostname} не имеет товаров, пропускаем`);
                continue;
            }

            console.log(`\n🔄 Обрабатываем домен: ${domain.hostname} (${domain.products.length} товаров)`);

            // Генерируем embeddings для товаров домена
            for (let i = 0; i < domain.products.length; i++) {
                const product = domain.products[i];
                processedProducts++;
                
                console.log(`\n[${processedProducts}/${totalProducts}] 📦 Обрабатываем: ${product.title}`);
                
                try {
                    // Проверяем, есть ли уже embedding
                    const hasEmbedding = (product as any).embedding && (product as any).embedding.length > 0;
                    
                    if (hasEmbedding) {
                        console.log(`  ✅ У товара уже есть embedding, пропускаем`);
                        continue;
                    }

                    // Генерируем embedding для товара
                    const productEmbedding = await embeddingService.generateProductEmbedding(product);
                    
                    // Обновляем товар
                    await prisma.product.update({
                        where: { id: product.id },
                        data: { embedding: productEmbedding } as any
                    });

                    console.log(`  ✅ Создан embedding для товара (${productEmbedding.length} размерность)`);

                    // Генерируем embeddings для вариантов
                    for (let j = 0; j < product.variants.length; j++) {
                        const variant = product.variants[j];
                        
                        console.log(`    🔄 Вариант ${j + 1}/${product.variants.length}: ${variant.title}`);
                        
                        // Проверяем, есть ли уже embedding у варианта
                        const variantHasEmbedding = (variant as any).embedding && (variant as any).embedding.length > 0;
                        
                        if (variantHasEmbedding) {
                            console.log(`    ✅ У варианта уже есть embedding, пропускаем`);
                            continue;
                        }

                        const variantEmbedding = await embeddingService.generateVariantEmbedding(product, variant);
                        
                        await prisma.productVariant.update({
                            where: { id: variant.id },
                            data: { embedding: variantEmbedding } as any
                        });

                        console.log(`    ✅ Создан embedding для варианта`);
                    }

                    // Задержка между запросами к OpenAI
                    await new Promise(resolve => setTimeout(resolve, 200));
                    
                } catch (error) {
                    console.error(`  ❌ Ошибка при обработке товара ${product.id}:`, error);
                    
                    // Продолжаем обработку других товаров
                    continue;
                }
            }

            console.log(`✅ Домен ${domain.hostname} обработан`);
        }

        console.log(`\n🎉 Генерация embeddings завершена!`);
        console.log(`📊 Статистика:`);
        console.log(`   - Доменов обработано: ${domains.length}`);
        console.log(`   - Товаров обработано: ${processedProducts}/${totalProducts}`);

    } catch (error) {
        console.error('💥 Критическая ошибка:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Функция для генерации embeddings конкретного домена
async function generateEmbeddingsForDomain(hostname: string) {
    console.log(`🎯 Генерация embeddings для домена: ${hostname}`);
    
    try {
        const domain = await prisma.domain.findUnique({
            where: { hostname },
            include: {
                products: {
                    include: {
                        variants: true
                    }
                }
            }
        });

        if (!domain) {
            console.log(`❌ Домен ${hostname} не найден`);
            return;
        }

        if (domain.products.length === 0) {
            console.log(`❌ В домене ${hostname} нет товаров`);
            return;
        }

        await embeddingService.generateEmbeddingsForDomain(domain.id);
        
        console.log(`✅ Embeddings для домена ${hostname} созданы`);
        
    } catch (error) {
        console.error('Ошибка:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Основная функция
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length > 0) {
        const hostname = args[0];
        await generateEmbeddingsForDomain(hostname);
    } else {
        await generateEmbeddingsForAllProducts();
    }
}

// Запуск скрипта
if (require.main === module) {
    main().catch(console.error);
}

export { generateEmbeddingsForAllProducts, generateEmbeddingsForDomain }; 