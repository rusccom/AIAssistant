export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastConfig {
    message: string;
    type: ToastType;
    duration?: number;
    position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center';
}

const TOAST_ICON: Record<ToastType, string> = {
    success: '+',
    error: '!',
    warning: '!',
    info: 'i'
};

export class Toast {
    private static container: HTMLElement | null = null;

    public static show(config: ToastConfig): HTMLElement {
        const container = Toast.createContainer();
        const toast = Toast.createElement(config);
        const duration = config.duration ?? Toast.getDefaultDuration(config.type);

        container.appendChild(toast);
        window.setTimeout(() => Toast.hide(toast), duration);
        return toast;
    }

    public static hide(toast: HTMLElement): void {
        if (toast.classList.contains('is-leaving')) {
            return;
        }

        toast.classList.add('is-leaving');
        window.setTimeout(() => toast.remove(), 200);
    }

    public static clearAll(): void {
        Toast.container?.replaceChildren();
    }

    private static createContainer(): HTMLElement {
        if (Toast.container) {
            return Toast.container;
        }

        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-stack';
        document.body.appendChild(container);
        Toast.container = container;
        return container;
    }

    private static createElement(config: ToastConfig): HTMLElement {
        const toast = document.createElement('div');
        const icon = document.createElement('span');
        const message = document.createElement('span');
        const closeButton = document.createElement('button');

        toast.className = `toast toast--${config.type}`;
        icon.className = 'toast__icon';
        icon.textContent = TOAST_ICON[config.type];
        message.className = 'toast__message';
        message.textContent = config.message;
        closeButton.type = 'button';
        closeButton.className = 'toast__close';
        closeButton.setAttribute('aria-label', 'Close');
        closeButton.textContent = 'x';

        closeButton.addEventListener('click', (event) => {
            event.stopPropagation();
            Toast.hide(toast);
        });
        toast.addEventListener('click', () => Toast.hide(toast));

        toast.append(icon, message, closeButton);
        return toast;
    }

    private static getDefaultDuration(type: ToastType): number {
        return type === 'error' ? 8000 : 4000;
    }
}

export const showToast = (message: string, type: ToastType = 'info', duration?: number) =>
    Toast.show({ message, type, duration });

export const showSuccess = (message: string) => Toast.show({ message, type: 'success' });
export const showError = (message: string) => Toast.show({ message, type: 'error' });
export const showWarning = (message: string) => Toast.show({ message, type: 'warning' });
export const showInfo = (message: string) => Toast.show({ message, type: 'info' });
