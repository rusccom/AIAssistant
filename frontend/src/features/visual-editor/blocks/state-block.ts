import Konva from 'konva';
import { refreshNodeCache } from '../utils/konva-factory';
import { REGULAR_BLOCK_SIZE } from '../utils/state-position';
import type { Bounds, Point, StateBlockCallbacks, StateData } from '../types/editor-types';

export class StateBlock {
    public data: StateData;
    public readonly group: Konva.Group;
    public readonly rect: Konva.Rect;
    public readonly descriptionText: Konva.Text;
    public readonly titleText: Konva.Text;
    private readonly accent: Konva.Rect;
    private readonly layer: Konva.Layer;
    private readonly stage: Konva.Stage;
    private readonly callbacks: StateBlockCallbacks;
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
        this.stage = stage;
        this.layer = layer;
        this.callbacks = callbacks;
        this.group = this.createGroup();
        this.rect = this.createRect();
        this.accent = this.createAccent();
        this.titleText = this.createTitleText();
        this.descriptionText = this.createDescriptionText();
        this.assemble();
        this.bindEvents();
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
        this.titleText.text(this.data.id);
        this.descriptionText.text(this.data.description || 'No description');
        this.group.id(this.data.id);
        this.group.name(`state-${this.data.id}`);
        this.updatePosition();
        refreshNodeCache(this.group);
        this.layer.batchDraw();
    }

    public updatePosition(): void {
        this.group.position(this.data.position);
    }

    private applySelectionStyles(): void {
        const stroke = this.isConnectionTarget ? '#16a34a' : this.isSelected ? '#2563eb' : '#d5dbe5';
        const strokeWidth = this.isConnectionTarget || this.isSelected ? 3 : 1.5;
        const accentColors = this.isSelected
            ? [0, '#f97316', 0.5, '#ea580c', 1, '#dc2626']
            : [0, '#2563eb', 0.5, '#1d4ed8', 1, '#0f766e'];

        this.rect.stroke(stroke);
        this.rect.strokeWidth(strokeWidth);
        this.accent.fillLinearGradientColorStops(accentColors);
        refreshNodeCache(this.group);
        this.layer.batchDraw();
    }

    private assemble(): void {
        this.group.add(this.rect);
        this.group.add(this.accent);
        this.group.add(this.titleText);
        this.group.add(this.descriptionText);
        this.layer.add(this.group);
        refreshNodeCache(this.group);
    }

    private bindEvents(): void {
        this.group.on('click', () => this.callbacks.onSelect(this.id));
        this.group.on('dblclick', () => this.callbacks.onEdit(this.id));
        this.group.on('contextmenu', (event) => this.handleContextMenu(event));
        this.group.on('dragstart', () => this.callbacks.onDragModeChange(true));
        this.group.on('dragmove', () => this.handleDragMove());
        this.group.on('dragend', () => this.handleDragEnd());
        this.group.on('mouseenter', () => this.applyHoverState(true));
        this.group.on('mouseleave', () => this.applyHoverState(false));
    }

    private createAccent(): Konva.Rect {
        return new Konva.Rect({
            x: 3,
            y: 0,
            width: REGULAR_BLOCK_SIZE.width - 6,
            height: 4,
            cornerRadius: [10, 10, 0, 0],
            fillLinearGradientStartPoint: { x: 0, y: 0 },
            fillLinearGradientEndPoint: { x: REGULAR_BLOCK_SIZE.width - 6, y: 0 },
            fillLinearGradientColorStops: [0, '#2563eb', 0.5, '#1d4ed8', 1, '#0f766e'],
            perfectDrawEnabled: false
        });
    }

    private createDescriptionText(): Konva.Text {
        return new Konva.Text({
            text: this.data.description || 'No description',
            x: 10,
            y: 36,
            width: REGULAR_BLOCK_SIZE.width - 20,
            height: 52,
            fontSize: 11,
            fontFamily: 'Inter, system-ui, sans-serif',
            fill: '#475569',
            lineHeight: 1.35,
            wrap: 'word',
            ellipsis: true,
            perfectDrawEnabled: false
        });
    }

    private createGroup(): Konva.Group {
        return new Konva.Group({
            id: this.data.id,
            name: `state-${this.data.id}`,
            draggable: true
        });
    }

    private createRect(): Konva.Rect {
        return new Konva.Rect({
            width: REGULAR_BLOCK_SIZE.width,
            height: REGULAR_BLOCK_SIZE.height,
            fillLinearGradientStartPoint: { x: 0, y: 0 },
            fillLinearGradientEndPoint: { x: 0, y: REGULAR_BLOCK_SIZE.height },
            fillLinearGradientColorStops: [0, '#ffffff', 1, '#f8fafc'],
            stroke: '#d5dbe5',
            strokeWidth: 1.5,
            cornerRadius: 12,
            shadowBlur: 10,
            shadowColor: 'rgba(15, 23, 42, 0.12)',
            shadowOffset: { x: 0, y: 4 },
            perfectDrawEnabled: false
        });
    }

    private createTitleText(): Konva.Text {
        return new Konva.Text({
            text: this.data.id,
            x: 10,
            y: 14,
            width: REGULAR_BLOCK_SIZE.width - 20,
            fontSize: 13,
            fontFamily: 'Inter, system-ui, sans-serif',
            fontStyle: '600',
            fill: '#0f172a',
            perfectDrawEnabled: false
        });
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

    private applyHoverState(active: boolean): void {
        this.stage.container().style.cursor = active ? 'move' : 'default';
        this.rect.to({
            shadowBlur: active ? 14 : 10,
            shadowOffset: { x: 0, y: active ? 6 : 4 },
            duration: 0.15
        });
    }
}
