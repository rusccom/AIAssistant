import type {
    EditModalElements,
    EditStateFormValue,
    GeneratedStateRecord,
    StateData
} from '../types/editor-types';

interface EditModalCallbacks {
    onOpenAiAssist: () => void;
    onSave: (value: EditStateFormValue) => void;
}

export class EditStateModalController {
    private visible = false;

    public constructor(
        private readonly elements: EditModalElements,
        private readonly callbacks: EditModalCallbacks
    ) {
        this.bindEvents();
    }

    public applyGeneratedContent(content: GeneratedStateRecord): void {
        this.elements.idInput.value = content.id || this.elements.idInput.value;
        this.elements.descriptionInput.value = content.description || '';
        this.elements.instructionsInput.value = (content.instructions || []).join('\n');
        this.elements.examplesInput.value = (content.examples || []).join('\n');
    }

    public close(): void {
        this.visible = false;
        this.elements.root.style.display = 'none';
    }

    public open(state: StateData, showReasoningMode: boolean): void {
        this.fillForm(state);
        this.elements.reasoningGroup.style.display = showReasoningMode ? 'block' : 'none';
        this.elements.root.style.display = 'block';
        this.visible = true;
    }

    private bindEvents(): void {
        this.elements.closeButton.addEventListener('click', () => this.close());
        this.elements.cancelButton.addEventListener('click', () => this.close());
        this.elements.aiAssistButton.addEventListener('click', () => this.callbacks.onOpenAiAssist());
        this.elements.saveButton.addEventListener('click', () => this.callbacks.onSave(this.readForm()));
        this.elements.root.addEventListener('click', (event) => this.handleBackdropClick(event));
    }

    private fillForm(state: StateData): void {
        this.elements.idInput.value = state.id;
        this.elements.descriptionInput.value = state.description;
        this.elements.instructionsInput.value = state.instructions.join('\n');
        this.elements.examplesInput.value = state.examples.join('\n');
        this.elements.reasoningModeSelect.value = state.reasoningMode;
    }

    private handleBackdropClick(event: MouseEvent): void {
        if (this.visible && event.target === this.elements.root) {
            this.close();
        }
    }

    private readForm(): EditStateFormValue {
        return {
            id: this.elements.idInput.value.trim(),
            description: this.elements.descriptionInput.value.trim(),
            instructions: splitLines(this.elements.instructionsInput.value),
            examples: splitLines(this.elements.examplesInput.value),
            reasoningMode: this.elements.reasoningModeSelect.value as EditStateFormValue['reasoningMode']
        };
    }
}

function splitLines(value: string): string[] {
    return value
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean);
}
