import type Konva from 'konva';
import type { Connection, ConnectableBlock } from '../types/editor-types';
import { getConnectionPoints } from '../utils/edge-points';
import { createArrow } from '../utils/konva-factory';

type BlockResolver = (stateId: string) => ConnectableBlock | undefined;

export class ConnectionManager {
    private connections: Connection[] = [];
    private edgesLayer?: Konva.Layer;
    private readonly resolveBlock: BlockResolver;

    public constructor(resolveBlock: BlockResolver) {
        this.resolveBlock = resolveBlock;
    }

    public attachLayer(layer: Konva.Layer): void {
        this.edgesLayer = layer;
    }

    public add(connection: Connection): void {
        if (connection.from === 'start') {
            this.removeAllFrom('start');
        }

        this.connections.push(connection);
        this.redraw();
    }

    public connect(from: string, to: string, condition = ''): void {
        this.add({ id: `${from}-${to}`, from, to, condition });
    }

    public clear(): void {
        this.connections = [];
        this.redraw();
    }

    public getAll(): Connection[] {
        return [...this.connections];
    }

    public has(from: string, to: string): boolean {
        return this.connections.some((connection) => connection.from === from && connection.to === to);
    }

    public redraw(): void {
        if (!this.edgesLayer) {
            return;
        }

        this.edgesLayer.destroyChildren();
        this.connections.forEach((connection) => this.drawConnection(connection));
        this.edgesLayer.batchDraw();
    }

    public redrawForBlock(stateId: string): void {
        if (!this.edgesLayer) {
            return;
        }

        const relatedIds = new Set(
            this.connections
                .filter((connection) => connection.from === stateId || connection.to === stateId)
                .map((connection) => connection.id)
        );

        this.edgesLayer.getChildren().forEach((node) => {
            if (relatedIds.has(node.getAttr('connectionId'))) {
                node.destroy();
            }
        });

        this.connections
            .filter((connection) => relatedIds.has(connection.id))
            .forEach((connection) => this.drawConnection(connection));
        this.edgesLayer.batchDraw();
    }

    public remove(from: string, to: string): void {
        this.connections = this.connections.filter(
            (connection) => connection.from !== from || connection.to !== to
        );
        this.redraw();
    }

    public removeAll(stateId: string): void {
        this.connections = this.connections.filter(
            (connection) => connection.from !== stateId && connection.to !== stateId
        );
        this.redraw();
    }

    public removeAllFrom(stateId: string): void {
        this.connections = this.connections.filter((connection) => connection.from !== stateId);
    }

    public setConnections(connections: Connection[]): void {
        this.connections = [...connections];
        this.redraw();
    }

    public updateCondition(from: string, to: string, condition: string): void {
        const match = this.connections.find(
            (connection) => connection.from === from && connection.to === to
        );

        if (match) {
            match.condition = condition;
        }
    }

    public updateStateId(oldId: string, newId: string): void {
        this.connections = this.connections.map((connection) => {
            const from = connection.from === oldId ? newId : connection.from;
            const to = connection.to === oldId ? newId : connection.to;
            return { ...connection, from, to, id: `${from}-${to}` };
        });
        this.redraw();
    }

    private drawConnection(connection: Connection): void {
        if (!this.edgesLayer) {
            return;
        }

        const from = this.resolveBlock(connection.from);
        const to = this.resolveBlock(connection.to);
        if (!from || !to) {
            return;
        }

        const points = getConnectionPoints(from.getBounds(), to.getBounds());
        const shapes = createArrow(points.fromPoint, points.toPoint);
        shapes.path.setAttr('connectionId', connection.id);
        shapes.arrowHead.setAttr('connectionId', connection.id);
        this.edgesLayer.add(shapes.path);
        this.edgesLayer.add(shapes.arrowHead);
    }
}
