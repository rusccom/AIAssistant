import Konva from 'konva';
import { Point } from '../types';

/**
 * Создает Konva стрелку между двумя точками
 */
export function createArrow(from: Point, to: Point): { path: Konva.Path; arrowhead: Konva.Line } {
    // Добавляем отступы от краев блоков
    const padding = 8;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) {
        throw new Error('Cannot create arrow between identical points');
    }
    
    // Нормализуем направление
    const normalX = dx / distance;
    const normalY = dy / distance;
    
    // Применяем отступы
    const startX = from.x + normalX * padding;
    const startY = from.y + normalY * padding;
    const endX = to.x - normalX * padding;
    const endY = to.y - normalY * padding;

    // Создаем изогнутую линию
    const controlOffset = Math.min(Math.abs(dx), Math.abs(dy)) * 0.3;
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    
    // Контрольные точки для плавной кривой
    const cp1X = midX + (Math.abs(dy) > Math.abs(dx) ? controlOffset : 0);
    const cp1Y = midY + (Math.abs(dx) > Math.abs(dy) ? controlOffset : 0);
    
    const pathData = `M ${startX} ${startY} Q ${cp1X} ${cp1Y} ${endX} ${endY}`;
    
    const path = new Konva.Path({
        data: pathData,
        stroke: '#3498db',
        strokeWidth: 2,
        fill: '',
    });

    // Создаем наконечник стрелки
    const arrowSize = 8;
    const angle = Math.atan2(endY - cp1Y, endX - cp1X);
    
    const arrowX1 = endX - arrowSize * Math.cos(angle - Math.PI / 6);
    const arrowY1 = endY - arrowSize * Math.sin(angle - Math.PI / 6);
    const arrowX2 = endX - arrowSize * Math.cos(angle + Math.PI / 6);
    const arrowY2 = endY - arrowSize * Math.sin(angle + Math.PI / 6);

    const arrowhead = new Konva.Line({
        points: [arrowX1, arrowY1, endX, endY, arrowX2, arrowY2],
        stroke: '#3498db',
        strokeWidth: 2,
        lineCap: 'round',
        lineJoin: 'round',
    });

    return { path, arrowhead };
}

/**
 * Инициализирует Konva Stage с базовыми настройками
 */
export function createKonvaStage(container: HTMLDivElement, width: number, height: number): Konva.Stage {
    return new Konva.Stage({
        container,
        width,
        height,
        // Оптимизации производительности
        imageSmoothingEnabled: false,
        pixelRatio: 1,
    });
}

/**
 * Создает базовые слои для блоков и соединений
 */
export function createBasicLayers(): { blocksLayer: Konva.Layer; edgesLayer: Konva.Layer } {
    const blocksLayer = new Konva.Layer({ 
        listening: true, 
        opacity: 1,
        // Оптимизации для блоков
        clearBeforeDraw: true,
        hitGraphEnabled: true
    });
    
    const edgesLayer = new Konva.Layer({ 
        listening: false, 
        opacity: 1,
        // Оптимизации для соединений
        clearBeforeDraw: true,
        hitGraphEnabled: false // Соединения не интерактивны
    });
    
    return { blocksLayer, edgesLayer };
}
