import prisma from '../../db/prisma';
import { SearchResult } from './search-result.types';

type ProductVectorRow = {
  id: number;
  title: string;
  description: string | null;
  distance: number;
};

type VariantVectorRow = {
  id: number;
  title: string;
  price: number;
  sku: string | null;
  distance: number;
  product_id: number;
  product_title: string;
  product_description: string | null;
};

type ProductTextRow = {
  id: number;
  title: string;
  description: string | null;
  similarity: number;
};

type VariantTextRow = {
  id: number;
  title: string;
  price: number;
  sku: string | null;
  similarity: number;
  product_id: number;
  product_title: string;
  product_description: string | null;
};

export async function findDomainIdByHostname(hostname: string): Promise<string | null> {
  const domain = await prisma.domain.findFirst({ where: { hostname } });
  return domain?.id ?? null;
}

export async function searchProductsByVector(
  domainId: string,
  queryVector: string,
  limit: number,
): Promise<SearchResult[]> {
  const rows = await prisma.$queryRaw<ProductVectorRow[]>`
    SELECT p.id, p.title, p.description,
    (p.embedding <=> ${queryVector}::vector) as distance
    FROM "Product" p
    WHERE p.embedding IS NOT NULL
      AND p."domainId" = ${domainId}
      AND p.status = 'active'
    ORDER BY p.embedding <=> ${queryVector}::vector
    LIMIT ${limit * 2};
  `;

  return rows.map(toProductVectorResult);
}

export async function searchVariantsByVector(
  domainId: string,
  queryVector: string,
  limit: number,
): Promise<SearchResult[]> {
  const rows = await prisma.$queryRaw<VariantVectorRow[]>`
    SELECT pv.id, pv.title, pv.price, pv.sku,
    (pv.embedding <=> ${queryVector}::vector) as distance,
    p.id as product_id, p.title as product_title, p.description as product_description
    FROM "ProductVariant" pv
    JOIN "Product" p ON p.id = pv."productId"
    WHERE pv.embedding IS NOT NULL
      AND p."domainId" = ${domainId}
      AND p.status = 'active'
      AND pv."isAvailable" = true
    ORDER BY pv.embedding <=> ${queryVector}::vector
    LIMIT ${limit * 2};
  `;

  return rows.map(toVariantVectorResult);
}

export async function searchProductsByText(
  domainId: string,
  query: string,
  limit: number,
): Promise<SearchResult[]> {
  const pattern = buildPattern(query);
  const rows = await prisma.$queryRaw<ProductTextRow[]>`
    SELECT p.id, p.title, p.description,
    CASE
      WHEN LOWER(p.title) = LOWER(${query}) THEN 0.99
      WHEN p.title ILIKE ${pattern} THEN 0.92
      WHEN COALESCE(p.brand, '') ILIKE ${pattern} THEN 0.88
      WHEN COALESCE(p.category, '') ILIKE ${pattern} THEN 0.86
      ELSE 0.82
    END as similarity
    FROM "Product" p
    WHERE p."domainId" = ${domainId}
      AND p.status = 'active'
      AND (
        p.title ILIKE ${pattern}
        OR COALESCE(p.description, '') ILIKE ${pattern}
        OR COALESCE(p.brand, '') ILIKE ${pattern}
        OR COALESCE(p.category, '') ILIKE ${pattern}
        OR array_to_string(p.keywords, ' ') ILIKE ${pattern}
      )
    ORDER BY similarity DESC, p."createdAt" DESC
    LIMIT ${limit};
  `;

  return rows.map(toProductTextResult);
}

export async function searchVariantsByText(
  domainId: string,
  query: string,
  limit: number,
): Promise<SearchResult[]> {
  const pattern = buildPattern(query);
  const rows = await prisma.$queryRaw<VariantTextRow[]>`
    SELECT pv.id, pv.title, pv.price, pv.sku,
    CASE
      WHEN LOWER(COALESCE(pv.sku, '')) = LOWER(${query}) THEN 1.0
      WHEN COALESCE(pv.sku, '') ILIKE ${pattern} THEN 0.98
      WHEN pv.title ILIKE ${pattern} THEN 0.92
      WHEN p.title ILIKE ${pattern} THEN 0.9
      ELSE 0.84
    END as similarity,
    p.id as product_id, p.title as product_title, p.description as product_description
    FROM "ProductVariant" pv
    JOIN "Product" p ON p.id = pv."productId"
    WHERE p."domainId" = ${domainId}
      AND p.status = 'active'
      AND pv."isAvailable" = true
      AND (
        COALESCE(pv.sku, '') ILIKE ${pattern}
        OR pv.title ILIKE ${pattern}
        OR p.title ILIKE ${pattern}
        OR COALESCE(p.description, '') ILIKE ${pattern}
        OR COALESCE(p.brand, '') ILIKE ${pattern}
        OR COALESCE(p.category, '') ILIKE ${pattern}
        OR array_to_string(p.keywords, ' ') ILIKE ${pattern}
      )
    ORDER BY similarity DESC, pv."updatedAt" DESC
    LIMIT ${limit};
  `;

  return rows.map(toVariantTextResult);
}

function buildPattern(query: string): string {
  return `%${query.trim()}%`;
}

function toProductVectorResult(row: ProductVectorRow): SearchResult {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    type: 'product',
    similarity: Math.max(0, 1 - row.distance),
  };
}

function toVariantVectorResult(row: VariantVectorRow): SearchResult {
  return {
    id: row.id,
    title: `${row.product_title} ${row.title}`,
    description: row.product_description ?? undefined,
    price: Number(row.price),
    sku: row.sku ?? undefined,
    type: 'variant',
    similarity: Math.max(0, 1 - row.distance),
    productId: row.product_id,
  };
}

function toProductTextResult(row: ProductTextRow): SearchResult {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    type: 'product',
    similarity: row.similarity,
  };
}

function toVariantTextResult(row: VariantTextRow): SearchResult {
  return {
    id: row.id,
    title: `${row.product_title} ${row.title}`,
    description: row.product_description ?? undefined,
    price: Number(row.price),
    sku: row.sku ?? undefined,
    type: 'variant',
    similarity: row.similarity,
    productId: row.product_id,
  };
}
