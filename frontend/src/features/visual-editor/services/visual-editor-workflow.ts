import {
    fetchBotConfig,
    fetchDomains,
    generateStateContent,
    saveBotConfig
} from './visual-editor-api';
import { buildBotStateRecords, buildEditorSettings } from './editor-serializer';
import type { BotConfigRecord, Connection, DomainOption, GeneratedStateRecord, StateData } from '../types/editor-types';

export async function openJsonFile(): Promise<unknown | null> {
    const file = await pickFile();
    if (!file) {
        return null;
    }

    return JSON.parse(await file.text()) as unknown;
}

export async function requestBotConfig(domain: string): Promise<BotConfigRecord> {
    return fetchBotConfig(domain);
}

export async function requestDomains(): Promise<DomainOption[]> {
    return fetchDomains();
}

export async function requestGeneratedState(
    prompt: string,
    states: StateData[]
): Promise<GeneratedStateRecord> {
    const context = states.map((state) => ({
        id: state.id,
        description: state.description,
        instructions: state.instructions,
        examples: state.examples
    }));

    return generateStateContent(prompt, context);
}

export async function saveDomainStates(
    domain: string,
    zoom: number,
    states: StateData[],
    connections: Connection[]
): Promise<void> {
    const currentConfig = await fetchBotConfig(domain);
    const payload: BotConfigRecord = {
        ...currentConfig,
        conversationStates: buildBotStateRecords(states, connections),
        editorSettings: buildEditorSettings(zoom, states, connections)
    };

    await saveBotConfig(domain, payload);
}

function pickFile(): Promise<File | null> {
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.addEventListener('change', () => resolve(input.files?.[0] || null), { once: true });
        input.click();
    });
}
