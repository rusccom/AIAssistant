import Konva from 'konva';
import { REGULAR_BLOCK_SIZE } from '../utils/state-position';
import type { Bounds, Point, StateBlockCallbacks, StateData } from '../types/editor-types';
import { bindStateBlockEvents } from './state-block-interactions';
import {
    applyStateBlockSelectionStyles,
    createStateBlockView,
    mountStateBlockView,
    refreshStateBlockTheme,
    syncStateBlockViewData,
    type StateBlockViewNodes
} from './state-block-view';

export class StateBlock {
    public data: StateData;
    public readonly group: Konva.Group;
    public readonly rect: Konva.Rect;
    public readonly descriptionText: Konva.Text;
    public readonly titleText: Konva.Text;
    private readonly layer: Konva.Layer;
    private readonly callbacks: StateBlockCallbacks;
    private readonly view: StateBlockViewNodes;
    private isConnectionTarget = false;
    private isSelected = false;
    private moveFrameId?: number;

    public constructor(
        data: StateData,
        stage: Konva.Stage,
        layer: Konva.Layer,
        callbacks: StateBlockCallbacks
    ) {
        this.data = data;
        this.layer = layer;
        this.callbacks = callbacks;
        this.view = createStateBlockView(data);
        this.group = this.view.group;
        this.rect = this.view.rect;
        this.titleText = this.view.titleText;
        this.descriptionText = this.view.descriptionText;
        mountStateBlockView(this.layer, this.view);
        bindStateBlockEvents({
            callbacks: this.callbacks,
            getId: () => this.id,
            group: this.group,
            onContextMenu: (event) => this.handleContextMenu(event),
            onDragEnd: () => this.handleDragEnd(),
            onDragMove: () => this.handleDragMove(),
            rect: this.rect,
            stage
        });
        this.updatePosition();
    }

    public get id(): string {
        return this.data.id;
    }

    public destroy(): void {
        if (this.moveFrameId) {
            cancelAnimationFrame(this.moveFrameId);
        }

        this.group.destroy();
    }

    public getBounds(): Bounds {
        return {
            x: this.data.position.x,
            y: this.data.position.y,
            width: REGULAR_BLOCK_SIZE.width,
            height: REGULAR_BLOCK_SIZE.height
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
        refreshStateBlockTheme(this.view);
        this.applySelectionStyles();
    }

    public setConnectionTarget(enabled: boolean): void {
        this.isConnectionTarget = enabled;
        this.applySelectionStyles();
    }

    public setDescriptionVisible(visible: boolean): void {
        this.descriptionText.visible(visible);
        this.layer.batchDraw();
    }

    public setDraggable(draggable: boolean): void {
        this.group.draggable(draggable);
    }

    public setSelected(selected: boolean): void {
        this.isSelected = selected;
        this.applySelectionStyles();
    }

    public updateData(patch: Partial<StateData>): void {
        this.data = { ...this.data, ...patch };
        syncStateBlockViewData(this.view, this.data);
        this.updatePosition();
        this.layer.batchDraw();
    }

    public updatePosition(): void {
        this.group.position(this.data.position);
    }

    private applySelectionStyles(): void {
        applyStateBlockSelectionStyles(this.view, this.isSelected, this.isConnectionTarget);
        this.layer.batchDraw();
    }

    private handleContextMenu(event: Konva.KonvaEventObject<MouseEvent>): void {
        event.evt.preventDefault();
        this.callbacks.onContextMenu(event.evt, this.id);
    }

    private handleDragEnd(): void {
        this.syncPositionFromGroup();
        this.callbacks.onDragModeChange(false);
        this.callbacks.onBlockDragEnd();
    }

    private handleDragMove(): void {
        this.syncPositionFromGroup();

        if (this.moveFrameId) {
            cancelAnimationFrame(this.moveFrameId);
        }

        this.moveFrameId = requestAnimationFrame(() => {
            this.callbacks.onBlockMove(this.id);
            this.moveFrameId = undefined;
        });
    }

    private syncPositionFromGroup(): void {
        this.data.position = {
            x: this.group.x(),
            y: this.group.y()
        };
    }
}
