import type {
    BotStateRecord,
    Connection,
    EditorSettings,
    FileExportRecord,
    Point,
    StateData
} from '../types/editor-types';
import { getImportedGridPosition } from '../utils/state-position';

function buildStatePositions(states: StateData[]): Record<string, Point> {
    return states.reduce<Record<string, Point>>((positions, state) => {
        positions[state.id] = state.position;
        return positions;
    }, {});
}

function getStartConnection(connections: Connection[]): string | null {
    return connections.find((connection) => connection.from === 'start')?.to ?? null;
}

export function buildEditorSettings(zoom: number, states: StateData[], connections: Connection[]): EditorSettings {
    return {
        zoom,
        statePositions: buildStatePositions(states),
        startConnection: getStartConnection(connections)
    };
}

export function buildBotStateRecords(states: StateData[], connections: Connection[]): BotStateRecord[] {
    return states.map((state) => {
        const transitions = connections
            .filter((connection) => connection.from === state.id)
            .map((connection) => ({
                next_step: connection.to,
                condition: connection.condition || 'When condition is met'
            }));

        return {
            id: state.id,
            description: state.description,
            instructions: state.instructions,
            examples: state.examples,
            reasoningMode: state.reasoningMode,
            transitions
        };
    });
}

export function buildFileExportRecord(
    zoom: number,
    states: StateData[],
    connections: Connection[]
): FileExportRecord {
    return {
        states,
        connections,
        editorSettings: buildEditorSettings(zoom, states, connections),
        metadata: {
            exportDate: new Date().toISOString(),
            version: '2.0'
        }
    };
}

export function downloadJson(filename: string, payload: unknown): void {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

export function getRegularStates(records: BotStateRecord[], settings?: Partial<EditorSettings>): StateData[] {
    const savedPositions = settings?.statePositions || {};

    return records.map((record, index) => ({
        id: record.id,
        description: record.description || 'Imported state',
        instructions: record.instructions || [],
        examples: record.examples || [],
        reasoningMode: record.reasoningMode || 'inherit',
        position: savedPositions[record.id] || getImportedGridPosition(index),
        connections: []
    }));
}

export function getConnectionsFromBotStates(records: BotStateRecord[]): Connection[] {
    return records.flatMap((record) =>
        (record.transitions || []).map((transition) => ({
            id: `${record.id}-${transition.next_step}`,
            from: record.id,
            to: transition.next_step,
            condition: transition.condition || ''
        }))
    );
}

export function isFileExportRecord(value: unknown): value is FileExportRecord {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const payload = value as Partial<FileExportRecord>;
    return Array.isArray(payload.states) && Array.isArray(payload.connections);
}
