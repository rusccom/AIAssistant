import { Prisma } from '@prisma/client';

type ProductEmbeddingSource = {
  title: string;
  description?: string | null;
  brand?: string | null;
  category?: string | null;
  keywords?: string[] | null;
};

type VariantEmbeddingSource = {
  title: string;
  attributes?: Prisma.JsonValue | null;
  isDefault?: boolean | null;
};

export function buildProductSearchText(product: ProductEmbeddingSource): string {
  return joinLines([
    withLabel('title', product.title),
    withLabel('brand', product.brand),
    withLabel('category', product.category),
    withLabel('keywords', joinValues(product.keywords)),
    withLabel('description', product.description),
  ]);
}

export function buildVariantSearchText(
  product: ProductEmbeddingSource,
  variant: VariantEmbeddingSource,
): string {
  return joinLines([
    withLabel('product', product.title),
    withLabel('brand', product.brand),
    withLabel('category', product.category),
    withLabel('variant', normalizeVariantTitle(variant)),
    withLabel('keywords', joinValues(product.keywords)),
    withLabel('attributes', stringifyAttributes(variant.attributes)),
    withLabel('description', product.description),
  ]);
}

export function normalizeKeywords(keywords?: string[] | null): string[] {
  const values = keywords ?? [];
  const unique = new Set(values.map(normalizeValue).filter(Boolean));
  return Array.from(unique);
}

function joinLines(lines: Array<string | null>): string {
  return lines.filter(Boolean).join('\n').trim();
}

function withLabel(label: string, value?: string | null): string | null {
  const normalized = normalizeValue(value);
  return normalized ? `${label}: ${normalized}` : null;
}

function normalizeVariantTitle(variant: VariantEmbeddingSource): string | null {
  return isDefaultVariant(variant) ? null : normalizeValue(variant.title);
}

function isDefaultVariant(variant: VariantEmbeddingSource): boolean {
  if (variant.isDefault) {
    return true;
  }

  return normalizeValue(variant.title).toLowerCase() === 'default title';
}

function joinValues(values?: string[] | null): string {
  return normalizeKeywords(values).join(', ');
}

function stringifyAttributes(attributes?: Prisma.JsonValue | null): string {
  if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes)) {
    return '';
  }

  const values = Object.entries(attributes as Prisma.JsonObject);
  return values.map(formatAttribute).filter(Boolean).join('; ');
}

function formatAttribute(entry: [string, Prisma.JsonValue | undefined]): string {
  const [key, rawValue] = entry;
  const value = formatAttributeValue(rawValue);
  return value ? `${key}: ${value}` : '';
}

function formatAttributeValue(value: Prisma.JsonValue | undefined): string {
  if (value === undefined) {
    return '';
  }

  if (Array.isArray(value)) {
    return value.map(item => normalizeValue(String(item ?? ''))).filter(Boolean).join(', ');
  }

  return normalizeValue(value == null ? '' : String(value));
}

function normalizeValue(value?: string | null): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}
