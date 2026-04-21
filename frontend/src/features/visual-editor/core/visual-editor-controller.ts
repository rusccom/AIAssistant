import { ROUTES } from '../../../utils/constants';
import { showError, showSuccess } from '../../../utils/error-handler';
import { StateBlock } from '../blocks/state-block';
import { ConnectionManager } from '../canvas/connection-manager';
import { EditorCanvas } from '../canvas/editor-canvas';
import { buildFileExportRecord, downloadJson, isFileExportRecord } from '../services/editor-serializer';
import { openJsonFile, requestBotConfig, requestDomains, requestGeneratedState, saveDomainStates } from '../services/visual-editor-workflow';
import { AiAssistModalController } from '../ui/ai-assist-modal';
import { ContextMenuController } from '../ui/context-menu';
import { EditStateModalController } from '../ui/edit-state-modal';
import { PropertiesPanelController } from '../ui/properties-panel';
import { startConnectionMode, type ConnectionModeSession } from './connection-mode';
import { buildStateData, createDomainSnapshot, fillDomainOptions, getNextStateCounter, normalizeGeneratedState, updateHeaderState } from './visual-editor-support';
import { getVisibleViewport } from '../utils/state-position';
import type { Connection, ConnectableBlock, EditorElements, EditStateFormValue, ProviderKind, StateData, SpecialStateId } from '../types/editor-types';
export class VisualEditorController {
    private readonly canvas: EditorCanvas;
    private readonly connections: ConnectionManager;
    private readonly contextMenu: ContextMenuController;
    private readonly editModal: EditStateModalController;
    private readonly aiAssistModal: AiAssistModalController;
    private readonly propertiesPanel: PropertiesPanelController;
    private readonly states = new Map<string, StateBlock>();
    private activeConnectionSession?: ConnectionModeSession;
    private nextStateOffsetIndex = 0;
    private selectedDomain: string | null = null;
    private selectedProvider: ProviderKind = 'openai';
    private selectedStateId: string | null = null;
    private stateCounter = 1;
    public constructor(private readonly elements: EditorElements) {
        this.canvas = new EditorCanvas(elements.canvas, {
            onContextMenu: (event, stateId) => this.showContextMenu(event, stateId),
            onViewportChange: () => this.connections.redraw()
        });
        this.connections = new ConnectionManager((stateId) => this.resolveBlock(stateId));
        this.connections.attachLayer(this.canvas.edgesLayer);
        this.contextMenu = new ContextMenuController(elements.contextMenu, { onAction: (action, stateId) => this.handleContextAction(action, stateId) });
        this.editModal = new EditStateModalController(elements.editModal, { onOpenAiAssist: () => this.aiAssistModal.open(), onSave: (value) => this.saveEditedState(value) });
        this.aiAssistModal = new AiAssistModalController(elements.aiAssistModal, { onGenerate: (prompt) => this.generateStateByPrompt(prompt) });
        this.propertiesPanel = new PropertiesPanelController(elements.propertiesPanel, {
            onDeleteConnection: (from, to) => this.deleteConnection(from, to),
            onEditState: (stateId) => this.openStateEditor(stateId),
            onStartConnection: (stateId) => this.startConnectionCreation(stateId),
            onUpdateCondition: (from, to, condition) => this.connections.updateCondition(from, to, condition)
        });
    }
    public async initialize(): Promise<void> {
        this.bindPageEvents();
        this.canvas.renderSpecialBlocks();
        this.refreshHeader();
        await this.loadDomains();
    }
    private addState(patch: Partial<StateData> = {}): void {
        const viewport = getVisibleViewport(this.elements.canvas.wrapper, this.canvas.getZoom());
        const stateData = buildStateData(patch, this.stateCounter, this.nextStateOffsetIndex++, viewport);
        const block = new StateBlock(stateData, this.canvas.stage, this.canvas.blocksLayer, {
            onSelect: (stateId) => this.selectState(stateId),
            onEdit: (stateId) => this.openStateEditor(stateId),
            onContextMenu: (event, stateId) => this.showContextMenu(event, stateId),
            onDragModeChange: (enabled) => this.setDragMode(enabled),
            onBlockMove: (stateId) => this.connections.redrawForBlock(stateId),
            onBlockDragEnd: () => this.connections.redraw()
        });
        this.states.set(stateData.id, block);
        this.stateCounter = getNextStateCounter(this.stateCounter, stateData.id);
        this.canvas.stage.draw();
    }
    private applyConnections(connections: Connection[]): void { this.connections.setConnections(connections.filter((connection) => this.canCreateConnection(connection.from, connection.to))); }
    private applyFilePayload(payload: unknown): void {
        if (!isFileExportRecord(payload)) {
            showError('Error loading file: Invalid JSON format');
            return;
        }
        this.clearCanvas();
        payload.states.forEach((state) => this.addState(state));
        this.applyConnections(payload.connections);
        this.applyStartConnection(payload.editorSettings.startConnection);
        this.canvas.setZoom(payload.editorSettings.zoom);
    }
    private applyStartConnection(targetId?: string | null): void {
        if (targetId && (this.states.has(targetId) || targetId === 'end')) {
            this.connections.connect('start', targetId);
        }
    }
    private bindPageEvents(): void {
        this.elements.header.addStateButton.addEventListener('click', () => this.addState());
        this.elements.header.saveButton.addEventListener('click', () => void this.saveStates());
        this.elements.header.loadButton.addEventListener('click', () => void this.importStatesFromFile());
        this.elements.header.clearButton.addEventListener('click', () => this.clearCanvas());
        this.elements.header.backButton.addEventListener('click', () => this.navigateToSettings());
        this.elements.header.domainSelect.addEventListener('change', () => void this.handleDomainChange());
        this.elements.canvas.zoomInButton.addEventListener('click', () => this.canvas.zoomIn());
        this.elements.canvas.zoomOutButton.addEventListener('click', () => this.canvas.zoomOut());
        this.elements.canvas.zoomResetButton.addEventListener('click', () => this.canvas.resetZoom());
        document.addEventListener('keydown', (event) => this.handleKeyDown(event));
    }
    private canCreateConnection(fromId: string, toId: string): boolean { return fromId !== toId && fromId !== 'end' && toId !== 'start' && !this.connections.has(fromId, toId); }
    private canUseStateId(nextId: string, currentId?: string): boolean { return !this.states.has(nextId) || nextId === currentId; }
    private clearCanvas(): void {
        this.activeConnectionSession?.cancel();
        this.connections.clear();
        this.states.forEach((block) => block.destroy());
        this.states.clear();
        this.selectedStateId = null;
        this.propertiesPanel.renderEmpty();
        this.canvas.renderSpecialBlocks();
    }
    private clearSelection(): void {
        if (this.selectedStateId) this.states.get(this.selectedStateId)?.setSelected(false);
        this.selectedStateId = null;
        this.propertiesPanel.renderEmpty();
    }
    private clearTargetHighlights(): void {
        this.states.forEach((block) => block.setConnectionTarget(false));
        this.canvas.getSpecialBlock('start')?.setHighlighted(false);
        this.canvas.getSpecialBlock('end')?.setHighlighted(false);
    }
    private createConnection(from: string, to: string): void {
        if (from === 'start') this.connections.removeAllFrom('start');
        this.connections.connect(from, to);
        this.connections.redraw();
        this.refreshPropertiesPanel();
    }
    private deleteConnection(from: string, to: string): void {
        if (!window.confirm(`Delete connection from "${from}" to "${to}"?`)) return;
        this.connections.remove(from, to);
        this.refreshPropertiesPanel();
    }
    private async generateStateByPrompt(prompt: string): Promise<void> {
        const content = await requestGeneratedState(prompt, this.getRegularStateData());
        this.editModal.applyGeneratedContent(normalizeGeneratedState(this.stateCounter, content));
    }
    private getRegularStateData(): StateData[] { return Array.from(this.states.values(), (block) => block.data); }
    private async handleDomainChange(): Promise<void> {
        this.selectedDomain = this.elements.header.domainSelect.value || null;
        this.refreshHeader();
        if (!this.selectedDomain) return void this.clearCanvas();
        await this.loadDomainConfiguration(this.selectedDomain);
    }
    private handleContextAction(action: string, stateId: string): void {
        if (action === 'create-connection') this.startConnectionCreation(stateId);
        if (action === 'edit-state') this.openStateEditor(stateId);
        if (action === 'delete-state') this.removeState(stateId);
    }
    private handleKeyDown(event: KeyboardEvent): void {
        if (event.key === 'Escape') this.clearSelection();
        if (event.key === 'Delete' && this.selectedStateId) this.removeState(this.selectedStateId);
    }
    private highlightConnectionTargets(fromId: string): void {
        this.states.forEach((block, stateId) => block.setConnectionTarget(stateId !== fromId));
        this.canvas.getSpecialBlock('end')?.setHighlighted(fromId !== 'end');
        this.canvas.getSpecialBlock('start')?.setHighlighted(false);
    }
    private async importStatesFromFile(): Promise<void> {
        const payload = await openJsonFile();
        if (payload) this.applyFilePayload(payload);
    }
    private async loadDomainConfiguration(domain: string): Promise<void> {
        try {
            const snapshot = createDomainSnapshot(await requestBotConfig(domain));
            this.selectedProvider = snapshot.provider;
            this.clearCanvas();
            snapshot.states.forEach((state) => this.addState(state));
            this.applyConnections(snapshot.connections);
            this.applyStartConnection(snapshot.startConnection);
            if (typeof snapshot.zoom === 'number') this.canvas.setZoom(snapshot.zoom);
        } catch (error) {
            console.error('Error loading states from domain', error);
            showError(`Could not load configuration for ${domain}.`);
        }
    }
    private async loadDomains(): Promise<void> {
        try {
            const domains = await requestDomains();
            fillDomainOptions(this.elements.header.domainSelect, domains);
            const domainFromUrl = new URLSearchParams(window.location.search).get('domain');
            if (!domainFromUrl || !domains.some((domain) => domain.hostname === domainFromUrl)) return;
            this.elements.header.domainSelect.value = domainFromUrl;
            await this.handleDomainChange();
        } catch (error) {
            console.error('Failed to load domains', error);
        }
    }
    private navigateToSettings(): void {
        const target = this.selectedDomain
            ? `${ROUTES.BOT_SETTINGS}?domain=${encodeURIComponent(this.selectedDomain)}`
            : ROUTES.BOT_SETTINGS;
        window.location.href = target;
    }
    private openStateEditor(stateId: string): void {
        const block = this.states.get(stateId);
        if (!block) return;
        this.selectedStateId = stateId;
        this.editModal.open(block.data, this.selectedProvider === 'gemini');
    }
    private refreshHeader(): void { updateHeaderState(this.elements.header.title, this.elements.header.saveButton, this.selectedDomain); }
    private refreshPropertiesPanel(): void {
        const block = this.selectedStateId ? this.states.get(this.selectedStateId) : undefined;
        if (!block) return void this.propertiesPanel.renderEmpty();
        const all = this.connections.getAll();
        this.propertiesPanel.render(
            block.data,
            all.filter((connection) => connection.from === block.id),
            all.filter((connection) => connection.to === block.id)
        );
    }
    private removeState(stateId: string): void {
        const block = this.states.get(stateId);
        if (!block) return;
        this.connections.removeAll(stateId);
        block.destroy();
        this.states.delete(stateId);
        if (this.selectedStateId === stateId) this.selectedStateId = null;
        this.refreshPropertiesPanel();
    }
    private resolveBlock(stateId: string): ConnectableBlock | undefined { return this.states.get(stateId) || (stateId === 'start' || stateId === 'end' ? this.canvas.getSpecialBlock(stateId) : undefined); }
    private async saveStates(): Promise<void> {
        if (!this.selectedDomain) {
            return void downloadJson('conversation-states.json', buildFileExportRecord(this.canvas.getZoom(), this.getRegularStateData(), this.connections.getAll()));
        }
        try {
            await saveDomainStates(
                this.selectedDomain,
                this.canvas.getZoom(),
                this.getRegularStateData(),
                this.connections.getAll()
            );
            showSuccess('States and editor settings saved successfully to database!');
        } catch (error) {
            console.error('Error saving states', error);
            showError('Failed to save states to database.');
        }
    }
    private saveEditedState(value: EditStateFormValue): void {
        const current = this.selectedStateId ? this.states.get(this.selectedStateId) : undefined;
        if (!current) return;
        if (!value.id || !this.canUseStateId(value.id, current.id)) return void showError('State ID must be unique.');
        const previousId = current.id;
        current.updateData({ ...value });
        if (previousId !== value.id) {
            this.states.delete(previousId);
            this.states.set(value.id, current);
            this.connections.updateStateId(previousId, value.id);
            this.selectedStateId = value.id;
        }
        this.editModal.close();
        this.refreshPropertiesPanel();
    }
    private selectState(stateId: string): void {
        if (this.selectedStateId) this.states.get(this.selectedStateId)?.setSelected(false);
        this.selectedStateId = stateId;
        this.states.get(stateId)?.setSelected(true);
        this.refreshPropertiesPanel();
    }
    private setBlocksDraggable(draggable: boolean): void { this.states.forEach((block) => block.setDraggable(draggable)); }
    private setDragMode(enabled: boolean): void {
        const hideDescriptions = enabled && this.states.size > 15;
        this.states.forEach((block) => block.setDescriptionVisible(!hideDescriptions));
    }
    private showContextMenu(event: MouseEvent, stateId: string | SpecialStateId): void { this.contextMenu.show(event, stateId); }
    private startConnectionCreation(fromId: string): void {
        this.activeConnectionSession?.cancel();
        this.activeConnectionSession = startConnectionMode({
            stage: this.canvas.stage,
            fromId,
            canConnect: (source, target) => this.canCreateConnection(source, target),
            onConnect: (source, target) => this.createConnection(source, target),
            onInvalidTarget: () => showError('Cannot create this connection'),
            highlightTargets: (source) => this.highlightConnectionTargets(source),
            clearHighlights: () => this.clearTargetHighlights(),
            setBlocksDraggable: (draggable) => this.setBlocksDraggable(draggable),
            setStatusVisible: (visible) => visible ? this.canvas.showConnectionStatus() : this.canvas.hideConnectionStatus()
        });
    }
}
