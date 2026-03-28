import { GEMINI_PROVIDER_CATALOG } from '../gemini/gemini-live.catalog';
import { OPENAI_PROVIDER_CATALOG } from '../openai/openai-realtime.catalog';
import {
  RealtimeProviderCatalog,
  RealtimeProviderId
} from './realtime.types';

const REALTIME_PROVIDERS = [
  OPENAI_PROVIDER_CATALOG,
  GEMINI_PROVIDER_CATALOG
] as const;

const DEFAULT_REALTIME_PROVIDER = OPENAI_PROVIDER_CATALOG;

const PROVIDER_MAP = new Map<RealtimeProviderId, RealtimeProviderCatalog>(
  REALTIME_PROVIDERS.map((provider) => [provider.id, provider])
);

const isProviderId = (value: string): value is RealtimeProviderId =>
  value === 'openai' || value === 'gemini';

export const getRealtimeProviders = (): RealtimeProviderCatalog[] =>
  [...REALTIME_PROVIDERS];

export const getRealtimeProviderCatalog = (
  provider?: string
): RealtimeProviderCatalog => {
  if (!provider || !isProviderId(provider)) {
    return DEFAULT_REALTIME_PROVIDER;
  }

  return PROVIDER_MAP.get(provider) ?? DEFAULT_REALTIME_PROVIDER;
};

export const resolveRealtimeModel = (
  provider: string | undefined,
  model?: string
): string => {
  const catalog = getRealtimeProviderCatalog(provider);
  const match = catalog.models.find((item) => item.id === model);
  return match?.id ?? catalog.defaultModel;
};

export const resolveRealtimeVoice = (
  provider: string | undefined,
  voice?: string
): string => {
  const catalog = getRealtimeProviderCatalog(provider);
  const match = catalog.voices.find((item) => item.id === voice);
  return match?.id ?? catalog.defaultVoice;
};
