import { apiRequest } from '../../../utils/api-client';
import { API_ENDPOINTS, ROUTES } from '../../../utils/constants';
import { handleApiError, showError, showSuccess } from '../../../utils/error-handler';
import { setElementVisible } from '../../../shared/ui/dom';
import { setupImportModal } from '../../products/import/import-modal';
import { setupRebuildEmbeddingsButton } from '../../products/embeddings/rebuild-embeddings';
import { bindRealtimeSettingsForm, syncRealtimeSettingsForm, type RealtimeProviderOption } from '../../realtime/realtime-settings';
import { createDomainCardMarkup } from '../renderers/bot-settings-ui';
import type {
    BotSettingsDashboardData,
    BotSettingsDomainConfig,
    BotSettingsDomainRecord,
    BotSettingsWindow
} from '../types';
import { ProductSectionController } from '../products/product-section-controller';
import {
    bindTabNavigation,
    bindWidgetActions,
    closeAddDomainModal,
    openAddDomainModal,
    updateDomainIndicator,
    updateWidgetIntegration
} from './page-ui-helpers';

export class BotSettingsPageController {
    private selectedDomain: string | null = null;
    private domainWidgetScriptUrls: Record<string, string> = {};
    private readonly productSection = new ProductSectionController({
        getSelectedDomain: () => this.selectedDomain
    });
    private readonly appWindow = window as BotSettingsWindow;

    public init(): void {
        if (!document.getElementById('add-domain-btn') || !document.getElementById('bot-config-form')) {
            window.location.href = ROUTES.BOT_SETTINGS;
            return;
        }

        bindRealtimeSettingsForm(() => this.getRealtimeProviders());
        this.productSection.init();
        this.bindDomainModal();
        this.bindBotConfigForm();
        bindWidgetActions({
            getSelectedDomain: () => this.selectedDomain,
            getWidgetScriptUrl: () => this.getSelectedWidgetScriptUrl()
        });
        this.bindVisualEditorLink();
        bindTabNavigation();
        setupImportModal({
            getSelectedDomain: () => this.selectedDomain,
            refreshProducts: () => this.productSection.refreshFirstPage()
        });
        setupRebuildEmbeddingsButton({
            getSelectedDomain: () => this.selectedDomain
        });
        void this.fetchDashboardData();
    }

    private getRealtimeProviders(): RealtimeProviderOption[] {
        return this.appWindow.realtimeProviders || [];
    }

    private bindBotConfigForm(): void {
        document.getElementById('bot-config-form')?.addEventListener('submit', (event) => {
            void this.saveBotConfig(event);
        });
    }

    private bindDomainModal(): void {
        document.getElementById('add-domain-btn')?.addEventListener('click', openAddDomainModal);
        document.getElementById('close-modal-btn')?.addEventListener('click', closeAddDomainModal);
        document.getElementById('cancel-modal-btn')?.addEventListener('click', closeAddDomainModal);
        document.getElementById('add-domain-form')?.addEventListener('submit', (event) => {
            void this.addDomain(event);
        });
    }

    private bindVisualEditorLink(): void {
        (document.getElementById('open-visual-editor-btn') as HTMLAnchorElement | null)?.addEventListener('click', (event) => {
            if (!this.selectedDomain) {
                event.preventDefault();
                showError('Please select a domain first');
                return;
            }

            (event.currentTarget as HTMLAnchorElement).href = `/visual-editor.html?domain=${encodeURIComponent(this.selectedDomain)}`;
        });
    }


    private async fetchDashboardData(): Promise<void> {
        try {
            const { data } = await apiRequest<BotSettingsDashboardData>(API_ENDPOINTS.DASHBOARD.DATA);

            if (!data.success) {
                throw new Error('Server error');
            }

            this.appWindow.domainConfigs = data.domainConfigs;
            this.appWindow.realtimeProviders = data.realtimeProviders || [];
            this.domainWidgetScriptUrls = data.domains.reduce<Record<string, string>>((result, domain) => {
                if (domain.widgetScriptUrl) {
                    result[domain.hostname] = domain.widgetScriptUrl;
                }

                return result;
            }, {});
            this.renderDomains(data.domains);
            updateWidgetIntegration(this.getSelectedWidgetScriptUrl());

            if ((data.voices || []).length > 0) {
                syncRealtimeSettingsForm(this.getRealtimeProviders());
            } else {
                const voiceSelect = document.getElementById('voice') as HTMLSelectElement | null;
                if (voiceSelect) {
                    voiceSelect.innerHTML = '<option value="alloy">Alloy (Default)</option>';
                }
            }
        } catch (error) {
            console.error(error);
            handleApiError(error, 'loading dashboard data');
        }
    }

