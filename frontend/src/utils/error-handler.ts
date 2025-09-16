/**
 * Стандартизированная обработка ошибок
 * Устраняет дубликаты showError/showSuccess в 15 файлах
 */

import { SELECTORS, CSS_CLASSES, MESSAGES } from './constants';

// Типы уведомлений
export type NotificationType = 'error' | 'success' | 'warning' | 'info';

/**
 * Показать уведомление пользователю
 * @param message Текст сообщения
 * @param type Тип уведомления
 * @param containerId ID контейнера (опционально)
 */
export function showNotification(
    message: string, 
    type: NotificationType = 'info',
    containerId?: string
): void {
    const container = containerId 
        ? document.getElementById(containerId)
        : findNotificationContainer(type);
        
    if (!container) {
        console.warn(`Notification container not found for type: ${type}`);
        return;
    }
    
    updateNotificationContent(container, message, type);
    showNotificationContainer(container);
}

/**
 * Найти подходящий контейнер для уведомления
 */
function findNotificationContainer(type: NotificationType): HTMLElement | null {
    if (type === 'error') {
        return document.querySelector(SELECTORS.ERROR_MESSAGE);
    }
    
    if (type === 'success') {
        return document.querySelector(SELECTORS.SUCCESS_MESSAGE);
    }
    
    // Создать временный контейнер если нет подходящего
    return createTemporaryNotification();
}

/**
 * Обновить содержимое контейнера уведомления
 */
function updateNotificationContent(
    container: HTMLElement, 
    message: string, 
    type: NotificationType
): void {
    // Найти текстовый элемент или использовать сам контейнер
    const textElement = container.querySelector('.error-text, .success-text, .message-text') || container;
    textElement.textContent = message;
    
    // Установить CSS класс
    container.className = `notification ${type}`;
}

/**
 * Показать контейнер уведомления
 */
function showNotificationContainer(container: HTMLElement): void {
    (container as HTMLElement).style.display = 'block';
    (container as HTMLElement).style.opacity = '1';
    
    // Автоматически скрыть успех/info через 5 сек
    const type = container.className.includes('success') ? 'success' : 
                 container.className.includes('info') ? 'info' : null;
                 
    if (type === 'success' || type === 'info') {
        setTimeout(() => hideNotification(container), 5000);
    }
}

/**
 * Скрыть уведомление
 */
export function hideNotification(containerId?: string | HTMLElement): void {
    const container = typeof containerId === 'string' 
        ? document.getElementById(containerId)
        : containerId || document.querySelector('.notification');
        
    if (container) {
        (container as HTMLElement).style.display = 'none';
        (container as HTMLElement).style.opacity = '0';
    }
}

/**
 * Создать временное всплывающее уведомление
 */
function createTemporaryNotification(): HTMLElement {
    const notification = document.createElement('div');
    notification.className = 'temp-notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #333;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        z-index: 10000;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    document.body.appendChild(notification);
    
    // Автоматически удалить через 5 сек
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
    
    return notification;
}

// Готовые функции для частых случаев
export const showError = (message: string, containerId?: string) => 
    showNotification(message, 'error', containerId);

export const showSuccess = (message: string, containerId?: string) => 
    showNotification(message, 'success', containerId);

export const showWarning = (message: string, containerId?: string) => 
    showNotification(message, 'warning', containerId);

/**
 * Обработать ошибку API запроса
 */
export function handleApiError(error: any, context?: string): void {
    console.error(`API Error${context ? ` in ${context}` : ''}:`, error);
    
    if (error.message?.includes('Unauthorized')) {
        showError(MESSAGES.ERRORS.UNAUTHORIZED);
        return;
    }
    
    if (error.message?.includes('Network')) {
        showError(MESSAGES.ERRORS.NETWORK_ERROR);
        return;
    }
    
    showError(MESSAGES.ERRORS.SERVER_ERROR);
}

/**
 * Обработать ошибку валидации формы
 */
export function handleValidationError(field: string, message?: string): void {
    const fieldElement = document.querySelector(`[name="${field}"]`);
    
    if (fieldElement) {
        fieldElement.classList.add(CSS_CLASSES.ERROR);
    }
    
    showError(message || MESSAGES.VALIDATION.REQUIRED_FIELDS);
}
