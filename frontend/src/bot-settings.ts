import './features/bot-settings/styles/bot-settings-page.css';
import './features/bot-settings/styles/product-modal.css';

import pageContent from './bot-settings.content.html';
import { BotSettingsPageController } from './features/bot-settings/page/bot-settings-page-controller';
import { setupPage } from './layout/app/page-container';
import { protectPage } from './utils/auth';
import { ROUTES, UI_CONFIG } from './utils/constants';
import { initNavigation } from './utils/navigation';
import { initSimpleFouc } from './utils/simple-fouc';
import { getAuthToken } from './utils/api-client';

protectPage();
initSimpleFouc();
initNavigation();

declare global {
    interface Window {
        lucide: {
            createIcons: () => void;
        };
    }
}

function initializePage(): void {
    setupPage(pageContent);

    if (!getAuthToken()) {
        window.location.href = ROUTES.LOGIN;
        return;
    }

    window.setTimeout(() => {
        const controller = new BotSettingsPageController();
        controller.init();
    }, UI_CONFIG.TIMEOUTS.AUTO_SAVE_DELAY / 10);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage);
} else {
    initializePage();
}
