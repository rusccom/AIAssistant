import { apiRequest } from '../../../utils/api-client';
import { API_ENDPOINTS, UI_CONFIG } from '../../../utils/constants';
import type { BotSettingsProduct, BotSettingsProductDraftVariant } from '../types';

interface ProductsResponse {
    pagination: {
        page: number;
        totalCount: number;
        totalPages: number;
    };
    products: BotSettingsProduct[];
}

interface ProductPayload {
    description: string;
    title: string;
    variants: BotSettingsProductDraftVariant[];
}

export async function fetchProducts(domain: string, page: number, search: string): Promise<ProductsResponse> {
    const params = new URLSearchParams({
        domain,
        limit: String(UI_CONFIG.PAGINATION.ITEMS_PER_PAGE),
        page: String(page)
    });

    if (search.trim()) {
        params.append('search', search.trim());
    }

    const { data } = await apiRequest<ProductsResponse>(`${API_ENDPOINTS.PRODUCTS.BASE}?${params}`);
    return data;
}

export async function createProduct(
    domain: string,
    payload: ProductPayload
): Promise<void> {
    const params = new URLSearchParams({ domain });

    await apiRequest(`${API_ENDPOINTS.PRODUCTS.BASE}?${params}`, {
        body: JSON.stringify(payload),
        method: 'POST'
    });
}

export async function updateProduct(
    domain: string,
    productId: number,
    payload: ProductPayload
): Promise<void> {
    const params = new URLSearchParams({ domain });

    await apiRequest(`${API_ENDPOINTS.PRODUCTS.BASE}/${productId}?${params}`, {
        body: JSON.stringify(payload),
        method: 'PUT'
    });
}

export async function deleteProduct(domain: string, productId: number): Promise<void> {
    const params = new URLSearchParams({ domain });

    await apiRequest(`${API_ENDPOINTS.PRODUCTS.BASE}/${productId}?${params}`, {
        method: 'DELETE'
    });
}
