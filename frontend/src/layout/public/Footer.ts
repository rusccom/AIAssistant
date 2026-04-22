import { refreshLocalizedUi } from '../../features/localization';

const footerTemplate = `
    <footer class="main-footer">
        <p data-i18n-html="common.footer.rights">&copy; 2025 AIAssistant. All rights reserved.</p>
    </footer>
`;

export const insertFooter = () => {
    const app = document.getElementById('app');
    if (app) {
        app.insertAdjacentHTML('beforeend', footerTemplate);
        refreshLocalizedUi(app);
    }
};
