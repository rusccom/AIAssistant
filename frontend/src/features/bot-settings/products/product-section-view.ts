import { setElementVisible } from '../../../shared/ui/dom';
import { renderProductsEmptyState, renderProductTable } from '../renderers/bot-settings-ui';
import type { BotSettingsProduct } from '../types';

export function renderProductsTable(
    tableBody: HTMLTableSectionElement | null,
    products: BotSettingsProduct[],
    selectedDomain: string | null
): void {
    if (!tableBody) {
        return;
    }

    tableBody.innerHTML = products.length
        ? renderProductTable(products)
        : renderProductsEmptyState(selectedDomain);
}

export function updateProductSearchInfo(
    container: HTMLElement | null,
    textElement: HTMLElement | null,
    search: string,
    totalProducts: number
): void {
    if (!container || !textElement || !search.trim()) {
        if (container) {
            setElementVisible(container, false);
        }

        return;
    }

    setElementVisible(container, true);
    container.className = `search-results-info ${totalProducts === 0 ? 'no-results' : 'has-results'}`;
    textElement.textContent = totalProducts === 0
        ? `No results found for "${search}"`
        : `Found ${totalProducts} ${totalProducts === 1 ? 'result' : 'results'} for "${search}"`;
}
