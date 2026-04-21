import type Konva from 'konva';

export type ProviderKind = 'openai' | 'gemini';
export type ReasoningMode = 'inherit' | 'fast' | 'balanced' | 'deep';
export type SpecialStateId = 'start' | 'end';

export interface Point {
    x: number;
    y: number;
}

export interface Bounds extends Point {
    width: number;
    height: number;
}

export interface VisibleViewport {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
}

export interface StateData {
    id: string;
    description: string;
    instructions: string[];
    examples: string[];
    reasoningMode: ReasoningMode;
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
    statePositions: Record<string, Point>;
    startConnection: string | null;
}

export interface BotTransition {
    next_step: string;
    condition?: string;
}

export interface BotStateRecord {
    id: string;
    description: string;
    instructions: string[];
    examples: string[];
    reasoningMode?: ReasoningMode;
    transitions?: BotTransition[];
}

export interface BotConfigRecord {
    provider?: ProviderKind;
    conversationStates?: BotStateRecord[];
    editorSettings?: Partial<EditorSettings>;
    [key: string]: unknown;
}

export interface DomainOption {
    hostname: string;
}

export interface GeneratedStateRecord {
    id?: string;
    description?: string;
    instructions?: string[];
    examples?: string[];
}

export interface FileExportRecord {
    states: StateData[];
    connections: Connection[];
    editorSettings: EditorSettings;
    metadata: {
        exportDate: string;
        version: string;
    };
}

export interface HeaderElements {
    domainBadge: HTMLElement;
    title: HTMLElement;
    addStateButton: HTMLButtonElement;
    saveButton: HTMLButtonElement;
    clearButton: HTMLButtonElement;
    backButton: HTMLButtonElement;
}

export interface CanvasElements {
    wrapper: HTMLElement;
    content: HTMLElement;
    host: HTMLDivElement;
    zoomInButton: HTMLButtonElement;
    zoomOutButton: HTMLButtonElement;
    zoomResetButton: HTMLButtonElement;
    zoomLevel: HTMLElement;
    connectionStatus: HTMLElement;
}

export interface EditModalElements {
    root: HTMLElement;
    closeButton: HTMLButtonElement;
    cancelButton: HTMLButtonElement;
    saveButton: HTMLButtonElement;
    aiAssistButton: HTMLButtonElement;
    idInput: HTMLInputElement;
    descriptionInput: HTMLTextAreaElement;
    instructionsInput: HTMLTextAreaElement;
    examplesInput: HTMLTextAreaElement;
    reasoningGroup: HTMLElement;
    reasoningModeSelect: HTMLSelectElement;
}

export interface AiAssistModalElements {
    root: HTMLElement;
    closeButton: HTMLButtonElement;
    cancelButton: HTMLButtonElement;
    generateButton: HTMLButtonElement;
    promptInput: HTMLTextAreaElement;
    errorMessage: HTMLElement;
}

export interface EditorElements {
    header: HeaderElements;
    canvas: CanvasElements;
    propertiesPanel: HTMLElement;
    contextMenu: HTMLElement;
    editModal: EditModalElements;
    aiAssistModal: AiAssistModalElements;
}

export interface ConnectableBlock {
    readonly id: string;
    getBounds(): Bounds;
    getCenter(): Point;
}

export interface StateBlockCallbacks {
    onSelect: (stateId: string) => void;
    onEdit: (stateId: string) => void;
    onContextMenu: (event: MouseEvent, stateId: string) => void;
    onDragModeChange: (enabled: boolean) => void;
    onBlockMove: (stateId: string) => void;
    onBlockDragEnd: () => void;
}

export interface SpecialBlockCallbacks {
    onContextMenu: (event: MouseEvent, stateId: SpecialStateId) => void;
}

export interface ArrowShapeSet {
    arrowHead: Konva.Line;
    path: Konva.Path;
}

export interface EditStateFormValue {
    description: string;
    examples: string[];
    id: string;
    instructions: string[];
    reasoningMode: ReasoningMode;
}
