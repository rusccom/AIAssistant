import { buildFileExportRecord, downloadJson, isFileExportRecord } from './editor-serializer';
import { openJsonFile, requestBotConfig, requestDomains, saveDomainStates } from './visual-editor-workflow';
import { createDomainSnapshot, fillDomainOptions, type DomainSnapshot } from '../core/visual-editor-support';
import type { Connection, FileExportRecord, StateData } from '../types/editor-types';

export async function importEditorFilePayload(): Promise<unknown | null> {
    return openJsonFile();
}

export async function initializeDomainSelect(select: HTMLSelectElement): Promise<string | null> {
    const domains = await requestDomains();
    fillDomainOptions(select, domains);

    const domainFromUrl = new URLSearchParams(window.location.search).get('domain');
    if (!domainFromUrl || !domains.some((domain) => domain.hostname === domainFromUrl)) {
        return null;
    }

    select.value = domainFromUrl;
    return domainFromUrl;
}

export async function loadDomainSnapshot(domain: string): Promise<DomainSnapshot> {
    return createDomainSnapshot(await requestBotConfig(domain));
}

export async function persistEditorState(
    domain: string | null,
    zoom: number,
    states: StateData[],
    connections: Connection[]
): Promise<'downloaded' | 'saved'> {
    if (!domain) {
        downloadJson('conversation-states.json', buildFileExportRecord(zoom, states, connections));
        return 'downloaded';
    }

    await saveDomainStates(domain, zoom, states, connections);
    return 'saved';
}

export function isEditorFilePayload(payload: unknown): payload is FileExportRecord {
    return isFileExportRecord(payload);
}
