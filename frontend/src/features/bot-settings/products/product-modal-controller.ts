import { closeLayer, openLayer, setElementVisible } from '../../../shared/ui/dom';
import { t } from '../../localization';
import { showError } from '../../../utils/error-handler';
import { appendVariantRow } from '../renderers/bot-settings-ui';
import type {
    BotSettingsProduct,
    BotSettingsProductDraftVariant,
    BotSettingsProductVariant
} from '../types';

export interface ProductModalSubmitPayload {
    mode: 'add' | 'edit';
    productDesc: string;
    productId?: number;
    productName: string;
    variants: BotSettingsProductDraftVariant[];
}

interface ProductModalControllerOptions {
    getProducts: () => BotSettingsProduct[];
    onSubmit: (payload: ProductModalSubmitPayload) => Promise<void>;
}

export class ProductModalController {
    private mode: 'add' | 'edit' = 'add';

    public constructor(private readonly options: ProductModalControllerOptions) {}

    public init(): void {
        if (!this.modal || !this.form || !this.variantsContainer) {
            console.error('Product modal elements are missing.');
            return;
        }

        this.form.addEventListener('submit', (event) => {
            void this.handleSubmit(event);
        });
        this.modal.addEventListener('click', (event) => {
            if (event.target === this.modal) {
                this.close();
            }
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !this.modal?.hidden) {
                this.close();
            }
        });
        this.addVariantButton?.addEventListener('click', () => this.addVariantRow());
        this.closeButton?.addEventListener('click', () => this.close());
        this.cancelButton?.addEventListener('click', () => this.close());
        document.querySelectorAll<HTMLInputElement>('input[name="product-type"]').forEach((radio) => {
            radio.addEventListener('change', () => this.toggleProductType());
        });
    }

    public async open(mode: 'add' | 'edit', productId?: number): Promise<void> {
        if (!this.modal) {
            return;
        }

        this.mode = mode;
        this.updateHeader();
        this.resetForm();

        if (mode === 'edit' && productId) {
            this.fillForm(productId);
        }

        this.toggleProductType();
        openLayer(this.modal);
    }

    public close(): void {
        if (!this.modal) {
            return;
        }

        closeLayer(this.modal);
        this.resetForm();
    }

    public refreshLanguage(): void {
        this.updateHeader();
        this.refreshVariantRows();
    }

    private get modal(): HTMLDivElement | null {
        return document.getElementById('product-modal') as HTMLDivElement | null;
    }

    private get form(): HTMLFormElement | null {
        return document.getElementById('product-form') as HTMLFormElement | null;
    }

    private get variantsContainer(): HTMLDivElement | null {
        return document.getElementById('variants-container') as HTMLDivElement | null;
    }

    private get addVariantButton(): HTMLButtonElement | null {
        return document.getElementById('add-variant-btn') as HTMLButtonElement | null;
    }

    private get closeButton(): HTMLButtonElement | null {
        return document.getElementById('close-product-modal-btn') as HTMLButtonElement | null;
    }

    private get cancelButton(): HTMLButtonElement | null {
        return document.getElementById('cancel-product-btn') as HTMLButtonElement | null;
    }

    private addVariantRow(title = '', sku = '', price = ''): void {
        if (!this.variantsContainer) {
            return;
        }

        const row = appendVariantRow(this.variantsContainer, title, sku, price);
        row.querySelector('.btn-delete-row')?.addEventListener('click', () => {
            row.remove();

            if (this.variantsContainer?.querySelectorAll('.dynamic-variant-row').length === 0) {
                this.addVariantRow();
            }
        });
    }

    private buildVariants(): BotSettingsProductDraftVariant[] | null {
        const selectedType = this.getSelectedType();

        if (selectedType === 'simple') {
            const price = parseFloat((document.getElementById('simple-price') as HTMLInputElement | null)?.value || '0');
            const sku = (document.getElementById('simple-sku') as HTMLInputElement | null)?.value?.trim() || '';

            if (price <= 0) {
                showError(t('botSettings.messages.validPrice'));
                return null;
            }

            return [{ title: 'Default Title', price: Math.round(price * 100), sku }];
        }

        const variantRows = Array.from(this.variantsContainer?.querySelectorAll('.dynamic-variant-row') || []);
        if (variantRows.length === 0) {
            showError(t('botSettings.messages.addVariant'));
            return null;
        }

        return variantRows.map((row) => {
            const title = (row.querySelector('[data-variant-field="title"]') as HTMLInputElement | null)?.value?.trim() || '';
            const sku = (row.querySelector('[data-variant-field="sku"]') as HTMLInputElement | null)?.value?.trim() || '';
            const price = parseFloat((row.querySelector('[data-variant-field="price"]') as HTMLInputElement | null)?.value || '0');

            if (!title || price <= 0) {
                throw new Error(t('botSettings.messages.variantFields'));
            }

            return { title, price: Math.round(price * 100), sku };
        });
    }

    private fillForm(productId: number): void {
        const product = this.options.getProducts().find((item) => item.id === productId);
        if (!product) {
            return;
        }

        (document.getElementById('product-id') as HTMLInputElement | null)!.value = String(product.id);
        (document.getElementById('product-name') as HTMLInputElement | null)!.value = product.title;
        (document.getElementById('product-description') as HTMLTextAreaElement | null)!.value = product.description || '';

        if (this.isSimpleProduct(product)) {
            (document.querySelector('input[name="product-type"][value="simple"]') as HTMLInputElement | null)!.checked = true;
            (document.getElementById('simple-price') as HTMLInputElement | null)!.value = String(product.variants[0].price / 100);
            (document.getElementById('simple-sku') as HTMLInputElement | null)!.value = product.variants[0].sku || '';
            return;
        }

        (document.querySelector('input[name="product-type"][value="variants"]') as HTMLInputElement | null)!.checked = true;
        this.populateVariants(product.variants);
    }

    private getSelectedType(): 'simple' | 'variants' {
        return ((document.querySelector('input[name="product-type"]:checked') as HTMLInputElement | null)?.value || 'simple') as 'simple' | 'variants';
    }

    private async handleSubmit(event: Event): Promise<void> {
        event.preventDefault();

        const productName = (document.getElementById('product-name') as HTMLInputElement | null)?.value?.trim() || '';
        const productDesc = (document.getElementById('product-description') as HTMLTextAreaElement | null)?.value?.trim() || '';

        if (!productName) {
            showError(t('botSettings.messages.productName'));
            return;
        }

        const variants = this.buildVariants();
        if (!variants) {
            return;
        }

        await this.options.onSubmit({
            mode: this.mode,
            productDesc,
            productId: this.mode === 'edit' ? Number((document.getElementById('product-id') as HTMLInputElement | null)?.value || 0) : undefined,
            productName,
            variants
        });
    }

    private isSimpleProduct(product: BotSettingsProduct): boolean {
        return product.variants.length === 1 && product.variants[0].title === 'Default Title';
    }

    private populateVariants(variants: BotSettingsProductVariant[]): void {
        this.clearVariants();
        variants.forEach((variant) => this.addVariantRow(variant.title, variant.sku || '', String(variant.price / 100)));
    }

    private resetForm(): void {
        this.form?.reset();
        const simpleRadio = document.querySelector('input[name="product-type"][value="simple"]') as HTMLInputElement | null;
        const productIdInput = document.getElementById('product-id') as HTMLInputElement | null;

        if (simpleRadio) {
            simpleRadio.checked = true;
        }

        if (productIdInput) {
            productIdInput.value = '';
        }

        this.clearVariants();
    }

    private clearVariants(): void {
        this.variantsContainer?.querySelectorAll('.dynamic-variant-row').forEach((row) => row.remove());
    }

    private toggleProductType(): void {
        const simpleSection = document.getElementById('simple-product-section');
        const variantsSection = document.getElementById('variants-section');
        const showSimple = this.getSelectedType() === 'simple';

        if (simpleSection) {
            setElementVisible(simpleSection, showSimple);
        }

        if (variantsSection) {
            setElementVisible(variantsSection, !showSimple);
        }

        if (!showSimple && this.variantsContainer?.querySelectorAll('.dynamic-variant-row').length === 0) {
            this.addVariantRow();
        }
    }

    private updateHeader(): void {
        const title = document.getElementById('product-modal-title');
        const submitButton = document.getElementById('submit-product-btn');

        if (title) {
            title.textContent = this.mode === 'add'
                ? t('botSettings.products.addTitle')
                : t('botSettings.products.editTitle');
        }

        if (submitButton) {
            submitButton.textContent = this.mode === 'add'
                ? t('botSettings.products.saveProduct')
                : t('botSettings.products.updateProduct');
        }
    }

    private refreshVariantRows(): void {
        this.variantsContainer?.querySelectorAll('.dynamic-variant-row').forEach((row) => {
            const titleInput = row.querySelector('[data-variant-field="title"]') as HTMLInputElement | null;
            const priceInput = row.querySelector('[data-variant-field="price"]') as HTMLInputElement | null;
            const deleteButton = row.querySelector('.btn-delete-row') as HTMLButtonElement | null;

            if (titleInput) {
                titleInput.placeholder = t('botSettings.products.variantNamePlaceholder');
            }

            if (priceInput) {
                priceInput.placeholder = t('botSettings.products.simplePrice');
            }

            if (deleteButton) {
                deleteButton.setAttribute('aria-label', t('botSettings.products.deleteVariant'));
            }
        });
    }
}
