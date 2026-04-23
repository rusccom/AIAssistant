import {
  LocalCartItem,
  LocalCartSnapshot,
  LocalCartSnapshotItem
} from './cart.types';

interface StoredCartState {
  items: LocalCartItem[];
  updatedAt: string;
}

const STORAGE_PREFIX = 'ai-assistant:cart:';
const memoryStorage = new Map<string, string>();

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const buildEmptyState = (): StoredCartState => {
  return { items: [], updatedAt: new Date().toISOString() };
};

export const buildCartStorageKey = (hostname: string) => {
  return `${STORAGE_PREFIX}${hostname}`;
};

const readRawValue = (key: string) => {
  try {
    return window.localStorage.getItem(key) ?? memoryStorage.get(key) ?? null;
  } catch {
    return memoryStorage.get(key) ?? null;
  }
};

const writeRawValue = (key: string, value: string) => {
  memoryStorage.set(key, value);
  try {
    window.localStorage.setItem(key, value);
  } catch {
    return;
  }
};

const toOptionalNumber = (value: unknown) => {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
};

const toOptionalString = (value: unknown) => {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

const normalizeCartItem = (value: unknown): LocalCartItem | null => {
  if (!isObject(value)) return null;
  if (!Number.isFinite(value.variantId)) return null;
  if (!Number.isFinite(value.price)) return null;
  if (!Number.isFinite(value.quantity)) return null;
  if (typeof value.title !== 'string' || !value.title.trim()) return null;

  return {
    price: Number(value.price),
    productId: toOptionalNumber(value.productId),
    quantity: Number(value.quantity),
    sku: toOptionalString(value.sku),
    title: value.title.trim(),
    variantId: Number(value.variantId)
  };
};

const normalizeStoredCart = (value: unknown): StoredCartState => {
  if (!isObject(value) || !Array.isArray(value.items)) return buildEmptyState();

  return {
    items: value.items.map(normalizeCartItem).filter(Boolean) as LocalCartItem[],
    updatedAt: toOptionalString(value.updatedAt) || new Date().toISOString()
  };
};

const readStoredCart = (hostname: string): StoredCartState => {
  const rawValue = readRawValue(buildCartStorageKey(hostname));
  if (!rawValue) return buildEmptyState();

  try {
    return normalizeStoredCart(JSON.parse(rawValue));
  } catch {
    return buildEmptyState();
  }
};

const toSnapshotItems = (items: LocalCartItem[]): LocalCartSnapshotItem[] => {
  return items.map((item) => ({
    ...item,
    totalPrice: item.price * item.quantity
  }));
};

export const readCartSnapshot = (hostname: string): LocalCartSnapshot => {
  const storedCart = readStoredCart(hostname);
  const items = toSnapshotItems(storedCart.items);
  const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    hostname,
    id: buildCartStorageKey(hostname),
    items,
    totalAmount,
    totalItems,
    updatedAt: storedCart.updatedAt
  };
};

export const writeCartItems = (
  hostname: string,
  items: LocalCartItem[]
): LocalCartSnapshot => {
  const nextState: StoredCartState = {
    items,
    updatedAt: new Date().toISOString()
  };

  writeRawValue(buildCartStorageKey(hostname), JSON.stringify(nextState));
  return readCartSnapshot(hostname);
};

export const clearCartSnapshot = (hostname: string): LocalCartSnapshot => {
  return writeCartItems(hostname, []);
};
