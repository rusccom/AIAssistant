import Konva from 'konva';

interface SpecialBlockEventBindings {
    group: Konva.Group;
    iconText: Konva.Text;
    onContextMenu?: (event: Konva.KonvaEventObject<MouseEvent>) => void;
    rect: Konva.Rect;
    stage: Konva.Stage;
}

export function bindSpecialBlockEvents(bindings: SpecialBlockEventBindings): void {
    bindHoverEvents(bindings.group, bindings.stage, bindings.rect, bindings.iconText);
    bindContextMenuEvent(bindings.group, bindings.onContextMenu);
}

function applySpecialBlockHoverState(
    stage: Konva.Stage,
    rect: Konva.Rect,
    iconText: Konva.Text,
    active: boolean
): void {
    stage.container().style.cursor = active ? 'pointer' : 'default';
    rect.to({
        shadowBlur: active ? 14 : 10,
        shadowOffset: { x: 0, y: active ? 6 : 4 },
        duration: 0.15
    });
    iconText.to({ fontSize: active ? 24 : 22, duration: 0.15 });
}

function bindContextMenuEvent(
    group: Konva.Group,
    onContextMenu?: (event: Konva.KonvaEventObject<MouseEvent>) => void
): void {
    if (!onContextMenu) {
        return;
    }

    group.on('contextmenu', onContextMenu);
}

function bindHoverEvents(
    group: Konva.Group,
    stage: Konva.Stage,
    rect: Konva.Rect,
    iconText: Konva.Text
): void {
    group.on('mouseenter', () => applySpecialBlockHoverState(stage, rect, iconText, true));
    group.on('mouseleave', () => applySpecialBlockHoverState(stage, rect, iconText, false));
}
