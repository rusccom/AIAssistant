import { createAuthHeaders, getAuthToken } from '../../../utils/api-client';
import { API_ENDPOINTS } from '../../../utils/constants';
import type {
    BotConfigRecord,
    DomainOption,
    GeneratedStateRecord,
    StateData
} from '../types/editor-types';

function ensureAuthToken(): void {
    if (!getAuthToken()) {
        throw new Error('No auth token found');
    }
}

function buildRequestInit(init: RequestInit = {}): RequestInit {
    return {
        ...init,
        headers: {
            ...createAuthHeaders(),
            ...init.headers
        }
    };
}

async function buildRequestError(response: Response): Promise<Error> {
    try {
        const payload = (await response.json()) as { message?: string };
        return new Error(payload.message || `Request failed with status ${response.status}`);
    } catch {
        return new Error(`Request failed with status ${response.status}`);
    }
}

async function request(url: string, init: RequestInit = {}): Promise<Response> {
    ensureAuthToken();
    const response = await fetch(url, buildRequestInit(init));
    if (response.ok) {
        return response;
    }

    throw await buildRequestError(response);
}

async function requestJson<T>(url: string, init: RequestInit = {}): Promise<T> {
    const response = await request(url, init);
    return response.json() as Promise<T>;
}

export async function fetchDomains(): Promise<DomainOption[]> {
    return requestJson<DomainOption[]>(API_ENDPOINTS.BOT_CONFIG.DOMAINS);
}

export async function fetchBotConfig(domain: string): Promise<BotConfigRecord> {
    return requestJson<BotConfigRecord>(`${API_ENDPOINTS.BOT_CONFIG.BASE}?domain=${domain}`);
}

export async function generateStateContent(
    prompt: string,
    states: Pick<StateData, 'description' | 'examples' | 'id' | 'instructions'>[]
): Promise<GeneratedStateRecord> {
    return requestJson<GeneratedStateRecord>('/api/ai-assist/generate-state', {
        method: 'POST',
        body: JSON.stringify({
            userPrompt: prompt,
            states
        })
    });
}

export async function saveBotConfig(domain: string, payload: BotConfigRecord): Promise<void> {
    await request(`${API_ENDPOINTS.BOT_CONFIG.BASE}?domain=${domain}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
    });
}
