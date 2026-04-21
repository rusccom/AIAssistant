import Konva from 'konva';
import { SpecialBlock } from '../blocks/special-block';
import { createBaseLayers, createKonvaStage } from '../utils/konva-factory';
import {
    clampZoom,
    getVisibleViewport,
    REGULAR_BLOCK_SIZE,
    SPECIAL_BLOCK_SIZE
} from '../utils/state-position';
import type { CanvasElements, Point, SpecialStateId } from '../types/editor-types';

interface EditorCanvasCallbacks {
    onContextMenu: (event: MouseEvent, stateId: SpecialStateId) => void;
    onViewportChange: () => void;
}

export class EditorCanvas {
    public readonly blocksLayer: Konva.Layer;
    public readonly edgesLayer: Konva.Layer;
    public readonly stage: Konva.Stage;
    private readonly callbacks: EditorCanvasCallbacks;
    private readonly elements: CanvasElements;
    private readonly specialBlocks = new Map<SpecialStateId, SpecialBlock>();
    private zoom = 1;

    public constructor(elements: CanvasElements, callbacks: EditorCanvasCallbacks) {
        this.elements = elements;
        this.callbacks = callbacks;
        this.stage = createKonvaStage(elements.host, elements.wrapper.clientWidth, elements.wrapper.clientHeight);
        const layers = createBaseLayers();
        this.blocksLayer = layers.blocksLayer;
        this.edgesLayer = layers.edgesLayer;
        this.stage.add(this.edgesLayer);
        this.stage.add(this.blocksLayer);
        this.bindViewportEvents();
    }

    public getSpecialBlock(id: SpecialStateId): SpecialBlock | undefined {
        return this.specialBlocks.get(id);
    }

    public getZoom(): number {
        return this.zoom;
    }

    public hideConnectionStatus(): void {
        this.elements.connectionStatus.style.display = 'none';
    }

    public renderSpecialBlocks(): void {
        const viewport = getVisibleViewport(this.elements.wrapper, this.zoom);
        this.upsertSpecialBlock('start', { x: viewport.left + 16, y: viewport.top + 16 });
        this.upsertSpecialBlock('end', {
            x: viewport.right - REGULAR_BLOCK_SIZE.width - 16,
            y: viewport.bottom - SPECIAL_BLOCK_SIZE.height - 20
        });
        this.stage.draw();
    }

    public resetZoom(): void {
        this.setZoom(1);
    }

    public setZoom(zoom: number): void {
        this.zoom = clampZoom(zoom);
        this.stage.scale({ x: this.zoom, y: this.zoom });
        this.updateZoomDisplay();
        this.renderSpecialBlocks();
        this.callbacks.onViewportChange();
    }

    public showConnectionStatus(): void {
        this.elements.connectionStatus.style.display = 'block';
    }

    public syncViewport(): void {
        this.syncStageSize();
        this.syncStagePosition();
        this.renderSpecialBlocks();
        this.callbacks.onViewportChange();
    }

    public zoomIn(): void {
        this.setZoom(this.zoom * 1.2);
    }

    public zoomOut(): void {
        this.setZoom(this.zoom / 1.2);
    }

    private bindViewportEvents(): void {
        this.elements.wrapper.addEventListener('scroll', () => this.syncViewport());

        if (typeof ResizeObserver === 'undefined') {
            return;
        }

        const observer = new ResizeObserver(() => this.syncViewport());
        observer.observe(this.elements.wrapper);
    }

    private createSpecialBlock(id: SpecialStateId, position: Point): SpecialBlock {
        return new SpecialBlock(id, position, this.stage, this.blocksLayer, {
            onContextMenu: this.callbacks.onContextMenu
        });
    }

    private syncStagePosition(): void {
        this.stage.position({
            x: -(this.elements.wrapper.scrollLeft || 0) * this.zoom,
            y: -(this.elements.wrapper.scrollTop || 0) * this.zoom
        });
        this.stage.draw();
    }

    private syncStageSize(): void {
        const width = this.elements.wrapper.clientWidth;
        const height = this.elements.wrapper.clientHeight;

        if (this.stage.width() === width && this.stage.height() === height) {
            return;
        }

        this.stage.width(width);
        this.stage.height(height);
    }

    private updateZoomDisplay(): void {
        this.elements.zoomLevel.textContent = `${Math.round(this.zoom * 100)}%`;
    }

    private upsertSpecialBlock(id: SpecialStateId, position: Point): void {
        const existing = this.specialBlocks.get(id);
        if (existing) {
            existing.updatePosition(position);
            return;
        }

        this.specialBlocks.set(id, this.createSpecialBlock(id, position));
    }
}
