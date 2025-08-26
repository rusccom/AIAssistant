import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config();

const prisma = new PrismaClient();

async function checkAndCreateTestData() {
    console.log('🔍 Проверка данных в базе...');

    try {
        // Проверяем пользователей
        const users = await prisma.user.findMany({
            include: {
                domains: true
            }
        });

        console.log(`👥 Найдено пользователей: ${users.length}`);
        
        if (users.length === 0) {
            console.log('❌ Нет пользователей в системе. Создайте пользователя через регистрацию.');
            return;
        }

        // Показываем информацию о пользователях
        users.forEach((user, index) => {
            console.log(`${index + 1}. ${user.email} - доменов: ${user.domains.length}`);
            user.domains.forEach((domain, domainIndex) => {
                console.log(`   ${domainIndex + 1}. ${domain.hostname}`);
            });
        });

        // Найдем пользователя с доменами для создания товаров
        const userWithDomains = users.find(user => user.domains.length > 0);
        
        if (!userWithDomains) {
            console.log('❌ Ни у одного пользователя нет доменов.');
            console.log('💡 Добавьте домены через интерфейс дашборда.');
            return;
        }

        // Проверяем товары для этого пользователя
        const existingProducts = await prisma.product.findMany({
            where: {
                domainId: {
                    in: userWithDomains.domains.map(d => d.id)
                }
            },
            include: {
                variants: true,
                domain: true
            }
        });

        console.log(`\n📦 Найдено товаров: ${existingProducts.length}`);
        
        if (existingProducts.length > 0) {
            console.log('Существующие товары:');
            existingProducts.forEach((product, index) => {
                console.log(`${index + 1}. "${product.title}" (домен: ${product.domain?.hostname}) - ${product.variants.length} вариантов`);
            });
            
            console.log('\n❓ Товары уже существуют. Хотите создать дополнительные? (Запустите createTestProducts)');
        } else {
            console.log('\n🚀 Создаем тестовые товары...');
            await createTestProducts(userWithDomains);
        }

    } catch (error) {
        console.error('Ошибка:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

async function createTestProducts(user: any) {
    const firstDomain = user.domains[0];
    
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
                    price: 2500, // $25.00 в копейках
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
                        price: 89990, // $899.90 в копейках
                        sku: 'IPH15-128-BLK'
                    },
                    {
                        title: '256GB Black',
                        price: 99990, // $999.90 в копейках
                        sku: 'IPH15-256-BLK'
                    },
                    {
                        title: '128GB Blue',
                        price: 89990, // $899.90 в копейках
                        sku: 'IPH15-128-BLU'
                    },
                    {
                        title: '256GB Blue',
                        price: 99990, // $999.90 в копейках
                        sku: 'IPH15-256-BLU'
                    }
                ]
            }
        },
        include: { variants: true }
    });

    // Товар с вариантами (кофе)
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

    // Дополнительные простые товары
    const book = await prisma.product.create({
        data: {
            title: 'Книга по программированию',
            description: 'Изучение современных веб-технологий и лучших практик',
            status: 'active',
            domainId: firstDomain.id,
            variants: {
                create: {
                    title: 'Default Title',
                    price: 4999, // $49.99 в копейках
                    sku: 'BOOK-001'
                }
            }
        },
        include: { variants: true }
    });

    const headphones = await prisma.product.create({
        data: {
            title: 'Наушники Bluetooth',
            description: 'Беспроводные наушники с активным шумоподавлением',
            status: 'active',
            domainId: firstDomain.id,
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
                    },
                    {
                        title: 'Серые',
                        price: 15999, // $159.99 в копейках
                        sku: 'HEADPHONES-GRY'
                    }
                ]
            }
        },
        include: { variants: true }
    });

    console.log('\n✅ Созданы тестовые товары:');
    console.log(`📱 Домен "${firstDomain.hostname}":`);
    console.log(`   - ${mug.title} (${mug.variants.length} вариант)`);
    console.log(`   - ${iphone.title} (${iphone.variants.length} варианта)`);
    console.log(`   - ${coffee.title} (${coffee.variants.length} варианта)`);
    console.log(`   - ${book.title} (${book.variants.length} вариант)`);
    console.log(`   - ${headphones.title} (${headphones.variants.length} варианта)`);
}

// Запускаем проверку если скрипт вызван напрямую
if (require.main === module) {
    checkAndCreateTestData()
        .then(() => {
            console.log('\n🎉 Проверка завершена!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Ошибка:', error);
            process.exit(1);
        });
}

export { checkAndCreateTestData }; 