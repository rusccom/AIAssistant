import { showError } from '../../../utils/error-handler';
import { ROUTES } from '../../../utils/constants';
import { initNavigation } from '../../../utils/navigation';
import { initSimpleFouc } from '../../../utils/simple-fouc';
import { getEditorElements } from '../dom/editor-elements';
import { VisualEditorController } from '../core/visual-editor-controller';

function redirectIfTokenMissing(): boolean {
    const token = localStorage.getItem('authToken');
    if (token) {
        return false;
    }

    showError('Please log in to access the visual editor');
    window.location.href = ROUTES.LOGIN;
    return true;
}

function exposeController(controller: VisualEditorController): void {
    const host = window as Window & { visualEditor?: VisualEditorController };
    host.visualEditor = controller;
}

export async function initVisualEditorPage(): Promise<void> {
    initSimpleFouc();
    initNavigation();

    if (redirectIfTokenMissing()) {
        return;
    }

    try {
        const controller = new VisualEditorController(getEditorElements());
        exposeController(controller);
        await controller.initialize();
    } catch (error) {
        console.error('Failed to initialize visual editor', error);
    }
}
