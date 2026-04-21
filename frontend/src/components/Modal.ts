import { closeLayer, openLayer, setBodyScrollLocked } from '../shared/ui/dom';
import { escapeHtml } from '../shared/ui/primitives';

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
    private readonly config: ModalConfig;
    private readonly element: HTMLElement;
    private readonly handleBackdropClick: (event: Event) => void;
    private readonly handleDocumentKeydown: (event: KeyboardEvent) => void;
    private onClose?: () => void;

    constructor(config: ModalConfig) {
        this.config = config;
        this.element = this.createElement();
        this.handleBackdropClick = (event) => {
            if (this.config.closeOnBackdrop !== false && event.target === this.element) {
                this.close();
            }
        };
        this.handleDocumentKeydown = (event) => {
            if (event.key === 'Escape' && this.isVisible()) {
                this.close();
            }
        };
        this.setupEventListeners();
    }

    public show(onClose?: () => void): void {
        this.onClose = onClose;
        openLayer(this.element);
        this.element.focus();
    }

    public close(): void {
        closeLayer(this.element);

        if (this.onClose) {
            this.onClose();
        }
    }

    public isVisible(): boolean {
        return !this.element.hidden;
    }

    public setContent(content: string): void {
        const body = this.element.querySelector<HTMLElement>('.modal-body');

        if (body) {
            body.innerHTML = content;
        }
    }

    public setTitle(title: string): void {
        const titleElement = this.element.querySelector<HTMLElement>('.modal-title');

        if (titleElement) {
            titleElement.textContent = title;
        }
    }

    public addButtons(buttons: ModalButtons[]): void {
        let footer = this.element.querySelector<HTMLElement>('.modal-footer');

        if (!footer) {
            footer = document.createElement('div');
            footer.className = 'modal-footer modal-actions';
            this.element.querySelector<HTMLElement>('.modal-content')?.appendChild(footer);
        }

        footer.innerHTML = '';

        buttons.forEach((buttonConfig) => {
            const button = document.createElement('button');
            const buttonClassName = buttonConfig.className?.includes('btn')
                ? buttonConfig.className
                : `btn ${buttonConfig.className || 'btn-primary'}`;

            button.type = 'button';
            button.className = buttonClassName;
            button.textContent = buttonConfig.text;
            button.addEventListener('click', async () => {
                try {
                    await buttonConfig.onClick();
                } catch (error) {
                    console.error('Modal button error:', error);
                }
            });

            footer.appendChild(button);
        });
    }

    public destroy(): void {
        this.element.removeEventListener('click', this.handleBackdropClick);
        document.removeEventListener('keydown', this.handleDocumentKeydown);
        this.element.remove();
        setBodyScrollLocked(false);
    }

    public static confirm(
        message: string,
        title = 'Confirm',
        onConfirm: () => void | Promise<void>
    ): Modal {
        const modal = new Modal({
            id: 'confirm-modal',
            title,
            content: wrapMessage(message),
            className: 'confirm-modal'
        });

        modal.addButtons([
            {
                text: 'Cancel',
                className: 'btn btn-secondary',
                onClick: () => modal.close()
            },
            {
                text: 'Confirm',
                className: 'btn btn-danger',
                onClick: async () => {
                    await onConfirm();
                    modal.close();
                }
            }
        ]);

        modal.show(() => modal.destroy());
        return modal;
    }

    public static alert(message: string, title = 'Information'): Modal {
        const modal = new Modal({
            id: 'alert-modal',
            title,
            content: wrapMessage(message),
            className: 'alert-modal'
        });

        modal.addButtons([
            {
                text: 'OK',
                className: 'btn btn-primary',
                onClick: () => modal.close()
            }
        ]);

        modal.show(() => modal.destroy());
        return modal;
    }

    private createElement(): HTMLElement {
        const modal = document.createElement('div');
        const classNames = ['modal-overlay'];

        if (this.config.className) {
            classNames.push(this.config.className);
        }

        modal.id = this.config.id;
        modal.className = classNames.join(' ');
        modal.hidden = true;
        modal.style.display = 'none';
        modal.tabIndex = -1;

        const content = document.createElement('div');
        content.className = 'modal-content';

        if (this.config.maxWidth) {
            content.style.maxWidth = this.config.maxWidth;
        }

        if (this.config.title || this.config.showCloseButton !== false) {
            const header = document.createElement('div');
            header.className = 'modal-header';

            if (this.config.title) {
                const title = document.createElement('h2');
                title.className = 'modal-title';
                title.textContent = this.config.title;
                header.appendChild(title);
            }

            if (this.config.showCloseButton !== false) {
                const closeButton = document.createElement('button');
                closeButton.type = 'button';
                closeButton.className = 'close-btn';
                closeButton.setAttribute('aria-label', 'Close');
                closeButton.textContent = 'x';
                closeButton.addEventListener('click', () => this.close());
                header.appendChild(closeButton);
            }

            content.appendChild(header);
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

    private setupEventListeners(): void {
        this.element.addEventListener('click', this.handleBackdropClick);
        document.addEventListener('keydown', this.handleDocumentKeydown);
    }
}

function wrapMessage(message: string): string {
    return `<p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`;
}
