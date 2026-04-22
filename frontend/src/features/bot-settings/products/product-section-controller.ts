import { Modal } from '../../../components';
import { setElementVisible } from '../../../shared/ui/dom';
import { t } from '../../localization';
import { UI_CONFIG } from '../../../utils/constants';
import { handleApiError, showError, showSuccess } from '../../../utils/error-handler';
import { createPaginationEllipsis, createPaginationItem } from '../renderers/bot-settings-ui';
import type { BotSettingsProduct, BotSettingsProductDraftVariant } from '../types';
import { renderProductsTable, updateProductSearchInfo } from './product-section-view';
import { createPageRange, debounce } from './product-list-utils';
import { ProductModalController, type ProductModalSubmitPayload } from './product-modal-controller';
import {
    createProduct,
    deleteProduct as deleteProductRequest,
    fetchProducts,
    updateProduct as updateProductRequest
} from './product-service';

interface ProductSectionControllerOptions {
    getSelectedDomain: () => string | null;
}

export class ProductSectionController {
    private currentPage = 1;
    private currentSearch = '';
    private priceListData: BotSettingsProduct[] = [];
    private totalPages = 1;
    private totalProducts = 0;
    private readonly modalController = new ProductModalController({
        getProducts: () => this.priceListData,
        onSubmit: (payload) => this.handleModalSubmit(payload)
    });

    public constructor(private readonly options: ProductSectionControllerOptions) {}

    public init(): void {
        this.modalController.init();
        this.bindSearch();
        this.bindPagination();
        this.bindTableActions();
        this.bindModalTriggers();
    }

    public async handleDomainChange(): Promise<void> {
        await this.loadProducts(1, this.currentSearch);
    }

    public refreshLanguage(): void {
        this.modalController.refreshLanguage();
        this.renderPriceList();
        this.renderPagination();
        this.updateSearchResultsInfo();
    }

    public async refreshFirstPage(): Promise<void> {
        await this.loadProducts(1, this.currentSearch);
    }

    public async loadProducts(page = 1, search = ''): Promise<void> {
        const selectedDomain = this.options.getSelectedDomain();
        if (!selectedDomain) {
            this.showEmptyState();
            this.hidePagination();
            this.hideSearchResultsInfo();
            return;
        }

        try {
            const data = await fetchProducts(selectedDomain, page, search);
            this.priceListData = data.products || [];
            this.currentPage = data.pagination.page;
            this.totalPages = data.pagination.totalPages;
            this.totalProducts = data.pagination.totalCount;
            this.currentSearch = search;
            this.renderPriceList();
            this.renderPagination();
            this.updateSearchResultsInfo();
        } catch (error) {
            console.error('Error loading products:', error);
            this.showEmptyState();
            this.hidePagination();
            this.hideSearchResultsInfo();
        }
    }

    private bindModalTriggers(): void {
        document.getElementById('add-product-btn')?.addEventListener('click', () => {
            void this.modalController.open('add');
        });
    }

    private bindPagination(): void {
        (document.getElementById('prev-page-btn') as HTMLButtonElement | null)?.addEventListener('click', () => {
            if (this.currentPage > 1) {
                void this.loadProducts(this.currentPage - 1, this.currentSearch);
            }
        });
        (document.getElementById('next-page-btn') as HTMLButtonElement | null)?.addEventListener('click', () => {
            if (this.currentPage < this.totalPages) {
                void this.loadProducts(this.currentPage + 1, this.currentSearch);
            }
        });
    }

