import { escapeHtml } from '../../../shared/ui/primitives';
import type { Connection, StateData } from '../types/editor-types';

export function buildEmptyPropertiesMarkup(): string {
    return '<p>Select a state to edit its properties</p>';
}

export function buildPropertiesPanelMarkup(
    state: StateData,
    outgoing: Connection[],
    incoming: Connection[]
): string {
    return `
        <div class="property-section">
            <h4>State: ${escapeHtml(state.id)}</h4>
            <p><strong>Description:</strong> ${escapeHtml(state.description || 'No description')}</p>
            <div class="connections-section">
                <h5>Outgoing Connections (${outgoing.length})</h5>
                <div class="connections-list">${buildOutgoingMarkup(outgoing)}</div>
                <h5>Incoming Connections (${incoming.length})</h5>
                <div class="connections-list">${buildIncomingMarkup(incoming)}</div>
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
        .map((connection) => `<div class="connection-item"><span>${escapeHtml(connection.from)} -></span></div>`)
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
                        <span class="connection-target">-> ${escapeHtml(connection.to)}${suffix}</span>
                        <button
                            class="btn-delete-connection"
                            data-action="delete-connection"
                            data-from="${escapeHtml(connection.from)}"
                            data-to="${escapeHtml(connection.to)}"
                        >x</button>
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
