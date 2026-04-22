import { showError, showSuccess } from '../../../utils/error-handler';
import { t } from '../../localization';
import type { Connection, FileExportRecord, ProviderKind, StateData } from '../types/editor-types';
import {
    importEditorFilePayload,
    initializeEditorDomain,
    isEditorFilePayload,
    loadDomainSnapshot,
    persistEditorState
} from './visual-editor-page-data';

interface EditorSnapshotRecord {
    connections: Connection[];
    provider?: ProviderKind;
    startConnection?: string | null;
    states: StateData[];
    zoom?: number;
}

export interface VisualEditorSceneActions {
    addState: (state: StateData) => void;
    applyConnections: (connections: Connection[]) => void;
    applyStartConnection: (targetId?: string | null) => void;
    clearCanvas: () => void;
    setProvider: (provider: ProviderKind) => void;
    setZoom: (zoom: number) => void;
}

export async function importVisualEditorSnapshot(
    actions: VisualEditorSceneActions
): Promise<void> {
    const payload = await importEditorFilePayload();
    if (!payload) {
        return;
    }

    if (!isEditorFilePayload(payload)) {
        showError(t('visualEditor.messages.invalidJson'));
        return;
    }

    applyVisualEditorSnapshot(normalizeImportedSnapshot(payload), actions);
}

export async function initializeVisualEditorDomain(): Promise<string | null> {
    try {
        return await initializeEditorDomain();
    } catch (error) {
        console.error('Failed to load domains', error);
        return null;
    }
}

export async function loadVisualEditorDomainSnapshot(
    domain: string,
    actions: VisualEditorSceneActions
): Promise<void> {
    try {
        const snapshot = await loadDomainSnapshot(domain);
        applyVisualEditorSnapshot(snapshot, actions);
    } catch (error) {
        console.error('Error loading states from domain', error);
        showError(t('visualEditor.messages.loadFailed', { domain }));
    }
}

export async function saveVisualEditorSnapshot(
    domain: string | null,
    zoom: number,
    states: StateData[],
    connections: Connection[]
): Promise<void> {
    try {
        const result = await persistEditorState(domain, zoom, states, connections);
        if (result === 'saved') {
            showSuccess(t('visualEditor.messages.saved'));
        }
    } catch (error) {
        console.error('Error saving states', error);
        showError(t('visualEditor.messages.saveFailed'));
    }
}

function applyVisualEditorSnapshot(
    snapshot: EditorSnapshotRecord,
    actions: VisualEditorSceneActions
): void {
    actions.clearCanvas();

    if (snapshot.provider) {
        actions.setProvider(snapshot.provider);
    }

    snapshot.states.forEach((state) => actions.addState(state));
    actions.applyConnections(snapshot.connections);
    actions.applyStartConnection(snapshot.startConnection);

    if (typeof snapshot.zoom === 'number') {
        actions.setZoom(snapshot.zoom);
    }
}

function normalizeImportedSnapshot(payload: FileExportRecord): EditorSnapshotRecord {
    return {
        connections: payload.connections,
        startConnection: payload.editorSettings.startConnection,
        states: payload.states,
        zoom: payload.editorSettings.zoom
    };
}
