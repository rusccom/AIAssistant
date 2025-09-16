/**
 * Переиспользуемый Modal компонент
 * Устраняет дубликаты modal логики в bot-settings.ts и других файлах
 */

import { CSS_CLASSES } from '../utils/constants';

export interface ModalConfig {
    id: string;
    title?: string;
    content?: string;
    closeOnBackdrop?: boolean;
    showCloseButton?: boolean;
    className?: string;
    maxWidth?: string;
}

export interface ModalButtons {
    text: string;
    className?: string;
    onClick: () => void | Promise<void>;
}

export class Modal {
    private element: HTMLElement;
    private config: ModalConfig;
    private onClose?: () => void;

    constructor(config: ModalConfig) {
        this.config = config;
        this.element = this.createElement();
        this.setupEventListeners();
    }

    /**
     * Создать DOM элемент модального окна
     */
    private createElement(): HTMLElement {
        const modal = document.createElement('div');
        modal.id = this.config.id;
        modal.className = `modal ${this.config.className || ''}`;
        modal.style.cssText = `
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
            align-items: center;
            justify-content: center;
        `;

        const content = document.createElement('div');
        content.className = 'modal-content';
        content.style.cssText = `
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            max-width: ${this.config.maxWidth || '500px'};
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            position: relative;
        `;

        if (this.config.title) {
            const title = document.createElement('h2');
            title.className = 'modal-title';
            title.textContent = this.config.title;
            title.style.marginTop = '0';
            content.appendChild(title);
        }

        if (this.config.showCloseButton !== false) {
            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '&times;';
            closeBtn.className = 'modal-close';
            closeBtn.style.cssText = `
                position: absolute;
                top: 15px;
                right: 20px;
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #999;
            `;
            closeBtn.onclick = () => this.close();
            content.appendChild(closeBtn);
        }

        if (this.config.content) {
            const body = document.createElement('div');
            body.className = 'modal-body';
            body.innerHTML = this.config.content;
            content.appendChild(body);
        }

        modal.appendChild(content);
        document.body.appendChild(modal);
        
        return modal;
    }

    /**
     * Настроить обработчики событий
     */
    private setupEventListeners(): void {
        if (this.config.closeOnBackdrop !== false) {
            this.element.addEventListener('click', (e) => {
                if (e.target === this.element) {
                    this.close();
                }
            });
        }

        // ESC для закрытия
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible()) {
                this.close();
            }
        });
    }

    /**
     * Показать модальное окно
     */
    public show(onClose?: () => void): void {
        this.onClose = onClose;
        this.element.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Фокус на модальное окно
        this.element.focus();
    }

    /**
     * Скрыть модальное окно
     */
    public close(): void {
        this.element.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        if (this.onClose) {
            this.onClose();
        }
    }

    /**
     * Проверить видимость модального окна
     */
    public isVisible(): boolean {
        return this.element.style.display === 'flex';
    }

    /**
     * Обновить содержимое модального окна
     */
    public setContent(content: string): void {
        const body = this.element.querySelector('.modal-body');
        if (body) {
            body.innerHTML = content;
        }
    }

    /**
     * Обновить заголовок
     */
    public setTitle(title: string): void {
        const titleElement = this.element.querySelector('.modal-title');
        if (titleElement) {
            titleElement.textContent = title;
        }
    }

    /**
     * Добавить кнопки в футер модального окна
     */
    public addButtons(buttons: ModalButtons[]): void {
        let footer = this.element.querySelector('.modal-footer');
        
        if (!footer) {
            footer = document.createElement('div');
            footer.className = 'modal-footer';
            (footer as HTMLElement).style.cssText = `
                margin-top: 20px;
                text-align: right;
                border-top: 1px solid #eee;
                padding-top: 15px;
            `;
            
            const content = this.element.querySelector('.modal-content');
            content?.appendChild(footer);
        }

        // Очистить существующие кнопки
        footer.innerHTML = '';

        buttons.forEach(button => {
            const btn = document.createElement('button');
            btn.textContent = button.text;
            btn.className = `btn ${button.className || 'btn-primary'}`;
            btn.style.marginLeft = '10px';
            
            btn.onclick = async () => {
                try {
                    await button.onClick();
                } catch (error) {
                    console.error('Modal button error:', error);
                }
            };
            
            footer.appendChild(btn);
        });
    }

    /**
     * Удалить модальное окно
     */
    public destroy(): void {
        if (this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        document.body.style.overflow = 'auto';
    }

    /**
     * Статический метод для создания простого confirm диалога
     */
    static confirm(
        message: string, 
        title: string = 'Confirm',
        onConfirm: () => void
    ): Modal {
        const modal = new Modal({
            id: 'confirm-modal',
            title,
            content: `<p>${message}</p>`,
            className: 'confirm-modal'
        });

        modal.addButtons([
            {
                text: 'Cancel',
                className: 'btn-secondary',
                onClick: () => modal.close()
            },
            {
                text: 'Confirm',
                className: 'btn-danger',
                onClick: () => {
                    onConfirm();
                    modal.close();
                }
            }
        ]);

        modal.show(() => modal.destroy());
        return modal;
    }

    /**
     * Статический метод для создания alert диалога
     */
    static alert(message: string, title: string = 'Information'): Modal {
        const modal = new Modal({
            id: 'alert-modal',
            title,
            content: `<p>${message}</p>`,
            className: 'alert-modal'
        });

        modal.addButtons([
            {
                text: 'OK',
                className: 'btn-primary',
                onClick: () => modal.close()
            }
        ]);

        modal.show(() => modal.destroy());
        return modal;
    }
}
