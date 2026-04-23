import {
  ProductContextController,
  ProductContextItem
} from './product-context.types';

interface SearchProductLike {
  description?: string;
  id: number;
  price?: number;
  productId?: number;
  sku?: string;
  title: string;
  type: 'product' | 'variant';
}

interface CatalogVariantLike {
  id: number;
  price: number;
  sku?: string;
  title: string;
}

interface CatalogProductLike {
  description?: string;
  id: number;
  sampleVariants?: CatalogVariantLike[];
  title: string;
}

const MAX_CONTEXT_ITEMS = 12;

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const toOptionalNumber = (value: unknown) => {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
};

const toOptionalString = (value: unknown) => {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

const isSearchProductLike = (value: unknown): value is SearchProductLike => {
  return isObject(value)
    && Number.isFinite(value.id)
    && typeof value.title === 'string'
    && (value.type === 'product' || value.type === 'variant');
};

const isCatalogVariantLike = (value: unknown): value is CatalogVariantLike => {
  return isObject(value)
    && Number.isFinite(value.id)
    && Number.isFinite(value.price)
    && typeof value.title === 'string';
};

const isCatalogProductLike = (value: unknown): value is CatalogProductLike => {
  return isObject(value)
    && Number.isFinite(value.id)
    && typeof value.title === 'string';
};

const buildContextKey = (item: ProductContextItem) => {
  if (item.variantId) return `variant:${item.variantId}`;
  if (item.productId) return `product:${item.productId}`;
  return `title:${item.title.toLowerCase()}`;
};

const trimContext = (items: ProductContextItem[]) => {
  const uniqueItems = new Map<string, ProductContextItem>();
  items.forEach((item) => uniqueItems.set(buildContextKey(item), item));
  return Array.from(uniqueItems.values()).slice(0, MAX_CONTEXT_ITEMS);
};

const mapSearchProduct = (item: SearchProductLike): ProductContextItem => {
  return {
    description: toOptionalString(item.description),
    price: toOptionalNumber(item.price),
    productId: item.type === 'product' ? item.id : item.productId,
    sku: toOptionalString(item.sku),
    title: item.title.trim(),
    type: item.type,
    variantId: item.type === 'variant' ? item.id : undefined
  };
};

const normalizeVariantTitle = (productTitle: string, variantTitle: string) => {
  const trimmedTitle = variantTitle.trim();
  if (!trimmedTitle || trimmedTitle.toLowerCase() === 'default title') {
    return productTitle;
  }

  return `${productTitle} ${trimmedTitle}`.trim();
};

const mapCatalogProduct = (product: CatalogProductLike): ProductContextItem[] => {
  const productItem: ProductContextItem = {
    description: toOptionalString(product.description),
    productId: product.id,
    title: product.title.trim(),
    type: 'product'
  };

  const variantItems = (product.sampleVariants || [])
    .filter(isCatalogVariantLike)
    .map((variant) => ({
      price: variant.price,
      productId: product.id,
      sku: toOptionalString(variant.sku),
      title: normalizeVariantTitle(product.title, variant.title),
      type: 'variant' as const,
      variantId: variant.id
    }));

  return [productItem, ...variantItems];
};

const getSearchContext = (result: unknown) => {
  if (!isObject(result) || !Array.isArray(result.products)) return [];
  return result.products.filter(isSearchProductLike).map(mapSearchProduct);
};

const getCatalogContext = (result: unknown) => {
  if (!isObject(result) || !isObject(result.catalog)) return [];
  const featuredProducts = Array.isArray(result.catalog.featuredProducts)
    ? result.catalog.featuredProducts
    : [];

  return featuredProducts
    .filter(isCatalogProductLike)
    .flatMap(mapCatalogProduct);
};

const getDetailContext = (result: unknown) => {
  if (!isObject(result) || !isObject(result.product)) return [];

  const product = result.product;
  if (!Number.isFinite(product.id) || typeof product.title !== 'string') {
    return [];
  }
  const productId = Number(product.id);
  const productTitle = product.title.trim();

  const selectedVariant = isObject(product.selectedVariant)
    ? product.selectedVariant
    : null;
  const selectedVariantId = selectedVariant
    ? toOptionalNumber(selectedVariant.id)
    : undefined;

  return trimContext([{
    description: toOptionalString(product.description),
    price: selectedVariant ? toOptionalNumber(selectedVariant.price) : undefined,
    productId,
    sku: selectedVariant ? toOptionalString(selectedVariant.sku) : undefined,
    title: productTitle,
    type: 'variant',
    variantId: selectedVariantId
  }]);
};

const buildEnhancedParams = (
  params: Record<string, unknown>,
  items: ProductContextItem[]
) => {
  if (!items.length) return params;
  return { ...params, contextProducts: items };
};

const resolveContextItems = (toolName: string, result: unknown) => {
  if (toolName === 'search_products') return getSearchContext(result);
  if (toolName === 'browse_catalog') return getCatalogContext(result);
  if (toolName === 'get_product_details') return getDetailContext(result);
  return [];
};

export const createProductContextController = (): ProductContextController => {
  let recentItems: ProductContextItem[] = [];

  return {
    captureToolResult: (toolName, result) => {
      const contextItems = resolveContextItems(toolName, result);
      if (!contextItems.length) return;
      recentItems = trimContext(contextItems);
    },
    enhanceParams: (toolName, params) => {
      if (toolName !== 'get_product_details') return params;
      return buildEnhancedParams(params, recentItems);
    }
  };
};
