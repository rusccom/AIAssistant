export interface ProductContextItem {
  productId?: number;
  variantId?: number;
  title: string;
  description?: string;
  price?: number;
  sku?: string;
  type: 'product' | 'variant';
}

export interface ProductContextController {
  captureToolResult(toolName: string, result: unknown): void;
  enhanceParams(
    toolName: string,
    params: Record<string, unknown>
  ): Record<string, unknown>;
}
