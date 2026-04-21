import { showToast } from '../components';
import { CSS_CLASSES, MESSAGES, SELECTORS } from './constants';

export type NotificationType = 'error' | 'success' | 'warning' | 'info';

export function showNotification(
    message: string,
    type: NotificationType = 'info',
    containerId?: string
): void {
    const container = containerId
        ? document.getElementById(containerId)
        : findNotificationContainer(type);

    if (!container) {
        showToast(message, type);
        return;
    }

    updateNotificationContent(container, message, type);
    showNotificationContainer(container, type);
}

export function hideNotification(containerId?: string | HTMLElement): void {
    const container = typeof containerId === 'string'
        ? document.getElementById(containerId)
        : containerId || document.querySelector<HTMLElement>('.notification');

    if (!container) {
        return;
    }

    container.style.display = 'none';
    container.style.opacity = '0';
}

export const showError = (message: string, containerId?: string) =>
    showNotification(message, 'error', containerId);

export const showSuccess = (message: string, containerId?: string) =>
    showNotification(message, 'success', containerId);

export const showWarning = (message: string, containerId?: string) =>
    showNotification(message, 'warning', containerId);

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

export function handleValidationError(field: string, message?: string): void {
    const fieldElement = document.querySelector<HTMLElement>(`[name="${field}"]`);

    if (fieldElement) {
        fieldElement.classList.add(CSS_CLASSES.ERROR);
    }

    showError(message || MESSAGES.VALIDATION.REQUIRED_FIELDS);
}

function findNotificationContainer(type: NotificationType): HTMLElement | null {
    if (type === 'error') {
        return document.querySelector<HTMLElement>(SELECTORS.ERROR_MESSAGE);
    }

    if (type === 'success') {
        return document.querySelector<HTMLElement>(SELECTORS.SUCCESS_MESSAGE);
    }

    return null;
}

function showNotificationContainer(container: HTMLElement, type: NotificationType): void {
    container.style.display = 'block';
    container.style.opacity = '1';

    if (type === 'success' || type === 'info') {
        window.setTimeout(() => hideNotification(container), 5000);
    }
}

function updateNotificationContent(
    container: HTMLElement,
    message: string,
    type: NotificationType
): void {
    const textElement = container.querySelector<HTMLElement>('.error-text, .success-text, .message-text') || container;

    textElement.textContent = message;
    container.className = `notification ${type}`;
}
