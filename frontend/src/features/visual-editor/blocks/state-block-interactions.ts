import Konva from 'konva';
import type { StateBlockCallbacks } from '../types/editor-types';

interface StateBlockEventBindings {
    callbacks: StateBlockCallbacks;
    getId: () => string;
    group: Konva.Group;
    onContextMenu: (event: Konva.KonvaEventObject<MouseEvent>) => void;
    onDragEnd: () => void;
    onDragMove: () => void;
    rect: Konva.Rect;
    stage: Konva.Stage;
}

export function bindStateBlockEvents(bindings: StateBlockEventBindings): void {
    bindSelectionEvents(bindings.group, bindings.callbacks, bindings.getId);
    bindContextMenuEvent(bindings.group, bindings.onContextMenu);
    bindDragEvents(bindings.group, bindings.callbacks, bindings.onDragMove, bindings.onDragEnd);
    bindHoverEvents(bindings.group, bindings.stage, bindings.rect);
}

export function applyStateBlockHoverState(
    stage: Konva.Stage,
    rect: Konva.Rect,
    active: boolean
): void {
    stage.container().style.cursor = active ? 'move' : 'default';
    rect.to({
        shadowBlur: active ? 14 : 10,
        shadowOffset: { x: 0, y: active ? 6 : 4 },
        duration: 0.15
    });
}

function bindContextMenuEvent(
    group: Konva.Group,
    onContextMenu: (event: Konva.KonvaEventObject<MouseEvent>) => void
): void {
    group.on('contextmenu', onContextMenu);
}

function bindDragEvents(
    group: Konva.Group,
    callbacks: StateBlockCallbacks,
    onDragMove: () => void,
    onDragEnd: () => void
): void {
    group.on('dragstart', () => callbacks.onDragModeChange(true));
    group.on('dragmove', onDragMove);
    group.on('dragend', onDragEnd);
}

function bindHoverEvents(group: Konva.Group, stage: Konva.Stage, rect: Konva.Rect): void {
    group.on('mouseenter', () => applyStateBlockHoverState(stage, rect, true));
    group.on('mouseleave', () => applyStateBlockHoverState(stage, rect, false));
}

function bindSelectionEvents(
    group: Konva.Group,
    callbacks: StateBlockCallbacks,
    getId: () => string
): void {
    group.on('click', () => callbacks.onSelect(getId()));
    group.on('dblclick', () => callbacks.onEdit(getId()));
}
