import dotenv from 'dotenv';
import path from 'path';

// Загружаем переменные окружения
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import prisma from '../db/prisma';

async function seedProducts() {
    console.log('Создание тестовых товаров...');

    // Простой товар (кружка)
    const simpleProduct = await prisma.product.create({
        data: {
            title: 'Керамическая кружка',
            description: 'Белая керамическая кружка 350мл',
            status: 'active',
            variants: {
                create: {
                    title: 'Default Title',
                    price: 50000, // 500₽ в копейках
                    sku: 'MUG-001'
                }
            }
        },
        include: {
            variants: true
        }
    });

    // Товар с вариантами (iPhone)
    const variantProduct = await prisma.product.create({
        data: {
            title: 'iPhone 15',
            description: 'Новый iPhone 15 с различными конфигурациями',
            status: 'active',
            variants: {
                create: [
                    {
                        title: '128GB Черный',
                        price: 8999000, // 89990₽ в копейках
                        sku: 'IPH15-128-BLK'
                    },
                    {
                        title: '256GB Черный', 
                        price: 9999000, // 99990₽ в копейках
                        sku: 'IPH15-256-BLK'
                    },
                    {
                        title: '128GB Синий',
                        price: 8999000, // 89990₽ в копейках
                        sku: 'IPH15-128-BLU'
                    }
                ]
            }
        },
        include: {
            variants: true
        }
    });

    // Еще один товар с вариантами (кофе)
    const coffeeProduct = await prisma.product.create({
        data: {
            title: 'Кофе премиум',
            description: 'Кофейные напитки премиум класса',
            status: 'active',
            variants: {
                create: [
                    {
                        title: 'Эспрессо',
                        price: 25000, // 250₽ в копейках
                        sku: 'COFFEE-ESP'
                    },
                    {
                        title: 'Латте',
                        price: 40000, // 400₽ в копейках  
                        sku: 'COFFEE-LAT'
                    },
                    {
                        title: 'Капучино',
                        price: 37500, // 375₽ в копейках
                        sku: 'COFFEE-CAP'
                    }
                ]
            }
        },
        include: {
            variants: true
        }
    });

    console.log('✅ Созданы тестовые товары:');
    console.log('1. Простой товар:', simpleProduct.title);
    console.log('2. Товар с вариантами:', variantProduct.title, `(${variantProduct.variants.length} вариантов)`);
    console.log('3. Кофе с вариантами:', coffeeProduct.title, `(${coffeeProduct.variants.length} вариантов)`);
}

async function main() {
    try {
        await seedProducts();
    } catch (error) {
        console.error('Ошибка при создании тестовых данных:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main(); 