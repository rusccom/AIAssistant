export interface ProductContextItem {
  productId?: number;
  variantId?: number;
  title: string;
  type?: 'product' | 'variant';
}

export interface GetProductDetailsArgs {
  contextProducts?: ProductContextItem[];
  hostname?: string;
  productId?: number;
  query?: string;
  variantId?: number;
}

export interface ProductVariantDetails {
  attributes?: Record<string, unknown>;
  id: number;
  price: number;
  sku?: string;
  title: string;
}

export interface ProductDetailsPayload {
  availableVariants: ProductVariantDetails[];
  brand?: string;
  category?: string;
  description?: string;
  id: number;
  keywords: string[];
  selectedVariant: ProductVariantDetails;
  title: string;
}

export interface ProductReferenceCandidate {
  productId?: number;
  title: string;
  variantId?: number;
}

interface ProductDetailsBaseResult {
  response: string;
  success: boolean;
}

export interface ProductDetailsSuccess extends ProductDetailsBaseResult {
  product: ProductDetailsPayload;
  success: true;
}

export interface ProductDetailsFailure extends ProductDetailsBaseResult {
  candidates?: ProductReferenceCandidate[];
  error: string;
  success: false;
}

export type GetProductDetailsResult =
  | ProductDetailsFailure
  | ProductDetailsSuccess;

export interface ResolvedProductReference {
  productId?: number;
  variantId?: number;
}

export interface ProductReferenceResolution {
  candidates?: ProductReferenceCandidate[];
  error?: string;
  reference?: ResolvedProductReference;
}
