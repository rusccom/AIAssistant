import { ConnectionManager } from '../canvas/connection-manager';
import { EditorCanvas } from '../canvas/editor-canvas';
import type { ConnectableBlock, Connection } from '../types/editor-types';
import { highlightConnectionTargets, resetConnectionTargets, setBlocksDraggable } from './visual-editor-state-helpers';
import { startConnectionMode, type ConnectionModeSession } from './connection-mode';
import { StateBlock } from '../blocks/state-block';

type StateBlockMap = Map<string, StateBlock>;

interface VisualEditorConnectionCoordinatorOptions {
    canvas: EditorCanvas;
    confirmDeleteConnection: (from: string, to: string) => boolean;
    onConnectionsChanged: () => void;
    onInvalidConnection: () => void;
    resolveBlock: (stateId: string) => ConnectableBlock | undefined;
    states: StateBlockMap;
}

export class VisualEditorConnectionCoordinator {
    private activeSession?: ConnectionModeSession;
    private readonly connections: ConnectionManager;

    public constructor(private readonly options: VisualEditorConnectionCoordinatorOptions) {
        this.connections = new ConnectionManager(options.resolveBlock);
        this.connections.attachLayer(options.canvas.edgesLayer);
    }

    public applyConnections(connections: Connection[]): void {
        this.connections.setConnections(
            connections.filter((connection) => this.canCreateConnection(connection.from, connection.to))
        );
    }

    public applyStartConnection(targetId?: string | null): void {
        if (!targetId || (!this.options.states.has(targetId) && targetId !== 'end')) {
            return;
        }

        this.connections.connect('start', targetId);
    }

    public clear(): void {
        this.activeSession?.cancel();
        this.connections.clear();
    }

    public deleteConnection(from: string, to: string): void {
        if (!this.options.confirmDeleteConnection(from, to)) {
            return;
        }

        this.connections.remove(from, to);
        this.options.onConnectionsChanged();
    }

    public getAll(): Connection[] {
        return this.connections.getAll();
    }

    public redraw(): void {
        this.connections.redraw();
    }

    public redrawForBlock(stateId: string): void {
        this.connections.redrawForBlock(stateId);
    }

    public removeAllForState(stateId: string): void {
        this.connections.removeAll(stateId);
    }

    public startConnectionCreation(fromId: string): void {
        this.activeSession?.cancel();
        this.activeSession = startConnectionMode({
            stage: this.options.canvas.stage,
            fromId,
            canConnect: (source, target) => this.canCreateConnection(source, target),
            onConnect: (source, target) => this.createConnection(source, target),
            onInvalidTarget: this.options.onInvalidConnection,
            highlightTargets: (source) => this.highlightTargets(source),
            clearHighlights: () => this.clearHighlights(),
            setBlocksDraggable: (draggable) => setBlocksDraggable(this.options.states, draggable),
            setStatusVisible: (visible) => this.setStatusVisible(visible)
        });
    }

    public updateCondition(from: string, to: string, condition: string): void {
        this.connections.updateCondition(from, to, condition);
    }

    public updateStateId(oldId: string, newId: string): void {
        this.connections.updateStateId(oldId, newId);
    }

    private canCreateConnection(fromId: string, toId: string): boolean {
        return fromId !== toId
            && fromId !== 'end'
            && toId !== 'start'
            && !this.connections.has(fromId, toId);
    }

    private clearHighlights(): void {
        resetConnectionTargets(this.options.states);
        this.options.canvas.getSpecialBlock('start')?.setHighlighted(false);
        this.options.canvas.getSpecialBlock('end')?.setHighlighted(false);
    }

    private createConnection(from: string, to: string): void {
        this.connections.connect(from, to);
        this.options.onConnectionsChanged();
    }

    private highlightTargets(fromId: string): void {
        highlightConnectionTargets(this.options.states, fromId);
        this.options.canvas.getSpecialBlock('end')?.setHighlighted(fromId !== 'end');
        this.options.canvas.getSpecialBlock('start')?.setHighlighted(false);
    }

    private setStatusVisible(visible: boolean): void {
        if (visible) {
            this.options.canvas.showConnectionStatus();
            return;
        }

        this.options.canvas.hideConnectionStatus();
    }
}
