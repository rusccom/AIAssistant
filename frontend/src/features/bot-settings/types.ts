import type { RealtimeProviderOption } from '../realtime/realtime-settings';

export interface BotSettingsProductVariant {
    id: number;
    price: number;
    sku?: string;
    title: string;
}

export interface BotSettingsProduct {
    description?: string;
    id: number;
    status: string;
    title: string;
    variants: BotSettingsProductVariant[];
}

export interface BotSettingsProductDraftVariant {
    price: number;
    sku: string;
    title: string;
}

export interface BotSettingsDomainConfig {
    identity?: string;
    instructions?: string;
    model?: string;
    otherDetails?: string;
    provider?: string;
    task?: string;
    voice?: string;
}

export interface BotSettingsDomainRecord {
    hostname: string;
    id: string;
    widgetScriptUrl?: string;
}

export interface BotSettingsDashboardData {
    domainConfigs: Record<string, BotSettingsDomainConfig>;
    domains: BotSettingsDomainRecord[];
    realtimeProviders?: RealtimeProviderOption[];
    success: boolean;
    voices?: unknown[];
}

export interface BotSettingsWindow extends Window {
    domainConfigs?: Record<string, BotSettingsDomainConfig>;
    realtimeProviders?: RealtimeProviderOption[];
}
