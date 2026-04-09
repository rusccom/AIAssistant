import { GroupedSearchResult, SearchResult } from './search-result.types';

export function applyIntelligentFiltering(
  results: SearchResult[],
  query: string,
  limit: number,
): SearchResult[] {
  const sorted = [...results].sort((a, b) => b.similarity - a.similarity);
  const exactMatches = sorted.filter(result => matchesWholeQuery(result, query));
  const wordMatches = sorted.filter(result => matchesAnyQueryWord(result, query));
  const candidates = chooseCandidates(sorted, exactMatches, wordMatches);
  const firstProduct = groupResultsByProduct(candidates)[0];

  if (firstProduct && firstProduct.variants.length > 1) {
    return firstProduct.variants.slice(0, limit);
  }

  return candidates.slice(0, limit);
}

export function mergeSearchResults(groups: SearchResult[][]): SearchResult[] {
  const merged = new Map<string, SearchResult>();

  groups.flat().forEach(result => {
    const key = `${result.type}:${result.id}`;
    const previous = merged.get(key);
    merged.set(key, previous ? chooseBetterResult(previous, result) : result);
  });

  return Array.from(merged.values());
}

export function groupResultsByProduct(results: SearchResult[]): GroupedSearchResult[] {
  const grouped = new Map<string, SearchResult[]>();

  results.forEach(result => {
    const key = result.type === 'product'
      ? `product_${result.id}`
      : `product_${result.productId}`;
    const items = grouped.get(key) ?? [];
    items.push(result);
    grouped.set(key, items);
  });

  return Array.from(grouped.values()).map(toGroupedResult);
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
  }).format(price);
}

function chooseCandidates(
  results: SearchResult[],
  exactMatches: SearchResult[],
  wordMatches: SearchResult[],
): SearchResult[] {
  const strongExact = exactMatches.filter(result => result.similarity > 0.4);
  if (strongExact.length > 0) {
    return strongExact;
  }

  const strongWords = wordMatches.filter(result => result.similarity > 0.5);
  if (strongWords.length > 0) {
    return strongWords;
  }

  const strongSemantic = results.filter(result => result.similarity > 0.4);
  if (strongSemantic.length > 0) {
    return strongSemantic;
  }

  return results.filter(result => result.similarity > 0.25);
}

function matchesWholeQuery(result: SearchResult, query: string): boolean {
  const haystack = [result.title, result.description, result.sku].join(' ').toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function matchesAnyQueryWord(result: SearchResult, query: string): boolean {
  const haystack = [result.title, result.description, result.sku].join(' ').toLowerCase();
  return query.toLowerCase().split(' ').filter(isLongWord).some(word => haystack.includes(word));
}

function isLongWord(word: string): boolean {
  return word.length > 2;
}

function chooseBetterResult(left: SearchResult, right: SearchResult): SearchResult {
  if (right.similarity > left.similarity) {
    return right;
  }

  return {
    ...left,
    description: left.description ?? right.description,
    price: left.price ?? right.price,
    sku: left.sku ?? right.sku,
    productId: left.productId ?? right.productId,
  };
}

function toGroupedResult(variants: SearchResult[]): GroupedSearchResult {
  const sorted = [...variants].sort((a, b) => b.similarity - a.similarity);
  return {
    title: sorted[0].type === 'product' ? sorted[0].title : extractProductTitle(sorted[0].title),
    variants: sorted,
  };
}

function extractProductTitle(value: string): string {
  const parts = value.split(' ');
  return parts.slice(0, -1).join(' ');
}
