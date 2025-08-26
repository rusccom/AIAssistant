// Типы для Visual Editor

export interface Point {
    x: number;
    y: number;
}

export interface StateData {
    id: string;
    description: string;
    instructions: string[];
    examples: string[];
    position: Point;
    connections: string[];
}

export interface Connection {
    id: string;
    from: string;
    to: string;
    condition?: string;
}

export interface EditorSettings {
    zoom: number;
    panOffset: Point;
    selectedDomain: string | null;
    statePositions: Record<string, Point>;
}

export interface VisualEditorConfig {
    canvas: HTMLCanvasElement;
    canvasContainer: HTMLElement;
    canvasWrapper: HTMLElement;
    contextMenu: HTMLElement;
    editModal: HTMLElement;
    aiAssistModal: HTMLElement;
    domainSelect: HTMLSelectElement;
}
