import { buildFileExportRecord, downloadJson, isFileExportRecord } from './editor-serializer';
import { openJsonFile, requestBotConfig, requestDomains, saveDomainStates } from './visual-editor-workflow';
import { createDomainSnapshot, type DomainSnapshot } from '../core/visual-editor-support';
import type { Connection, DomainOption, FileExportRecord, StateData } from '../types/editor-types';

export async function importEditorFilePayload(): Promise<unknown | null> {
    return openJsonFile();
}

export async function initializeEditorDomain(): Promise<string | null> {
    const domains = await requestDomains();
    return resolveInitialDomain(domains);
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

function resolveInitialDomain(domains: DomainOption[]): string | null {
    const domainFromUrl = new URLSearchParams(window.location.search).get('domain');
    const requestedDomain = domains.find((domain) => domain.hostname === domainFromUrl)?.hostname;

    if (requestedDomain) {
        return requestedDomain;
    }

    const fallbackDomain = domains[0]?.hostname || null;
    if (fallbackDomain) {
        syncDomainUrl(fallbackDomain);
    }

    return fallbackDomain;
}

function syncDomainUrl(domain: string): void {
    const url = new URL(window.location.href);
    url.searchParams.set('domain', domain);
    window.history.replaceState({}, '', url.toString());
}
