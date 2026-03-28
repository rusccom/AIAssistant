// Visual State Editor - Refactored TypeScript Entry Point
import './visual-editor/visual-editor.css';
import { initSimpleFouc } from './utils/simple-fouc';
import { initNavigation } from './utils/navigation';
import { protectPage } from './utils/auth';

// Минимальный импорт для безопасных изменений
import { showError, showSuccess } from './utils/error-handler';
import { ROUTES } from './utils/constants';
import Konva from 'konva';
import { Point, StateData, Connection, EditorSettings } from './visual-editor/types';
import { SpecialBlock } from './visual-editor/components/SpecialBlock';
import { StateBlock } from './visual-editor/components/StateBlock';
import { ConnectionManager } from './visual-editor/managers/ConnectionManager';
import { createKonvaStage, createBasicLayers } from './visual-editor/utils/konva-utils';

// Protect this page - only authenticated users can access
protectPage();

// Упрощенный VisualEditor класс
class VisualEditor {
    private states: Map<string, StateBlock> = new Map();
    public connections!: ConnectionManager;
    private selectedState: StateBlock | null = null;
    private canvasContainer!: HTMLElement;
    private canvasWrapper!: HTMLElement;
    public stage!: Konva.Stage;
    public blocksLayer!: Konva.Layer;
    public edgesLayer!: Konva.Layer;
    private contextMenu!: HTMLElement;
    private editModal!: HTMLElement;
    private domainSelect!: HTMLSelectElement;
    public zoom: number = 1;
    private specialStart?: SpecialBlock;
    private specialEnd?: SpecialBlock;
    private stateCounter: number = 1;
    private isDragMode: boolean = false;
    private selectedDomain: string | null = null;
    private selectedProvider: string = 'openai';
    private newBlockOffsetIndex: number = 0;
    private readonly newBlockOffsetStep: number = 32;
    private readonly newBlockOffsetCycle: number = 8;

    constructor() {
        this.initializeElements();
        this.initializeKonva();
        this.initializeManagers();
        this.setupEventListeners();
        this.renderSpecialBlocks();
    }

    private initializeElements(): void {
        this.canvasContainer = document.getElementById('canvas-content') as HTMLElement;
        this.canvasWrapper = this.canvasContainer.parentElement as HTMLElement;
        this.contextMenu = document.getElementById('context-menu')!;
        this.editModal = document.getElementById('edit-state-modal')!;
        this.domainSelect = document.getElementById('domain-select') as HTMLSelectElement;
    }

    private initializeKonva(): void {
        const konvaHost = document.getElementById('konva-container') as HTMLDivElement;
        this.stage = createKonvaStage(konvaHost, this.canvasWrapper.clientWidth, this.canvasWrapper.clientHeight);
        
        const { blocksLayer, edgesLayer } = createBasicLayers();
        this.blocksLayer = blocksLayer;
        this.edgesLayer = edgesLayer;
        
        this.stage.add(this.edgesLayer);
        this.stage.add(this.blocksLayer);
        this.stage.draw();
    }

    private initializeManagers(): void {
        const canvas = document.createElement('canvas');
        this.connections = new ConnectionManager(canvas);
        this.connections.setEdgesLayer(this.edgesLayer);
    }

