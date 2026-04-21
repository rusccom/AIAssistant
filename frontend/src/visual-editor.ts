import { protectPage } from './utils/auth';
import { initVisualEditorPage } from './features/visual-editor';

protectPage();

document.addEventListener('DOMContentLoaded', () => {
    void initVisualEditorPage();
});
