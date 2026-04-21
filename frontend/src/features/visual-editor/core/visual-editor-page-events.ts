import type { EditorElements } from '../types/editor-types';

export interface VisualEditorPageEventHandlers {
    onAddState: () => void;
    onBack: () => void;
    onClear: () => void;
    onKeyDown: (event: KeyboardEvent) => void;
    onSave: () => void | Promise<void>;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onZoomReset: () => void;
}

export function bindVisualEditorPageEvents(
    elements: EditorElements,
    handlers: VisualEditorPageEventHandlers
): void {
    bindHeaderEvents(elements, handlers);
    bindCanvasEvents(elements, handlers);
    document.addEventListener('keydown', handlers.onKeyDown);
}

function bindCanvasEvents(
    elements: EditorElements,
    handlers: VisualEditorPageEventHandlers
): void {
    elements.canvas.zoomInButton.addEventListener('click', handlers.onZoomIn);
    elements.canvas.zoomOutButton.addEventListener('click', handlers.onZoomOut);
    elements.canvas.zoomResetButton.addEventListener('click', handlers.onZoomReset);
}

function bindHeaderEvents(
    elements: EditorElements,
    handlers: VisualEditorPageEventHandlers
): void {
    elements.header.addStateButton.addEventListener('click', handlers.onAddState);
    elements.header.saveButton.addEventListener('click', () => void handlers.onSave());
    elements.header.clearButton.addEventListener('click', handlers.onClear);
    elements.header.backButton.addEventListener('click', handlers.onBack);
}
