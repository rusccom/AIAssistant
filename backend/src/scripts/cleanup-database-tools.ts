#!/usr/bin/env ts-node

import dotenv from 'dotenv';
import path from 'path';

// Загружаем переменные окружения
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupDatabaseTools() {
    console.log('🧹 Очищаем старые tools из базы данных...\n');

    try {
        // 1. Показываем что есть сейчас
        const existingTools = await prisma.tool.findMany({
            include: {
                botConfigurations: {
                    include: {
                        domain: true
                    }
                }
            }
        });

        console.log(`📦 Найдено tools в базе: ${existingTools.length}`);
        
        if (existingTools.length === 0) {
            console.log('✅ База данных уже чистая - нет старых tools');
            return;
        }

        // Показываем что будем удалять
        existingTools.forEach((tool, index) => {
            console.log(`${index + 1}. ${tool.name} (используется в ${tool.botConfigurations.length} доменах)`);
            tool.botConfigurations.forEach(config => {
                console.log(`   - ${config.domain?.hostname || 'Unknown domain'}`);
            });
        });

        console.log('\n⚠️ Удаляем все старые tools...');

        // 2. Отключаем tools от bot configurations
        for (const tool of existingTools) {
            for (const config of tool.botConfigurations) {
                await prisma.botConfiguration.update({
                    where: { id: config.id },
                    data: {
                        tools: {
                            disconnect: { id: tool.id }
                        }
                    }
                });
                console.log(`🔗 Отключен tool ${tool.name} от домена ${config.domain?.hostname}`);
            }
        }

        // 3. Удаляем все tools
        const deleteResult = await prisma.tool.deleteMany({});
        console.log(`🗑️ Удалено tools: ${deleteResult.count}`);

        console.log('\n✅ Очистка завершена! Теперь используются bot functions из файлов.');

    } catch (error: any) {
        console.error('💥 Ошибка:', error);
    } finally {
        await prisma.$disconnect();
    }
}

if (require.main === module) {
    cleanupDatabaseTools().catch(console.error);
} 