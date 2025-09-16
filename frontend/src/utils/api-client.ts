/**
 * Централизованный API клиент для устранения дубликатов
 */

// Импортируем API endpoints из constants чтобы избежать дубликатов
import { API_ENDPOINTS } from './constants';

// Реэкспортируем для обратной совместимости
export { API_ENDPOINTS };

// В development используется webpack proxy для /api/* запросов

// Константы страниц
export const PAGES = {
    HOME: '/',
    LOGIN: '/login.html',
    REGISTER: '/register.html', 
    DASHBOARD: '/dashboard.html',
    BOT_SETTINGS: '/bot-settings.html',
    VISUAL_EDITOR: '/visual-editor.html'
} as const;

/**
 * Получить токен авторизации
 */
export function getAuthToken(): string | null {
    return localStorage.getItem('authToken');
}

/**
 * Создать заголовки с авторизацией
 */
export function createAuthHeaders(): HeadersInit {
    const token = getAuthToken();
    const headers: HeadersInit = {
        'Content-Type': 'application/json'
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
}

/**
 * Универсальная функция для API запросов с авторизацией
 */
export async function apiRequest<T = any>(
    endpoint: string, 
    options: RequestInit = {}
): Promise<{ data: T; response: Response }> {
    const config: RequestInit = {
        ...options,
        headers: {
            ...createAuthHeaders(),
            ...options.headers
        }
    };

    // В development webpack proxy автоматически перенаправляет /api/* на localhost:3001
    const response = await fetch(endpoint, config);
    const data = await response.json();
    
    // Автоматическая обработка 401 ошибок
    if (response.status === 401) {
        console.warn('🔓 Unauthorized: clearing auth data');
        clearAuthData();
        window.location.href = PAGES.LOGIN;
        throw new Error('Unauthorized');
    }
    
    return { data, response };
}

/**
 * Очистить все данные авторизации (устраняет 7 дубликатов)
 */
export function clearAuthData(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    console.log('🗑️ Auth data cleared');
}

/**
 * Сохранить данные авторизации
 */
export function saveAuthData(token: string, user: any): void {
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(user));
    console.log('💾 Auth data saved');
}

/**
 * Получить данные пользователя из localStorage
 */
export function getStoredUser(): any | null {
    const userStr = localStorage.getItem('user');
    if (!userStr || userStr === 'undefined' || userStr === 'null') {
        return null;
    }
    try {
        return JSON.parse(userStr);
    } catch (e) {
        console.error("Failed to parse user from localStorage", e);
        return null;
    }
}

/**
 * Выполнить logout
 */
export async function performLogout(): Promise<void> {
    try {
        const token = getAuthToken();
        if (token) {
            // Уведомляем сервер о logout (необязательно)
            await fetch(API_ENDPOINTS.AUTH.LOGOUT, {
                method: 'POST',
                headers: createAuthHeaders()
            }).catch(() => {}); // Игнорируем ошибки logout на backend
        }
    } finally {
        clearAuthData();
        window.location.href = PAGES.LOGIN;
    }
}
