import { closeLayer, openLayer, setElementVisible } from '../../../shared/ui/dom';
import { t } from '../../localization';
import { showError, showSuccess } from '../../../utils/error-handler';
import { buildWidgetEmbedSnippet, copyWidgetEmbedSnippet, openWidgetPreview } from '../../widget-integration/widget-embed';

interface WidgetActionsOptions {
    getSelectedDomain: () => string | null;
    getWidgetScriptUrl: () => string;
}

export function bindTabNavigation(): void {
    const tabButtons = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach((button) => {
        button.addEventListener('click', () => {
            tabButtons.forEach((item) => item.classList.remove('active'));
            button.classList.add('active');
            tabContents.forEach((content) => setElementVisible(content as HTMLElement, false));
            const targetTab = document.getElementById(button.getAttribute('data-tab') || '');
            if (targetTab) {
                setElementVisible(targetTab, true);
            }
        });
    });
}

export function bindWidgetActions(options: WidgetActionsOptions): void {
    document.getElementById('copy-widget-code-btn')?.addEventListener('click', async () => {
        const widgetScriptUrl = options.getWidgetScriptUrl();
        if (!widgetScriptUrl) {
            showError(t('botSettings.messages.selectDomainFirstShort'));
            return;
        }

        try {
            await copyWidgetEmbedSnippet(widgetScriptUrl);
            showSuccess(t('botSettings.messages.embedCopied'));
        } catch (error) {
            console.error('Widget code copy error:', error);
            showError(t('botSettings.messages.embedCopyFailed'));
        }
    });

    document.getElementById('test-widget-btn')?.addEventListener('click', () => {
        const widgetScriptUrl = options.getWidgetScriptUrl();
        if (!widgetScriptUrl) {
            showError(t('botSettings.messages.selectDomainFirstShort'));
            return;
        }

        try {
            openWidgetPreview(widgetScriptUrl);
            showSuccess(t('botSettings.messages.widgetOpened', {
                domain: options.getSelectedDomain() || ''
            }));
        } catch (error) {
            console.error('Widget preview error:', error);
            showError(t('botSettings.messages.widgetOpenFailed'));
        }
    });
}

export function closeAddDomainModal(): void {
    const modal = document.getElementById('add-domain-modal') as HTMLDivElement | null;
    const input = document.getElementById('domain-name-input') as HTMLInputElement | null;

    if (modal) {
        closeLayer(modal);
    }

    if (input) {
        input.value = '';
    }
}

export function openAddDomainModal(): void {
    const modal = document.getElementById('add-domain-modal') as HTMLDivElement | null;
    const input = document.getElementById('domain-name-input') as HTMLInputElement | null;

    if (!modal || !input) {
        return;
    }

    openLayer(modal);
    input.focus();
}

export function updateDomainIndicator(domain: string | null): void {
    const indicator = document.getElementById('domain-indicator');
    const domainName = document.getElementById('current-domain-name');

    if (indicator) {
        setElementVisible(indicator, Boolean(domain));
    }

    if (domainName) {
        domainName.textContent = domain || t('botSettings.products.noDomainSelected');
    }
}

export function updateWidgetIntegration(widgetScriptUrl: string): void {
    const widgetEmbedCode = document.getElementById('widget-embed-code') as HTMLTextAreaElement | null;
    const copyButton = document.getElementById('copy-widget-code-btn') as HTMLButtonElement | null;
    const testButton = document.getElementById('test-widget-btn') as HTMLButtonElement | null;

    if (widgetEmbedCode) {
        widgetEmbedCode.value = widgetScriptUrl ? buildWidgetEmbedSnippet(widgetScriptUrl) : '';
    }

    if (copyButton) {
        copyButton.disabled = !widgetScriptUrl;
    }

    if (testButton) {
        testButton.disabled = !widgetScriptUrl;
    }
}
