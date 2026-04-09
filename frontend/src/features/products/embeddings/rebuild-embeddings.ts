import { Modal } from '../../../components';
import { apiRequest } from '../../../utils/api-client';
import { API_ENDPOINTS } from '../../../utils/constants';
import { handleApiError, showError, showSuccess } from '../../../utils/error-handler';

type SetupRebuildEmbeddingsOptions = {
    getSelectedDomain: () => string | null;
};

type RebuildEmbeddingsResponse = {
    success: boolean;
    message: string;
    totalProducts: number;
    rebuiltProducts: number;
    failedProducts: number;
};

const DEFAULT_LABEL = 'Rebuild Embeddings';
const RUNNING_LABEL = 'Rebuilding...';

export function setupRebuildEmbeddingsButton(
    options: SetupRebuildEmbeddingsOptions,
): void {
    const button = document.getElementById('rebuild-embeddings-btn') as HTMLButtonElement | null;

    if (!button) {
        return;
    }

    button.addEventListener('click', () => {
        const domain = options.getSelectedDomain();

        if (!domain) {
            showError('Please select a domain first');
            return;
        }

        Modal.confirm(
            'This will rebuild embeddings for all products and variants in the current domain. It may take some time.',
            'Rebuild Embeddings',
            () => {
                void rebuildEmbeddings(button, domain);
            }
        );
    });
}

async function rebuildEmbeddings(
    button: HTMLButtonElement,
    domain: string,
): Promise<void> {
    updateButtonState(button, true);

    try {
        const { data } = await apiRequest<RebuildEmbeddingsResponse>(
            API_ENDPOINTS.PRODUCTS.REBUILD_EMBEDDINGS,
            {
                method: 'POST',
                body: JSON.stringify({ domain }),
            },
        );

        showSuccess(data.message);
    } catch (error) {
        handleApiError(error, 'rebuilding embeddings');
    } finally {
        updateButtonState(button, false);
    }
}

function updateButtonState(button: HTMLButtonElement, isRunning: boolean): void {
    button.disabled = isRunning;
    button.textContent = isRunning ? RUNNING_LABEL : DEFAULT_LABEL;
}
