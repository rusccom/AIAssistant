export const clientThemeRegistry = {
    'solid-premium': {
        label: 'Solid Premium Minimalism',
        description: 'Dense matte client workspace with warm sand accents.'
    }
} as const;

export type ClientThemeId = keyof typeof clientThemeRegistry;

export const DEFAULT_CLIENT_THEME_ID: ClientThemeId = 'solid-premium';

export function getClientThemeIds(): ClientThemeId[] {
    return Object.keys(clientThemeRegistry) as ClientThemeId[];
}

export function getClientThemes() {
    return getClientThemeIds().map((id) => ({
        id,
        ...clientThemeRegistry[id]
    }));
}

export function isClientThemeId(value: string | null | undefined): value is ClientThemeId {
    return Boolean(value && value in clientThemeRegistry);
}

export function resolveClientThemeId(value: string | null | undefined): ClientThemeId {
    return isClientThemeId(value) ? value : DEFAULT_CLIENT_THEME_ID;
}
