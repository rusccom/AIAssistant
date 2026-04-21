import type { Connection, StateData } from '../types/editor-types';

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
        this.root.innerHTML = buildPanelMarkup(state, outgoing, incoming);
    }

    public renderEmpty(): void {
        this.activeStateId = null;
        this.root.innerHTML = '<p>Select a state to edit its properties</p>';
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

function buildPanelMarkup(state: StateData, outgoing: Connection[], incoming: Connection[]): string {
    return `
        <div class="property-section">
            <h4>State: ${escapeHtml(state.id)}</h4>
            <p><strong>Description:</strong> ${escapeHtml(state.description || 'No description')}</p>
            <div class="connections-section">
                <h5>Outgoing Connections (${outgoing.length})</h5>
                <div class="connections-list">
                    ${buildOutgoingMarkup(outgoing)}
                </div>
                <h5>Incoming Connections (${incoming.length})</h5>
                <div class="connections-list">
                    ${buildIncomingMarkup(incoming)}
                </div>
            </div>
            <div class="property-actions">
                <button class="btn btn-sm btn-secondary" id="edit-selected-state-btn">Edit State</button>
                <button class="btn btn-sm btn-primary" id="add-connection-btn">Add Connection</button>
            </div>
        </div>
    `;
}

function buildIncomingMarkup(connections: Connection[]): string {
    if (!connections.length) {
        return '<p class="no-connections">No incoming connections</p>';
    }

    return connections
        .map((connection) => `<div class="connection-item"><span>${escapeHtml(connection.from)} →</span></div>`)
        .join('');
}

function buildOutgoingMarkup(connections: Connection[]): string {
    if (!connections.length) {
        return '<p class="no-connections">No outgoing connections</p>';
    }

    return connections
        .map((connection) => {
            const suffix = connection.to === 'end' || connection.to === 'start' ? ' (special)' : '';
            const value = escapeHtml(connection.condition || '');

            return `
                <div class="connection-item">
                    <div class="connection-header">
                        <span class="connection-target">→ ${escapeHtml(connection.to)}${suffix}</span>
                        <button
                            class="btn-delete-connection"
                            data-action="delete-connection"
                            data-from="${escapeHtml(connection.from)}"
                            data-to="${escapeHtml(connection.to)}"
                        >×</button>
                    </div>
                    <div class="connection-condition">
                        <label class="condition-label">Condition:</label>
                        <textarea
                            class="condition-input"
                            rows="2"
                            spellcheck="false"
                            data-from="${escapeHtml(connection.from)}"
                            data-to="${escapeHtml(connection.to)}"
                            placeholder="e.g., When user says hello (Ctrl+Enter to save)"
                        >${value}</textarea>
                    </div>
                </div>
            `;
        })
        .join('');
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
