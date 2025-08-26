import Konva from 'konva';
import { Point } from '../types';

// Специальный блок для start/end узлов в Konva
export class SpecialBlock {
    id: string;
    konvaGroup!: Konva.Group;
    konvaRect!: Konva.Rect;
    konvaAccent!: Konva.Rect;
    konvaDepthShadow!: Konva.Rect;
    konvaIcon!: Konva.Text;
    konvaText!: Konva.Text;
    position: Point;
    private stage: Konva.Stage;
    private layer: Konva.Layer;

    constructor(id: 'start' | 'end', position: Point, stage: Konva.Stage, layer: Konva.Layer) {
        this.id = id;
        this.position = position;
        this.stage = stage;
        this.layer = layer;
        
        this.createKonvaElements();
        this.updatePosition();
        this.setupEventHandlers();
    }

    private createKonvaElements(): void {
        // Создаем группу для всех элементов блока
        this.konvaGroup = new Konva.Group({
            name: `special-${this.id}`,
            id: this.id,
            draggable: false, // Специальные блоки НИКОГДА не перетаскиваются
            opacity: 1,
            cache: true
        });

        // Определяем цветовую схему для каждого типа блока
        const isStart = this.id === 'start';
        const colors = {
            gradient: isStart 
                ? [0, '#f0fdf4', 1, '#dcfce7'] // Светло-зеленый градиент для START
                : [0, '#fef2f2', 1, '#fee2e2'], // Светло-красный градиент для END
            accent: isStart
                ? [0, '#10b981', 0.5, '#059669', 1, '#047857'] // Зеленый акцент
                : [0, '#ef4444', 0.5, '#dc2626', 1, '#b91c1c'], // Красный акцент
            border: isStart ? '#a7f3d0' : '#fecaca',
            textDark: isStart ? '#065f46' : '#7f1d1d',
            textLight: isStart ? '#10b981' : '#ef4444',
            icon: isStart ? '▶' : '⏹'
        };

        // Дополнительная тень для глубины
        this.konvaDepthShadow = new Konva.Rect({
            width: 140,
            height: 80,
            fill: 'rgba(0,0,0,0.08)',
            cornerRadius: 16,
            x: 2,
            y: 6,
            opacity: 0.7,
            perfectDrawEnabled: false
        });

        // Основной прямоугольник блока с современным дизайном
        this.konvaRect = new Konva.Rect({
            width: 140,
            height: 80,
            fillLinearGradientStartPoint: { x: 0, y: 0 },
            fillLinearGradientEndPoint: { x: 0, y: 80 },
            fillLinearGradientColorStops: colors.gradient,
            stroke: colors.border,
            strokeWidth: 1.5,
            cornerRadius: 16,
            shadowColor: 'rgba(0,0,0,0.12)',
            shadowBlur: 8,
            shadowOffset: { x: 0, y: 4 },
            opacity: 1,
            perfectDrawEnabled: false
        });

        // Акцентная полоска сверху
        const accentMargin = 4;
        this.konvaAccent = new Konva.Rect({
            width: 140 - accentMargin * 2,
            height: 5,
            x: accentMargin,
            y: 0,
            fillLinearGradientStartPoint: { x: 0, y: 0 },
            fillLinearGradientEndPoint: { x: 140 - accentMargin * 2, y: 0 },
            fillLinearGradientColorStops: colors.accent,
            cornerRadius: [12, 12, 0, 0],
            opacity: 1,
            perfectDrawEnabled: false
        });

        // Иконка/символ блока
        this.konvaIcon = new Konva.Text({
            text: colors.icon,
            fontSize: 24,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fill: colors.textLight,
            width: 140,
            height: 30,
            x: 0,
            y: 15,
            align: 'center',
            verticalAlign: 'middle',
            opacity: 0.8,
            perfectDrawEnabled: false
        });

        // Текст блока с улучшенной типографикой
        this.konvaText = new Konva.Text({
            text: this.id.toUpperCase(),
            fontSize: 13,
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            fill: colors.textDark,
            width: 140,
            height: 25,
            x: 0,
            y: 45,
            align: 'center',
            verticalAlign: 'middle',
            fontStyle: '600',
            letterSpacing: 1.2,
            opacity: 1,
            perfectDrawEnabled: false
        });

        // Добавляем элементы в группу (порядок важен для z-index)
        this.konvaGroup.add(this.konvaDepthShadow);
        this.konvaGroup.add(this.konvaRect);
        this.konvaGroup.add(this.konvaAccent);
        this.konvaGroup.add(this.konvaIcon);
        this.konvaGroup.add(this.konvaText);
        
        // Добавляем группу в слой
        this.layer.add(this.konvaGroup);
        
        // Кэшируем группу для лучшей производительности
        this.konvaGroup.cache();
    }

