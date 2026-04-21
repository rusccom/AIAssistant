import type {
    AiAssistModalElements,
    CanvasElements,
    EditModalElements,
    EditorElements,
    HeaderElements
} from '../types/editor-types';

function requireById<T extends HTMLElement>(id: string): T {
    const element = document.getElementById(id);
    if (!element) {
        throw new Error(`Missing required element: #${id}`);
    }

    return element as T;
}

function requireBySelector<T extends Element>(selector: string): T {
    const element = document.querySelector(selector);
    if (!element) {
        throw new Error(`Missing required element: ${selector}`);
    }

    return element as T;
}

function getHeaderElements(): HeaderElements {
    return {
        domainBadge: requireById<HTMLElement>('header-domain-badge'),
        title: requireById<HTMLElement>('header-title'),
        addStateButton: requireById<HTMLButtonElement>('add-state-btn'),
        saveButton: requireById<HTMLButtonElement>('save-states-btn'),
        clearButton: requireById<HTMLButtonElement>('clear-canvas-btn'),
        backButton: requireById<HTMLButtonElement>('back-to-settings-btn')
    };
}

function getCanvasElements(): CanvasElements {
    return {
        wrapper: requireBySelector<HTMLElement>('.canvas-wrapper'),
        content: requireById<HTMLElement>('canvas-content'),
        host: requireById<HTMLDivElement>('konva-container'),
        zoomInButton: requireById<HTMLButtonElement>('zoom-in-btn'),
        zoomOutButton: requireById<HTMLButtonElement>('zoom-out-btn'),
        zoomResetButton: requireById<HTMLButtonElement>('zoom-reset-btn'),
        zoomLevel: requireById<HTMLElement>('zoom-level'),
        connectionStatus: requireById<HTMLElement>('connection-status')
    };
}

function getEditModalElements(): EditModalElements {
    return {
        root: requireById<HTMLElement>('edit-state-modal'),
        closeButton: requireById<HTMLButtonElement>('close-edit-modal'),
        cancelButton: requireById<HTMLButtonElement>('cancel-edit-btn'),
        saveButton: requireById<HTMLButtonElement>('save-edit-btn'),
        aiAssistButton: requireById<HTMLButtonElement>('ai-assist-btn'),
        idInput: requireById<HTMLInputElement>('state-id-input'),
        descriptionInput: requireById<HTMLTextAreaElement>('state-description-input'),
        instructionsInput: requireById<HTMLTextAreaElement>('state-instructions-input'),
        examplesInput: requireById<HTMLTextAreaElement>('state-examples-input'),
        reasoningGroup: requireById<HTMLElement>('state-reasoning-group'),
        reasoningModeSelect: requireById<HTMLSelectElement>('state-reasoning-mode')
    };
}

function getAiAssistModalElements(): AiAssistModalElements {
    return {
        root: requireById<HTMLElement>('ai-assist-modal'),
        closeButton: requireById<HTMLButtonElement>('close-ai-modal'),
        cancelButton: requireById<HTMLButtonElement>('cancel-ai-btn'),
        generateButton: requireById<HTMLButtonElement>('generate-content-btn'),
        promptInput: requireById<HTMLTextAreaElement>('ai-prompt-input'),
        errorMessage: requireById<HTMLElement>('ai-error-message')
    };
}

export function getEditorElements(): EditorElements {
    return {
        header: getHeaderElements(),
        canvas: getCanvasElements(),
        propertiesPanel: requireById<HTMLElement>('properties-panel'),
        contextMenu: requireById<HTMLElement>('context-menu'),
        editModal: getEditModalElements(),
        aiAssistModal: getAiAssistModalElements()
    };
}