    private renderDomains(domains: BotSettingsDomainRecord[]): void {
        const domainsList = document.getElementById('domains-list');
        const emptyState = document.getElementById('empty-domains');

        if (!domainsList || !emptyState) {
            return;
        }

        if (domains.length === 0) {
            domainsList.innerHTML = '';
            setElementVisible(emptyState, true);
            return;
        }

        setElementVisible(emptyState, false);
        domainsList.innerHTML = domains.map((domain) => `
            <div class="domain-item ${this.selectedDomain === domain.hostname ? 'selected' : ''}" data-domain="${domain.hostname}">
                ${createDomainCardMarkup(domain)}
            </div>
        `).join('');
        domainsList.querySelectorAll<HTMLElement>('.domain-item').forEach((item) => {
            item.addEventListener('click', () => {
                void this.selectDomain(item.dataset.domain || '');
            });
        });
    }

    private async selectDomain(domain: string): Promise<void> {
        if (!domain) {
            return;
        }

        document.querySelectorAll('.domain-item').forEach((item) => item.classList.remove('selected'));
        document.querySelector<HTMLElement>(`.domain-item[data-domain="${domain}"]`)?.classList.add('selected');
        this.selectedDomain = domain;
        updateDomainIndicator(domain);
        this.loadBotConfig(domain);
        updateWidgetIntegration(this.getSelectedWidgetScriptUrl());
        await this.productSection.handleDomainChange();
    }

    private loadBotConfig(domain: string): void {
        const config = (this.appWindow.domainConfigs || {})[domain] || {};
        const selectedDomainLabel = document.getElementById('selected-domain-label');
        const botConfigSection = document.getElementById('bot-config-section');

        if (selectedDomainLabel) {
            selectedDomainLabel.textContent = domain;
        }

        if (botConfigSection) {
            setElementVisible(botConfigSection, true);
        }

        (document.getElementById('identity') as HTMLTextAreaElement | null)!.value = config.identity || '';
        (document.getElementById('task') as HTMLTextAreaElement | null)!.value = config.task || '';
        (document.getElementById('otherDetails') as HTMLInputElement | null)!.value = config.otherDetails || '';
        (document.getElementById('instructions') as HTMLTextAreaElement | null)!.value = config.instructions || '';
        syncRealtimeSettingsForm(this.getRealtimeProviders(), {
            model: config.model,
            provider: config.provider,
            voice: config.voice
        });
    }

    private async saveBotConfig(event: Event): Promise<void> {
        event.preventDefault();
        if (!this.selectedDomain) {
            return;
        }

        const currentConfig = (this.appWindow.domainConfigs || {})[this.selectedDomain] || {};
        const configData: BotSettingsDomainConfig = {
            identity: (document.getElementById('identity') as HTMLTextAreaElement | null)?.value || '',
            instructions: (document.getElementById('instructions') as HTMLTextAreaElement | null)?.value || '',
            model: (document.getElementById('model') as HTMLSelectElement | null)?.value || '',
            otherDetails: (document.getElementById('otherDetails') as HTMLInputElement | null)?.value || '',
            provider: (document.getElementById('provider') as HTMLSelectElement | null)?.value || '',
            task: (document.getElementById('task') as HTMLTextAreaElement | null)?.value || '',
            voice: (document.getElementById('voice') as HTMLSelectElement | null)?.value || ''
        };

        try {
            await apiRequest(`${API_ENDPOINTS.BOT_CONFIG.BASE}?domain=${this.selectedDomain}`, {
                body: JSON.stringify(configData),
                method: 'PUT'
            });
            this.appWindow.domainConfigs = {
                ...(this.appWindow.domainConfigs || {}),
                [this.selectedDomain]: { ...currentConfig, ...configData }
            };
            showSuccess('Configuration saved successfully.');
        } catch (error) {
            console.error(error);
            handleApiError(error, 'saving configuration');
        }
    }

    private async addDomain(event: Event): Promise<void> {
        event.preventDefault();
        const input = document.getElementById('domain-name-input') as HTMLInputElement | null;
        const hostname = input?.value.trim() || '';

        if (!hostname) {
            showError('Please enter a domain name.');
            return;
        }

        try {
            const { response } = await apiRequest('/api/dashboard/domains', {
                body: JSON.stringify({ hostname }),
                method: 'POST'
            });

            if (response.status === 409) {
                showError('This domain has already been added.');
                return;
            }

            closeAddDomainModal();
            await this.fetchDashboardData();
            showSuccess('Domain added successfully.');
        } catch (error) {
            console.error(error);
            handleApiError(error, 'adding domain');
        }
    }

    private getSelectedWidgetScriptUrl(): string {
        return this.selectedDomain ? this.domainWidgetScriptUrls[this.selectedDomain] || '' : '';
    }
}
