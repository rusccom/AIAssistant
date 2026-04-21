import Konva from 'konva';
import { refreshNodeCache } from '../utils/konva-factory';
import { SPECIAL_BLOCK_SIZE } from '../utils/state-position';
import type { Bounds, Point, SpecialBlockCallbacks, SpecialStateId } from '../types/editor-types';

const SPECIAL_STYLE = {
    start: {
        accent: [0, '#10b981', 0.5, '#059669', 1, '#047857'],
        fill: [0, '#f0fdf4', 1, '#dcfce7'],
        icon: '▶',
        stroke: '#86efac',
        text: '#065f46'
    },
    end: {
        accent: [0, '#ef4444', 0.5, '#dc2626', 1, '#b91c1c'],
        fill: [0, '#fff1f2', 1, '#ffe4e6'],
        icon: '■',
        stroke: '#fda4af',
        text: '#881337'
    }
} as const;

export class SpecialBlock {
    public readonly group: Konva.Group;
    public readonly rect: Konva.Rect;
    private readonly accent: Konva.Rect;
    private readonly iconText: Konva.Text;
    private readonly labelText: Konva.Text;
    private readonly callbacks: SpecialBlockCallbacks;
    private readonly layer: Konva.Layer;
    private readonly stage: Konva.Stage;
    private position: Point;

    public constructor(
        private readonly stateId: SpecialStateId,
        position: Point,
        stage: Konva.Stage,
        layer: Konva.Layer,
        callbacks: SpecialBlockCallbacks
    ) {
        this.position = position;
        this.stage = stage;
        this.layer = layer;
        this.callbacks = callbacks;
        this.group = this.createGroup();
        this.rect = this.createRect();
        this.accent = this.createAccent();
        this.iconText = this.createIcon();
        this.labelText = this.createLabel();
        this.assemble();
        this.bindEvents();
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

    public setHighlighted(enabled: boolean): void {
        this.rect.stroke(enabled ? '#16a34a' : SPECIAL_STYLE[this.stateId].stroke);
        this.rect.strokeWidth(enabled ? 3 : 1.5);
        this.layer.batchDraw();
    }

    public updatePosition(position: Point): void {
        this.position = position;
        this.group.position(position);
        this.layer.batchDraw();
    }

    private assemble(): void {
        this.group.add(this.rect);
        this.group.add(this.accent);
        this.group.add(this.iconText);
        this.group.add(this.labelText);
        this.layer.add(this.group);
        refreshNodeCache(this.group);
    }

    private bindEvents(): void {
        this.group.on('mouseenter', () => this.applyHoverState(true));
        this.group.on('mouseleave', () => this.applyHoverState(false));

        if (this.stateId === 'start') {
            this.group.on('contextmenu', (event) => this.handleContextMenu(event));
        }
    }

    private createAccent(): Konva.Rect {
        return new Konva.Rect({
            x: 4,
            y: 0,
            width: SPECIAL_BLOCK_SIZE.width - 8,
            height: 5,
            cornerRadius: [12, 12, 0, 0],
            fillLinearGradientStartPoint: { x: 0, y: 0 },
            fillLinearGradientEndPoint: { x: SPECIAL_BLOCK_SIZE.width - 8, y: 0 },
            fillLinearGradientColorStops: [...SPECIAL_STYLE[this.stateId].accent],
            perfectDrawEnabled: false
        });
    }

    private createGroup(): Konva.Group {
        return new Konva.Group({
            id: this.stateId,
            name: `special-${this.stateId}`,
            draggable: false
        });
    }

    private createIcon(): Konva.Text {
        return new Konva.Text({
            text: SPECIAL_STYLE[this.stateId].icon,
            x: 0,
            y: 14,
            width: SPECIAL_BLOCK_SIZE.width,
            align: 'center',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 22,
            fill: SPECIAL_STYLE[this.stateId].text,
            perfectDrawEnabled: false
        });
    }

    private createLabel(): Konva.Text {
        return new Konva.Text({
            text: this.stateId.toUpperCase(),
            x: 0,
            y: 47,
            width: SPECIAL_BLOCK_SIZE.width,
            align: 'center',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 13,
            fontStyle: '600',
            fill: SPECIAL_STYLE[this.stateId].text,
            perfectDrawEnabled: false
        });
    }

    private createRect(): Konva.Rect {
        return new Konva.Rect({
            width: SPECIAL_BLOCK_SIZE.width,
            height: SPECIAL_BLOCK_SIZE.height,
            cornerRadius: 16,
            stroke: SPECIAL_STYLE[this.stateId].stroke,
            strokeWidth: 1.5,
            fillLinearGradientStartPoint: { x: 0, y: 0 },
            fillLinearGradientEndPoint: { x: 0, y: SPECIAL_BLOCK_SIZE.height },
            fillLinearGradientColorStops: [...SPECIAL_STYLE[this.stateId].fill],
            shadowBlur: 10,
            shadowColor: 'rgba(15, 23, 42, 0.12)',
            shadowOffset: { x: 0, y: 4 },
            perfectDrawEnabled: false
        });
    }

    private handleContextMenu(event: Konva.KonvaEventObject<MouseEvent>): void {
        event.evt.preventDefault();
        this.callbacks.onContextMenu(event.evt, this.stateId);
    }

    private applyHoverState(active: boolean): void {
        this.stage.container().style.cursor = active ? 'pointer' : 'default';
        this.rect.to({
            shadowBlur: active ? 14 : 10,
            shadowOffset: { x: 0, y: active ? 6 : 4 },
            duration: 0.15
        });
        this.iconText.to({ fontSize: active ? 24 : 22, duration: 0.15 });
    }
}
