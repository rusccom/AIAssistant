import type { AppLanguage } from './types';

interface AppLanguageConfig {
    id: AppLanguage;
    locale: string;
}

const appLanguageRegistry: Record<AppLanguage, AppLanguageConfig> = {
    en: {
        id: 'en',
        locale: 'en-US'
    },
    pl: {
        id: 'pl',
        locale: 'pl-PL'
    }
};

export const DEFAULT_APP_LANGUAGE: AppLanguage = 'en';

export function getAppLanguages(): AppLanguageConfig[] {
    return Object.values(appLanguageRegistry);
}

export function getAppLanguageLocale(language: AppLanguage): string {
    return appLanguageRegistry[language].locale;
}

export function isAppLanguage(value: string | null | undefined): value is AppLanguage {
    return value === 'en' || value === 'pl';
}

export function resolveAppLanguage(value: string | null | undefined): AppLanguage {
    return isAppLanguage(value) ? value : DEFAULT_APP_LANGUAGE;
}
