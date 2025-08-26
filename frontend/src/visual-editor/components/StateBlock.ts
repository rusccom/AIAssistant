import Konva from 'konva';
import { Point, StateData } from '../types';

export class StateBlock {
    data: StateData;
    
    // Геттер для совместимости - всегда возвращает data.id
    get id(): string {
        return this.data.id;
    }
    konvaGroup!: Konva.Group;
    konvaRect!: Konva.Rect;
    konvaAccent!: Konva.Rect;
    konvaDepthShadow!: Konva.Rect;
    konvaHeader!: Konva.Text;
    konvaDescription!: Konva.Text;
    position: Point;
    private stage: Konva.Stage;
    private layer: Konva.Layer;
    public isSelected: boolean = false;
    private updateRafId?: number;
    
    // Размеры блока
    private readonly width = 174;
    private readonly height = 100;
    private readonly padding = 8;
    
    constructor(data: StateData, stage: Konva.Stage, layer: Konva.Layer) {
        this.data = data;
        this.position = data.position;
        this.stage = stage;
        this.layer = layer;
        
        this.createKonvaElements();
        this.updatePosition();
        this.setupEventListeners();
    }

    private createKonvaElements(): void {
        // Создаем группу для всех элементов блока с кэшированием
        this.konvaGroup = new Konva.Group({
            name: `state-${this.id}`,
            draggable: true,
            opacity: 1,
            id: this.id,
            // Включаем кэширование для лучшей производительности
            cache: true
        });

        // Основной прямоугольник блока - современный дизайн с градиентом
        this.konvaRect = new Konva.Rect({
            width: this.width,
            height: this.height,
            fillLinearGradientStartPoint: { x: 0, y: 0 },
            fillLinearGradientEndPoint: { x: 0, y: this.height },
            fillLinearGradientColorStops: [0, '#ffffff', 1, '#f8f9fa'],
            stroke: '#e1e8ed',
            strokeWidth: 1.5,
            cornerRadius: 12,
            shadowColor: 'rgba(0,0,0,0.15)',
            shadowBlur: 8,
            shadowOffset: { x: 0, y: 4 },
            opacity: 1,
            perfectDrawEnabled: false
        });

        // Акцентная полоска сверху - с отступами чтобы не выходить за рамку
        const accentMargin = 3; // Отступ от краев для безопасности
        this.konvaAccent = new Konva.Rect({
            width: this.width - accentMargin * 2,
            height: 4,
            x: accentMargin,
            y: 0,
            fillLinearGradientStartPoint: { x: 0, y: 0 },
            fillLinearGradientEndPoint: { x: this.width - accentMargin * 2, y: 0 },
            fillLinearGradientColorStops: [0, '#3498db', 0.5, '#2980b9', 1, '#1abc9c'],
            cornerRadius: [9, 9, 0, 0], // Немного меньше чем у основного блока
            opacity: 1,
            perfectDrawEnabled: false
        });

        // Дополнительная тень для глубины
        this.konvaDepthShadow = new Konva.Rect({
            width: this.width,
            height: this.height,
            fill: 'rgba(0,0,0,0.05)',
            cornerRadius: 12,
            x: 1,
            y: 6,
            opacity: 0.6,
            perfectDrawEnabled: false
        });

        // Заголовок с ID состояния - более элегантный
        this.konvaHeader = new Konva.Text({
            text: this.data.id,
            fontSize: 13,
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            fill: '#2c3e50',
            width: this.width - this.padding * 2,
            x: this.padding,
            y: this.padding + 8,
            fontStyle: '600',
            letterSpacing: 0.5,
            perfectDrawEnabled: false
        });

        // Убираем дублирование - konvaTitle теперь не нужен, так как ID показан в заголовке

        // Описание блока - красивое с улучшенной типографикой
        this.konvaDescription = new Konva.Text({
            text: this.data.description || 'No description',
            fontSize: 11,
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            fill: '#546e7a',
            width: this.width - this.padding * 2,
            x: this.padding,
            y: this.padding + 30,
            wrap: 'word',
            ellipsis: true,
            height: this.height - this.padding * 2 - 45,
            lineHeight: 1.4,
            perfectDrawEnabled: false
        });

        // Добавляем все элементы в группу (порядок важен для z-index)
        this.konvaGroup.add(this.konvaDepthShadow);
        this.konvaGroup.add(this.konvaRect);
        this.konvaGroup.add(this.konvaAccent);
        this.konvaGroup.add(this.konvaHeader);
        this.konvaGroup.add(this.konvaDescription);
        
        // Добавляем группу в слой
        this.layer.add(this.konvaGroup);
        
        // Кэшируем группу после создания всех элементов
        this.konvaGroup.cache();
    }

