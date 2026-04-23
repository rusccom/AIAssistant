import {
  ProductContextItem,
  ProductReferenceCandidate,
  ProductReferenceResolution
} from './product-details.types';

const normalizeText = (value?: string) => {
  return (value || '').toLowerCase().replace(/\s+/g, ' ').trim();
};

const tokenize = (value?: string) => {
  return normalizeText(value).split(' ').filter((token) => token.length > 2);
};

const toPositiveNumber = (value?: number) => {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
    ? value
    : undefined;
};

const buildCandidate = (
  item: ProductContextItem
): ProductReferenceCandidate => {
  return {
    productId: toPositiveNumber(item.productId),
    title: item.title.trim(),
    variantId: toPositiveNumber(item.variantId)
  };
};

const toCandidateKey = (item: ProductContextItem) => {
  if (item.variantId) return `variant:${item.variantId}`;
  if (item.productId) return `product:${item.productId}`;
  return normalizeText(item.title);
};

const dedupeCandidates = (items: ProductContextItem[]) => {
  const uniqueItems = new Map<string, ProductContextItem>();
  items.forEach((item) => uniqueItems.set(toCandidateKey(item), item));
  return Array.from(uniqueItems.values());
};

const buildReference = (item: ProductContextItem) => {
  return {
    productId: toPositiveNumber(item.productId),
    variantId: toPositiveNumber(item.variantId)
  };
};

const buildScore = (query: string, title: string) => {
  const normalizedQuery = normalizeText(query);
  const normalizedTitle = normalizeText(title);
  if (!normalizedQuery || !normalizedTitle) return 0;
  if (normalizedQuery === normalizedTitle) return 100;
  if (normalizedTitle.includes(normalizedQuery)) return 80;
  if (normalizedQuery.includes(normalizedTitle)) return 70;
  return countWordOverlap(normalizedQuery, normalizedTitle) * 10;
};

const countWordOverlap = (query: string, title: string) => {
  const titleTokens = new Set(tokenize(title));
  return tokenize(query).filter((token) => titleTokens.has(token)).length;
};

const buildAmbiguousResult = (
  items: ProductContextItem[]
): ProductReferenceResolution => {
  return {
    candidates: items.map(buildCandidate),
    error: 'AMBIGUOUS_PRODUCT_REFERENCE'
  };
};

const buildNotFoundResult = (): ProductReferenceResolution => {
  return {
    error: 'PRODUCT_CONTEXT_NOT_FOUND'
  };
};

const buildEmptyContextResult = (): ProductReferenceResolution => {
  return {
    error: 'PRODUCT_CONTEXT_EMPTY'
  };
};

const resolveSingleItem = (items: ProductContextItem[]) => {
  if (!items.length) return buildEmptyContextResult();
  if (items.length > 1) return buildAmbiguousResult(items);
  return { reference: buildReference(items[0]) };
};

const resolveByQuery = (
  query: string,
  items: ProductContextItem[]
): ProductReferenceResolution => {
  const ranked = items
    .map((item) => ({ item, score: buildScore(query, item.title) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);

  if (!ranked.length) return buildNotFoundResult();
  const bestScore = ranked[0].score;
  const bestItems = ranked
    .filter((entry) => entry.score === bestScore)
    .map((entry) => entry.item);

  if (bestItems.length > 1) return buildAmbiguousResult(bestItems);
  return { reference: buildReference(bestItems[0]) };
};

export const resolveProductReference = (
  query: string | undefined,
  contextProducts: ProductContextItem[] | undefined
): ProductReferenceResolution => {
  const uniqueItems = dedupeCandidates(contextProducts || []);
  if (!query?.trim()) return resolveSingleItem(uniqueItems);
  return resolveByQuery(query, uniqueItems);
};
