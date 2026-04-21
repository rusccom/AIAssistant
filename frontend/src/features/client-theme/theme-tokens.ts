export interface SpecialBlockThemeTokens {
    accent: string;
    fill: string;
    stroke: string;
    text: string;
}

export interface VisualEditorThemeTokens {
    connectionStroke: string;
    nodeAccent: string;
    nodeBorder: string;
    nodeFill: string;
    nodeSelectedBorder: string;
    nodeTargetBorder: string;
    nodeText: string;
    nodeTitle: string;
    start: SpecialBlockThemeTokens;
    end: SpecialBlockThemeTokens;
}

const FALLBACK_TOKENS: VisualEditorThemeTokens = {
    connectionStroke: '#4B5563',
    nodeAccent: '#C49A6C',
    nodeBorder: '#E5E7EB',
    nodeFill: '#FFFFFF',
    nodeSelectedBorder: '#C49A6C',
    nodeTargetBorder: '#4C8B67',
    nodeText: '#6B7280',
    nodeTitle: '#111827',
    start: {
        accent: '#4C8B67',
        fill: '#DDEFE3',
        stroke: '#4C8B67',
        text: '#1F5135'
    },
    end: {
        accent: '#C76757',
        fill: '#F8E2DE',
        stroke: '#C76757',
        text: '#7C2D20'
    }
};

export function getVisualEditorThemeTokens(): VisualEditorThemeTokens {
    return {
        connectionStroke: readThemeToken('--ct-editor-connection', FALLBACK_TOKENS.connectionStroke),
        nodeAccent: readThemeToken('--ct-editor-node-accent', FALLBACK_TOKENS.nodeAccent),
        nodeBorder: readThemeToken('--ct-editor-node-border', FALLBACK_TOKENS.nodeBorder),
        nodeFill: readThemeToken('--ct-editor-node-fill', FALLBACK_TOKENS.nodeFill),
        nodeSelectedBorder: readThemeToken('--ct-editor-node-selected', FALLBACK_TOKENS.nodeSelectedBorder),
        nodeTargetBorder: readThemeToken('--ct-editor-node-target', FALLBACK_TOKENS.nodeTargetBorder),
        nodeText: readThemeToken('--ct-editor-node-text', FALLBACK_TOKENS.nodeText),
        nodeTitle: readThemeToken('--ct-editor-node-title', FALLBACK_TOKENS.nodeTitle),
        start: readSpecialTokens('start', FALLBACK_TOKENS.start),
        end: readSpecialTokens('end', FALLBACK_TOKENS.end)
    };
}

function readSpecialTokens(
    blockId: 'start' | 'end',
    fallback: SpecialBlockThemeTokens
): SpecialBlockThemeTokens {
    return {
        accent: readThemeToken(`--ct-editor-${blockId}-accent`, fallback.accent),
        fill: readThemeToken(`--ct-editor-${blockId}-fill`, fallback.fill),
        stroke: readThemeToken(`--ct-editor-${blockId}-stroke`, fallback.stroke),
        text: readThemeToken(`--ct-editor-${blockId}-text`, fallback.text)
    };
}

function readThemeToken(name: string, fallback: string): string {
    const value = getComputedStyle(document.documentElement)
        .getPropertyValue(name)
        .trim();

    return value || fallback;
}
