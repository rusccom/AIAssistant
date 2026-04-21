import Konva from 'konva';
import type { ArrowShapeSet, Point } from '../types/editor-types';

const ARROW_PADDING = 8;
const ARROW_SIZE = 8;

export function createKonvaStage(
    container: HTMLDivElement,
    width: number,
    height: number
): Konva.Stage {
    return new Konva.Stage({
        container,
        width,
        height,
        imageSmoothingEnabled: false,
        pixelRatio: 1
    });
}

export function createBaseLayers(): { blocksLayer: Konva.Layer; edgesLayer: Konva.Layer } {
    const blocksLayer = new Konva.Layer({ clearBeforeDraw: true, listening: true });
    const edgesLayer = new Konva.Layer({ clearBeforeDraw: true, hitGraphEnabled: false });

    return { blocksLayer, edgesLayer };
}

export function refreshNodeCache(node: Konva.Group): void {
    if (node.isCached()) {
        node.clearCache();
    }

    node.cache();
}

export function createArrow(from: Point, to: Point): ArrowShapeSet {
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    if (!distance) {
        throw new Error('Cannot create arrow between identical points');
    }

    const normalized = {
        x: (to.x - from.x) / distance,
        y: (to.y - from.y) / distance
    };
    const start = {
        x: from.x + normalized.x * ARROW_PADDING,
        y: from.y + normalized.y * ARROW_PADDING
    };
    const end = {
        x: to.x - normalized.x * ARROW_PADDING,
        y: to.y - normalized.y * ARROW_PADDING
    };
    const control = getCurveControlPoint(start, end);

    return {
        path: new Konva.Path({
            data: `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`,
            stroke: '#2563eb',
            strokeWidth: 2
        }),
        arrowHead: createArrowHead(end, control)
    };
}

function getCurveControlPoint(start: Point, end: Point): Point {
    const offset = Math.min(Math.abs(end.x - start.x), Math.abs(end.y - start.y)) * 0.3;
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;

    return {
        x: midX + (Math.abs(end.y - start.y) > Math.abs(end.x - start.x) ? offset : 0),
        y: midY + (Math.abs(end.x - start.x) > Math.abs(end.y - start.y) ? offset : 0)
    };
}

function createArrowHead(end: Point, control: Point): Konva.Line {
    const angle = Math.atan2(end.y - control.y, end.x - control.x);
    const left = {
        x: end.x - ARROW_SIZE * Math.cos(angle - Math.PI / 6),
        y: end.y - ARROW_SIZE * Math.sin(angle - Math.PI / 6)
    };
    const right = {
        x: end.x - ARROW_SIZE * Math.cos(angle + Math.PI / 6),
        y: end.y - ARROW_SIZE * Math.sin(angle + Math.PI / 6)
    };

    return new Konva.Line({
        points: [left.x, left.y, end.x, end.y, right.x, right.y],
        stroke: '#2563eb',
        strokeWidth: 2,
        lineCap: 'round',
        lineJoin: 'round'
    });
}
