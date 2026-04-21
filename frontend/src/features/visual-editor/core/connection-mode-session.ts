import type Konva from 'konva';

const CONNECTION_MODE_NAMESPACE = '.connection-mode';

interface ConnectionModeSessionParams {
    onCleanup: () => void;
    onEscape: () => void;
    onStageClick: (event: Konva.KonvaEventObject<MouseEvent>) => void;
    stage: Konva.Stage;
    timeoutMs: number;
}

export function getConnectionModeTargetId(node: Konva.Node | null): string | null {
    let current: Konva.Node | null = node;

    while (current) {
        const stateId = current.getAttr('id');
        if (typeof stateId === 'string' && stateId) {
            return stateId;
        }

        current = current.getParent();
    }

    return null;
}

export function startConnectionModeSession(params: ConnectionModeSessionParams): () => void {
    let active = true;
    let timeoutId = 0;
    const escapeHandler = createEscapeHandler(params.onEscape);

    const cleanup = () => {
        if (!active) {
            return;
        }

        active = false;
        window.clearTimeout(timeoutId);
        params.stage.off(CONNECTION_MODE_NAMESPACE);
        document.removeEventListener('keydown', escapeHandler);
        params.onCleanup();
    };

    timeoutId = window.setTimeout(cleanup, params.timeoutMs);
    params.stage.on(`click${CONNECTION_MODE_NAMESPACE}`, params.onStageClick);
    document.addEventListener('keydown', escapeHandler);

    return cleanup;
}

function createEscapeHandler(onEscape: () => void): (event: KeyboardEvent) => void {
    return (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            onEscape();
        }
    };
}