    private setupEventListeners(): void {
        // Основные кнопки
        document.getElementById('add-state-btn')?.addEventListener('click', () => this.addState());
        document.getElementById('save-states-btn')?.addEventListener('click', () => this.saveStates());
        document.getElementById('clear-canvas-btn')?.addEventListener('click', () => this.clearCanvas());
        document.getElementById('back-to-settings-btn')?.addEventListener('click', () => this.backToSettings());
        
        // Zoom controls
        document.getElementById('zoom-in-btn')?.addEventListener('click', () => this.zoomIn());
        document.getElementById('zoom-out-btn')?.addEventListener('click', () => this.zoomOut());
        document.getElementById('zoom-reset-btn')?.addEventListener('click', () => this.resetZoom());
        
        // Модальные окна
        this.setupModalEventListeners();
        
        // Загружаем домены
        this.loadDomains();
        
        // Добавляем кнопку загрузки состояний
        this.setupImportButton();
        
        // Устанавливаем начальный текст кнопки сохранения
        this.updateSaveButtonText();
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' && this.selectedState) {
                this.removeState(this.selectedState.id);
            }
            if (e.key === 'Escape') {
                this.clearSelection();
            }
        });

        // Canvas resize observer
        if (typeof ResizeObserver !== 'undefined') {
            const ro = new ResizeObserver(() => {
                this.syncCanvasSize();
                this.renderSpecialBlocks();
                this.connections.redrawConnections();
            });
            ro.observe(this.canvasWrapper);
        }

        // Scroll handler for special blocks
        this.canvasWrapper.addEventListener('scroll', () => {
            this.updateKonvaPosition();
            this.renderSpecialBlocks();
            this.connections.redrawConnections();
        });
    }

    private renderSpecialBlocks(): void {
        const margin = 16;
        const visibleLeft = this.canvasWrapper.scrollLeft;
        const visibleTop = this.canvasWrapper.scrollTop;
        const visibleRight = visibleLeft + this.canvasWrapper.clientWidth / this.zoom;
        const visibleBottom = visibleTop + this.canvasWrapper.clientHeight / this.zoom;

        // START блок
        const startX = visibleLeft + margin;
        const startY = visibleTop + margin;
        if (!this.specialStart) {
            this.specialStart = new SpecialBlock('start', { x: startX, y: startY }, this.stage, this.blocksLayer);
            this.states.set('start', (this.specialStart as unknown) as StateBlock);
            } else {
            this.specialStart.position = { x: startX, y: startY };
            this.specialStart.updatePosition();
        }

        // END блок
        const endX = visibleRight - 174 - margin;
        const endY = visibleBottom - 100 - margin;
        if (!this.specialEnd) {
            this.specialEnd = new SpecialBlock('end', { x: endX, y: endY }, this.stage, this.blocksLayer);
            this.states.set('end', (this.specialEnd as unknown) as StateBlock);
        } else {
            this.specialEnd.position = { x: endX, y: endY };
            this.specialEnd.updatePosition();
        }

        this.stage.draw();
    }

    addState(data?: Partial<StateData>): StateBlock {
        // Используем переданный ID или генерируем новый
        const stateId = data?.id || `state-${this.stateCounter++}`;
        
        const stateData: StateData = {
            id: stateId,
            description: data?.description || 'New State',
            instructions: data?.instructions || [],
            examples: data?.examples || [],
            reasoningMode: data?.reasoningMode || 'inherit',
            position: data?.position || this.getNextNewBlockPosition(),
            connections: []
        };
        
        const stateBlock = new StateBlock(stateData, this.stage, this.blocksLayer);
        this.states.set(stateId, stateBlock);
        this.stage.draw();

        
        console.log(`✅ Created StateBlock: id="${stateId}" ${data?.id ? '(from data)' : '(generated)'} at position`, stateData.position);
        
        return stateBlock;
    }

    private getNextNewBlockPosition(): Point {
        const visibleLeft = this.canvasWrapper.scrollLeft || 0;
        const visibleTop = this.canvasWrapper.scrollTop || 0;
        const visibleWidth = this.canvasWrapper.clientWidth / this.zoom;
        const visibleHeight = this.canvasWrapper.clientHeight / this.zoom;
        const blockWidth = 174;
        const blockHeight = 100;
        const baseX = Math.floor(visibleLeft + visibleWidth * 0.5 - blockWidth * 0.5);
        const baseY = Math.floor(visibleTop + visibleHeight * 0.5 - blockHeight * 0.5);
        const cycleIndex = this.newBlockOffsetIndex % this.newBlockOffsetCycle;
        const offset = cycleIndex * this.newBlockOffsetStep;
        this.newBlockOffsetIndex += 1;
        return { x: baseX + offset, y: baseY + offset };
    }

    removeState(stateId: string): void {
        if (stateId === 'start' || stateId === 'end') return;

        const state = this.states.get(stateId);
        if (state) {
            this.connections.removeAllConnections(stateId);
            state.destroy();
            this.states.delete(stateId);
            
            if (this.selectedState?.id === stateId) {
                this.selectedState = null;
                // Очищаем панель свойств
                const propertiesPanel = document.getElementById('properties-panel');
                if (propertiesPanel) {
                    propertiesPanel.innerHTML = '<p>Select a state to edit its properties</p>';
                }
            }

        }
    }

    showContextMenu(e: MouseEvent, state: StateBlock | SpecialBlock): void {
        e.preventDefault();
        
        const menu = this.contextMenu;
        menu.style.display = 'block';
        menu.style.left = `${e.clientX}px`;
        menu.style.top = `${e.clientY}px`;
        
        // Настраиваем видимость пунктов меню в зависимости от типа блока
        const createConnectionItem = menu.querySelector('[data-action="create-connection"]') as HTMLElement;
        const editStateItem = menu.querySelector('[data-action="edit-state"]') as HTMLElement;
        const deleteStateItem = menu.querySelector('[data-action="delete-state"]') as HTMLElement;
        
        if (state.id === 'start') {
            // Для START блока показываем только "Create Connection"
            createConnectionItem.style.display = 'block';
            editStateItem.style.display = 'none';
            deleteStateItem.style.display = 'none';
        } else if (state.id === 'end') {
            // Для END блока скрываем все пункты или показываем только просмотр
            createConnectionItem.style.display = 'none';
            editStateItem.style.display = 'none';
            deleteStateItem.style.display = 'none';
        } else {
            // Для обычных блоков показываем все пункты
            createConnectionItem.style.display = 'block';
            editStateItem.style.display = 'block';
            deleteStateItem.style.display = 'block';
        }
        
        // Обработчики событий для пунктов меню
        const handleMenuClick = (e: Event) => {
            e.stopPropagation();
        const target = e.target as HTMLElement;
            const action = target.getAttribute('data-action');
        
        switch (action) {
            case 'create-connection':
                    this.startConnectionCreation(state);
                break;
            case 'edit-state':
                    if (state instanceof StateBlock) {
                this.editState(state);
                    }
                break;
            case 'delete-state':
                    if (state instanceof StateBlock && state.id !== 'start' && state.id !== 'end') {
                        this.removeState(state.id);
                    }
                break;
        }
        
            hideMenu();
        };
        
        // Удаляем старые обработчики и добавляем новые
        menu.removeEventListener('click', handleMenuClick);
        menu.addEventListener('click', handleMenuClick);
        
        // Скрываем меню при клике вне его
        const hideMenu = () => {
            menu.style.display = 'none';
            menu.removeEventListener('click', handleMenuClick);
            document.removeEventListener('click', hideMenu);
        };
        
        setTimeout(() => {
            document.addEventListener('click', hideMenu);
        }, 10);
    }

    startConnectionCreation(fromState: StateBlock | SpecialBlock): void {
        
        // Отключаем перетаскивание для всех блоков во время создания соединения
        this.setBlocksDraggable(false);
        
        // Показываем уведомление в панели управления
        const connectionStatus = document.getElementById('connection-status');
        if (connectionStatus) {
            connectionStatus.style.display = 'block';
        }
        

        
        // Подсвечиваем возможные цели для соединения
        this.highlightValidTargets(fromState.id);
        
        // Добавляем временный обработчик кликов
        const connectionHandler = (e: any) => {
            e.evt?.stopPropagation();
            
            let targetStateId: string | null = null;
            
            // В Konva событии target - это сам элемент
            const konvaTarget = e.target;
            
            // Пробуем найти ID в самом элементе
            if (konvaTarget?.attrs?.id) {
                targetStateId = konvaTarget.attrs.id;
            }
            // Если не нашли, ищем в родителе (Group)
            else if (konvaTarget?.parent?.attrs?.id) {
                targetStateId = konvaTarget.parent.attrs.id;
            }
            // Ищем вверх по иерархии
            else {
                let current = konvaTarget;
                while (current && !targetStateId) {
                    if (current.attrs?.id) {
                        targetStateId = current.attrs.id;
                        break;
                    }
                    current = current.parent;
                }
            }
            
            if (targetStateId && targetStateId !== fromState.id) {
                // Проверяем валидность соединения
                if (this.canCreateConnection(fromState.id, targetStateId)) {
                    this.createConnection(fromState.id, targetStateId);
                } else {
                    showError('Cannot create this connection');
                }
            }
            
            // Убираем подсветку и обработчик, включаем обратно перетаскивание
            this.clearTargetHighlighting();
            this.stage.off('click', connectionHandler);
            this.setBlocksDraggable(true);
            document.removeEventListener('keydown', escapeHandler);
            clearTimeout(timeoutId);
            
            // Скрываем уведомление в панели управления
            const connectionStatus = document.getElementById('connection-status');
            if (connectionStatus) {
                connectionStatus.style.display = 'none';
            }
        };
        
        // Вешаем обработчик на Konva Stage вместо document
        this.stage.on('click', connectionHandler);
        
        // Добавляем возможность отмены по Escape
        const escapeHandler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                this.clearTargetHighlighting();
                this.stage.off('click', connectionHandler);
                this.setBlocksDraggable(true);
                document.removeEventListener('keydown', escapeHandler);
                
                // Скрываем уведомление в панели управления
                const connectionStatus = document.getElementById('connection-status');
                if (connectionStatus) {
                    connectionStatus.style.display = 'none';
                }
            }
        };
        
        document.addEventListener('keydown', escapeHandler);
        
        // Автоматически убираем режим создания соединения через 10 секунд
        const timeoutId = setTimeout(() => {
            this.clearTargetHighlighting();
            this.stage.off('click', connectionHandler);
            this.setBlocksDraggable(true); // Включаем обратно перетаскивание
            document.removeEventListener('keydown', escapeHandler);
            
            // Скрываем уведомление в панели управления
            const connectionStatus = document.getElementById('connection-status');
            if (connectionStatus) {
                connectionStatus.style.display = 'none';
            }
        }, 10000);
    }

    private highlightValidTargets(fromStateId: string): void {
        // Подсвечиваем все состояния кроме исходного
        this.states.forEach((state, stateId) => {
            if (stateId !== fromStateId) {
                if (state instanceof StateBlock) {
                    // Обычные состояния - зеленая подсветка
                    state.konvaRect.stroke('#27ae60');
                    state.konvaRect.strokeWidth(3);
                    // Обновляем кэш если он есть
                    if (state.konvaGroup.isCached()) {
                        state.konvaGroup.clearCache();
                        state.konvaGroup.cache();
                    }
                }
            }
        });
        
        // START блок НЕ подсвечиваем - к нему нельзя подключиться
        // Только END блок может быть целью соединения
        if (this.specialEnd && this.specialEnd.id !== fromStateId) {
            this.specialEnd.konvaRect.stroke('#27ae60');
            this.specialEnd.konvaRect.strokeWidth(3);
        }
        
        this.blocksLayer.batchDraw();
    }

    private clearTargetHighlighting(): void {
        // Убираем подсветку со всех состояний
        this.states.forEach((state, stateId) => {
            if (state instanceof StateBlock) {
                // Обычные состояния - восстанавливаем обычную границу
                state.konvaRect.stroke(state.isSelected ? '#3498db' : '#bdc3c7');
                state.konvaRect.strokeWidth(state.isSelected ? 3 : 2);
                // Обновляем кэш если он есть
                if (state.konvaGroup.isCached()) {
                    state.konvaGroup.clearCache();
                    state.konvaGroup.cache();
                }
            }
        });
        
        // Восстанавливаем специальные блоки отдельно
        if (this.specialStart) {
            this.specialStart.konvaRect.stroke('#28a745');
            this.specialStart.konvaRect.strokeWidth(2);
        }
        
        if (this.specialEnd) {
            this.specialEnd.konvaRect.stroke('#dc3545');
            this.specialEnd.konvaRect.strokeWidth(2);
        }
        
        this.blocksLayer.batchDraw();
    }

    private canCreateConnection(fromId: string, toId: string): boolean {
        // Запрещаем соединения с самим собой
        if (fromId === toId) return false;
        
        // Запрещаем соединения ИЗ end блока
        if (fromId === 'end') return false;
        
        // Запрещаем соединения К start блоку (к нему нельзя подключиться)
        if (toId === 'start') return false;
        
        // Проверяем, нет ли уже такого соединения
        return !this.connections.hasConnection(fromId, toId);
    }

    private createConnection(fromId: string, toId: string): void {
        // Если это соединение от start блока, удаляем предыдущие соединения от start
        if (fromId === 'start') {
            this.connections.removeAllConnectionsFrom(fromId);
        }
        
        // Создаем новое соединение
        const connectionId = `${fromId}-${toId}`;
        const connection: Connection = {
            id: connectionId,
            from: fromId,
            to: toId
        };
        
        this.connections.addConnection(connection);
        this.connections.redrawConnections();
    }

    private setupModalEventListeners(): void {
        // Модальное окно редактирования состояния
        const closeEditModalBtn = document.getElementById('close-edit-modal');
        const cancelEditBtn = document.getElementById('cancel-edit-btn');
        const saveEditBtn = document.getElementById('save-edit-btn');
        
        // Закрытие модального окна
        closeEditModalBtn?.addEventListener('click', () => this.closeEditModal());
        cancelEditBtn?.addEventListener('click', () => this.closeEditModal());
        
        // Сохранение изменений
        saveEditBtn?.addEventListener('click', () => this.saveEditModalChanges());
        
        // AI Assistant модальное окно
        const aiAssistBtn = document.getElementById('ai-assist-btn');
        const closeAiModalBtn = document.getElementById('close-ai-modal');
        const cancelAiBtn = document.getElementById('cancel-ai-btn');
        const generateContentBtn = document.getElementById('generate-content-btn');
        
        aiAssistBtn?.addEventListener('click', () => this.showAiAssistModal());
        closeAiModalBtn?.addEventListener('click', () => this.closeAiAssistModal());
        cancelAiBtn?.addEventListener('click', () => this.closeAiAssistModal());
        generateContentBtn?.addEventListener('click', () => this.generateAiContent());
        
        // Закрытие модальных окон по клику вне их
        this.editModal.addEventListener('click', (e) => {
            if (e.target === this.editModal) {
                this.closeEditModal();
            }
        });
        
        const aiModal = document.getElementById('ai-assist-modal');
        aiModal?.addEventListener('click', (e) => {
            if (e.target === aiModal) {
                this.closeAiAssistModal();
            }
        });
    }

    editState(state: StateBlock): void {
        this.selectedState = state;
        this.showEditModal(state);
    }

    private showEditModal(state: StateBlock): void {
        // Заполняем форму данными состояния
        const stateIdInput = document.getElementById('state-id-input') as HTMLInputElement;
        const stateDescriptionInput = document.getElementById('state-description-input') as HTMLTextAreaElement;
        const stateInstructionsInput = document.getElementById('state-instructions-input') as HTMLTextAreaElement;
        const stateExamplesInput = document.getElementById('state-examples-input') as HTMLTextAreaElement;
        const stateReasoningModeInput = document.getElementById('state-reasoning-mode') as HTMLSelectElement;
        
        if (stateIdInput) stateIdInput.value = state.data.id;
        if (stateDescriptionInput) stateDescriptionInput.value = state.data.description || '';
        if (stateInstructionsInput) stateInstructionsInput.value = state.data.instructions?.join('\n') || '';
        if (stateExamplesInput) stateExamplesInput.value = state.data.examples?.join('\n') || '';
        if (stateReasoningModeInput) stateReasoningModeInput.value = state.data.reasoningMode || 'inherit';
        this.updateReasoningModeVisibility();
        
        // Показываем модальное окно
        this.editModal.style.display = 'block';
    }

    private closeEditModal(): void {
        this.editModal.style.display = 'none';
    }

    private updateReasoningModeVisibility(): void {
        const reasoningGroup = document.getElementById('state-reasoning-group') as HTMLElement | null;
        if (!reasoningGroup) {
            return;
        }

        reasoningGroup.style.display = this.selectedProvider === 'gemini' ? 'block' : 'none';
    }

    private saveEditModalChanges(): void {
        if (!this.selectedState) return;
        
        const stateIdInput = document.getElementById('state-id-input') as HTMLInputElement;
        const stateDescriptionInput = document.getElementById('state-description-input') as HTMLTextAreaElement;
        const stateInstructionsInput = document.getElementById('state-instructions-input') as HTMLTextAreaElement;
        const stateExamplesInput = document.getElementById('state-examples-input') as HTMLTextAreaElement;
        const stateReasoningModeInput = document.getElementById('state-reasoning-mode') as HTMLSelectElement;
        
        const newData: Partial<StateData> = {
            id: stateIdInput?.value || this.selectedState.data.id,
            description: stateDescriptionInput?.value || '',
            instructions: stateInstructionsInput?.value ? stateInstructionsInput.value.split('\n').filter(line => line.trim()) : [],
            examples: stateExamplesInput?.value ? stateExamplesInput.value.split('\n').filter(line => line.trim()) : [],
            reasoningMode: (stateReasoningModeInput?.value as StateData['reasoningMode']) || 'inherit'
        };
        
        // Сохраняем старый ID ПЕРЕД обновлением
        const oldId = this.selectedState.data.id;
        
        // Обновляем состояние
        this.selectedState.updateData(newData);
        
        // Если изменился ID, нужно обновить Map
        if (newData.id && newData.id !== oldId) {
            // ID автоматически синхронизируется через геттер this.data.id
            
            // Обновляем Map состояний
            this.states.delete(oldId);
            this.states.set(newData.id, this.selectedState);
            
            // Обновляем все соединения, которые ссылаются на старый ID
            this.connections.updateStateId(oldId, newData.id);
            
            console.log(`State ID updated: ${oldId} -> ${newData.id}`);
        }

        
        this.closeEditModal();
    }

    private showAiAssistModal(): void {
        const aiModal = document.getElementById('ai-assist-modal');
        if (aiModal) {
            aiModal.style.display = 'block';
        }
    }

    private closeAiAssistModal(): void {
        const aiModal = document.getElementById('ai-assist-modal');
        if (aiModal) {
            aiModal.style.display = 'none';
        }
        
        // Очищаем форму
        const promptInput = document.getElementById('ai-prompt-input') as HTMLTextAreaElement;
        const errorMessage = document.getElementById('ai-error-message') as HTMLElement;
        
        if (promptInput) promptInput.value = '';
        if (errorMessage) errorMessage.style.display = 'none';
    }

    private async generateAiContent(): Promise<void> {
        const promptInput = document.getElementById('ai-prompt-input') as HTMLTextAreaElement;
        const errorMessage = document.getElementById('ai-error-message') as HTMLElement;
        const generateBtn = document.getElementById('generate-content-btn') as HTMLButtonElement;
        
        if (!promptInput?.value.trim()) {
            if (errorMessage) {
                errorMessage.textContent = 'Please enter a description of what this state should do.';
                errorMessage.style.display = 'block';
            }
            return;
        }
        
        // Показываем состояние загрузки
        const originalText = generateBtn.textContent || 'Generate';
        generateBtn.textContent = 'Generating...';
        generateBtn.disabled = true;
        
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                throw new Error('No auth token found');
            }

            // Получаем все существующие состояния для контекста
            const existingStates = Array.from(this.states.entries())
                .filter(([id]) => id !== 'start' && id !== 'end')
                .map(([, state]) => ({
                    id: state.data.id,
                    description: state.data.description,
                    instructions: state.data.instructions,
                    examples: state.data.examples
                }));

            const response = await fetch('/api/ai-assist/generate-state', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userPrompt: promptInput.value.trim(),
                    states: existingStates
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to generate content');
            }

            const generatedContent = await response.json();
            
            // Заполняем форму сгенерированным контентом
            const stateIdInput = document.getElementById('state-id-input') as HTMLInputElement;
            const stateDescriptionInput = document.getElementById('state-description-input') as HTMLTextAreaElement;
            const stateInstructionsInput = document.getElementById('state-instructions-input') as HTMLTextAreaElement;
            const stateExamplesInput = document.getElementById('state-examples-input') as HTMLTextAreaElement;
            
            if (stateIdInput) stateIdInput.value = generatedContent.id || `state-${this.stateCounter}`;
            if (stateDescriptionInput) stateDescriptionInput.value = generatedContent.description || '';
            if (stateInstructionsInput) stateInstructionsInput.value = 
                Array.isArray(generatedContent.instructions) ? generatedContent.instructions.join('\n') : '';
            if (stateExamplesInput) stateExamplesInput.value = 
                Array.isArray(generatedContent.examples) ? generatedContent.examples.join('\n') : '';
            
            // Скрываем ошибки если всё успешно
            if (errorMessage) {
                errorMessage.style.display = 'none';
            }
            
            this.closeAiAssistModal();
            
        } catch (error: any) {
            console.error('Error generating AI content:', error);
            if (errorMessage) {
                errorMessage.textContent = error.message || 'Failed to generate content. Please try again.';
                errorMessage.style.display = 'block';
            }
        } finally {
            // Восстанавливаем кнопку
            generateBtn.textContent = originalText;
            generateBtn.disabled = false;
        }
    }

    selectState(state: StateBlock): void {
        // Снимаем выделение с предыдущего блока
        if (this.selectedState) {
            this.selectedState.setSelected(false);
        }
        
        // Выделяем новый блок
        this.selectedState = state;
        state.setSelected(true);
        
        // Обновляем панель свойств
        this.updatePropertiesPanel(state);
    }

        private updatePropertiesPanel(state?: StateBlock): void {
        const propertiesPanel = document.getElementById('properties-panel');
        if (!propertiesPanel) return;
        
        if (!state) {
            propertiesPanel.innerHTML = '<p>Select a state to edit its properties</p>';
            return;
        }

        const outgoingConnections = this.connections.getConnections()
            .filter(conn => conn.from === state.id);
        
        const incomingConnections = this.connections.getConnections()
            .filter(conn => conn.to === state.id);

        propertiesPanel.innerHTML = `
            <div class="property-section">
                <h4>State: ${state.data.id}</h4>
                <p><strong>Description:</strong> ${state.data.description}</p>
                
                <div class="connections-section">
                    <h5>Outgoing Connections (${outgoingConnections.length})</h5>
                    <div class="connections-list">
                        ${outgoingConnections.map(conn => `
                            <div class="connection-item">
                                <div class="connection-header">
                                    <span class="connection-target">→ ${conn.to}${conn.to === 'end' || conn.to === 'start' ? ' (special)' : ''}</span>
                                    <button class="btn-delete-connection" data-from="${conn.from}" data-to="${conn.to}">✕</button>
                                </div>
                                <div class="connection-condition">
                                    <label class="condition-label">Condition:</label>
                                    <textarea class="condition-input" 
                                           rows="2"
                                           tabindex="0"
                                           spellcheck="false"
                                           placeholder="e.g., When user says hello (Ctrl+Enter to save)"
                                           data-from="${conn.from}" 
                                           data-to="${conn.to}">${(conn as any).condition || ''}</textarea>
                                </div>
                            </div>
                        `).join('')}
                        ${outgoingConnections.length === 0 ? '<p class="no-connections">No outgoing connections</p>' : ''}
                    </div>
                    
                    <h5>Incoming Connections (${incomingConnections.length})</h5>
                    <div class="connections-list">
                        ${incomingConnections.map(conn => `
                            <div class="connection-item">
                                <span>${conn.from} →</span>
                            </div>
                        `).join('')}
                        ${incomingConnections.length === 0 ? '<p class="no-connections">No incoming connections</p>' : ''}
                    </div>
                </div>
                
                <div class="property-actions">
                    <button class="btn btn-sm btn-secondary" id="edit-selected-state-btn">Edit State</button>
                    <button class="btn btn-sm btn-primary" id="add-connection-btn">Add Connection</button>
                </div>
            </div>
        `;

        // Добавляем обработчики событий для управления соединениями
        this.setupConnectionManagement(propertiesPanel, state);
    }

    private setupConnectionManagement(propertiesPanel: Element, state: StateBlock): void {
        // Кнопки удаления соединений
        const deleteButtons = propertiesPanel.querySelectorAll('.btn-delete-connection');
        deleteButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const target = e.target as HTMLElement;
                const fromId = target.dataset.from!;
                const toId = target.dataset.to!;
                
                if (confirm(`Delete connection from "${fromId}" to "${toId}"?`)) {
                    this.connections.removeConnection(fromId, toId);
                    this.updatePropertiesPanel(state); // Обновляем панель
                }
            });
        });

        // Поля редактирования условий
        let isEditingCondition = false;
        propertiesPanel.querySelectorAll('.condition-input').forEach(input => {
            const textarea = input as HTMLTextAreaElement;
            
            textarea.addEventListener('focus', () => {
                isEditingCondition = true;
            });
            
            textarea.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    textarea.blur();
                }
                e.stopPropagation();
            });
            
            textarea.addEventListener('blur', () => {
                if (isEditingCondition) {
                    const fromId = textarea.dataset.from!;
                    const toId = textarea.dataset.to!;
                    const condition = textarea.value.trim();
                    
                    // Обновляем условие соединения
                    if (this.connections.updateConnectionCondition) {
                        this.connections.updateConnectionCondition(fromId, toId, condition);
                    }
                    
                    isEditingCondition = false;
                    console.log(`Updated condition for ${fromId} -> ${toId}: "${condition}"`);
                }
            });
        });

        // Кнопка добавления соединения
        const addConnectionBtn = propertiesPanel.querySelector('#add-connection-btn');
        addConnectionBtn?.addEventListener('click', () => {
            this.startConnectionCreation(state);
        });

        // Кнопка редактирования состояния
        const editStateBtn = propertiesPanel.querySelector('#edit-selected-state-btn');
        editStateBtn?.addEventListener('click', () => {
            this.editState(state);
        });
    }





    private async loadDomains(): Promise<void> {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                console.warn('No auth token found');
                return;
            }

            const response = await fetch('/api/bot-config/domains', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const domains = await response.json();
                
                // Очищаем старые опции
                this.domainSelect.innerHTML = '<option value="">Select Domain</option>';
                
                // Добавляем домены
                if (Array.isArray(domains)) {
                    domains.forEach((domain: any) => {
                        const option = document.createElement('option');
                        option.value = domain.hostname;
                        option.textContent = domain.hostname;
                        this.domainSelect.appendChild(option);
                    });
                    
                    // Добавляем обработчик изменения домена
                    this.domainSelect.addEventListener('change', () => {
                        const selectedDomain = this.domainSelect.value;
                        this.selectedDomain = selectedDomain || null;
                        if (selectedDomain) {
                            this.loadStatesFromDomain(selectedDomain);
                            this.updateSaveButtonText();
                        } else {
                            this.clearCanvas();
                            this.updateSaveButtonText();
                        }
                    });

                    // Автоматически выбрать домен из URL параметров
                    const domainFromURL = this.getDomainFromURL();
                    if (domainFromURL) {
                        const domainExists = domains.find((d: any) => d.hostname === domainFromURL);
                        if (domainExists) {
                            this.domainSelect.value = domainFromURL;
                            this.selectedDomain = domainFromURL;
                            // Автоматически загрузить состояния для этого домена
                            console.log(`🎯 Auto-loading domain from URL: ${domainFromURL}`);
                            this.loadStatesFromDomain(domainFromURL);
                            this.updateSaveButtonText();
                        } else {
                            console.warn(`⚠️ Domain '${domainFromURL}' not found in user's domains`);
                        }
                    }
                }
            } else {
                console.error('Failed to load domains:', response.status);
            }
        } catch (error) {
            console.error('Error loading domains:', error);
        }
    }

    // Получить домен из URL параметров
    private getDomainFromURL(): string | null {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('domain');
    }

    private async loadStatesFromDomain(domain: string): Promise<void> {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                console.error('No auth token found');
                return;
            }

            const response = await fetch(`/api/bot-config?domain=${domain}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) {
                console.error('Failed to load bot configuration');
                return;
            }
            
            const config = await response.json();
            this.selectedProvider = config.provider || 'openai';
            this.updateReasoningModeVisibility();
            
            // Загружаем настройки редактора первыми чтобы получить позиции
            const editorSettings = config.editorSettings && typeof config.editorSettings === 'object' 
                ? config.editorSettings as any 
                : {};
            
            if (config.conversationStates && Array.isArray(config.conversationStates)) {
                this.importFromBotSettings(config.conversationStates, editorSettings);
            } else {
                this.clearCanvas();
            }
            
            // Загружаем настройки редактора (зум)
            if (typeof editorSettings.zoom === 'number' && editorSettings.zoom > 0) {
                this.zoom = Math.max(0.1, Math.min(3, editorSettings.zoom)); // Ограничиваем между 0.1 и 3
                this.updateZoom();
                console.log(`Restored editor zoom: ${(editorSettings.zoom * 100).toFixed(1)}%`);
            }
            
            console.log('Loaded editorSettings from database:', editorSettings);
        } catch (error) {
            console.error('Error loading states from domain:', error);
            showError(`Could not load configuration for ${domain}.`);
        }
    }

    private updateSaveButtonText(): void {
        const saveBtn = document.getElementById('save-states-btn') as HTMLButtonElement;
        if (saveBtn) {
            // Всегда краткий бизнес-стиль текста
            saveBtn.textContent = 'Save';
            saveBtn.title = this.selectedDomain
                ? 'Save states to database for selected domain'
                : 'Download states as JSON file';
        }
        
        // Обновляем заголовок страницы
        this.updatePageTitle();
    }

    private updatePageTitle(): void {
        const titleElement = document.querySelector('.editor-header h1');
        if (titleElement) {
            if (this.selectedDomain) {
                titleElement.textContent = `Visual State Editor - ${this.selectedDomain}`;
            } else {
                titleElement.textContent = 'Visual State Editor';
            }
        }
    }

    private backToSettings(): void {
        // Возвращаемся к настройкам бота
        if (this.selectedDomain) {
            window.location.href = `/bot-settings.html?domain=${encodeURIComponent(this.selectedDomain)}`;
        } else {
            window.location.href = '/bot-settings.html';
        }
    }

    setDragMode(enabled: boolean): void {
        this.isDragMode = enabled;
        
        if (enabled) {
            // Оставляем соединения видимыми для красоты
            // Но оптимизируем их обновление
            
            // Если много блоков, включаем упрощенный режим только для текста
            const stateCount = this.states.size;
            if (stateCount > 15) {
                this.setSimplifiedMode(true);
            }
        } else {
            // После перетаскивания возвращаем полный режим
            this.setSimplifiedMode(false);
        }
    }

    private setBlocksDraggable(draggable: boolean): void {
        // Управляем возможностью перетаскивания только для обычных блоков
        this.states.forEach(state => {
            if (state instanceof StateBlock) {
                state.konvaGroup.draggable(draggable);
            }
        });
        
        // Специальные блоки (start/end) ВСЕГДА остаются неперетаскиваемыми
        if (this.specialStart) {
            this.specialStart.konvaGroup.draggable(false);
        }
        if (this.specialEnd) {
            this.specialEnd.konvaGroup.draggable(false);
        }
    }

    private setSimplifiedMode(enabled: boolean): void {
        // Переключаем качество отрисовки блоков для производительности
        this.states.forEach(state => {
            if (state instanceof StateBlock) {
                if (enabled) {
                    // Упрощенный режим - скрываем только описание, оставляем заголовки
                    state.konvaDescription.visible(false);
                    // Заголовки остаются видимыми для читаемости
            } else {
                    // Полный режим - показываем все
                    state.konvaDescription.visible(true);
                        }
                    }
                });
        this.blocksLayer.batchDraw();
    }

    private clearSelection(): void {
        if (this.selectedState) {
            this.selectedState.setSelected(false);
        this.selectedState = null;
        }
    }

    private saveStates(): void {
        if (this.selectedDomain) {
            // Сохраняем в базу данных если выбран домен
            this.saveStatesToDomain();
        } else {
            // Сохраняем как файл если домен не выбран
            this.saveStatesAsFile();
        }
    }

    private saveStatesAsFile(): void {
        const statesData = Array.from(this.states.entries())
            .filter(([id]) => id !== 'start' && id !== 'end')
            .map(([, state]) => ({
                ...state.data,
                connections: this.connections.getConnections()
                    .filter(conn => conn.from === state.id)
                    .map(conn => conn.to)
            }));
        
        const connectionsData = this.connections.getConnections();
        
        // Создаем карту позиций состояний
        const statePositions: { [stateId: string]: { x: number; y: number } } = {};
        this.states.forEach((state, id) => {
            if (id === 'start' || id === 'end') return;
            statePositions[id] = state.data.position;
        });
        
        const exportData = {
            states: statesData,
            connections: connectionsData,
            editorSettings: {
                zoom: this.zoom,
                statePositions: statePositions,
                startConnection: this.connections.getConnections()
                    .find(conn => conn.from === 'start')?.to || null
            },
            metadata: {
                exportDate: new Date().toISOString(),
                version: '1.1'
            }
        };
        
        console.log('Exporting states:', exportData);
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'conversation-states.json';
        link.click();
        
        URL.revokeObjectURL(url);
    }

    private async saveStatesToDomain(): Promise<void> {
        if (!this.selectedDomain) {
            showError('Please select a domain first');
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                console.error('No auth token found');
                return;
            }

            // Получаем текущую конфигурацию чтобы сохранить другие настройки
            const getResponse = await fetch(`/api/bot-config?domain=${this.selectedDomain}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            let existingConfig = {};
            if (getResponse.ok) {
                existingConfig = await getResponse.json();
            }

            // Экспортируем состояния в формате bot settings (без позиций)
            const conversationStates = this.exportForBotSettings();
            
            // Экспортируем настройки редактора (зум + позиции блоков)
            const statePositions: { [stateId: string]: { x: number; y: number } } = {};
            this.states.forEach((state, id) => {
                if (id === 'start' || id === 'end') return;
                statePositions[id] = state.data.position;
            });
            
            // Находим соединение от START блока
            const startConnection = this.connections.getConnections()
                .find(conn => conn.from === 'start');
            
            const editorSettings = {
                zoom: this.zoom,
                statePositions: statePositions,
                startConnection: startConnection ? startConnection.to : null
            };
            
            console.log('Saving editor settings:', editorSettings);
            if (editorSettings.startConnection) {
                console.log(`💾 Saving START connection to database: start -> ${editorSettings.startConnection}`);
            }
            console.log('Saving conversation states (without positions):', conversationStates.length, 'states');
            
            const configData = {
                ...existingConfig,
                conversationStates: conversationStates,
                editorSettings: editorSettings
            };

            const response = await fetch(`/api/bot-config?domain=${this.selectedDomain}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(configData)
            });

            if (!response.ok) {
                throw new Error('Failed to save configuration');
            }

            showSuccess('States and editor settings saved successfully to database!');
        } catch (error) {
            console.error('Error saving states:', error);
            showError('Failed to save states to database.');
        }
    }

    // Экспорт состояний в формате для bot settings (с transitions)
    exportForBotSettings(): any[] {
        const states = Array.from(this.states.entries())
            .filter(([id]) => id !== 'start' && id !== 'end')
            .map(([, state]) => {
                const connections = this.connections.getConnections().filter(conn => conn.from === state.id);
                
                // Создаем объект с четким порядком полей: id → description → instructions → examples → transitions
                const stateObject: any = {};
                stateObject.id = state.data.id;
                stateObject.description = state.data.description;
                stateObject.instructions = state.data.instructions;
                stateObject.examples = state.data.examples;
                stateObject.reasoningMode = state.data.reasoningMode || 'inherit';
                stateObject.transitions = connections.map(conn => ({
                    next_step: conn.to,
                    condition: (conn as any).condition || 'When condition is met'
                }));
                
                return stateObject;
            });
        
        console.log('Exported for bot settings (without positions):', states);
        return states;
    }

    private setupImportButton(): void {
        // Добавляем кнопку "Load States" в центральную группу рядом с остальными кнопками
        const headerCenter = document.querySelector('.header-controls .hc-center') as HTMLElement | null;
        const headerControls = document.querySelector('.header-controls');
        const targetContainer = headerCenter || headerControls;
        if (targetContainer && !document.getElementById('load-states-btn')) {
            const loadBtn = document.createElement('button');
            loadBtn.id = 'load-states-btn';
            loadBtn.className = 'btn btn-secondary';
            loadBtn.textContent = 'Load States';
            loadBtn.addEventListener('click', () => this.loadStates());
            
            // Вставляем перед кнопкой "Clear All" внутри центральной группы
            const clearBtn = document.getElementById('clear-canvas-btn');
            if (clearBtn && clearBtn.parentElement === targetContainer) {
                targetContainer.insertBefore(loadBtn, clearBtn);
            } else if (targetContainer) {
                targetContainer.appendChild(loadBtn);
            }
        }
    }

    loadStates(): void {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.addEventListener('change', (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target?.result as string);
                    this.importStates(data);
                } catch (error) {
                    showError('Error loading file: Invalid JSON format');
                }
            };
            reader.readAsText(file);
        });
        
        input.click();
    }

    private importStates(data: any): void {
        this.clearCanvas();
        
        if (data.states) {
            // Получаем позиции состояний из editorSettings если доступны (новый формат)
            const statePositions = data.editorSettings?.statePositions || {};
            
            data.states.forEach((stateData: StateData) => {
                // Используем позицию из editorSettings если доступна, иначе из данных состояния (обратная совместимость)
                if (statePositions[stateData.id]) {
                    stateData.position = statePositions[stateData.id];
                    console.log(`Using position from editorSettings for ${stateData.id}:`, stateData.position);
                }
                
                this.addState(stateData);
            });
        }
        
        if (data.connections) {
            data.connections.forEach((conn: Connection) => {
                this.connections.addConnection(conn.from, conn.to);
            });
        }
        
        // Восстанавливаем настройки редактора если доступны
        if (data.editorSettings && typeof data.editorSettings === 'object') {
            const editorSettings = data.editorSettings as any;
            if (typeof editorSettings.zoom === 'number' && editorSettings.zoom > 0) {
                this.zoom = Math.max(0.1, Math.min(3, editorSettings.zoom)); // Ограничиваем между 0.1 и 3
                this.updateZoom();
                console.log(`Restored editor zoom from file: ${(this.zoom * 100).toFixed(1)}%`);
            }
            
            // Восстанавливаем соединение START блока
            if (editorSettings.startConnection && 
                (this.states.has(editorSettings.startConnection) || editorSettings.startConnection === 'end')) {
                console.log(`Restoring START connection from file to: ${editorSettings.startConnection}`);
                this.connections.addConnection('start', editorSettings.startConnection);
            }
        }
    }

    // Импорт состояний из формата bot settings (с transitions)
    importFromBotSettings(botStatesData: any[], editorSettings?: any): void {
        this.clearCanvas();
        
        if (!botStatesData || !Array.isArray(botStatesData)) {
            console.warn('Invalid bot states data provided');
            return;
        }

        // Извлекаем позиции состояний из editorSettings
        const statePositions = editorSettings?.statePositions || {};
        console.log('Available state positions from editorSettings:', statePositions);

        // Сначала создаем все состояния
        botStatesData.forEach((stateData, index) => {
            let position;
            
            // Пытаемся получить позицию из editorSettings
            if (statePositions[stateData.id] && 
                typeof statePositions[stateData.id].x === 'number' && 
                typeof statePositions[stateData.id].y === 'number') {
                position = statePositions[stateData.id];
                console.log(`Using saved position from editorSettings for ${stateData.id}:`, position);
            } else {
                // Рассчитываем позицию в сетке с центрированием
                const cols = 3;
                const blockWidth = 174;
                const blockHeight = 100;
                const spacing = 50;
                
                const col = index % cols;
                const row = Math.floor(index / cols);
                
                // Центрируем сетку
                const gridWidth = cols * blockWidth + (cols - 1) * spacing;
                const startX = Math.max(50, (1200 - gridWidth) / 2);
                const startY = 100;
                
                position = {
                    x: startX + col * (blockWidth + spacing),
                    y: startY + row * (blockHeight + spacing)
                };
                console.log(`Calculated grid position for ${stateData.id}:`, position);
            }

            this.addState({
                id: stateData.id || `${index + 1}_imported_state`,
                description: stateData.description || 'Imported state',
                instructions: stateData.instructions || [],
                examples: stateData.examples || [],
                reasoningMode: stateData.reasoningMode || 'inherit',
                position: position,
                connections: []
            });
        });

        // Восстанавливаем соединение START блока из editorSettings
        if (editorSettings?.startConnection && 
            (this.states.has(editorSettings.startConnection) || editorSettings.startConnection === 'end')) {
            console.log(`Restoring START connection to: ${editorSettings.startConnection}`);
            this.connections.addConnection('start', editorSettings.startConnection);
        }
        
        // Затем создаем все соединения с условиями
        botStatesData.forEach(stateData => {
            if (stateData.transitions && Array.isArray(stateData.transitions)) {
                stateData.transitions.forEach((transition: any) => {
                    if (transition.next_step) {
                        // Проверяем существование целевого состояния
                        const targetExists = this.states.has(transition.next_step) || 
                                           transition.next_step === 'end' || 
                                           transition.next_step === 'start';
                        
                        if (targetExists) {
                            this.connections.addConnection(stateData.id, transition.next_step);
                            
                            // Добавляем условие если есть
                            if (transition.condition) {
                                this.connections.updateConnectionCondition?.(
                                    stateData.id,
                                    transition.next_step, 
                                    transition.condition
                                );
                            }
                        } else {
                            console.warn(`Skipping connection ${stateData.id} -> ${transition.next_step}: target state not found`);
                        }
                    }
                });
            }
        });

        console.log('Imported states from bot settings format:', botStatesData);
        
        // Очищаем недопустимые соединения после импорта
        this.cleanupInvalidConnections();
    }

    private cleanupInvalidConnections(): void {
        const allConnections = this.connections.getConnections();
        const validConnections: Connection[] = [];
        const removedConnections: string[] = [];

        allConnections.forEach(conn => {
            const fromState = this.states.get(conn.from);
            const toState = this.states.get(conn.to);
            
            // Сохраняем соединения если:
            // 1. Оба состояния существуют
            // 2. Цель - специальное состояние (end, start)
            if ((fromState && toState) || 
                (fromState && (conn.to === 'end' || conn.to === 'start'))) {
                validConnections.push(conn);
            } else {
                removedConnections.push(`${conn.from} -> ${conn.to}`);
                console.warn(`Invalid connection removed: ${conn.from} -> ${conn.to}`);
            }
        });

        // Обновляем только если удалили недопустимые соединения
        if (validConnections.length !== allConnections.length) {
            this.connections.setConnections(validConnections);
            console.log(`Cleaned up connections: ${allConnections.length} -> ${validConnections.length}`);
            console.log('Removed connections:', removedConnections);
        } else {
            console.log('No invalid connections found during cleanup');
        }
    }

    private clearCanvas(): void {
        // Очищаем все состояния кроме start/end
        Array.from(this.states.keys())
            .filter(id => id !== 'start' && id !== 'end')
            .forEach(id => this.removeState(id));
    }

    private zoomIn(): void {
        this.zoom = Math.min(this.zoom * 1.2, 3);
        this.updateZoom();
    }

    private zoomOut(): void {
        this.zoom = Math.max(this.zoom / 1.2, 0.3);
                this.updateZoom();
    }

    private resetZoom(): void {
        this.zoom = 1;
                    this.updateZoom();
    }

    private updateZoom(): void {
        // Обновляем отображение зума
        const zoomDisplay = document.getElementById('zoom-level');
        if (zoomDisplay) {
            zoomDisplay.textContent = `${Math.round(this.zoom * 100)}%`;
        }
        
        // Применяем масштабирование к Konva Stage
        this.stage.scale({ x: this.zoom, y: this.zoom });
        this.renderSpecialBlocks();
        this.connections.redrawConnections();
        this.stage.draw();
    }

    private updateKonvaPosition(): void {
        const scrollLeft = this.canvasWrapper.scrollLeft || 0;
        const scrollTop = this.canvasWrapper.scrollTop || 0;
        
        this.stage.position({
            x: -scrollLeft * this.zoom,
            y: -scrollTop * this.zoom
        });
        
        this.stage.draw();
    }

    private syncCanvasSize(): void {
        const width = this.canvasWrapper.clientWidth;
        const height = this.canvasWrapper.clientHeight;
        
        if (this.stage.width() !== width || this.stage.height() !== height) {
            this.stage.width(width);
            this.stage.height(height);
            this.connections.redrawConnections();
        }
    }
}

// Initialize the visual editor
document.addEventListener('DOMContentLoaded', () => {
    // Initialize FOUC protection for visual editor
    initSimpleFouc();
    
    // Initialize navigation highlighting
    initNavigation();
    
    // Check authentication
    const token = localStorage.getItem('authToken');
    if (!token) {
        showError('Please log in to access the visual editor');
        window.location.href = ROUTES.LOGIN;
        return;
    }

    // Check if essential elements exist
    const konvaContainer = document.getElementById('konva-container');
    const canvasContent = document.getElementById('canvas-content');
    const canvasWrapper = document.querySelector('.canvas-wrapper');
    
    if (!konvaContainer || !canvasContent || !canvasWrapper) {
        console.error('Essential elements missing! Cannot initialize visual editor.');
        return;
    }

    const visualEditor = new VisualEditor();
    (window as any).visualEditor = visualEditor;
}); 
