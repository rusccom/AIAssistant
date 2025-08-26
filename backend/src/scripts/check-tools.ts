#!/usr/bin/env ts-node

import dotenv from 'dotenv';
import path from 'path';

// Загружаем переменные окружения
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTools() {
    console.log('🔧 Проверяем tools в базе данных...\n');

    try {
        // Получаем все tools из базы
        const tools = await prisma.tool.findMany({
            include: {
                botConfigurations: {
                    include: {
                        domain: true
                    }
                }
            }
        });

        console.log(`📦 Найдено tools: ${tools.length}\n`);

        if (tools.length === 0) {
            console.log('❌ В базе данных нет настроенных tools');
            console.log('💡 Нужно создать tool для семантического поиска товаров\n');
            return;
        }

        // Показываем все tools
        tools.forEach((tool, index) => {
            console.log(`${index + 1}. ${tool.name}`);
            console.log(`   Описание: ${tool.description}`);
            console.log(`   Тип: ${tool.type}`);
            console.log(`   Активен: ${tool.isActive ? '✅' : '❌'}`);
            console.log(`   Конфигурация: ${JSON.stringify(tool.config, null, 2)}`);
            console.log(`   Параметры: ${JSON.stringify(tool.parameters, null, 2)}`);
            console.log(`   Используется в доменах: ${tool.botConfigurations.length}`);
            
            tool.botConfigurations.forEach(config => {
                console.log(`     - ${config.domain?.hostname || 'Unknown domain'}`);
            });
            
            console.log('─'.repeat(80) + '\n');
        });

        // Проверяем какие domains есть
        const domains = await prisma.domain.findMany({
            include: {
                botConfiguration: {
                    include: {
                        tools: true
                    }
                }
            }
        });

        console.log(`🌐 Найдено доменов: ${domains.length}\n`);

        domains.forEach((domain, index) => {
            console.log(`${index + 1}. ${domain.hostname}`);
            if (domain.botConfiguration) {
                console.log(`   Конфигурация бота: ✅`);
                console.log(`   Tools в боте: ${domain.botConfiguration.tools.length}`);
                domain.botConfiguration.tools.forEach(tool => {
                    console.log(`     - ${tool.name} (${tool.isActive ? 'активен' : 'неактивен'})`);
                });
            } else {
                console.log(`   Конфигурация бота: ❌`);
            }
            console.log('');
        });

    } catch (error) {
        console.error('💥 Ошибка:', error);
    } finally {
        await prisma.$disconnect();
    }
}

if (require.main === module) {
    checkTools().catch(console.error);
} 