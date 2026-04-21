import Konva from 'konva';
import { getVisualEditorThemeTokens } from '../../client-theme/theme-tokens';
import { refreshNodeCache } from '../utils/konva-factory';
import { SPECIAL_BLOCK_SIZE } from '../utils/state-position';
import type { SpecialStateId } from '../types/editor-types';

const SPECIAL_BLOCK_ICONS: Record<SpecialStateId, string> = {
    start: '>',
    end: 'x'
};

export interface SpecialBlockViewNodes {
    accent: Konva.Rect;
    group: Konva.Group;
    iconText: Konva.Text;
    labelText: Konva.Text;
    rect: Konva.Rect;
}

export function createSpecialBlockView(stateId: SpecialStateId): SpecialBlockViewNodes {
    return {
        accent: createAccent(stateId),
        group: createGroup(stateId),
        iconText: createIcon(stateId),
        labelText: createLabel(stateId),
        rect: createRect(stateId)
    };
}

export function mountSpecialBlockView(layer: Konva.Layer, nodes: SpecialBlockViewNodes): void {
    nodes.group.add(nodes.rect);
    nodes.group.add(nodes.accent);
    nodes.group.add(nodes.iconText);
    nodes.group.add(nodes.labelText);
    layer.add(nodes.group);
    refreshNodeCache(nodes.group);
}

export function refreshSpecialBlockTheme(
    nodes: SpecialBlockViewNodes,
    stateId: SpecialStateId
): void {
    const theme = getSpecialBlockTheme(stateId);

    nodes.accent.fill(theme.accent);
    nodes.rect.fill(theme.fill);
    nodes.rect.stroke(theme.stroke);
    nodes.iconText.fill(theme.text);
    nodes.labelText.fill(theme.text);
    refreshNodeCache(nodes.group);
}

export function setSpecialBlockHighlight(
    rect: Konva.Rect,
    stateId: SpecialStateId,
    enabled: boolean
): void {
    const tokens = getVisualEditorThemeTokens();
    const theme = getSpecialBlockTheme(stateId);

    rect.stroke(enabled ? tokens.nodeTargetBorder : theme.stroke);
    rect.strokeWidth(enabled ? 3 : 1.5);
}

function createAccent(stateId: SpecialStateId): Konva.Rect {
    const theme = getSpecialBlockTheme(stateId);

    return new Konva.Rect({
        x: 4,
        y: 0,
        width: SPECIAL_BLOCK_SIZE.width - 8,
        height: 5,
        cornerRadius: [12, 12, 0, 0],
        fill: theme.accent,
        perfectDrawEnabled: false
    });
}

function createGroup(stateId: SpecialStateId): Konva.Group {
    return new Konva.Group({
        id: stateId,
        name: `special-${stateId}`,
        draggable: false
    });
}

function createIcon(stateId: SpecialStateId): Konva.Text {
    const theme = getSpecialBlockTheme(stateId);

    return new Konva.Text({
        text: SPECIAL_BLOCK_ICONS[stateId],
        x: 0,
        y: 14,
        width: SPECIAL_BLOCK_SIZE.width,
        align: 'center',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 22,
        fill: theme.text,
        perfectDrawEnabled: false
    });
}

function createLabel(stateId: SpecialStateId): Konva.Text {
    const theme = getSpecialBlockTheme(stateId);

    return new Konva.Text({
        text: stateId.toUpperCase(),
        x: 0,
        y: 47,
        width: SPECIAL_BLOCK_SIZE.width,
        align: 'center',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 13,
        fontStyle: 'bold',
        fill: theme.text,
        perfectDrawEnabled: false
    });
}

function createRect(stateId: SpecialStateId): Konva.Rect {
    const theme = getSpecialBlockTheme(stateId);

    return new Konva.Rect({
        width: SPECIAL_BLOCK_SIZE.width,
        height: SPECIAL_BLOCK_SIZE.height,
        cornerRadius: 16,
        stroke: theme.stroke,
        strokeWidth: 1.5,
        fill: theme.fill,
        shadowBlur: 10,
        shadowColor: 'rgba(15, 23, 42, 0.12)',
        shadowOffset: { x: 0, y: 4 },
        perfectDrawEnabled: false
    });
}

function getSpecialBlockTheme(stateId: SpecialStateId) {
    return getVisualEditorThemeTokens()[stateId];
}
