/**
 * Переиспользуемый LoadingSpinner компонент
 * Устраняет дубликаты loading состояний в формах
 */

import { CSS_CLASSES } from '../utils/constants';

export interface SpinnerConfig {
    size?: 'small' | 'medium' | 'large';
    color?: string;
    text?: string;
    overlay?: boolean;
}

export class LoadingSpinner {
    private element: HTMLElement;
    private config: SpinnerConfig;

    constructor(config: SpinnerConfig = {}) {
        this.config = config;
        this.element = this.createElement();
    }

    /**
     * Создать DOM элемент спиннера
     */
    private createElement(): HTMLElement {
        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner';
        
        const size = this.getSizeValues();
        const color = this.config.color || '#007bff';
        
        spinner.style.cssText = `
            display: none;
            ${this.config.overlay ? this.getOverlayStyles() : ''}
            justify-content: center;
            align-items: center;
            flex-direction: column;
            gap: 10px;
        `;

        // Создать анимированный спиннер
        const spinnerCircle = document.createElement('div');
        spinnerCircle.style.cssText = `
            width: ${size.width}px;
            height: ${size.height}px;
            border: ${size.border}px solid #f3f3f3;
            border-top: ${size.border}px solid ${color};
            border-radius: 50%;
            animation: spin 1s linear infinite;
        `;

        spinner.appendChild(spinnerCircle);

        // Добавить текст если указан
        if (this.config.text) {
            const text = document.createElement('div');
            text.className = 'loading-text';
            text.textContent = this.config.text;
            text.style.cssText = `
                color: ${color};
                font-size: 14px;
                text-align: center;
            `;
            spinner.appendChild(text);
        }

        return spinner;
    }

    /**
     * Получить размеры по конфигурации
     */
    private getSizeValues() {
        const sizes = {
            small: { width: 20, height: 20, border: 2 },
            medium: { width: 40, height: 40, border: 4 },
            large: { width: 60, height: 60, border: 6 }
        };
        return sizes[this.config.size || 'medium'];
    }

    /**
     * Получить стили для overlay режима
     */
    private getOverlayStyles(): string {
        return `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255, 255, 255, 0.8);
            z-index: 9999;
        `;
    }

    /**
     * Показать спиннер
     */
    public show(parent?: HTMLElement): void {
        const container = parent || document.body;
        
        if (!this.element.parentNode) {
            container.appendChild(this.element);
        }
        
        this.element.style.display = this.config.overlay ? 'flex' : 'inline-flex';
    }

    /**
     * Скрыть спиннер
     */
    public hide(): void {
        this.element.style.display = 'none';
    }

    /**
     * Удалить спиннер
     */
    public destroy(): void {
        if (this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }

    /**
     * Инициализация CSS анимаций (вызвать один раз)
     */
    public static initStyles(): void {
        if (document.getElementById('spinner-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'spinner-styles';
        styles.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        
        document.head.appendChild(styles);
    }

    /**
     * Показать глобальный overlay спиннер
     */
    public static showGlobal(text: string = 'Loading...'): LoadingSpinner {
        const spinner = new LoadingSpinner({
            size: 'large',
            text,
            overlay: true
        });
        
        spinner.show();
        return spinner;
    }

    /**
     * Добавить спиннер к кнопке
     */
    public static addToButton(button: HTMLButtonElement, text?: string): void {
        if (button.querySelector('.btn-spinner')) return;

        const originalText = button.textContent;
        const spinner = new LoadingSpinner({ size: 'small' });
        spinner.element.className = 'btn-spinner';
        spinner.element.style.cssText = 'display: inline-flex; margin-right: 8px;';

        button.disabled = true;
        button.insertBefore(spinner.element, button.firstChild);
        
        if (text) {
            button.childNodes.forEach(node => {
                if (node.nodeType === Node.TEXT_NODE) {
                    node.textContent = text;
                }
            });
        }

        spinner.show();

        // Сохранить оригинальное состояние
        (button as any)._originalState = {
            text: originalText,
            disabled: false,
            spinner
        };
    }

    /**
     * Убрать спиннер с кнопки
     */
    public static removeFromButton(button: HTMLButtonElement): void {
        const state = (button as any)._originalState;
        if (!state) return;

        state.spinner.destroy();
        button.disabled = state.disabled;
        button.textContent = state.text;
        
        delete (button as any)._originalState;
    }
}

// Инициализация стилей при импорте
LoadingSpinner.initStyles();
