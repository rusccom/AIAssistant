import './import-status.css';

import { closeLayer, openLayer } from '../../../shared/ui/dom';
import { t } from '../../localization';
import { apiRequest } from '../../../utils/api-client';
import { API_ENDPOINTS } from '../../../utils/constants';
import { showError, showSuccess, showWarning } from '../../../utils/error-handler';
import { ImportStatusController } from './import-status';
import { ImportProduct, parseImportFile, processImportData } from './import-parser';

interface SetupImportModalOptions {
    getSelectedDomain: () => string | null;
    refreshProducts: () => Promise<void> | void;
}

interface BulkImportResponse {
    error?: string;
    errors?: string[];
    failed?: number;
    imported?: number;
    message?: string;
}

type ImportElements = {
    cancelBtn: HTMLButtonElement;
    closeBtn: HTMLButtonElement;
    fileInput: HTMLInputElement;
    form: HTMLFormElement;
    groupCheckbox: HTMLInputElement;
    modal: HTMLDivElement;
    submitBtn: HTMLButtonElement;
    trigger: HTMLButtonElement;
};

type ImportRequestError = Error & { details?: string[] };
type ImportContext = {
    domain: string;
    file: File;
    groupVariants: boolean;
};

export function setupImportModal(options: SetupImportModalOptions): void {
    const elements = getImportElements();

    if (!elements) {
        return;
    }

    const status = new ImportStatusController();
    const closeModal = () => tryCloseModal(elements, status);

    elements.trigger.addEventListener('click', () => openModal(elements, status));
    elements.closeBtn.addEventListener('click', closeModal);
    elements.cancelBtn.addEventListener('click', closeModal);
    elements.form.addEventListener('submit', (event) => {
        void submitImport(event, elements, status, options, closeModal);
    });
    elements.modal.addEventListener('click', (event) => {
        if (event.target === elements.modal) {
            closeModal();
        }
    });
}

function getImportElements(): ImportElements | null {
    const trigger = document.getElementById('import-btn') as HTMLButtonElement | null;
    const modal = document.getElementById('import-modal') as HTMLDivElement | null;
    const form = document.getElementById('import-form') as HTMLFormElement | null;
    const fileInput = document.getElementById('price-list-file') as HTMLInputElement | null;
    const groupCheckbox = document.getElementById('group-variants-checkbox') as HTMLInputElement | null;
    const submitBtn = document.getElementById('submit-import-btn') as HTMLButtonElement | null;
    const closeBtn = document.getElementById('close-import-modal-btn') as HTMLButtonElement | null;
    const cancelBtn = document.getElementById('cancel-import-btn') as HTMLButtonElement | null;

    if (!trigger || !modal || !form || !fileInput || !groupCheckbox || !submitBtn || !closeBtn || !cancelBtn) {
        console.error('Import modal elements are missing.');
        return null;
    }

    return { trigger, modal, form, fileInput, groupCheckbox, submitBtn, closeBtn, cancelBtn };
}

function openModal(elements: ImportElements, status: ImportStatusController): void {
    status.reset();
    elements.form.reset();
    setBusyState(elements, false);
    openLayer(elements.modal);
}

function tryCloseModal(elements: ImportElements, status: ImportStatusController): void {
    if (status.isBusy()) {
        return;
    }

    closeLayer(elements.modal);
    elements.form.reset();
    setBusyState(elements, false);
    status.reset();
}

async function submitImport(
    event: Event,
    elements: ImportElements,
    status: ImportStatusController,
    options: SetupImportModalOptions,
    closeModal: () => void
): Promise<void> {
    event.preventDefault();
    const context = getImportContext(elements, options);

    if (!context) {
        return;
    }

    setBusyState(elements, true);

    try {
        await runImportFlow(context, status, options, closeModal);
    } catch (error) {
        handleImportError(error, status);
    } finally {
        setBusyState(elements, false);
    }
}

function getImportContext(
    elements: ImportElements,
    options: SetupImportModalOptions
): ImportContext | null {
    const file = elements.fileInput.files?.[0];
    const domain = options.getSelectedDomain();

    if (!file) {
        showError(t('botSettings.import.selectFile'));
        return null;
    }

    if (!domain) {
        showError(t('botSettings.messages.selectDomainFirst'));
        return null;
    }

    return { file, domain, groupVariants: elements.groupCheckbox.checked };
}

async function runImportFlow(
    context: ImportContext,
    status: ImportStatusController,
    options: SetupImportModalOptions,
    closeModal: () => void
): Promise<void> {
    const products = await prepareProducts(context.file, context.groupVariants, status);
    const result = await sendImportRequest(products, context.domain);
    const refreshFailed = await refreshProducts(status, options.refreshProducts, result);

    finishImport(status, result, refreshFailed);
    notifyImportResult(result, refreshFailed);
    scheduleClose(closeModal, result.failed ?? 0);
}

