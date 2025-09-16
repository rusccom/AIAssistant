/**
 * Безопасная работа с localStorage
 * Устраняет дубликаты и добавляет обработку ошибок
 */

import { STORAGE_KEYS } from './constants';

// Интерфейсы для типизации
export interface StoredUser {
    id: number;
    email: string;
    firstName?: string;
    lastName?: string;
}

export interface AppSettings {
    theme?: 'light' | 'dark';
    language?: 'ru' | 'en';
    notifications?: boolean;
}

/**
 * Безопасное сохранение в localStorage
 */
export function setStorageItem<T>(key: string, value: T): boolean {
    try {
        const serialized = JSON.stringify(value);
        localStorage.setItem(key, serialized);
        return true;
    } catch (error) {
        console.error(`Failed to save to localStorage (${key}):`, error);
        return false;
    }
}

/**
 * Безопасное чтение из localStorage
 */
export function getStorageItem<T>(key: string, defaultValue?: T): T | null {
    try {
        const item = localStorage.getItem(key);
        
        if (item === null) {
            return defaultValue || null;
        }
        
        if (item === 'undefined' || item === 'null') {
            return null;
        }
        
        return JSON.parse(item);
    } catch (error) {
        console.error(`Failed to read from localStorage (${key}):`, error);
        
        // Очистить поврежденные данные
        localStorage.removeItem(key);
        return defaultValue || null;
    }
}

/**
 * Удалить элемент из localStorage
 */
export function removeStorageItem(key: string): void {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error(`Failed to remove from localStorage (${key}):`, error);
    }
}

/**
 * Очистить все данные приложения
 */
export function clearAppData(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
        removeStorageItem(key);
    });
    
    // Очистить автосохранения
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('autosave_')) {
            removeStorageItem(key);
        }
    });
    
    console.log('🗑️ All app data cleared from localStorage');
}

// Специализированные функции для auth данных
export function getAuthToken(): string | null {
    return getStorageItem<string>(STORAGE_KEYS.AUTH_TOKEN);
}

export function setAuthToken(token: string): boolean {
    return setStorageItem(STORAGE_KEYS.AUTH_TOKEN, token);
}

export function removeAuthToken(): void {
    removeStorageItem(STORAGE_KEYS.AUTH_TOKEN);
}

export function getUser(): StoredUser | null {
    return getStorageItem<StoredUser>(STORAGE_KEYS.USER_DATA);
}

export function setUser(user: StoredUser): boolean {
    return setStorageItem(STORAGE_KEYS.USER_DATA, user);
}

export function removeUser(): void {
    removeStorageItem(STORAGE_KEYS.USER_DATA);
}

// Функции для настроек приложения
export function getAppSettings(): AppSettings {
    return getStorageItem<AppSettings>(STORAGE_KEYS.SETTINGS, {
        theme: 'light',
        language: 'ru',
        notifications: true
    }) || {};
}

export function setAppSettings(settings: Partial<AppSettings>): boolean {
    const current = getAppSettings();
    const updated = { ...current, ...settings };
    return setStorageItem(STORAGE_KEYS.SETTINGS, updated);
}

/**
 * Проверить доступность localStorage
 */
export function isStorageAvailable(): boolean {
    try {
        const testKey = '__test_storage__';
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
        return true;
    } catch (error) {
        console.warn('localStorage is not available:', error);
        return false;
    }
}

/**
 * Получить размер данных в localStorage (в KB)
 */
export function getStorageSize(): number {
    try {
        let totalSize = 0;
        
        for (const key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                totalSize += localStorage[key].length + key.length;
            }
        }
        
        return Math.round(totalSize / 1024); // KB
    } catch (error) {
        console.warn('Failed to calculate storage size:', error);
        return 0;
    }
}

/**
 * Очистить старые данные (cleanup)
 */
export function cleanupOldData(maxAge: number = 30 * 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    
    Object.keys(localStorage).forEach(key => {
        try {
            const item = localStorage.getItem(key);
            if (!item) return;
            
            // Попытаться найти timestamp в данных
            const data = JSON.parse(item);
            const timestamp = data.timestamp || data.createdAt || data.updatedAt;
            
            if (timestamp && (now - new Date(timestamp).getTime()) > maxAge) {
                localStorage.removeItem(key);
                console.log(`🧹 Cleaned old storage item: ${key}`);
            }
        } catch (error) {
            // Игнорировать ошибки парсинга
        }
    });
}
