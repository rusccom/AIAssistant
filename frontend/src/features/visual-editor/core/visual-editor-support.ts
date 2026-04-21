import type {
    BotConfigRecord,
    Connection,
    GeneratedStateRecord,
    ProviderKind,
    StateData,
    VisibleViewport
} from '../types/editor-types';
import { getConnectionsFromBotStates, getRegularStates } from '../services/editor-serializer';
import { getNextStatePosition } from '../utils/state-position';

export interface DomainSnapshot {
    connections: Connection[];
    provider: ProviderKind;
    startConnection: string | null;
    states: StateData[];
    zoom?: number;
}

export function buildStateData(
    patch: Partial<StateData>,
    stateCounter: number,
    offsetIndex: number,
    viewport: VisibleViewport
): StateData {
    return {
        id: patch.id || `state-${stateCounter}`,
        description: patch.description || 'New State',
        instructions: patch.instructions || [],
        examples: patch.examples || [],
        reasoningMode: patch.reasoningMode || 'inherit',
        position: patch.position || getNextStatePosition(viewport, offsetIndex),
        connections: []
    };
}

export function createDomainSnapshot(config: BotConfigRecord): DomainSnapshot {
    const records = Array.isArray(config.conversationStates) ? config.conversationStates : [];
    return {
        provider: config.provider || 'openai',
        states: getRegularStates(records, config.editorSettings),
        connections: getConnectionsFromBotStates(records),
        startConnection: config.editorSettings?.startConnection || null,
        zoom: typeof config.editorSettings?.zoom === 'number' ? config.editorSettings.zoom : undefined
    };
}

export function getNextStateCounter(currentCounter: number, stateId: string): number {
    const match = /^state-(\d+)$/.exec(stateId);
    if (!match) {
        return currentCounter + 1;
    }

    return Math.max(currentCounter, Number(match[1]) + 1);
}

export function normalizeGeneratedState(
    stateCounter: number,
    content: GeneratedStateRecord
): GeneratedStateRecord {
    return {
        ...content,
        id: content.id || `state-${stateCounter}`
    };
}

export function updateHeaderState(
    title: HTMLElement,
    domainBadge: HTMLElement,
    saveButton: HTMLButtonElement,
    selectedDomain: string | null
): void {
    title.textContent = 'Visual State Editor';
    domainBadge.textContent = selectedDomain || '';
    domainBadge.hidden = !selectedDomain;
    saveButton.title = selectedDomain
        ? 'Save states to database for selected domain'
        : 'Download states as JSON file';
}