    private bindSearch(): void {
        const searchInput = document.getElementById('product-search') as HTMLInputElement | null;
        const clearButton = document.getElementById('clear-search-btn') as HTMLButtonElement | null;

        if (!searchInput || !clearButton) {
            return;
        }

        const runSearch = debounce((searchTerm: string) => {
            void this.loadProducts(1, searchTerm);
        }, UI_CONFIG.TIMEOUTS.DEBOUNCE_DELAY);

        searchInput.addEventListener('input', (event) => {
            const searchTerm = (event.target as HTMLInputElement).value;
            setElementVisible(clearButton, Boolean(searchTerm.trim()), 'flex');
            runSearch(searchTerm);
        });
        clearButton.addEventListener('click', () => {
            searchInput.value = '';
            setElementVisible(clearButton, false, 'flex');
            void this.loadProducts(1, '');
        });
        searchInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                void this.loadProducts(1, searchInput.value);
            }
        });
    }

    private bindTableActions(): void {
        this.tableBody?.addEventListener('click', (event) => {
            const button = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>('button');

            if (button?.classList.contains('btn-edit') && button.dataset.id) {
                void this.modalController.open('edit', Number(button.dataset.id));
                return;
            }

            if (button?.classList.contains('btn-delete') && button.dataset.id) {
                void this.deleteProduct(Number(button.dataset.id));
            }
        });
    }

    private async deleteProduct(productId: number): Promise<void> {
        const product = this.priceListData.find((item) => item.id === productId);
        if (!product) {
            return;
        }

        Modal.confirm(
            t('botSettings.messages.deleteProductMessage', { name: product.title }),
            t('botSettings.messages.deleteProductTitle'),
            () => this.performProductDelete(productId)
        );
    }

    private async performProductDelete(productId: number): Promise<void> {
        const selectedDomain = this.options.getSelectedDomain();
        if (!selectedDomain) {
            showError(t('botSettings.messages.selectDomainFirst'));
            return;
        }

        try {
            await deleteProductRequest(selectedDomain, productId);
            await this.loadProducts(this.currentPage, this.currentSearch);
            showSuccess(t('botSettings.messages.productDeleted'));
        } catch (error) {
            console.error('Error deleting product:', error);
            handleApiError(error, 'deleting product');
        }
    }

    private hidePagination(): void {
        if (this.paginationContainer) {
            setElementVisible(this.paginationContainer, false, 'flex');
        }
    }

    private hideSearchResultsInfo(): void {
        if (this.searchResultsInfo) {
            setElementVisible(this.searchResultsInfo, false);
        }
    }

    private async handleModalSubmit(payload: ProductModalSubmitPayload): Promise<void> {
        if (payload.mode === 'edit') {
            await this.updateProduct(payload.productId, payload.productName, payload.productDesc, payload.variants);
            return;
        }

        await this.createProduct(payload.productName, payload.productDesc, payload.variants);
    }

    private async createProduct(
        productName: string,
        productDesc: string,
        variants: BotSettingsProductDraftVariant[]
    ): Promise<void> {
        const selectedDomain = this.options.getSelectedDomain();
        if (!selectedDomain) {
            showError(t('botSettings.messages.selectDomainFirst'));
            return;
        }

        try {
            await createProduct(selectedDomain, {
                description: productDesc,
                title: productName,
                variants
            });
            await this.loadProducts(
                this.currentSearch.trim() ? this.currentPage : 1,
                this.currentSearch.trim() ? this.currentSearch : ''
            );
            this.modalController.close();
            showSuccess(t('botSettings.messages.productCreated'));
        } catch (error) {
            console.error('Error creating product:', error);
            handleApiError(error, 'creating product');
        }
    }

    private async updateProduct(
        productId: number | undefined,
        productName: string,
        productDesc: string,
        variants: BotSettingsProductDraftVariant[]
    ): Promise<void> {
        const selectedDomain = this.options.getSelectedDomain();
        if (!selectedDomain) {
            showError(t('botSettings.messages.selectDomainFirst'));
            return;
        }

        if (!productId) {
            showError(t('botSettings.messages.productIdMissing'));
            return;
        }

        try {
            await updateProductRequest(selectedDomain, productId, {
                description: productDesc,
                title: productName,
                variants
            });
            await this.loadProducts(this.currentPage, this.currentSearch);
            this.modalController.close();
            showSuccess(t('botSettings.messages.productUpdated'));
        } catch (error) {
            console.error('Error updating product:', error);
            handleApiError(error, 'updating product');
        }
    }

    private get paginationContainer(): HTMLElement | null {
        return document.getElementById('pagination-container');
    }

    private get paginationPages(): HTMLElement | null {
        return document.getElementById('pagination-pages');
    }

    private get searchResultsInfo(): HTMLElement | null {
        return document.getElementById('search-results-info');
    }

    private get searchResultsText(): HTMLElement | null {
        return document.getElementById('search-results-text');
    }

    private get tableBody(): HTMLTableSectionElement | null {
        return document.querySelector('#price-list-table tbody') as HTMLTableSectionElement | null;
    }

    private renderPagination(): void {
        if (!this.paginationContainer || !this.paginationPages) {
            return;
        }

        if (this.totalProducts === 0) {
            this.hidePagination();
            return;
        }

        setElementVisible(this.paginationContainer, true, 'flex');
        const info = document.getElementById('pagination-info-text');
        if (info) {
            const startItem = (this.currentPage - 1) * UI_CONFIG.PAGINATION.ITEMS_PER_PAGE + 1;
            const endItem = Math.min(this.currentPage * UI_CONFIG.PAGINATION.ITEMS_PER_PAGE, this.totalProducts);

            info.textContent = t('botSettings.products.pagination', {
                end: endItem,
                start: startItem,
                total: this.totalProducts
            });
        }

        (document.getElementById('prev-page-btn') as HTMLButtonElement | null)!.disabled = this.currentPage <= 1;
        (document.getElementById('next-page-btn') as HTMLButtonElement | null)!.disabled = this.currentPage >= this.totalPages;
        this.paginationPages.innerHTML = '';

        createPageRange(this.currentPage, this.totalPages).forEach((item) => {
            if (item === '...') {
                this.paginationPages?.appendChild(createPaginationEllipsis());
                return;
            }

            const button = createPaginationItem(item, item === this.currentPage);
            button.addEventListener('click', () => void this.loadProducts(item, this.currentSearch));
            this.paginationPages?.appendChild(button);
        });
    }

    private renderPriceList(): void {
        renderProductsTable(this.tableBody, this.priceListData, this.options.getSelectedDomain());
    }

    private showEmptyState(): void {
        renderProductsTable(this.tableBody, [], this.options.getSelectedDomain());
    }

    private updateSearchResultsInfo(): void {
        updateProductSearchInfo(
            this.searchResultsInfo,
            this.searchResultsText,
            this.currentSearch,
            this.totalProducts
        );
    }
}
