import Konva from 'konva';
import { SPECIAL_BLOCK_SIZE } from '../utils/state-position';
import type { Bounds, Point, SpecialBlockCallbacks, SpecialStateId } from '../types/editor-types';
import { bindSpecialBlockEvents } from './special-block-interactions';
import {
    createSpecialBlockView,
    mountSpecialBlockView,
    refreshSpecialBlockTheme,
    setSpecialBlockHighlight,
    type SpecialBlockViewNodes
} from './special-block-view';

export class SpecialBlock {
    public readonly group: Konva.Group;
    public readonly rect: Konva.Rect;
    private readonly callbacks: SpecialBlockCallbacks;
    private readonly layer: Konva.Layer;
    private readonly view: SpecialBlockViewNodes;
    private position: Point;

    public constructor(
        private readonly stateId: SpecialStateId,
        position: Point,
        stage: Konva.Stage,
        layer: Konva.Layer,
        callbacks: SpecialBlockCallbacks
    ) {
        this.position = position;
        this.layer = layer;
        this.callbacks = callbacks;
        this.view = createSpecialBlockView(this.stateId);
        this.group = this.view.group;
        this.rect = this.view.rect;
        mountSpecialBlockView(this.layer, this.view);
        bindSpecialBlockEvents({
            group: this.group,
            iconText: this.view.iconText,
            onContextMenu: this.stateId === 'start'
                ? (event) => this.handleContextMenu(event)
                : undefined,
            rect: this.rect,
            stage
        });
        this.updatePosition(position);
    }

    public get id(): SpecialStateId {
        return this.stateId;
    }

    public getBounds(): Bounds {
        return {
            x: this.position.x,
            y: this.position.y,
            width: SPECIAL_BLOCK_SIZE.width,
            height: SPECIAL_BLOCK_SIZE.height
        };
    }

    public getCenter(): Point {
        const bounds = this.getBounds();
        return {
            x: bounds.x + bounds.width / 2,
            y: bounds.y + bounds.height / 2
        };
    }

    public refreshTheme(): void {
        refreshSpecialBlockTheme(this.view, this.stateId);
        this.layer.batchDraw();
    }

    public setHighlighted(enabled: boolean): void {
        setSpecialBlockHighlight(this.rect, this.stateId, enabled);
        this.layer.batchDraw();
    }

    public updatePosition(position: Point): void {
        this.position = position;
        this.group.position(position);
        this.layer.batchDraw();
    }

    private handleContextMenu(event: Konva.KonvaEventObject<MouseEvent>): void {
        event.evt.preventDefault();
        this.callbacks.onContextMenu(event.evt, this.stateId);
    }
}
