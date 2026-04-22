import { showError } from '../../../utils/error-handler';
import { ROUTES } from '../../../utils/constants';
import { initNavigation } from '../../../utils/navigation';
import { initSimpleFouc } from '../../../utils/simple-fouc';
import {
    CLIENT_THEME_CHANGE_EVENT,
    initializeClientTheme,
    mountClientThemeControls
} from '../../client-theme/theme-controller';
import {
    APP_LANGUAGE_CHANGE_EVENT,
    initializeAppLanguage,
    t
} from '../../localization';
import { getEditorElements } from '../dom/editor-elements';
import { VisualEditorController } from '../core/visual-editor-controller';

function redirectIfTokenMissing(): boolean {
    const token = localStorage.getItem('authToken');
    if (token) {
        return false;
    }

    showError(t('visualEditor.messages.loginRequired'));
    window.location.href = ROUTES.LOGIN;
    return true;
}

function exposeController(controller: VisualEditorController): void {
    const host = window as Window & { visualEditor?: VisualEditorController };
    host.visualEditor = controller;
}

export async function initVisualEditorPage(): Promise<void> {
    initializeAppLanguage('titles.visualEditor');
    initializeClientTheme();
    initSimpleFouc();
    initNavigation();

    if (redirectIfTokenMissing()) {
        return;
    }

    try {
        const controller = new VisualEditorController(getEditorElements());
        exposeController(controller);
        await controller.initialize();
        mountClientThemeControls();
        document.addEventListener(CLIENT_THEME_CHANGE_EVENT, () => controller.refreshTheme());
        document.addEventListener(APP_LANGUAGE_CHANGE_EVENT, () => controller.refreshLanguage());
    } catch (error) {
        console.error('Failed to initialize visual editor', error);
    }
}
