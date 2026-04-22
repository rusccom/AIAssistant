import { t, type TranslationKey } from '../../localization';

type ImportStage = 'reading' | 'processing' | 'uploading' | 'refreshing' | 'success' | 'error';

const STAGE_TITLE: Record<ImportStage, TranslationKey> = {
    reading: 'botSettings.import.readingStage',
    processing: 'botSettings.import.processingStage',
    uploading: 'botSettings.import.uploadingStage',
    refreshing: 'botSettings.import.refreshingStage',
    success: 'botSettings.import.successStage',
    error: 'botSettings.import.errorStage'
};

const STAGE_PROGRESS: Record<ImportStage, number> = {
    reading: 20,
    processing: 45,
    uploading: 75,
    refreshing: 95,
    success: 100,
    error: 100
};

export class ImportStatusController {
    private readonly root: HTMLElement;
    private readonly title: HTMLElement;
    private readonly text: HTMLElement;
    private readonly meta: HTMLElement;
    private readonly fill: HTMLElement;
    private busy = false;
    private metaText = '';
    private startedAt = 0;
    private timerId: number | null = null;

    public constructor(root: ParentNode = document) {
        this.root = this.requireElement(root, 'import-status');
        this.title = this.requireElement(root, 'import-status-title');
        this.text = this.requireElement(root, 'import-status-text');
        this.meta = this.requireElement(root, 'import-status-meta');
        this.fill = this.requireElement(root, 'import-status-fill');
    }

    public isBusy(): boolean {
        return this.busy;
    }

    public start(stage: Exclude<ImportStage, 'success' | 'error'>, text: string, meta = ''): void {
        this.busy = true;
        this.startedAt = Date.now();
        this.startTimer();
        this.render(stage, text, meta);
    }

    public update(stage: Exclude<ImportStage, 'success' | 'error'>, text: string, meta = ''): void {
        this.render(stage, text, meta);
    }

    public finishSuccess(text: string, meta = ''): void {
        this.finish('success', text, meta);
    }

    public finishError(text: string, meta = ''): void {
        this.finish('error', text, meta);
    }

    public reset(): void {
        this.busy = false;
        this.metaText = '';
        this.startedAt = 0;
        this.stopTimer();
        this.root.hidden = true;
        this.root.dataset.state = 'idle';
        this.fill.style.width = '0%';
        this.meta.textContent = '';
    }

    private finish(stage: 'success' | 'error', text: string, meta: string): void {
        this.busy = false;
        this.stopTimer();
        this.render(stage, text, meta);
    }

    private render(stage: ImportStage, text: string, meta: string): void {
        this.root.hidden = false;
        this.root.dataset.state = stage;
        this.title.textContent = t(STAGE_TITLE[stage]);
        this.text.textContent = text;
        this.metaText = meta;
        this.fill.style.width = `${STAGE_PROGRESS[stage]}%`;
        this.updateMeta();
    }

    private updateMeta(): void {
        const parts = [this.metaText].filter(Boolean);

        if (this.busy && this.startedAt > 0) {
            parts.push(t('botSettings.import.elapsed', {
                seconds: Math.max(1, Math.floor((Date.now() - this.startedAt) / 1000))
            }));
        }

        this.meta.textContent = parts.join(' | ');
    }

    private startTimer(): void {
        this.stopTimer();
        this.timerId = window.setInterval(() => this.updateMeta(), 1000);
        this.updateMeta();
    }

    private stopTimer(): void {
        if (this.timerId !== null) {
            window.clearInterval(this.timerId);
            this.timerId = null;
        }
    }

    private requireElement(root: ParentNode, id: string): HTMLElement {
        const element = root.querySelector<HTMLElement>(`#${id}`);

        if (!element) {
            throw new Error(`Element #${id} not found`);
        }

        return element;
    }
}
