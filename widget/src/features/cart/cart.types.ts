export interface CatalogSearchProduct {
  id: number;
  price?: number;
  productId?: number;
  sku?: string;
  title: string;
  type: 'product' | 'variant';
}

export interface LocalCartItem {
  price: number;
  productId?: number;
  quantity: number;
  sku?: string;
  title: string;
  variantId: number;
}

export interface LocalCartSnapshotItem extends LocalCartItem {
  totalPrice: number;
}

export interface LocalCartSnapshot {
  hostname: string;
  id: string;
  items: LocalCartSnapshotItem[];
  totalAmount: number;
  totalItems: number;
  updatedAt: string;
}

export interface ToolExecutionResult {
  response: string;
  success: boolean;
  [key: string]: unknown;
}
