import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config();

const prisma = new PrismaClient();

async function createTestProductsWithDomains() {
    console.log('Создание тестовых товаров для доменов...');

    try {
        // Получаем первого пользователя с доменами
        const userWithDomains = await prisma.user.findFirst({
            include: {
                domains: {
                    orderBy: { createdAt: 'asc' }
                }
            }
        });

        if (!userWithDomains || userWithDomains.domains.length === 0) {
            console.log('❌ Нет пользователей с доменами для создания товаров');
            return;
        }

        console.log(`Найден пользователь: ${userWithDomains.email} с ${userWithDomains.domains.length} доменами`);

        // Создаем товары для первого домена
        const firstDomain = userWithDomains.domains[0];
        console.log(`Создаем товары для домена: ${firstDomain.hostname}`);

        // Простой товар (кружка)
        const mug = await prisma.product.create({
            data: {
                title: 'Керамическая кружка',
                description: 'Белая керамическая кружка 350мл для горячих напитков',
                status: 'active',
                domainId: firstDomain.id,
                variants: {
                    create: {
                        title: 'Default Title',
                        price: 25000, // $250 в копейках
                        sku: 'MUG-001'
                    }
                }
            },
            include: { variants: true }
        });

        // Товар с вариантами (iPhone)
        const iphone = await prisma.product.create({
            data: {
                title: 'iPhone 15',
                description: 'Новый iPhone 15 с различными конфигурациями памяти и цветами',
                status: 'active',
                domainId: firstDomain.id,
                variants: {
                    create: [
                        {
                            title: '128GB Black',
                            price: 89990000, // $899.90 в копейках
                            sku: 'IPH15-128-BLK'
                        },
                        {
                            title: '256GB Black',
                            price: 99990000, // $999.90 в копейках
                            sku: 'IPH15-256-BLK'
                        },
                        {
                            title: '128GB Blue',
                            price: 89990000, // $899.90 в копейках
                            sku: 'IPH15-128-BLU'
                        },
                        {
                            title: '256GB Blue',
                            price: 99990000, // $999.90 в копейках
                            sku: 'IPH15-256-BLU'
                        }
                    ]
                }
            },
            include: { variants: true }
        });

        // Еще один товар с вариантами (кофе)
        const coffee = await prisma.product.create({
            data: {
                title: 'Кофе премиум',
                description: 'Свежеобжаренные кофейные зерна и готовые напитки',
                status: 'active',
                domainId: firstDomain.id,
                variants: {
                    create: [
                        {
                            title: 'Эспрессо',
                            price: 350, // $3.50 в копейках
                            sku: 'COFFEE-ESP'
                        },
                        {
                            title: 'Латте',
                            price: 450, // $4.50 в копейках
                            sku: 'COFFEE-LAT'
                        },
                        {
                            title: 'Капучино',
                            price: 425, // $4.25 в копейках
                            sku: 'COFFEE-CAP'
                        },
                        {
                            title: 'Американо',
                            price: 320, // $3.20 в копейках
                            sku: 'COFFEE-AME'
                        }
                    ]
                }
            },
            include: { variants: true }
        });

        // Если есть второй домен, создаем товары и для него
        if (userWithDomains.domains.length > 1) {
            const secondDomain = userWithDomains.domains[1];
            console.log(`Создаем товары для второго домена: ${secondDomain.hostname}`);

            await prisma.product.create({
                data: {
                    title: 'Книга по программированию',
                    description: 'Изучение современных веб-технологий',
                    status: 'active',
                    domainId: secondDomain.id,
                    variants: {
                        create: {
                            title: 'Default Title',
                            price: 4999, // $49.99 в копейках
                            sku: 'BOOK-001'
                        }
                    }
                }
            });

            await prisma.product.create({
                data: {
                    title: 'Наушники Bluetooth',
                    description: 'Беспроводные наушники с шумоподавлением',
                    status: 'active',
                    domainId: secondDomain.id,
                    variants: {
                        create: [
                            {
                                title: 'Черные',
                                price: 15999, // $159.99 в копейках
                                sku: 'HEADPHONES-BLK'
                            },
                            {
                                title: 'Белые',
                                price: 15999, // $159.99 в копейках
                                sku: 'HEADPHONES-WHT'
                            }
                        ]
                    }
                }
            });
        }

        console.log('\n✅ Созданы тестовые товары:');
        console.log(`📱 Домен "${firstDomain.hostname}":`);
        console.log(`   - ${mug.title} (${mug.variants.length} вариант)`);
        console.log(`   - ${iphone.title} (${iphone.variants.length} варианта)`);
        console.log(`   - ${coffee.title} (${coffee.variants.length} варианта)`);

        if (userWithDomains.domains.length > 1) {
            console.log(`📱 Домен "${userWithDomains.domains[1].hostname}":`);
            console.log(`   - Книга по программированию (1 вариант)`);
            console.log(`   - Наушники Bluetooth (2 варианта)`);
        }

    } catch (error) {
        console.error('Ошибка при создании тестовых товаров:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Запускаем создание если скрипт вызван напрямую
if (require.main === module) {
    createTestProductsWithDomains()
        .then(() => {
            console.log('\n🎉 Тестовые товары созданы успешно!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Ошибка создания тестовых товаров:', error);
            process.exit(1);
        });
}

export { createTestProductsWithDomains }; 