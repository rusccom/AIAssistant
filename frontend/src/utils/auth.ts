export async function redirectIfAuthenticated() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        console.log('👤 На странице входа: токен отсутствует');
        return;
    }

    try {
        // Проверяем действительность токена
        const response = await fetch('/api/auth/me', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            // Токен действителен - обновляем данные и перенаправляем
            const user = await response.json();
            localStorage.setItem('user', JSON.stringify(user));
            
            console.log(`✅ Автоматический вход: пользователь ${user.email}, перенаправляем на dashboard`);
            window.location.href = '/dashboard.html';
        } else if (response.status === 401) {
            // Токен истек - очищаем данные
            console.log('⚠️ Токен истек, очищаем localStorage');
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
        }
    } catch (error) {
        console.warn('⚠️ Ошибка проверки токена:', error);
    }
}

export async function protectPage() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        console.log('🔒 Нет токена, перенаправляем на login');
        window.location.href = '/login.html';
        return;
    }

    try {
        // Проверяем действительность токена
        const response = await fetch('/api/auth/me', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            // Токен действителен - обновляем данные пользователя
            const user = await response.json();
            localStorage.setItem('user', JSON.stringify(user));
            console.log('✅ Защищенная страница: доступ разрешен');
        } else if (response.status === 401) {
            // Токен истек - перенаправляем на логин
            console.log('⚠️ Токен истек, перенаправляем на login');
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            window.location.href = '/login.html';
        }
    } catch (error) {
        console.warn('⚠️ Ошибка проверки токена:', error);
        // При сетевых ошибках не перенаправляем
    }
}

export function getUser() {
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
 * Выполняет logout пользователя
 * Простая версия - очищает все данные и перенаправляет на логин
 */
export async function logout() {
    try {
        // Отправляем запрос на backend для logout (если необходимо)
        const token = localStorage.getItem('authToken');
        if (token) {
            fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }).catch(() => {
                // Игнорируем ошибки logout на backend, т.к. локальный logout важнее
            });
        }
    } finally {
        // Очищаем все данные авторизации
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        
        console.log('🔓 Logout: Все данные очищены');
        
        // Перенаправляем на страницу логина
        window.location.href = '/login.html';
    }
}



/**
 * Показывает информацию о состоянии авторизации (для отладки)
 */
export function getAuthInfo(): { hasToken: boolean; user?: any } {
    const token = localStorage.getItem('authToken');
    const user = getUser();
    
    return {
        hasToken: !!token,
        user: user || undefined
    };
} 