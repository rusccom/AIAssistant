import { Prisma, PrismaClient } from '@prisma/client';
import { BOT_DEFAULTS } from '../config/bot-defaults';
import { SYSTEM_DEFAULTS } from '../config/system-defaults';
import {
  getRealtimeProviderCatalog,
  resolveRealtimeModel,
  resolveRealtimeVoice
} from '../features/realtime/shared/realtime.catalog';

const prisma = new PrismaClient();

const buildBaseConfig = (data: any, provider: string) => ({
  identity: data.identity || '',
  task: data.task || '',
  otherDetails: data.otherDetails || '',
  instructions: data.instructions || '',
  provider,
  model: resolveRealtimeModel(provider, data.model),
  demeanor: BOT_DEFAULTS.demeanor,
  tone: BOT_DEFAULTS.tone,
  levelOfEnthusiasm: BOT_DEFAULTS.levelOfEnthusiasm,
  formality: BOT_DEFAULTS.formality,
  levelOfEmotion: BOT_DEFAULTS.levelOfEmotion,
  fillerWords: BOT_DEFAULTS.fillerWords,
  pacing: BOT_DEFAULTS.pacing,
  voice: resolveRealtimeVoice(provider, data.voice || BOT_DEFAULTS.voice),
  conversationStates: SYSTEM_DEFAULTS.conversationStates,
  editorSettings: SYSTEM_DEFAULTS.editorSettings
});

const buildUpdateData = (data: Prisma.BotConfigurationUpdateInput, current: any) => {
  const provider = getRealtimeProviderCatalog(
    (data as any).provider || current.provider
  ).id;

  return {
    ...data,
    provider,
    model: resolveRealtimeModel(provider, (data as any).model || current.model),
    voice: resolveRealtimeVoice(provider, (data as any).voice || current.voice),
    demeanor: BOT_DEFAULTS.demeanor,
    tone: BOT_DEFAULTS.tone,
    levelOfEnthusiasm: BOT_DEFAULTS.levelOfEnthusiasm,
    formality: BOT_DEFAULTS.formality,
    levelOfEmotion: BOT_DEFAULTS.levelOfEmotion,
    fillerWords: BOT_DEFAULTS.fillerWords,
    pacing: BOT_DEFAULTS.pacing
  };
};

export const getBotConfig = async (userId: number, domain: string) => {
  const domainData = await prisma.domain.findFirst({
    where: { hostname: domain, userId },
    include: { botConfiguration: true }
  });

  if (!domainData) {
    throw new Error('Domain not found or access denied');
  }

  if (!domainData.botConfiguration) {
    const provider = getRealtimeProviderCatalog().id;
    return prisma.botConfiguration.create({
      data: {
        domainId: domainData.id,
        ...buildBaseConfig({}, provider)
      }
    });
  }

  return domainData.botConfiguration;
};

export const getPublicBotConfigByHostname = async (hostname: string) => {
  const domainData = await prisma.domain.findUnique({
    where: { hostname },
    include: { botConfiguration: true }
  });

  if (!domainData) {
    throw new Error('Domain not found');
  }

  if (!domainData.botConfiguration) {
    throw new Error(`No bot configuration found for domain ${hostname}`);
  }

  return domainData.botConfiguration;
};

export const updateBotConfig = async (
  userId: number,
  domainHostname: string,
  data: Prisma.BotConfigurationUpdateInput
) => {
  const domain = await prisma.domain.findFirst({
    where: { hostname: domainHostname, userId }
  });

  if (!domain) {
    throw new Error(
      `Domain with hostname ${domainHostname} not found or you do not have permission to edit it.`
    );
  }

  const botConfig = await prisma.botConfiguration.findUnique({
    where: { domainId: domain.id }
  });

  if (!botConfig) {
    const provider = getRealtimeProviderCatalog((data as any).provider).id;
    return prisma.botConfiguration.create({
      data: {
        ...(data as any),
        domainId: domain.id,
        ...buildBaseConfig(data as any, provider)
      }
    });
  }

  return prisma.botConfiguration.update({
    where: { domainId: domain.id },
    data: buildUpdateData(data, botConfig)
  });
};

export const getUserDomains = async (userId: number) => {
  return prisma.domain.findMany({
    where: { userId },
    select: {
      id: true,
      hostname: true,
      createdAt: true,
      updatedAt: true
    }
  });
};
