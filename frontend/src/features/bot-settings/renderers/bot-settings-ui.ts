import {
    escapeHtml,
    renderButtonMarkup,
    renderTableEmptyStateRow
} from '../../../shared/ui/primitives';
import { getActiveAppLocale, t } from '../../localization';
import type {
    BotSettingsProduct,
    BotSettingsProductVariant as BotSettingsVariant,
    BotSettingsDomainRecord as BotSettingsDomainCard
} from '../types';

export function appendVariantRow(
    container: HTMLElement,
    title = '',
    sku = '',
    price = ''
): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'dynamic-variant-row';
    row.innerHTML = `
        <div class="variant-fields-container">
            <input
                type="text"
                data-variant-field="title"
                placeholder="${escapeHtml(t('botSettings.products.variantNamePlaceholder'))}"
                value="${escapeHtml(title)}"
                required
            >
            <input type="text" data-variant-field="sku" placeholder="SKU" value="${escapeHtml(sku)}">
            <input
                type="number"
                data-variant-field="price"
                placeholder="${escapeHtml(t('botSettings.products.simplePrice'))}"
                value="${escapeHtml(price)}"
                step="0.01"
                min="0"
                required
            >
            <div></div>
        </div>
        <button type="button" class="btn-delete-row" aria-label="${escapeHtml(t('botSettings.products.deleteVariant'))}">x</button>
    `;
    container.appendChild(row);
    return row;
}

export function createDomainCardMarkup(domain: BotSettingsDomainCard): string {
    const firstLetter = domain.hostname.charAt(0).toUpperCase();

    return `
        <div class="domain-info">
            <div class="domain-icon">${escapeHtml(firstLetter)}</div>
            <div class="domain-details">
                <h3 class="domain-name">${escapeHtml(domain.hostname)}</h3>
                <p class="domain-status">${escapeHtml(t('botSettings.domain.cardDescription'))}</p>
            </div>
        </div>
    `;
}

export function createPaginationItem(pageNum: number, active: boolean): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = active ? 'page-number active' : 'page-number';
    button.textContent = String(pageNum);
    return button;
}

export function createPaginationEllipsis(): HTMLSpanElement {
    const ellipsis = document.createElement('span');
    ellipsis.className = 'page-ellipsis';
    ellipsis.textContent = '...';
    return ellipsis;
}

export function renderProductsEmptyState(selectedDomain: string | null): string {
    if (!selectedDomain) {
        return renderTableEmptyStateRow({
            colspan: 6,
            title: t('botSettings.products.empty.noDomainTitle'),
            description: t('botSettings.products.empty.noDomainDescription')
        });
    }

    return renderTableEmptyStateRow({
        colspan: 6,
        title: t('botSettings.products.empty.noProductsTitle'),
        description: t('botSettings.products.empty.noProductsDescription')
    });
}

export function renderProductTable(products: BotSettingsProduct[]): string {
    return products.map((product) => renderProductRows(product)).join('');
}

function renderProductRows(product: BotSettingsProduct): string {
    if (product.variants.length === 0) {
        return renderSimpleProductRow(product, null, t('botSettings.products.noVariants'));
    }

    if (isSimpleProduct(product)) {
        return renderSimpleProductRow(product, product.variants[0], formatPrice(product.variants[0].price));
    }

    return `
        <tr class="product-main-row">
            <td class="product-name">${escapeHtml(product.title)}</td>
            <td class="product-description">${renderDescription(product.description)}</td>
            <td class="product-article empty-cell">-</td>
            <td class="product-price empty-cell">-</td>
            <td class="product-currency empty-cell">-</td>
            <td class="product-actions">${renderProductActions(product.id)}</td>
        </tr>
        ${product.variants.map((variant) => renderVariantRow(product.id, variant)).join('')}
    `;
}

function formatPrice(price: number): string {
    return new Intl.NumberFormat(getActiveAppLocale(), {
        style: 'currency',
        currency: 'USD'
    }).format(price / 100);
}

function isSimpleProduct(product: BotSettingsProduct): boolean {
    return product.variants.length === 1 && product.variants[0].title === 'Default Title';
}

function renderDescription(description?: string): string {
    return escapeHtml(description || '-');
}

function renderProductActions(productId: number): string {
    const editButton = renderButtonMarkup({
        attrs: { 'data-id': productId, type: 'button' },
        extraClasses: ['btn-edit'],
        label: t('common.buttons.edit'),
        size: 'sm',
        variant: 'secondary'
    });
    const deleteButton = renderButtonMarkup({
        attrs: { 'data-id': productId, type: 'button' },
        extraClasses: ['btn-delete'],
        label: t('common.buttons.delete'),
        size: 'sm',
        variant: 'danger'
    });

    return `${editButton}${deleteButton}`;
}

function renderSimpleProductRow(
    product: BotSettingsProduct,
    variant: BotSettingsVariant | null,
    priceLabel: string
): string {
    return `
        <tr>
            <td class="product-name">${escapeHtml(product.title)}</td>
            <td class="product-description">${renderDescription(product.description)}</td>
            <td class="product-article">${escapeHtml(variant?.sku || '-')}</td>
            <td class="product-price">${escapeHtml(priceLabel)}</td>
            <td class="product-currency">${variant ? 'USD' : '-'}</td>
            <td class="product-actions">${renderProductActions(product.id)}</td>
        </tr>
    `;
}

function renderVariantRow(productId: number, variant: BotSettingsVariant): string {
    return `
        <tr class="variant-row">
            <td class="variant-name">${escapeHtml(variant.title)}</td>
            <td class="variant-description">-</td>
            <td class="variant-article">${escapeHtml(variant.sku || '-')}</td>
            <td class="variant-price">${escapeHtml(formatPrice(variant.price))}</td>
            <td class="variant-currency">USD</td>
            <td class="variant-actions">${renderProductActions(productId)}</td>
        </tr>
    `;
}
