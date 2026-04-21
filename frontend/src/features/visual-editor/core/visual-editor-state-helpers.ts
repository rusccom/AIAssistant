import { StateBlock } from '../blocks/state-block';
import type { StateData } from '../types/editor-types';

type StateBlockMap = Map<string, StateBlock>;

export function canUseEditorStateId(
    states: StateBlockMap,
    nextId: string,
    currentId?: string
): boolean {
    return !states.has(nextId) || nextId === currentId;
}

export function clearStateSelection(
    states: StateBlockMap,
    selectedStateId: string | null
): string | null {
    return setSelectedState(states, selectedStateId, null);
}

export function collectRegularStateData(states: StateBlockMap): StateData[] {
    return Array.from(states.values(), (block) => block.data);
}

export function destroyStateBlocks(states: StateBlockMap): void {
    states.forEach((block) => block.destroy());
    states.clear();
}

export function highlightConnectionTargets(
    states: StateBlockMap,
    fromId: string
): void {
    states.forEach((block, stateId) => block.setConnectionTarget(stateId !== fromId));
}

export function resetConnectionTargets(states: StateBlockMap): void {
    states.forEach((block) => block.setConnectionTarget(false));
}

export function setBlocksDescriptionVisible(
    states: StateBlockMap,
    visible: boolean
): void {
    states.forEach((block) => block.setDescriptionVisible(visible));
}

export function setBlocksDraggable(states: StateBlockMap, draggable: boolean): void {
    states.forEach((block) => block.setDraggable(draggable));
}

export function setSelectedState(
    states: StateBlockMap,
    currentSelectedId: string | null,
    nextSelectedId: string | null
): string | null {
    if (currentSelectedId) {
        states.get(currentSelectedId)?.setSelected(false);
    }

    if (nextSelectedId) {
        states.get(nextSelectedId)?.setSelected(true);
    }

    return nextSelectedId;
}
