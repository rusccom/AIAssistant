import { escapeHtml } from '../../../shared/ui/primitives';
import { t } from '../../localization';
import type { Connection, StateData } from '../types/editor-types';

export function buildEmptyPropertiesMarkup(): string {
    return `<p>${escapeHtml(t('visualEditor.properties.empty'))}</p>`;
}

export function buildPropertiesPanelMarkup(
    state: StateData,
    outgoing: Connection[],
    incoming: Connection[]
): string {
    return `
        <div class="property-section">
            <h4>${escapeHtml(t('visualEditor.panel.state', { id: state.id }))}</h4>
            <p><strong>${escapeHtml(t('visualEditor.panel.description'))}</strong> ${escapeHtml(state.description || t('visualEditor.panel.noDescription'))}</p>
            <div class="connections-section">
                <h5>${escapeHtml(t('visualEditor.panel.outgoing', { count: outgoing.length }))}</h5>
                <div class="connections-list">${buildOutgoingMarkup(outgoing)}</div>
                <h5>${escapeHtml(t('visualEditor.panel.incoming', { count: incoming.length }))}</h5>
                <div class="connections-list">${buildIncomingMarkup(incoming)}</div>
            </div>
            <div class="property-actions">
                <button class="btn btn-sm btn-secondary" id="edit-selected-state-btn">${escapeHtml(t('visualEditor.context.editState'))}</button>
                <button class="btn btn-sm btn-primary" id="add-connection-btn">${escapeHtml(t('visualEditor.context.createConnection'))}</button>
            </div>
        </div>
    `;
}

function buildIncomingMarkup(connections: Connection[]): string {
    if (!connections.length) {
        return `<p class="no-connections">${escapeHtml(t('visualEditor.panel.noIncoming'))}</p>`;
    }

    return connections
        .map((connection) => `<div class="connection-item"><span>${escapeHtml(connection.from)} -></span></div>`)
        .join('');
}

function buildOutgoingMarkup(connections: Connection[]): string {
    if (!connections.length) {
        return `<p class="no-connections">${escapeHtml(t('visualEditor.panel.noOutgoing'))}</p>`;
    }

    return connections
        .map((connection) => {
            const suffix = connection.to === 'end' || connection.to === 'start'
                ? t('visualEditor.panel.special')
                : '';
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
                        <label class="condition-label">${escapeHtml(t('visualEditor.panel.condition'))}</label>
                        <textarea
                            class="condition-input"
                            rows="2"
                            spellcheck="false"
                            data-from="${escapeHtml(connection.from)}"
                            data-to="${escapeHtml(connection.to)}"
                            placeholder="${escapeHtml(t('visualEditor.panel.conditionPlaceholder'))}"
                        >${value}</textarea>
                    </div>
                </div>
            `;
        })
        .join('');
}
