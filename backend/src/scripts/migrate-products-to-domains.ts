import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config();

const prisma = new PrismaClient();

async function migrateProductsToDomains() {
    console.log('Начинаем миграцию товаров к доменам...');

    try {
        // Получаем все товары без домена
        const productsWithoutDomain = await prisma.product.findMany({
            where: { domainId: null },
            include: { variants: true }
        });

        console.log(`Найдено товаров без домена: ${productsWithoutDomain.length}`);

        if (productsWithoutDomain.length === 0) {
            console.log('✅ Нет товаров для миграции');
            return;
        }

        // Получаем всех пользователей с их доменами
        const users = await prisma.user.findMany({
            include: {
                domains: {
                    orderBy: { createdAt: 'asc' }
                }
            }
        });

        if (users.length === 0) {
            console.log('❌ Нет пользователей в системе');
            return;
        }

        // Находим первого пользователя с доменами
        const userWithDomains = users.find(user => user.domains.length > 0);
        
        if (!userWithDomains) {
            console.log('❌ Ни у одного пользователя нет доменов');
            return;
        }

        const firstDomain = userWithDomains.domains[0];
        console.log(`Выбран домен для миграции: ${firstDomain.hostname} (User: ${userWithDomains.email})`);

        // Привязываем все товары к первому домену
        const updateResult = await prisma.product.updateMany({
            where: { domainId: null },
            data: { domainId: firstDomain.id }
        });

        console.log(`✅ Мигрировано товаров: ${updateResult.count}`);
        console.log(`Товары привязаны к домену: ${firstDomain.hostname}`);

    } catch (error) {
        console.error('Ошибка при миграции товаров:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Запускаем миграцию если скрипт вызван напрямую
if (require.main === module) {
    migrateProductsToDomains()
        .then(() => {
            console.log('🎉 Миграция завершена');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Ошибка миграции:', error);
            process.exit(1);
        });
}

export { migrateProductsToDomains }; 