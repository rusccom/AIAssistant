export interface ProductVariantInput {
  title: string;
  price: number;
  sku?: string;
  attributes?: Record<string, unknown>;
  isAvailable?: boolean;
}

export interface CreateProductData {
  title: string;
  description?: string;
  status?: string;
  brand?: string;
  category?: string;
  keywords?: string[];
  domainId: string;
  variants: ProductVariantInput[];
}

export interface UpdateProductData {
  title?: string;
  description?: string;
  status?: string;
  brand?: string;
  category?: string;
  keywords?: string[];
  variants?: ProductVariantInput[];
}

export interface BulkImportData {
  title: string;
  description?: string;
  status?: string;
  brand?: string;
  category?: string;
  keywords?: string[];
  variants: ProductVariantInput[];
}
