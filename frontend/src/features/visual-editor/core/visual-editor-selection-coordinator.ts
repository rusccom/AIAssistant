import { StateBlock } from '../blocks/state-block';
import { PropertiesPanelController } from '../ui/properties-panel';
import type { Connection, ProviderKind, StateData } from '../types/editor-types';
import { clearStateSelection, setSelectedState } from './visual-editor-state-helpers';

type StateBlockMap = Map<string, StateBlock>;

interface OpenEditorOptions {
    openEditor: (state: StateData, isGeminiProvider: boolean) => void;
    provider: ProviderKind;
    stateId: string;
    states: StateBlockMap;
}

export class VisualEditorSelectionCoordinator {
    private selectedStateId: string | null = null;

    public constructor(private readonly propertiesPanel: PropertiesPanelController) {}

    public clearAfterCanvasReset(): void {
        this.selectedStateId = null;
        this.propertiesPanel.renderEmpty();
    }

    public clearSelection(states: StateBlockMap): void {
        this.selectedStateId = clearStateSelection(states, this.selectedStateId);
        this.propertiesPanel.renderEmpty();
    }

    public getSelectedState(states: StateBlockMap): StateBlock | undefined {
        return this.selectedStateId ? states.get(this.selectedStateId) : undefined;
    }

    public getSelectedStateId(): string | null {
        return this.selectedStateId;
    }

    public handleStateRemoval(
        stateId: string,
        states: StateBlockMap,
        connections: Connection[]
    ): void {
        if (this.selectedStateId === stateId) {
            this.selectedStateId = null;
        }

        this.refreshPropertiesPanel(states, connections);
    }

    public openStateEditor(options: OpenEditorOptions): void {
        const block = options.states.get(options.stateId);
        if (!block) {
            return;
        }

        this.selectedStateId = options.stateId;
        options.openEditor(block.data, options.provider === 'gemini');
    }

    public refreshPropertiesPanel(
        states: StateBlockMap,
        connections: Connection[]
    ): void {
        const block = this.getSelectedState(states);
        if (!block) {
            this.propertiesPanel.renderEmpty();
            return;
        }

        this.propertiesPanel.render(
            block.data,
            connections.filter((connection) => connection.from === block.id),
            connections.filter((connection) => connection.to === block.id)
        );
    }

    public selectState(
        stateId: string,
        states: StateBlockMap,
        connections: Connection[]
    ): void {
        this.selectedStateId = setSelectedState(states, this.selectedStateId, stateId);
        this.refreshPropertiesPanel(states, connections);
    }

    public updateSelectedStateId(nextStateId: string): void {
        this.selectedStateId = nextStateId;
    }
}