    private setupEventListeners(): void {
        // Обработчики событий для Konva
        this.konvaGroup.on('dragstart', (e) => {
            // Отключаем обновления соединений для всех блоков во время перетаскивания
            const visualEditor = (window as any).visualEditor;
            if (visualEditor) {
                visualEditor.setDragMode(true);
            }
        });

        this.konvaGroup.on('dragmove', (e) => {
            this.position = {
                x: this.konvaGroup.x(),
                y: this.konvaGroup.y()
            };
            this.data.position = this.position;
            
            // Плавное обновление соединений с throttling для производительности
            this.scheduleConnectionUpdate();
        });

        this.konvaGroup.on('dragend', (e) => {
            this.position = {
                x: this.konvaGroup.x(),
                y: this.konvaGroup.y()
            };
            this.data.position = this.position;
            
            // Включаем обратно обновления и перерисовываем соединения
            const visualEditor = (window as any).visualEditor;
            if (visualEditor) {
                visualEditor.setDragMode(false);
                if (visualEditor.connections) {
                    visualEditor.connections.redrawConnections();
                }
            }
        });

        // Контекстное меню
        this.konvaGroup.on('contextmenu', (e) => {
            e.evt.preventDefault();
            const visualEditor = (window as any).visualEditor;
            if (visualEditor) {
                const mouseEvent = e.evt as MouseEvent;
                visualEditor.showContextMenu(mouseEvent, this);
            }
        });

        // Двойной клик для редактирования
        this.konvaGroup.on('dblclick', (e) => {
            const visualEditor = (window as any).visualEditor;
            if (visualEditor) {
                visualEditor.editState(this);
            }
        });

        // Клик для выделения
        this.konvaGroup.on('click', (e) => {
            const visualEditor = (window as any).visualEditor;
            if (visualEditor) {
                visualEditor.selectState(this);
            }
        });

        // Красивые эффекты наведения
        this.konvaGroup.on('mouseenter', () => {
            this.stage.container().style.cursor = 'move';
            
            // Плавное увеличение тени и масштаба
            this.konvaRect.to({
                shadowBlur: 12,
                shadowOffset: { x: 0, y: 6 },
                shadowColor: 'rgba(0,0,0,0.2)',
                scaleX: 1.02,
                scaleY: 1.02,
                duration: 0.15
            });
            
            // Усиливаем акцентную полоску
            this.konvaAccent.to({
                height: 5,
                duration: 0.15
            });
            
            // Легкое поднятие всего блока
            this.konvaGroup.to({
                y: this.position.y - 2,
                duration: 0.15
            });
        });
        
        this.konvaGroup.on('mouseleave', () => {
            this.stage.container().style.cursor = 'default';
            
            // Возвращаем обычные параметры
            this.konvaRect.to({
                shadowBlur: 8,
                shadowOffset: { x: 0, y: 4 },
                shadowColor: 'rgba(0,0,0,0.15)',
                scaleX: 1,
                scaleY: 1,
                duration: 0.15
            });
            
            this.konvaAccent.to({
                height: 4,
                duration: 0.15
            });
            
            this.konvaGroup.to({
                y: this.position.y,
                duration: 0.15
            });
        });
    }

    updatePosition(): void {
        this.konvaGroup.position({
            x: this.position.x,
            y: this.position.y
        });
        // Убираем stage.draw() - слой будет перерисован автоматически
    }

    private scheduleConnectionUpdate(): void {
        if (this.updateRafId) {
            cancelAnimationFrame(this.updateRafId);
        }

        this.updateRafId = requestAnimationFrame(() => {
            // Плавное обновление только соединений этого блока
            const visualEditor = (window as any).visualEditor;
            if (visualEditor?.connections) {
                visualEditor.connections.updateConnectionsForBlock(this.id);
            }
            this.updateRafId = undefined;
        });
    }

    setSelected(selected: boolean): void {
        if (this.isSelected === selected) return; // Избегаем ненужных обновлений
        
        this.isSelected = selected;
        
        // Обновленные стили для выделения
        this.konvaRect.stroke(selected ? '#2980b9' : '#e1e8ed');
        this.konvaRect.strokeWidth(selected ? 2.5 : 1.5);
        
        // Более яркая акцентная полоска для выделенного блока
        if (selected) {
            this.konvaAccent.fillLinearGradientColorStops([0, '#e74c3c', 0.5, '#c0392b', 1, '#e67e22']);
        } else {
            this.konvaAccent.fillLinearGradientColorStops([0, '#3498db', 0.5, '#2980b9', 1, '#1abc9c']);
        }
        
        // Очищаем кэш и создаем новый
        this.konvaGroup.clearCache();
        this.konvaGroup.cache();
        
        this.layer.batchDraw();
    }

    updateData(newData: Partial<StateData>): void {
        this.data = { ...this.data, ...newData };
        
        let needsRedraw = false;
        
        // Обновляем визуальные элементы только если они изменились
        if (newData.description !== undefined && this.konvaDescription.text() !== newData.description) {
            this.konvaDescription.text(newData.description || 'No description');
            needsRedraw = true;
        }
        
        if (newData.id !== undefined && this.konvaHeader.text() !== newData.id) {
            this.konvaHeader.text(newData.id);
            // Обновляем ID группы Konva для согласованности
            this.konvaGroup.setAttr('id', newData.id);
            this.konvaGroup.setAttr('name', `state-${newData.id}`);
            needsRedraw = true;
        }
        
        // Обновляем позицию если она изменилась
        if (newData.position !== undefined) {
            this.position = newData.position;
            this.updatePosition();
            needsRedraw = true;
        }
        
        if (needsRedraw) {
            // Обновляем кэш при изменении контента
            this.konvaGroup.clearCache();
            this.konvaGroup.cache();
            this.layer.batchDraw();
        }
    }

    getCenter(): Point {
        return {
            x: this.position.x + this.width / 2,
            y: this.position.y + this.height / 2
        };
    }

    getBounds(): { x: number; y: number; width: number; height: number } {
        return {
            x: this.position.x,
            y: this.position.y,
            width: this.width,
            height: this.height
        };
    }

    // Совместимость с старым API
    get element(): HTMLElement {
        // Возвращаем заглушку для совместимости
        return {
            style: {},
            dataset: { stateId: this.id },
            classList: { add: () => {}, remove: () => {} }
        } as any;
    }

    destroy(): void {
        if (this.updateRafId) {
            cancelAnimationFrame(this.updateRafId);
        }
        this.konvaGroup.destroy();
        this.stage.draw();
    }


}