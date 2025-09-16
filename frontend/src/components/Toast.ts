/**
 * Toast уведомления
 * Заменяет дублированные showError/showSuccess функции
 */

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastConfig {
    message: string;
    type: ToastType;
    duration?: number;
    position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center';
}

export class Toast {
    private static container: HTMLElement | null = null;

    /**
     * Создать контейнер для toast уведомлений
     */
    private static createContainer(): HTMLElement {
        if (Toast.container) return Toast.container;

        const container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-width: 400px;
        `;
        
        document.body.appendChild(container);
        Toast.container = container;
        
        return container;
    }

    /**
     * Показать toast уведомление
     */
    public static show(config: ToastConfig): HTMLElement {
        const container = Toast.createContainer();
        const toast = Toast.createElement(config);
        
        container.appendChild(toast);
        
        // Автоматическое скрытие
        const duration = config.duration || Toast.getDefaultDuration(config.type);
        setTimeout(() => Toast.hide(toast), duration);
        
        return toast;
    }

    /**
     * Создать элемент toast
     */
    private static createElement(config: ToastConfig): HTMLElement {
        const toast = document.createElement('div');
        toast.className = `toast toast-${config.type}`;
        
        const colors = Toast.getColors(config.type);
        toast.style.cssText = `
            background: ${colors.bg};
            color: ${colors.text};
            border: 1px solid ${colors.border};
            border-radius: 6px;
            padding: 12px 16px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            gap: 10px;
            animation: slideIn 0.3s ease-out;
            cursor: pointer;
            min-width: 250px;
        `;

        // Иконка по типу
        const icon = document.createElement('span');
        icon.innerHTML = Toast.getIcon(config.type);
        icon.style.fontSize = '18px';
        toast.appendChild(icon);

        // Текст сообщения
        const message = document.createElement('span');
        message.textContent = config.message;
        message.style.flex = '1';
        toast.appendChild(message);

        // Кнопка закрытия
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
            background: none;
            border: none;
            color: inherit;
            font-size: 18px;
            cursor: pointer;
            opacity: 0.7;
            padding: 0;
            width: 20px;
            height: 20px;
        `;
        closeBtn.onclick = () => Toast.hide(toast);
        toast.appendChild(closeBtn);

        // Клик по toast для закрытия
        toast.onclick = () => Toast.hide(toast);

        return toast;
    }

    /**
     * Скрыть toast уведомление
     */
    public static hide(toast: HTMLElement): void {
        toast.style.animation = 'slideOut 0.3s ease-out forwards';
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    /**
     * Получить цвета по типу уведомления
     */
    private static getColors(type: ToastType): { bg: string; text: string; border: string } {
        const colors = {
            success: { bg: '#d4edda', text: '#155724', border: '#c3e6cb' },
            error: { bg: '#f8d7da', text: '#721c24', border: '#f5c6cb' },
            warning: { bg: '#fff3cd', text: '#856404', border: '#ffeaa7' },
            info: { bg: '#d1ecf1', text: '#0c5460', border: '#bee5eb' }
        };
        return colors[type];
    }

    /**
     * Получить иконку по типу
     */
    private static getIcon(type: ToastType): string {
        const icons = {
            success: '✅',
            error: '❌', 
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type];
    }

    /**
     * Получить длительность по умолчанию
     */
    private static getDefaultDuration(type: ToastType): number {
        return type === 'error' ? 8000 : 4000;
    }

    /**
     * Очистить все toast уведомления
     */
    public static clearAll(): void {
        if (Toast.container) {
            Toast.container.innerHTML = '';
        }
    }

    /**
     * Инициализация CSS анимаций (вызвать один раз)
     */
    public static initStyles(): void {
        if (document.getElementById('toast-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'toast-styles';
        styles.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        
        document.head.appendChild(styles);
    }
}

// Готовые функции для быстрого использования
export const showToast = (message: string, type: ToastType = 'info', duration?: number) => 
    Toast.show({ message, type, duration });

export const showSuccess = (message: string) => Toast.show({ message, type: 'success' });
export const showError = (message: string) => Toast.show({ message, type: 'error' });
export const showWarning = (message: string) => Toast.show({ message, type: 'warning' });
export const showInfo = (message: string) => Toast.show({ message, type: 'info' });

// Инициализация стилей при импорте
Toast.initStyles();