    private setupEventHandlers(): void {
        // Красивые эффекты наведения для специальных блоков
        this.konvaGroup.on('mouseenter', () => {
            this.stage.container().style.cursor = 'pointer';
            
            // Плавное увеличение тени и масштаба
            this.konvaRect.to({
                shadowBlur: 12,
                shadowOffset: { x: 0, y: 6 },
                shadowColor: 'rgba(0,0,0,0.18)',
                scaleX: 1.03,
                scaleY: 1.03,
                duration: 0.2
            });
            
            // Усиливаем акцентную полоску
            this.konvaAccent.to({
                height: 6,
                duration: 0.2
            });
            
            // Анимация иконки
            this.konvaIcon.to({
                fontSize: 26,
                opacity: 1,
                duration: 0.2
            });
            
            // Легкое поднятие всего блока
            this.konvaGroup.to({
                y: this.position.y - 3,
                duration: 0.2
            });
        });
        
        this.konvaGroup.on('mouseleave', () => {
            this.stage.container().style.cursor = 'default';
            
            // Возвращаем обычные параметры
            this.konvaRect.to({
                shadowBlur: 8,
                shadowOffset: { x: 0, y: 4 },
                shadowColor: 'rgba(0,0,0,0.12)',
                scaleX: 1,
                scaleY: 1,
                duration: 0.2
            });
            
            this.konvaAccent.to({
                height: 5,
                duration: 0.2
            });
            
            this.konvaIcon.to({
                fontSize: 24,
                opacity: 0.8,
                duration: 0.2
            });
            
            this.konvaGroup.to({
                y: this.position.y,
                duration: 0.2
            });
        });
        
        // Пульсирующий эффект при клике
        this.konvaGroup.on('click', () => {
            // Быстрая анимация "пульса"
            this.konvaRect.to({
                scaleX: 0.95,
                scaleY: 0.95,
                duration: 0.1,
                onFinish: () => {
                    this.konvaRect.to({
                        scaleX: 1.03,
                        scaleY: 1.03,
                        duration: 0.1
                    });
                }
            });
        });
        
        if (this.id === 'start') {
            // Включаем контекстное меню для START блока
            this.konvaGroup.on('contextmenu', (e) => {
                e.evt.preventDefault();
                const ve = (window as any).visualEditor;
                if (ve) {
                    const mouseEvent = e.evt as MouseEvent;
                    ve.showContextMenu(mouseEvent, (this as unknown) as any);
                }
            });
        }
    }

    updatePosition(): void {
        this.konvaGroup.position({
            x: this.position.x,
            y: this.position.y
        });
    }

    getBounds(): { width: number; height: number; x: number; y: number } {
        return {
            width: 140,
            height: 80,
            x: this.position.x,
            y: this.position.y
        };
    }

    getCenter(): Point {
        return {
            x: this.position.x + 140 / 2,
            y: this.position.y + 80 / 2
        };
    }

    // Совместимость с существующим кодом
    get element(): any {
        return this.konvaGroup;
    }

    destroy(): void {
        this.konvaGroup.destroy();
    }

    // Минимальный API для совместимости с StateBlock
    updateConnectionsCounter(): void {}
    setSelected(selected: boolean): void {
        // Для Konva блоков можно добавить визуальное выделение позже
    }
    setConnecting(connecting: boolean): void {
        // Для Konva блоков можно добавить визуальное состояние соединения позже
    }
}
