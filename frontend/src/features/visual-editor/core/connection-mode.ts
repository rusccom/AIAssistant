import type Konva from 'konva';
import { getConnectionModeTargetId, startConnectionModeSession } from './connection-mode-session';

export interface ConnectionModeSession {
    cancel: () => void;
}

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

export function startConnectionMode(params: ConnectionModeParams): ConnectionModeSession {
    params.highlightTargets(params.fromId);
    params.setBlocksDraggable(false);
    params.setStatusVisible(true);

    let cleanup: () => void = () => undefined;

    cleanup = startConnectionModeSession({
        onCleanup: () => stopConnectionMode(params),
        onEscape: () => cleanup(),
        onStageClick: (event) => {
            handleStageClick(params, getConnectionModeTargetId(event.target));
            cleanup();
        },
        stage: params.stage,
        timeoutMs: 10000
    });

    return { cancel: cleanup };
}

function handleStageClick(params: ConnectionModeParams, targetId: string | null): void {
    if (!targetId || targetId === params.fromId) {
        return;
    }

    if (params.canConnect(params.fromId, targetId)) {
        params.onConnect(params.fromId, targetId);
        return;
    }

    params.onInvalidTarget();
}

function stopConnectionMode(params: ConnectionModeParams): void {
    params.clearHighlights();
    params.setBlocksDraggable(true);
    params.setStatusVisible(false);
}