async function prepareProducts(
    file: File,
    groupVariants: boolean,
    status: ImportStatusController
): Promise<ImportProduct[]> {
    status.start('reading', t('botSettings.import.readingFile', { fileName: file.name }));

    const rawData = await parseImportFile(file);

    if (rawData.length === 0) {
        throw new Error(t('botSettings.import.noData'));
    }

    status.update(
        'processing',
        t('botSettings.import.preparingProducts'),
        t('botSettings.import.rowsFound', { count: rawData.length })
    );

    const products = processImportData(rawData, groupVariants);

    if (products.length === 0) {
        throw new Error(t('botSettings.import.noValidProducts'));
    }

    status.update(
        'uploading',
        t('botSettings.import.uploadingProducts'),
        buildUploadMeta(rawData.length, products.length, groupVariants)
    );
    return products;
}

async function sendImportRequest(products: ImportProduct[], domain: string): Promise<BulkImportResponse> {
    const { data, response } = await apiRequest<BulkImportResponse>(API_ENDPOINTS.PRODUCTS.BULK_IMPORT, {
        method: 'POST',
        body: JSON.stringify({ products, domain })
    });

    if (!response.ok) {
        throw createImportRequestError(data);
    }

    return data;
}

function createImportRequestError(data: BulkImportResponse): ImportRequestError {
    const message = data.error || data.message || t('common.messages.serverError');
    const error = new Error(message) as ImportRequestError;
    error.details = Array.isArray(data.errors) ? data.errors : [];
    return error;
}

function buildUploadMeta(rawRows: number, products: number, groupVariants: boolean): string {
    return groupVariants
        ? t('botSettings.import.groupedMeta', { rows: rawRows, products })
        : t('botSettings.import.ungroupedMeta', { rows: rawRows, products });
}

function createResultSummary(result: BulkImportResponse): string {
    return t('botSettings.import.summary', {
        failed: result.failed ?? 0,
        imported: result.imported ?? 0
    });
}

async function refreshProducts(
    status: ImportStatusController,
    refresh: SetupImportModalOptions['refreshProducts'],
    result: BulkImportResponse
): Promise<boolean> {
    status.update('refreshing', t('botSettings.import.refreshingTable'), createResultSummary(result));

    try {
        await refresh();
        return false;
    } catch (error) {
        console.error('Failed to refresh products after import:', error);
        return true;
    }
}

function finishImport(
    status: ImportStatusController,
    result: BulkImportResponse,
    refreshFailed: boolean
): void {
    const message = buildCompletionMessage(result, refreshFailed);
    const summary = buildCompletionSummary(result, refreshFailed);
    status.finishSuccess(message, summary);
}

function notifyImportResult(result: BulkImportResponse, refreshFailed: boolean): void {
    const summary = createResultSummary(result);

    if (refreshFailed) {
        showWarning(`${summary}\n${t('botSettings.import.refreshWarning')}`);
        return;
    }

    if ((result.failed ?? 0) > 0) {
        showWarning(summary);
        return;
    }

    showSuccess(summary);
}

function scheduleClose(closeModal: () => void, failed: number): void {
    const delay = failed > 0 ? 1600 : 900;
    window.setTimeout(closeModal, delay);
}

function buildCompletionMessage(result: BulkImportResponse, refreshFailed: boolean): string {
    if (refreshFailed) {
        return t('botSettings.import.refreshPending');
    }

    return result.failed ? t('botSettings.import.completedWithWarnings') : t('botSettings.import.completed');
}

function buildCompletionSummary(result: BulkImportResponse, refreshFailed: boolean): string {
    const summary = createResultSummary(result);

    return refreshFailed
        ? t('botSettings.import.refreshPendingSummary', { summary })
        : summary;
}

function handleImportError(error: unknown, status: ImportStatusController): void {
    const message = getErrorMessage(error);
    const details = getErrorDetails(error);

    status.finishError(message, details[0] || t('botSettings.import.errorFallback'));
    showError(formatErrorMessage(message, details));
}

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : t('common.messages.serverError');
}

function getErrorDetails(error: unknown): string[] {
    return error instanceof Error && 'details' in error && Array.isArray((error as ImportRequestError).details)
        ? (error as ImportRequestError).details ?? []
        : [];
}

function formatErrorMessage(message: string, details: string[]): string {
    const extra = details.slice(0, 5);

    if (extra.length === 0) {
        return message;
    }

    const suffix = details.length > extra.length
        ? `\n${t('botSettings.import.moreErrors', { count: details.length - extra.length })}`
        : '';

    return `${message}\n${extra.join('\n')}${suffix}`;
}

function setBusyState(elements: ImportElements, busy: boolean): void {
    elements.submitBtn.disabled = busy;
    elements.closeBtn.disabled = busy;
    elements.cancelBtn.disabled = busy;
    elements.fileInput.disabled = busy;
    elements.groupCheckbox.disabled = busy;
    elements.submitBtn.textContent = busy ? t('botSettings.import.inProgress') : t('common.buttons.import');
}
