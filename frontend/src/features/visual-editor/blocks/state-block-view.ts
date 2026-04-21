import Konva from 'konva';
import { getVisualEditorThemeTokens } from '../../client-theme/theme-tokens';
import { refreshNodeCache } from '../utils/konva-factory';
import { REGULAR_BLOCK_SIZE } from '../utils/state-position';
import type { StateData } from '../types/editor-types';

export interface StateBlockViewNodes {
    accent: Konva.Rect;
    descriptionText: Konva.Text;
    group: Konva.Group;
    rect: Konva.Rect;
    titleText: Konva.Text;
}

export function createStateBlockView(data: StateData): StateBlockViewNodes {
    return {
        accent: createAccent(),
        descriptionText: createDescriptionText(data),
        group: createGroup(data),
        rect: createRect(),
        titleText: createTitleText(data)
    };
}

export function mountStateBlockView(layer: Konva.Layer, nodes: StateBlockViewNodes): void {
    nodes.group.add(nodes.rect);
    nodes.group.add(nodes.accent);
    nodes.group.add(nodes.titleText);
    nodes.group.add(nodes.descriptionText);
    layer.add(nodes.group);
    refreshNodeCache(nodes.group);
}

export function refreshStateBlockTheme(nodes: StateBlockViewNodes): void {
    const theme = getVisualEditorThemeTokens();

    nodes.rect.fill(theme.nodeFill);
    nodes.titleText.fill(theme.nodeTitle);
    nodes.descriptionText.fill(theme.nodeText);
}

export function applyStateBlockSelectionStyles(
    nodes: StateBlockViewNodes,
    isSelected: boolean,
    isConnectionTarget: boolean
): void {
    const theme = getVisualEditorThemeTokens();

    nodes.rect.stroke(resolveStateBlockStroke(isSelected, isConnectionTarget));
    nodes.rect.strokeWidth(isSelected || isConnectionTarget ? 3 : 1.5);
    nodes.accent.fill(theme.nodeAccent);
    refreshNodeCache(nodes.group);
}

export function syncStateBlockViewData(nodes: StateBlockViewNodes, data: StateData): void {
    nodes.titleText.text(data.id);
    nodes.descriptionText.text(getStateBlockDescription(data));
    nodes.group.id(data.id);
    nodes.group.name(`state-${data.id}`);
    refreshNodeCache(nodes.group);
}

function createAccent(): Konva.Rect {
    const theme = getVisualEditorThemeTokens();

    return new Konva.Rect({
        x: 3,
        y: 0,
        width: REGULAR_BLOCK_SIZE.width - 6,
        height: 4,
        cornerRadius: [10, 10, 0, 0],
        fill: theme.nodeAccent,
        perfectDrawEnabled: false
    });
}

function createDescriptionText(data: StateData): Konva.Text {
    const theme = getVisualEditorThemeTokens();

    return new Konva.Text({
        text: getStateBlockDescription(data),
        x: 10,
        y: 36,
        width: REGULAR_BLOCK_SIZE.width - 20,
        height: 52,
        fontSize: 11,
        fontFamily: 'Inter, system-ui, sans-serif',
        fill: theme.nodeText,
        lineHeight: 1.35,
        wrap: 'word',
        ellipsis: true,
        perfectDrawEnabled: false
    });
}

function createGroup(data: StateData): Konva.Group {
    return new Konva.Group({
        id: data.id,
        name: `state-${data.id}`,
        draggable: true
    });
}

function createRect(): Konva.Rect {
    const theme = getVisualEditorThemeTokens();

    return new Konva.Rect({
        width: REGULAR_BLOCK_SIZE.width,
        height: REGULAR_BLOCK_SIZE.height,
        fill: theme.nodeFill,
        stroke: theme.nodeBorder,
        strokeWidth: 1.5,
        cornerRadius: 12,
        shadowBlur: 10,
        shadowColor: 'rgba(15, 23, 42, 0.12)',
        shadowOffset: { x: 0, y: 4 },
        perfectDrawEnabled: false
    });
}

function createTitleText(data: StateData): Konva.Text {
    const theme = getVisualEditorThemeTokens();

    return new Konva.Text({
        text: data.id,
        x: 10,
        y: 14,
        width: REGULAR_BLOCK_SIZE.width - 20,
        fontSize: 13,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontStyle: 'bold',
        fill: theme.nodeTitle,
        perfectDrawEnabled: false
    });
}

function getStateBlockDescription(data: StateData): string {
    return data.description || 'No description';
}

function resolveStateBlockStroke(isSelected: boolean, isConnectionTarget: boolean): string {
    const theme = getVisualEditorThemeTokens();

    if (isConnectionTarget) {
        return theme.nodeTargetBorder;
    }

    return isSelected ? theme.nodeSelectedBorder : theme.nodeBorder;
}
