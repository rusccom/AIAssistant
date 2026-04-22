import { resolveAppLanguage } from './language-registry';
import type { AppLanguage } from './types';

const APP_LANGUAGE_STORAGE_KEY = 'appLanguage';

export function loadStoredAppLanguage(): AppLanguage | null {
    try {
        const value = localStorage.getItem(APP_LANGUAGE_STORAGE_KEY);
        return value ? resolveAppLanguage(value) : null;
    } catch (error) {
        console.warn('Failed to load stored app language:', error);
        return null;
    }
}

export function saveAppLanguage(language: AppLanguage): void {
    try {
        localStorage.setItem(APP_LANGUAGE_STORAGE_KEY, language);
    } catch (error) {
        console.warn('Failed to save app language:', error);
    }
}
