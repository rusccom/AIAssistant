export interface SearchResult {
  id: number;
  title: string;
  description?: string;
  price?: number;
  sku?: string;
  type: 'product' | 'variant';
  similarity: number;
  productId?: number;
}

export interface GroupedSearchResult {
  title: string;
  variants: SearchResult[];
}
