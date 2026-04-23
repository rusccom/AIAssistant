import { dispatchCartChanged } from './cart-events';
import { readCartSnapshot, writeCartItems } from './cart-storage';
import {
  CatalogSearchProduct,
  LocalCartItem,
  LocalCartSnapshot,
  ToolExecutionResult
} from './cart.types';

interface LocalCartToolController {
  captureToolResult(toolName: string, result: unknown): void;
  clearCart(): LocalCartSnapshot;
  executeTool(
    toolName: string,
    params: Record<string, unknown>
  ): ToolExecutionResult | null;
  getCartSnapshot(): LocalCartSnapshot;
}

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('ru-RU', {
    currency: 'RUB',
    minimumFractionDigits: 0,
    style: 'currency'
  }).format(price / 100);
};

const toPositiveInteger = (value: unknown, fallback: number) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const toVariantId = (value: unknown) => {
  return toPositiveInteger(value, 0);
};

const isCatalogSearchProduct = (value: unknown): value is CatalogSearchProduct => {
  return isObject(value)
    && Number.isFinite(value.id)
    && typeof value.title === 'string'
    && (value.type === 'product' || value.type === 'variant');
};

const getSearchProducts = (result: unknown): CatalogSearchProduct[] => {
  if (!isObject(result) || !Array.isArray(result.products)) return [];
  return result.products.filter(isCatalogSearchProduct);
};

const createCartItem = (
  source: CatalogSearchProduct,
  quantity: number
): LocalCartItem => {
  return {
    price: source.price || 0,
    productId: source.productId,
    quantity,
    sku: source.sku,
    title: source.title,
    variantId: source.id
  };
};

const upsertCartItem = (
  items: LocalCartItem[],
  source: CatalogSearchProduct,
  quantity: number
) => {
  const existingItem = items.find((item) => item.variantId === source.id);
  if (!existingItem) return [...items, createCartItem(source, quantity)];

  return items.map((item) => {
    return item.variantId === source.id
      ? { ...item, quantity: item.quantity + quantity }
      : item;
  });
};

const buildCartResponse = (snapshot: LocalCartSnapshot) => {
  if (!snapshot.items.length) return 'The cart is empty.';

  const lines = snapshot.items.map((item, index) => {
    return `${index + 1}. ${item.title} x${item.quantity} = ${formatPrice(item.totalPrice)}`;
  });

  return [
    `Cart has ${snapshot.totalItems} item(s) for ${formatPrice(snapshot.totalAmount)}.`,
    ...lines
  ].join('\n');
};

const buildAddToCartError = (): ToolExecutionResult => {
  return {
    success: false,
    response: 'I could not map this request to a specific catalog variant. Search first and use a variant id.',
    error: 'VARIANT_CONTEXT_NOT_FOUND'
  };
};

const toCatalogProduct = (item: LocalCartItem): CatalogSearchProduct => {
  return {
    id: item.variantId,
    price: item.price,
    productId: item.productId,
    sku: item.sku,
    title: item.title,
    type: 'variant'
  };
};

const resolveVariantSource = (
  items: LocalCartItem[],
  variantCache: Map<number, CatalogSearchProduct>,
  variantId: number
) => {
  const existingItem = items.find((item) => item.variantId === variantId);
  if (existingItem) return toCatalogProduct(existingItem);
  return variantCache.get(variantId) || null;
};

const buildAddToCartResult = (
  snapshot: LocalCartSnapshot,
  variantId: number
): ToolExecutionResult => {
  const cartItem = snapshot.items.find((item) => item.variantId === variantId);
  if (!cartItem) return buildAddToCartError();

  return {
    success: true,
    response: `Added "${cartItem.title}" to cart. Cart now has ${snapshot.totalItems} item(s) for ${formatPrice(snapshot.totalAmount)}.`,
    cart: snapshot,
    cartItem
  };
};

const executeAddToCart = (
  hostname: string,
  params: Record<string, unknown>,
  variantCache: Map<number, CatalogSearchProduct>
): ToolExecutionResult => {
  const variantId = toVariantId(params.variantId);
  if (!variantId) return buildAddToCartError();

  const quantity = toPositiveInteger(params.quantity, 1);
  const currentCart = readCartSnapshot(hostname);
  const source = resolveVariantSource(currentCart.items, variantCache, variantId);
  if (!source || typeof source.price !== 'number') return buildAddToCartError();

  const nextItems = upsertCartItem(currentCart.items, source, quantity);
  const snapshot = writeCartItems(hostname, nextItems);
  dispatchCartChanged(snapshot);
  return buildAddToCartResult(snapshot, variantId);
};

const executeGetCartInfo = (hostname: string): ToolExecutionResult => {
  const snapshot = readCartSnapshot(hostname);
  return {
    success: true,
    response: buildCartResponse(snapshot),
    cart: snapshot
  };
};

const cacheVariants = (
  variantCache: Map<number, CatalogSearchProduct>,
  result: unknown
) => {
  getSearchProducts(result)
    .filter((product) => product.type === 'variant')
    .forEach((product) => {
      variantCache.set(product.id, product);
    });
};

export const createLocalCartToolController = (
  hostname: string
): LocalCartToolController => {
  const variantCache = new Map<number, CatalogSearchProduct>();

  return {
    captureToolResult: (toolName, result) => {
      if (toolName === 'search_products') cacheVariants(variantCache, result);
    },
    clearCart: () => {
      const snapshot = writeCartItems(hostname, []);
      dispatchCartChanged(snapshot);
      return snapshot;
    },
    executeTool: (toolName, params) => {
      if (toolName === 'add_to_cart') {
        return executeAddToCart(hostname, params, variantCache);
      }

      if (toolName === 'get_cart_info') {
        return executeGetCartInfo(hostname);
      }

      return null;
    },
    getCartSnapshot: () => readCartSnapshot(hostname)
  };
};
