import type { ClientThemeId } from './theme-registry';

const CLIENT_THEME_STORAGE_KEY = 'client-theme-id';

export function loadStoredClientThemeId(): string | null {
    try {
        return window.localStorage.getItem(CLIENT_THEME_STORAGE_KEY);
    } catch {
        return null;
    }
}

export function saveClientThemeId(themeId: ClientThemeId): void {
    try {
        window.localStorage.setItem(CLIENT_THEME_STORAGE_KEY, themeId);
    } catch {
        // Ignore storage failures and keep the current in-memory theme.
    }
}
