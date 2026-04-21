import type { Point, VisibleViewport } from '../types/editor-types';

export const DEFAULT_CANVAS_SIZE = {
    width: 1200,
    height: 800
} as const;

export const REGULAR_BLOCK_SIZE = {
    width: 174,
    height: 100
} as const;

export const SPECIAL_BLOCK_SIZE = {
    width: 140,
    height: 80
} as const;

const GRID_COLUMNS = 3;
const GRID_SPACING = 50;
const IMPORT_START_Y = 100;
const OFFSET_CYCLE = 8;
const OFFSET_STEP = 32;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3;

export function clampZoom(zoom: number): number {
    return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
}

export function getVisibleViewport(wrapper: HTMLElement, zoom: number): VisibleViewport {
    const left = wrapper.scrollLeft || 0;
    const top = wrapper.scrollTop || 0;
    const width = wrapper.clientWidth / zoom;
    const height = wrapper.clientHeight / zoom;

    return {
        left,
        top,
        right: left + width,
        bottom: top + height,
        width,
        height
    };
}

export function getNextStatePosition(viewport: VisibleViewport, offsetIndex: number): Point {
    const cycleIndex = offsetIndex % OFFSET_CYCLE;
    const offset = cycleIndex * OFFSET_STEP;
    const baseX = Math.floor(viewport.left + viewport.width * 0.5 - REGULAR_BLOCK_SIZE.width * 0.5);
    const baseY = Math.floor(viewport.top + viewport.height * 0.5 - REGULAR_BLOCK_SIZE.height * 0.5);

    return {
        x: baseX + offset,
        y: baseY + offset
    };
}

export function getImportedGridPosition(index: number): Point {
    const col = index % GRID_COLUMNS;
    const row = Math.floor(index / GRID_COLUMNS);
    const gridWidth =
        GRID_COLUMNS * REGULAR_BLOCK_SIZE.width + (GRID_COLUMNS - 1) * GRID_SPACING;
    const startX = Math.max(50, (DEFAULT_CANVAS_SIZE.width - gridWidth) / 2);

    return {
        x: startX + col * (REGULAR_BLOCK_SIZE.width + GRID_SPACING),
        y: IMPORT_START_Y + row * (REGULAR_BLOCK_SIZE.height + GRID_SPACING)
    };
}
