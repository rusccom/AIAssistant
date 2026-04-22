import { Modal } from '../../../components';
import { t } from '../../localization';
import { apiRequest } from '../../../utils/api-client';
import { API_ENDPOINTS } from '../../../utils/constants';
import { handleApiError, showError, showSuccess } from '../../../utils/error-handler';

type SetupRebuildEmbeddingsOptions = {
    getSelectedDomain: () => string | null;
};

type RebuildEmbeddingsResponse = {
    failedProducts: number;
    rebuiltProducts: number;
    success: boolean;
    totalProducts: number;
};

const DEFAULT_LABEL_KEY = 'botSettings.products.rebuildEmbeddings';
const RUNNING_LABEL_KEY = 'botSettings.rebuild.running';

export function setupRebuildEmbeddingsButton(options: SetupRebuildEmbeddingsOptions): void {
    const button = document.getElementById('rebuild-embeddings-btn') as HTMLButtonElement | null;

    if (!button) {
        return;
    }

    button.addEventListener('click', () => {
        const domain = options.getSelectedDomain();

        if (!domain) {
            showError(t('botSettings.messages.selectDomainFirst'));
            return;
        }

        Modal.confirm(
            t('botSettings.rebuild.confirmMessage'),
            t('botSettings.rebuild.confirmTitle'),
            () => {
                void rebuildEmbeddings(button, domain);
            }
        );
    });
}

async function rebuildEmbeddings(
    button: HTMLButtonElement,
    domain: string
): Promise<void> {
    updateButtonState(button, true);

    try {
        const { data } = await apiRequest<RebuildEmbeddingsResponse>(
            API_ENDPOINTS.PRODUCTS.REBUILD_EMBEDDINGS,
            {
                method: 'POST',
                body: JSON.stringify({ domain })
            }
        );

        showSuccess(buildSuccessMessage(data));
    } catch (error) {
        handleApiError(error, 'rebuilding embeddings');
    } finally {
        updateButtonState(button, false);
    }
}

function buildSuccessMessage(data: RebuildEmbeddingsResponse): string {
    if (data.failedProducts > 0) {
        return t('botSettings.rebuild.successWithFailures', {
            failed: data.failedProducts,
            rebuilt: data.rebuiltProducts,
            total: data.totalProducts
        });
    }

    return t('botSettings.rebuild.success', {
        rebuilt: data.rebuiltProducts,
        total: data.totalProducts
    });
}

function updateButtonState(button: HTMLButtonElement, isRunning: boolean): void {
    button.disabled = isRunning;
    button.textContent = t(isRunning ? RUNNING_LABEL_KEY : DEFAULT_LABEL_KEY);
}
