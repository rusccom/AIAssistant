import type { Connection, StateData } from '../types/editor-types';
import { buildEmptyPropertiesMarkup, buildPropertiesPanelMarkup } from './properties-panel-markup';

interface PropertiesPanelCallbacks {
    onDeleteConnection: (from: string, to: string) => void;
    onEditState: (stateId: string) => void;
    onStartConnection: (stateId: string) => void;
    onUpdateCondition: (from: string, to: string, condition: string) => void;
}

export class PropertiesPanelController {
    private activeStateId: string | null = null;
    private isEditingCondition = false;

    public constructor(
        private readonly root: HTMLElement,
        private readonly callbacks: PropertiesPanelCallbacks
    ) {
        this.bindEvents();
        this.renderEmpty();
    }

    public render(state: StateData, outgoing: Connection[], incoming: Connection[]): void {
        this.activeStateId = state.id;
        this.root.innerHTML = buildPropertiesPanelMarkup(state, outgoing, incoming);
    }

    public renderEmpty(): void {
        this.activeStateId = null;
        this.root.innerHTML = buildEmptyPropertiesMarkup();
    }

    private bindEvents(): void {
        this.root.addEventListener('click', (event) => this.handleClick(event));
        this.root.addEventListener('focusin', (event) => this.handleFocusIn(event));
        this.root.addEventListener('focusout', (event) => this.handleFocusOut(event));
        this.root.addEventListener('keydown', (event) => this.handleKeyDown(event));
    }

    private handleClick(event: Event): void {
        const target = event.target as HTMLElement | null;
        if (!target) {
            return;
        }

        if (target.id === 'edit-selected-state-btn' && this.activeStateId) {
            this.callbacks.onEditState(this.activeStateId);
        }

        if (target.id === 'add-connection-btn' && this.activeStateId) {
            this.callbacks.onStartConnection(this.activeStateId);
        }

        if (target.dataset.action === 'delete-connection') {
            this.callbacks.onDeleteConnection(target.dataset.from!, target.dataset.to!);
        }
    }

    private handleFocusIn(event: FocusEvent): void {
        const target = event.target as HTMLElement | null;
        this.isEditingCondition = Boolean(target?.classList.contains('condition-input'));
    }

    private handleFocusOut(event: FocusEvent): void {
        const target = event.target as HTMLTextAreaElement | null;
        if (!this.isEditingCondition || !target?.classList.contains('condition-input')) {
            return;
        }

        this.callbacks.onUpdateCondition(target.dataset.from!, target.dataset.to!, target.value.trim());
        this.isEditingCondition = false;
    }

    private handleKeyDown(event: KeyboardEvent): void {
        const target = event.target as HTMLElement | null;
        if (!target?.classList.contains('condition-input')) {
            return;
        }

        event.stopPropagation();
        if (event.key === 'Enter' && event.ctrlKey) {
            event.preventDefault();
            (target as HTMLTextAreaElement).blur();
        }
    }
}
