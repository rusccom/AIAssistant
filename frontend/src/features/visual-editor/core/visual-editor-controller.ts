import { ROUTES } from '../../../utils/constants';
import { showError } from '../../../utils/error-handler';
import { StateBlock } from '../blocks/state-block';
import { EditorCanvas } from '../canvas/editor-canvas';
import {
    importVisualEditorSnapshot,
    initializeVisualEditorDomains,
    loadVisualEditorDomainSnapshot,
    saveVisualEditorSnapshot
} from '../services/visual-editor-page-coordinator';
import { requestGeneratedState } from '../services/visual-editor-workflow';
import { AiAssistModalController } from '../ui/ai-assist-modal';
import { ContextMenuController } from '../ui/context-menu';
import { EditStateModalController } from '../ui/edit-state-modal';
import { PropertiesPanelController } from '../ui/properties-panel';
import { VisualEditorConnectionCoordinator } from './visual-editor-connection-coordinator';
import { bindVisualEditorPageEvents } from './visual-editor-page-events';
import { VisualEditorSelectionCoordinator } from './visual-editor-selection-coordinator';
import {
    canUseEditorStateId,
    collectRegularStateData,
    destroyStateBlocks,
    setBlocksDescriptionVisible,
} from './visual-editor-state-helpers';
import { buildStateData, getNextStateCounter, normalizeGeneratedState, updateHeaderState } from './visual-editor-support';
import { getVisibleViewport } from '../utils/state-position';
import type { Connection, ConnectableBlock, EditorElements, EditStateFormValue, ProviderKind, StateData, SpecialStateId } from '../types/editor-types';
export class VisualEditorController {
    private readonly canvas: EditorCanvas;
    private readonly connectionFlow: VisualEditorConnectionCoordinator;
    private readonly contextMenu: ContextMenuController;
    private readonly editModal: EditStateModalController;
    private readonly aiAssistModal: AiAssistModalController;
    private readonly propertiesPanel: PropertiesPanelController;
    private readonly selection: VisualEditorSelectionCoordinator;
    private readonly states = new Map<string, StateBlock>();
    private nextStateOffsetIndex = 0;
    private selectedDomain: string | null = null;
    private selectedProvider: ProviderKind = 'openai';
    private stateCounter = 1;
    public constructor(private readonly elements: EditorElements) {
        let connectionFlow: VisualEditorConnectionCoordinator | undefined;

        this.canvas = new EditorCanvas(elements.canvas, {
            onContextMenu: (event, stateId) => this.showContextMenu(event, stateId),
            onViewportChange: () => connectionFlow?.redraw()
        });
        this.contextMenu = new ContextMenuController(elements.contextMenu, { onAction: (action, stateId) => this.handleContextAction(action, stateId) });
        this.editModal = new EditStateModalController(elements.editModal, { onOpenAiAssist: () => this.aiAssistModal.open(), onSave: (value) => this.saveEditedState(value) });
        this.aiAssistModal = new AiAssistModalController(elements.aiAssistModal, { onGenerate: (prompt) => this.generateStateByPrompt(prompt) });
        this.propertiesPanel = new PropertiesPanelController(elements.propertiesPanel, {
            onDeleteConnection: (from, to) => this.connectionFlow.deleteConnection(from, to),
            onEditState: (stateId) => this.openStateEditor(stateId),
            onStartConnection: (stateId) => this.connectionFlow.startConnectionCreation(stateId),
            onUpdateCondition: (from, to, condition) => this.connectionFlow.updateCondition(from, to, condition)
        });
        this.selection = new VisualEditorSelectionCoordinator(this.propertiesPanel);
        connectionFlow = new VisualEditorConnectionCoordinator({
            canvas: this.canvas,
            confirmDeleteConnection: (from, to) => window.confirm(`Delete connection from "${from}" to "${to}"?`),
            onConnectionsChanged: () => {
                if (!connectionFlow) {
                    return;
                }

                this.selection.refreshPropertiesPanel(this.states, connectionFlow.getAll());
            },
            onInvalidConnection: () => showError('Cannot create this connection'),
            resolveBlock: (stateId) => this.resolveBlock(stateId),
            states: this.states
        });
        this.connectionFlow = connectionFlow;
    }
    public async initialize(): Promise<void> {
        this.bindPageEvents();
        this.canvas.renderSpecialBlocks();
        this.refreshHeader();
        const domainFromUrl = await initializeVisualEditorDomains(this.elements.header.domainSelect);
        if (domainFromUrl) {
            await this.handleDomainChange();
        }
    }

    public refreshTheme(): void {
        this.states.forEach((block) => block.refreshTheme());
        this.canvas.refreshTheme();
        this.connectionFlow.redraw();
        this.selection.refreshPropertiesPanel(this.states, this.connectionFlow.getAll());
    }

