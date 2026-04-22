import type { AppLanguage } from '../types';
import { appEn, appPl } from './app';
import { botSettingsExtraEn, botSettingsExtraPl } from './bot-settings-extra';
import { authEn, authPl } from './auth';
import { botSettingsEn, botSettingsPl } from './bot-settings';
import { commonEn, commonPl } from './common';
import { dashboardEn, dashboardPl } from './dashboard';
import { visualEditorEn, visualEditorPl } from './visual-editor';

export const enTranslations = {
    ...commonEn,
    ...authEn,
    ...appEn,
    ...dashboardEn,
    ...botSettingsEn,
    ...botSettingsExtraEn,
    ...visualEditorEn
} as const;

export type TranslationKey = keyof typeof enTranslations;

export const translationsByLanguage: Record<AppLanguage, Record<TranslationKey, string>> = {
    en: enTranslations,
    pl: {
        ...commonPl,
        ...authPl,
        ...appPl,
        ...dashboardPl,
        ...botSettingsPl,
        ...botSettingsExtraPl,
        ...visualEditorPl
    }
};
