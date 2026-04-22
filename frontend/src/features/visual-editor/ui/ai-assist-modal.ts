import type { AiAssistModalElements } from '../types/editor-types';
import { t } from '../../localization';

interface AiAssistModalCallbacks {
    onGenerate: (prompt: string) => Promise<void>;
}

export class AiAssistModalController {
    public constructor(
        private readonly elements: AiAssistModalElements,
        private readonly callbacks: AiAssistModalCallbacks
    ) {
        this.bindEvents();
    }

    public close(): void {
        this.elements.root.style.display = 'none';
        this.elements.promptInput.value = '';
        this.clearError();
        this.setBusy(false);
    }

    public open(): void {
        this.elements.root.style.display = 'block';
        this.clearError();
    }

    public showError(message: string): void {
        this.elements.errorMessage.textContent = message;
        this.elements.errorMessage.style.display = 'block';
    }

    private bindEvents(): void {
        this.elements.closeButton.addEventListener('click', () => this.close());
        this.elements.cancelButton.addEventListener('click', () => this.close());
        this.elements.generateButton.addEventListener('click', () => void this.handleGenerate());
        this.elements.root.addEventListener('click', (event) => this.handleBackdropClick(event));
    }

    private clearError(): void {
        this.elements.errorMessage.textContent = '';
        this.elements.errorMessage.style.display = 'none';
    }

    private async handleGenerate(): Promise<void> {
        const prompt = this.elements.promptInput.value.trim();
        if (!prompt) {
            this.showError(t('visualEditor.ai.emptyPrompt'));
            return;
        }

        this.clearError();
        this.setBusy(true);

        try {
            await this.callbacks.onGenerate(prompt);
            this.close();
        } catch (error) {
            const message = error instanceof Error ? error.message : t('visualEditor.ai.failed');
            this.showError(message);
            this.setBusy(false);
        }
    }

    private handleBackdropClick(event: MouseEvent): void {
        if (event.target === this.elements.root) {
            this.close();
        }
    }

    private setBusy(busy: boolean): void {
        this.elements.generateButton.disabled = busy;
        this.elements.generateButton.textContent = busy
            ? t('visualEditor.ai.generating')
            : t('common.buttons.generate');
    }
}
