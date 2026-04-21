import type Konva from 'konva';

export interface ConnectionModeSession {
    cancel: () => void;
}

const CONNECTION_MODE_NAMESPACE = '.connection-mode';

interface ConnectionModeParams {
    canConnect: (fromId: string, toId: string) => boolean;
    clearHighlights: () => void;
    fromId: string;
    highlightTargets: (fromId: string) => void;
    onConnect: (fromId: string, toId: string) => void;
    onInvalidTarget: () => void;
    setBlocksDraggable: (draggable: boolean) => void;
    setStatusVisible: (visible: boolean) => void;
    stage: Konva.Stage;
}

function getNodeId(node: Konva.Node | null): string | null {
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

export function startConnectionMode(params: ConnectionModeParams): ConnectionModeSession {
    params.highlightTargets(params.fromId);
    params.setBlocksDraggable(false);
    params.setStatusVisible(true);

    let timeoutId = 0;
    const escapeHandler = (event: KeyboardEvent) => {
        if (event.key === 'Escape') cleanup();
    };
    const cleanup = createCleanup(params, escapeHandler, () => timeoutId);
    const clickHandler = (event: Konva.KonvaEventObject<MouseEvent>) => {
        handleStageClick(params, getNodeId(event.target));
        cleanup();
    };

    timeoutId = window.setTimeout(cleanup, 10000);
    params.stage.on(`click${CONNECTION_MODE_NAMESPACE}`, clickHandler);
    document.addEventListener('keydown', escapeHandler);

    return { cancel: cleanup };
}

function createCleanup(
    params: ConnectionModeParams,
    escapeHandler: (event: KeyboardEvent) => void,
    getTimeoutId: () => number
): () => void {
    let active = true;

    return () => {
        if (!active) return;
        active = false;
        window.clearTimeout(getTimeoutId());
        params.stage.off(CONNECTION_MODE_NAMESPACE);
        document.removeEventListener('keydown', escapeHandler);
        params.clearHighlights();
        params.setBlocksDraggable(true);
        params.setStatusVisible(false);
    };
}

function handleStageClick(params: ConnectionModeParams, targetId: string | null): void {
    if (!targetId || targetId === params.fromId) return;
    if (params.canConnect(params.fromId, targetId)) {
        params.onConnect(params.fromId, targetId);
        return;
    }

    params.onInvalidTarget();
}
