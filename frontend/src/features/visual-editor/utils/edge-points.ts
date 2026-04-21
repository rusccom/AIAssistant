import type { Bounds, Point } from '../types/editor-types';

function getCenter(bounds: Bounds): Point {
    return {
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2
    };
}

function getNormalizedVector(dx: number, dy: number): Point {
    const distance = Math.hypot(dx, dy);
    if (!distance) {
        return { x: 0, y: 0 };
    }

    return {
        x: dx / distance,
        y: dy / distance
    };
}

function projectToVerticalEdge(bounds: Bounds, center: Point, direction: Point): Point | null {
    const targetX = direction.x > 0 ? bounds.x + bounds.width : bounds.x;
    if (!direction.x) {
        return null;
    }

    const factor = (targetX - center.x) / direction.x;
    const targetY = center.y + direction.y * factor;
    const top = bounds.y;
    const bottom = bounds.y + bounds.height;

    return targetY >= top && targetY <= bottom ? { x: targetX, y: targetY } : null;
}

function projectToHorizontalEdge(bounds: Bounds, center: Point, direction: Point): Point | null {
    const targetY = direction.y > 0 ? bounds.y + bounds.height : bounds.y;
    if (!direction.y) {
        return null;
    }

    const factor = (targetY - center.y) / direction.y;
    const targetX = center.x + direction.x * factor;
    const left = bounds.x;
    const right = bounds.x + bounds.width;

    return targetX >= left && targetX <= right ? { x: targetX, y: targetY } : null;
}

function getEdgePoint(bounds: Bounds, source: Point, target: Point): Point {
    const direction = getNormalizedVector(target.x - source.x, target.y - source.y);

    return (
        projectToVerticalEdge(bounds, source, direction) ??
        projectToHorizontalEdge(bounds, source, direction) ??
        source
    );
}

export function getConnectionPoints(from: Bounds, to: Bounds): { fromPoint: Point; toPoint: Point } {
    const fromCenter = getCenter(from);
    const toCenter = getCenter(to);

    return {
        fromPoint: getEdgePoint(from, fromCenter, toCenter),
        toPoint: getEdgePoint(to, toCenter, fromCenter)
    };
}
