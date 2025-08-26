import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Fetches all sessions for a given user.
 * @param userId The ID of the user.
 * @returns A list of sessions.
 */
export const getUserSessions = async (userId: number) => {
    try {
        const sessions = await prisma.session.findMany({
            where: {
                userId: userId,
            },
            orderBy: {
                id: 'desc', // Sort from newest to oldest
            },
        });
        console.log(`✅ Dashboard: Загружено ${sessions.length} сессий для user ${userId}`);
        return sessions;
    } catch (error) {
        console.error('❌ Dashboard sessions error:', error);
        // Возвращаем пустой массив вместо ошибки 500
        console.log('⚠️ Возвращаем пустой массив сессий до исправления схемы');
        return [];
    }
};

export const getDomainsByUserId = async (userId: number) => {
    return prisma.domain.findMany({
        where: { userId },
        orderBy: { hostname: 'asc' },
    });
};

export const addDomainToUser = async (userId: number, hostname: string) => {
    const existingDomain = await prisma.domain.findFirst({
        where: {
            hostname,
            userId,
        },
    });

    if (existingDomain) {
        return null; // Domain already exists for this user
    }

    return prisma.domain.create({
        data: {
            hostname,
            userId,
        },
    });
}; 

/**
 * Получает ВСЕ данные для дашборда одним запросом:
 * - Список доменов пользователя
 * - Конфигурации ботов для каждого домена
 * - Инструменты для каждого домена
 */
export const getFullDashboardData = async (userId: number) => {
    // Получаем домены со всеми связанными данными одним запросом
    const domains = await prisma.domain.findMany({
        where: { userId },
        include: {
            botConfiguration: {
                include: {
                    tools: true
                }
            }
        },
        orderBy: { hostname: 'asc' }
    });

    // Формируем удобную структуру данных
    const domainConfigs: Record<string, any> = {};
    
    domains.forEach(domain => {
        if (domain.botConfiguration) {
            domainConfigs[domain.hostname] = {
                ...domain.botConfiguration,
                tools: domain.botConfiguration.tools
            };
        }
    });

    return {
        domains: domains.map(d => ({
            id: d.id,
            hostname: d.hostname,
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
            hasConfig: !!d.botConfiguration
        })),
        domainConfigs
    };
}; 