import Konva from 'konva';
import { Connection, Point } from '../types';
import { createArrow } from '../utils/konva-utils';

export class ConnectionManager {
    private connections: Connection[] = [];
    private canvas: HTMLCanvasElement;
    private edgesLayer?: Konva.Layer;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        console.log('ConnectionManager initialized with Konva backend');
    }

    setEdgesLayer(layer: Konva.Layer): void {
        this.edgesLayer = layer;
    }

    addConnection(connection: Connection): void;
    addConnection(from: string, to: string, condition?: string): void;
    addConnection(connectionOrFrom: Connection | string, to?: string, condition?: string): void {
        let newConnection: Connection;
        
        if (typeof connectionOrFrom === 'string') {
            // Старый формат вызова
            const from = connectionOrFrom;
            if (!to) throw new Error('Missing "to" parameter');
            
            // Удаляем предыдущее соединение от start, если оно есть
            if (from === 'start') {
                this.connections = this.connections.filter(conn => conn.from !== 'start');
            }

            const connectionId = `${from}-${to}`;
            newConnection = {
                id: connectionId,
                from,
                to,
                condition: condition || ''
            };
        } else {
            // Новый формат - передается объект Connection
            newConnection = connectionOrFrom;
            
            // Удаляем предыдущее соединение от start, если оно есть
            if (newConnection.from === 'start') {
                this.connections = this.connections.filter(conn => conn.from !== 'start');
            }
        }
        
        this.connections.push(newConnection);
        this.redrawConnections();
    }

    removeConnection(from: string, to: string): void {
        this.connections = this.connections.filter(
            conn => !(conn.from === from && conn.to === to)
        );
        this.redrawConnections();
    }

    removeAllConnections(stateId: string): void {
        this.connections = this.connections.filter(
            conn => conn.from !== stateId && conn.to !== stateId
        );
        this.redrawConnections();
    }

    removeAllConnectionsFrom(fromStateId: string): void {
        this.connections = this.connections.filter(
            conn => conn.from !== fromStateId
        );
        this.redrawConnections();
    }

    hasConnection(fromId: string, toId: string): boolean {
        return this.connections.some(
            conn => conn.from === fromId && conn.to === toId
        );
    }

    getConnections(): Connection[] {
        return [...this.connections];
    }

    updateConnectionCondition(fromId: string, toId: string, condition: string): void {
        const connection = this.connections.find(
            conn => conn.from === fromId && conn.to === toId
        );
        
        if (connection) {
            (connection as any).condition = condition;
            console.log(`Updated condition for connection ${fromId} -> ${toId}: "${condition}"`);
        }
    }

    setConnections(connections: Connection[]): void {
        this.connections = [...connections];
        this.redrawConnections();
    }

    updateStateId(oldId: string, newId: string): void {
        console.log(`Updating connections: ${oldId} -> ${newId}`);
        
        let updatedCount = 0;
        
        // Обновляем все соединения где oldId является источником
        this.connections.forEach(conn => {
            if (conn.from === oldId) {
                conn.from = newId;
                conn.id = `${newId}-${conn.to}`; // Обновляем ID соединения
                updatedCount++;
                console.log(`Updated connection source: ${oldId} -> ${newId} to ${conn.to}`);
            }
        });
        
        // Обновляем все соединения где oldId является целью
        this.connections.forEach(conn => {
            if (conn.to === oldId) {
                conn.to = newId;
                conn.id = `${conn.from}-${newId}`; // Обновляем ID соединения
                updatedCount++;
                console.log(`Updated connection target: ${conn.from} -> ${oldId} to ${newId}`);
            }
        });
        
        console.log(`Updated ${updatedCount} connections for state ID change`);
        
        // Перерисовываем соединения с обновленными ID
        this.redrawConnections();
    }

    redrawConnections(): void {
        if (!this.edgesLayer) return;

        // Очищаем слой соединений
        this.edgesLayer.destroyChildren();

        // Перерисовываем все соединения через Konva
        this.connections.forEach(connection => {
            this.drawConnectionKonva(connection);
        });

        // Используем batchDraw для лучшей производительности
        this.edgesLayer.batchDraw();
    }

    updateConnectionsForBlock(blockId: string): void {
        if (!this.edgesLayer) return;

        // Находим соединения, связанные с этим блоком
        const relatedConnections = this.connections.filter(
            conn => conn.from === blockId || conn.to === blockId
        );

        if (relatedConnections.length === 0) return;

        // Используем requestAnimationFrame для плавного обновления
        requestAnimationFrame(() => {
            if (!this.edgesLayer) return;
            
            // Удаляем только связанные соединения из слоя
            this.edgesLayer.getChildren().forEach(child => {
                const connectionId = child.getAttr('connectionId');
                if (relatedConnections.some(conn => conn.id === connectionId)) {
                    child.destroy();
                }
            });

            // Перерисовываем только эти соединения
            relatedConnections.forEach(connection => {
                this.drawConnectionKonva(connection);
            });

            if (this.edgesLayer) {
                this.edgesLayer.batchDraw();
            }
        });
    }

    private drawConnectionKonva(connection: Connection): void {
        if (!this.edgesLayer) return;

        const visualEditor = (window as any).visualEditor;
        if (!visualEditor) return;

        const fromState = visualEditor.states.get(connection.from);
        const toState = visualEditor.states.get(connection.to);

        if (!fromState || !toState) {
            console.warn('States not found for connection:', connection.from, '->', connection.to);
            return;
        }

        // Получаем границы блоков
        const fromBounds = fromState.getBounds();
        const toBounds = toState.getBounds();
        
        // Рассчитываем точки соединения на краях блоков
        const { fromPoint, toPoint } = this.calculateEdgePoints(fromBounds, toBounds);

        try {
            const { path, arrowhead } = createArrow(fromPoint, toPoint);
            
            // Добавляем ID к элементам для оптимизации поиска
            path.setAttr('connectionId', connection.id);
            arrowhead.setAttr('connectionId', connection.id);
            
            this.edgesLayer.add(path);
            this.edgesLayer.add(arrowhead);
        } catch (error) {
            console.warn('Could not create arrow:', error);
        }
    }

    /**
     * Рассчитывает точки соединения на краях блоков
     */
    private calculateEdgePoints(fromBounds: any, toBounds: any): { fromPoint: Point; toPoint: Point } {
        // Центры блоков
        const fromCenterX = fromBounds.x + fromBounds.width / 2;
        const fromCenterY = fromBounds.y + fromBounds.height / 2;
        const toCenterX = toBounds.x + toBounds.width / 2;
        const toCenterY = toBounds.y + toBounds.height / 2;
        
        // Направление от центра к центру
        const dx = toCenterX - fromCenterX;
        const dy = toCenterY - fromCenterY;
        
        // Точка на краю исходного блока
        const fromPoint = this.getBlockEdgePoint(
            fromBounds, 
            fromCenterX, 
            fromCenterY, 
            dx, 
            dy
        );
        
        // Точка на краю целевого блока
        const toPoint = this.getBlockEdgePoint(
            toBounds, 
            toCenterX, 
            toCenterY, 
            -dx, // Обратное направление
            -dy
        );
        
        return { fromPoint, toPoint };
    }

    /**
     * Находит точку пересечения луча с краем прямоугольника
     */
    private getBlockEdgePoint(bounds: any, centerX: number, centerY: number, dx: number, dy: number): Point {
        const { x, y, width, height } = bounds;
        
        // Границы блока
        const left = x;
        const right = x + width;
        const top = y;
        const bottom = y + height;
        
        // Нормализация направления
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length === 0) {
            return { x: centerX, y: centerY };
        }
        
        const normalizedDx = dx / length;
        const normalizedDy = dy / length;
        
        // Проверяем пересечение с каждой стороной прямоугольника
        let intersectionX = centerX;
        let intersectionY = centerY;
        
        if (normalizedDx > 0) {
            // Движемся вправо - пересечение с правой стороной
            const t = (right - centerX) / normalizedDx;
            const newY = centerY + normalizedDy * t;
            if (newY >= top && newY <= bottom) {
                intersectionX = right;
                intersectionY = newY;
            }
        } else if (normalizedDx < 0) {
            // Движемся влево - пересечение с левой стороной
            const t = (left - centerX) / normalizedDx;
            const newY = centerY + normalizedDy * t;
            if (newY >= top && newY <= bottom) {
                intersectionX = left;
                intersectionY = newY;
            }
        }
        
        if (normalizedDy > 0) {
            // Движемся вниз - пересечение с нижней стороной
            const t = (bottom - centerY) / normalizedDy;
            const newX = centerX + normalizedDx * t;
            if (newX >= left && newX <= right) {
                intersectionX = newX;
                intersectionY = bottom;
            }
        } else if (normalizedDy < 0) {
            // Движемся вверх - пересечение с верхней стороной
            const t = (top - centerY) / normalizedDy;
            const newX = centerX + normalizedDx * t;
            if (newX >= left && newX <= right) {
                intersectionX = newX;
                intersectionY = top;
            }
        }
        
        return { x: intersectionX, y: intersectionY };
    }

    // Устаревшие методы для совместимости
    private drawArrow(): void {
        // Заменено на drawConnectionKonva
    }

    private drawArrowKonva(): void {
        // Заменено на createArrow в utils
    }
}