    private addState(patch: Partial<StateData> = {}): void {
        const viewport = getVisibleViewport(this.elements.canvas.wrapper, this.canvas.getZoom());
        const stateData = buildStateData(patch, this.stateCounter, this.nextStateOffsetIndex++, viewport);
        const block = new StateBlock(stateData, this.canvas.stage, this.canvas.blocksLayer, {
            onSelect: (stateId) => this.selectState(stateId),
            onEdit: (stateId) => this.openStateEditor(stateId),
            onContextMenu: (event, stateId) => this.showContextMenu(event, stateId),
            onDragModeChange: (enabled) => this.setDragMode(enabled),
            onBlockMove: (stateId) => this.connectionFlow.redrawForBlock(stateId),
            onBlockDragEnd: () => this.connectionFlow.redraw()
        });
        this.states.set(stateData.id, block);
        this.stateCounter = getNextStateCounter(this.stateCounter, stateData.id);
        block.refreshTheme();
        this.canvas.stage.draw();
    }
    private bindPageEvents(): void {
        bindVisualEditorPageEvents(this.elements, {
            onAddState: () => this.addState(),
            onBack: () => this.navigateToSettings(),
            onClear: () => this.clearCanvas(),
            onDomainChange: () => this.handleDomainChange(),
            onKeyDown: (event) => this.handleKeyDown(event),
            onLoad: () => this.importStatesFromFile(),
            onSave: () => this.saveStates(),
            onZoomIn: () => this.canvas.zoomIn(),
            onZoomOut: () => this.canvas.zoomOut(),
            onZoomReset: () => this.canvas.resetZoom()
        });
    }
    private clearCanvas(): void {
        this.connectionFlow.clear();
        destroyStateBlocks(this.states);
        this.selection.clearAfterCanvasReset();
        this.canvas.renderSpecialBlocks();
    }
    private clearSelection(): void {
        this.selection.clearSelection(this.states);
    }
    private async generateStateByPrompt(prompt: string): Promise<void> {
        const content = await requestGeneratedState(prompt, collectRegularStateData(this.states));
        this.editModal.applyGeneratedContent(normalizeGeneratedState(this.stateCounter, content));
    }
    private async handleDomainChange(): Promise<void> {
        this.selectedDomain = this.elements.header.domainSelect.value || null;
        this.refreshHeader();
        if (!this.selectedDomain) return void this.clearCanvas();
        await loadVisualEditorDomainSnapshot(this.selectedDomain, this.getSceneActions());
    }
    private handleContextAction(action: string, stateId: string): void {
        if (action === 'create-connection') this.connectionFlow.startConnectionCreation(stateId);
        if (action === 'edit-state') this.openStateEditor(stateId);
        if (action === 'delete-state') this.removeState(stateId);
    }
    private handleKeyDown(event: KeyboardEvent): void {
        if (event.key === 'Escape') this.clearSelection();
        const selectedStateId = this.selection.getSelectedStateId();
        if (event.key === 'Delete' && selectedStateId) this.removeState(selectedStateId);
    }
    private async importStatesFromFile(): Promise<void> {
        await importVisualEditorSnapshot(this.getSceneActions());
    }
    private navigateToSettings(): void {
        const target = this.selectedDomain
            ? `${ROUTES.BOT_SETTINGS}?domain=${encodeURIComponent(this.selectedDomain)}`
            : ROUTES.BOT_SETTINGS;
        window.location.href = target;
    }
    private openStateEditor(stateId: string): void {
        this.selection.openStateEditor({
            openEditor: (state, isGeminiProvider) => this.editModal.open(state, isGeminiProvider),
            provider: this.selectedProvider,
            stateId,
            states: this.states
        });
    }
    private refreshHeader(): void { updateHeaderState(this.elements.header.title, this.elements.header.saveButton, this.selectedDomain); }
    private removeState(stateId: string): void {
        const block = this.states.get(stateId);
        if (!block) return;
        this.connectionFlow.removeAllForState(stateId);
        block.destroy();
        this.states.delete(stateId);
        this.selection.handleStateRemoval(stateId, this.states, this.connectionFlow.getAll());
    }
    private resolveBlock(stateId: string): ConnectableBlock | undefined { return this.states.get(stateId) || (stateId === 'start' || stateId === 'end' ? this.canvas.getSpecialBlock(stateId) : undefined); }
    private async saveStates(): Promise<void> {
        await saveVisualEditorSnapshot(
            this.selectedDomain,
            this.canvas.getZoom(),
            collectRegularStateData(this.states),
            this.connectionFlow.getAll()
        );
    }
    private saveEditedState(value: EditStateFormValue): void {
        const current = this.selection.getSelectedState(this.states);
        if (!current) return;
        if (!value.id || !canUseEditorStateId(this.states, value.id, current.id)) return void showError('State ID must be unique.');
        const previousId = current.id;
        current.updateData({ ...value });
        if (previousId !== value.id) {
            this.states.delete(previousId);
            this.states.set(value.id, current);
            this.connectionFlow.updateStateId(previousId, value.id);
            this.selection.updateSelectedStateId(value.id);
        }
        this.editModal.close();
        this.selection.refreshPropertiesPanel(this.states, this.connectionFlow.getAll());
    }
    private selectState(stateId: string): void {
        this.selection.selectState(stateId, this.states, this.connectionFlow.getAll());
    }
    private setDragMode(enabled: boolean): void {
        const hideDescriptions = enabled && this.states.size > 15;
        setBlocksDescriptionVisible(this.states, !hideDescriptions);
    }
    private setProvider(provider: ProviderKind): void {
        this.selectedProvider = provider;
    }
    private showContextMenu(event: MouseEvent, stateId: string | SpecialStateId): void { this.contextMenu.show(event, stateId); }
    private getSceneActions() {
        return {
            addState: (state: StateData) => this.addState(state),
            applyConnections: (connections: Connection[]) => this.connectionFlow.applyConnections(connections),
            applyStartConnection: (targetId?: string | null) => this.connectionFlow.applyStartConnection(targetId),
            clearCanvas: () => this.clearCanvas(),
            setProvider: (provider: ProviderKind) => this.setProvider(provider),
            setZoom: (zoom: number) => this.canvas.setZoom(zoom)
        };
    }
}
