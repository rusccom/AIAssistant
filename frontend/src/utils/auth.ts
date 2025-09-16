import { getAuthToken, apiRequest, clearAuthData, PAGES, API_ENDPOINTS } from './api-client';

export function redirectIfAuthenticated() {
    const token = getAuthToken();
    if (!token) {
        console.log('👤 На странице входа: токен отсутствует');
        return;
    }

    // Если токен есть - сразу редиректим (быстро, без API запроса)
    console.log(`🚀 Быстрый редирект: токен найден, перенаправляем на dashboard`);
    window.location.href = PAGES.DASHBOARD;
}

export async function protectPage() {
    const token = getAuthToken();
    if (!token) {
        console.log('🔒 Нет токена, перенаправляем на login');
        window.location.href = PAGES.LOGIN;
        return;
    }

    try {
        // Проверяем действительность токена через централизованный API client
        const { data: user } = await apiRequest(API_ENDPOINTS.AUTH.ME, { method: 'GET' });
        
        // Сохраняем данные пользователя
        localStorage.setItem('user', JSON.stringify(user));
        console.log('✅ Защищенная страница: доступ разрешен');
    } catch (error) {
        console.warn('⚠️ Ошибка проверки токена:', error);
        // apiRequest уже обработал 401 и сделал редирект
    }
}

// Переиспользуем функции из api-client для устранения дубликатов
export { getStoredUser as getUser, performLogout as logout } from './api-client';

/**
 * Показывает информацию о состоянии авторизации (для отладки)
 */
export function getAuthInfo(): { hasToken: boolean; user?: any } {
    const token = getAuthToken();
    const user = getStoredUser();
    
    return {
        hasToken: !!token,
        user: user || undefined
    };
}

// Импортируем функции для совместимости
import { getStoredUser } from './api-client'; 