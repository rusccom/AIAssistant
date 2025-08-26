import { Prisma, PrismaClient } from '@prisma/client';
import { BOT_DEFAULTS } from '../config/bot-defaults';
import { SYSTEM_DEFAULTS } from '../config/system-defaults';

const prisma = new PrismaClient();

export const getBotConfig = async (userId: number, domain: string) => {
    const domainData = await prisma.domain.findFirst({
        where: { hostname: domain, userId },
        include: { botConfiguration: true },
    });

    if (!domainData) {
        throw new Error('Domain not found or access denied');
    }

    // Если конфигурация не найдена, создаем ее со значениями по умолчанию
    if (!domainData.botConfiguration) {
        const newConfig = await prisma.botConfiguration.create({
            data: {
                domainId: domainData.id,
                identity: '', // Задается с фронтенда
                task: '', // Задается с фронтенда
                otherDetails: '', // Задается с фронтенда
                instructions: '', // Задается с фронтенда
                demeanor: BOT_DEFAULTS.demeanor,
                tone: BOT_DEFAULTS.tone,
                levelOfEnthusiasm: BOT_DEFAULTS.levelOfEnthusiasm,
                formality: BOT_DEFAULTS.formality,
                levelOfEmotion: BOT_DEFAULTS.levelOfEmotion,
                fillerWords: BOT_DEFAULTS.fillerWords,
                pacing: BOT_DEFAULTS.pacing,
                voice: BOT_DEFAULTS.voice,
                conversationStates: SYSTEM_DEFAULTS.conversationStates,
                editorSettings: SYSTEM_DEFAULTS.editorSettings,
            },
        });
        return newConfig;
    }

    return domainData.botConfiguration;
};

/**
 * Retrieves the bot configuration for a given hostname without requiring user authentication.
 * This is intended for public use by the widget.
 * @param hostname The hostname to retrieve the configuration for.
 * @returns The bot configuration object.
 */
export const getPublicBotConfigByHostname = async (hostname: string) => {
    const domainData = await prisma.domain.findUnique({
        where: { hostname },
        include: {
          botConfiguration: true // Убираем include tools - теперь функции из файлов
        },
    });

    if (!domainData) {
        throw new Error('Domain not found');
    }

    if (!domainData.botConfiguration) {
        throw new Error(`No bot configuration found for domain ${hostname}`);
    }

    // Return the configuration без tools
    return domainData.botConfiguration;
};


export const updateBotConfig = async (userId: number, domainHostname: string, data: Prisma.BotConfigurationUpdateInput) => {
    const domain = await prisma.domain.findFirst({
        where: { hostname: domainHostname, userId },
    });

    if (!domain) {
        throw new Error(`Domain with hostname ${domainHostname} not found or you do not have permission to edit it.`);
    }

    const botConfig = await prisma.botConfiguration.findUnique({
        where: { domainId: domain.id },
    });

    if (!botConfig) {
        // This can happen if getBotConfig was not called before
        // for some reason. Let's create it.
        return prisma.botConfiguration.create({
            data: {
                ...(data as any),
                domainId: domain.id,
                // Если поля не переданы с фронтенда, устанавливаем пустые строки
                identity: (data as any).identity || '',
                task: (data as any).task || '',
                otherDetails: (data as any).otherDetails || '',
                instructions: (data as any).instructions || '',
                demeanor: BOT_DEFAULTS.demeanor,
                tone: BOT_DEFAULTS.tone,
                levelOfEnthusiasm: BOT_DEFAULTS.levelOfEnthusiasm,
                formality: BOT_DEFAULTS.formality,
                levelOfEmotion: BOT_DEFAULTS.levelOfEmotion,
                fillerWords: BOT_DEFAULTS.fillerWords,
                pacing: BOT_DEFAULTS.pacing,
                voice: BOT_DEFAULTS.voice,
                conversationStates: SYSTEM_DEFAULTS.conversationStates,
                editorSettings: SYSTEM_DEFAULTS.editorSettings,
            }
        });
    }

    // Объединяем пользовательские данные с серверными дефолтами
    const updateData = {
        ...data,
        // Автоматически применяем BOT_DEFAULTS (не управляются пользователем)
        demeanor: BOT_DEFAULTS.demeanor,
        tone: BOT_DEFAULTS.tone,
        levelOfEnthusiasm: BOT_DEFAULTS.levelOfEnthusiasm,
        formality: BOT_DEFAULTS.formality,
        levelOfEmotion: BOT_DEFAULTS.levelOfEmotion,
        fillerWords: BOT_DEFAULTS.fillerWords,
        pacing: BOT_DEFAULTS.pacing,
    };

    return prisma.botConfiguration.update({
        where: { domainId: domain.id },
        data: updateData,
    });
}; 

export const getUserDomains = async (userId: number) => {
    const domains = await prisma.domain.findMany({
        where: { userId },
        select: {
            id: true,
            hostname: true,
            createdAt: true,
            updatedAt: true
        }
    });
    
    return domains;
}; 