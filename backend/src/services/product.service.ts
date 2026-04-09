import { Prisma } from '@prisma/client';
import prisma from '../db/prisma';
import { normalizeKeywords } from '../features/product-search/search-text.builder';
import {
  BulkImportData,
  CreateProductData,
  ProductVariantInput,
  UpdateProductData,
} from '../features/products/product.types';
import { embeddingService } from './embedding.service';

const DEFAULT_VARIANT_TITLE = 'Default Title';

export class ProductService {
  async getAllProducts(
    domainId: string,
    page: number = 1,
    limit: number = 50,
    search?: string,
  ) {
    const where = buildProductWhere(domainId, search);
    const skip = (page - 1) * limit;
    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { variants: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return {
      products,
      pagination: buildPagination(page, limit, totalCount),
      search: search || null,
    };
  }

  async getProductById(id: number, domainId?: string) {
    return prisma.product.findFirst({
      where: buildProductWhereById(id, domainId),
      include: { variants: true },
    });
  }

  async createProduct(data: CreateProductData) {
    const product = await prisma.product.create({
      data: mapProductCreateData(data),
      include: { variants: true },
    });

    await this.refreshEmbeddings(product.id, `Generated embeddings for new product: ${product.title}`);
    return product;
  }

  async bulkImportProducts(productsData: BulkImportData[], domainId: string) {
    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (let index = 0; index < productsData.length; index += 1) {
      const productData = productsData[index];
      const error = validateImportProduct(productData);

      if (error) {
        results.failed += 1;
        results.errors.push(`Row ${index + 1}: ${error}`);
        continue;
      }

      try {
        await this.createProduct({ ...productData, domainId });
        results.success += 1;
      } catch (error: any) {
        results.failed += 1;
        results.errors.push(`Row ${index + 1}: ${error.message || 'Unknown error'}`);
      }
    }

    return results;
  }

  async updateProduct(id: number, data: UpdateProductData, domainId?: string) {
    await this.ensureProductAccess(id, domainId);

    if (data.variants) {
      await prisma.productVariant.deleteMany({ where: { productId: id } });
    }

    const product = await prisma.product.update({
      where: { id },
      data: mapProductUpdateData(data),
      include: { variants: true },
    });

    await this.refreshEmbeddings(id, `Updated embeddings for product: ${product.title}`);
    return product;
  }

  async deleteProduct(id: number, domainId?: string) {
    await this.ensureProductAccess(id, domainId);
    return prisma.product.delete({ where: { id } });
  }

  async rebuildEmbeddingsForDomain(domainId: string) {
    return embeddingService.generateEmbeddingsForDomain(domainId);
  }

  private async ensureProductAccess(id: number, domainId?: string) {
    const product = await prisma.product.findFirst({
      where: buildProductWhereById(id, domainId),
      include: { variants: true },
    });

    if (!product) {
      throw new Error('Product not found or access denied');
    }
  }

  private async refreshEmbeddings(productId: number, successMessage: string) {
    try {
      await embeddingService.updateProductEmbedding(productId);
      console.log(`✅ ${successMessage}`);
    } catch (error) {
      console.warn(`⚠️ Failed to refresh embeddings for product ${productId}:`, error);
    }
  }
}

function buildProductWhere(domainId: string, search?: string): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { domainId };
  const query = search?.trim();

  if (!query) {
    return where;
  }

  const words = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
  where.OR = [
    containsInsensitive('title', query),
    containsInsensitive('description', query),
    containsInsensitive('brand', query),
    containsInsensitive('category', query),
    words.length > 0 ? { keywords: { hasSome: words } } : undefined,
    {
      variants: {
        some: {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { sku: { contains: query, mode: 'insensitive' } },
          ],
        },
      },
    },
  ].filter(Boolean) as Prisma.ProductWhereInput[];

  return where;
}

function buildProductWhereById(id: number, domainId?: string): Prisma.ProductWhereInput {
  return domainId ? { id, domainId } : { id };
}

function mapProductCreateData(data: CreateProductData): Prisma.ProductCreateInput {
  return {
    title: data.title.trim(),
    description: normalizeOptional(data.description),
    brand: normalizeOptional(data.brand),
    category: normalizeOptional(data.category),
    keywords: normalizeKeywords(data.keywords),
    status: data.status || 'active',
    domain: { connect: { id: data.domainId } },
    variants: { create: data.variants.map(mapVariantInput) },
  };
}

function mapProductUpdateData(data: UpdateProductData): Prisma.ProductUpdateInput {
  return {
    title: normalizeOptional(data.title),
    description: normalizeOptional(data.description),
    brand: normalizeOptional(data.brand),
    category: normalizeOptional(data.category),
    keywords: data.keywords ? { set: normalizeKeywords(data.keywords) } : undefined,
    status: data.status,
    variants: data.variants ? { create: data.variants.map(mapVariantInput) } : undefined,
  };
}

function mapVariantInput(variant: ProductVariantInput): Prisma.ProductVariantCreateWithoutProductInput {
  const title = normalizeVariantTitle(variant.title);
  return {
    title,
    price: variant.price,
    sku: normalizeOptional(variant.sku),
    attributes: (variant.attributes ?? undefined) as Prisma.InputJsonValue | undefined,
    isDefault: title === DEFAULT_VARIANT_TITLE,
    isAvailable: variant.isAvailable ?? true,
  };
}

function normalizeVariantTitle(title: string): string {
  const normalized = normalizeOptional(title);
  return normalized || DEFAULT_VARIANT_TITLE;
}

function normalizeOptional(value?: string | null): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function containsInsensitive(field: 'title' | 'description' | 'brand' | 'category', query: string) {
  return { [field]: { contains: query, mode: 'insensitive' as const } };
}

function buildPagination(page: number, limit: number, totalCount: number) {
  const totalPages = Math.ceil(totalCount / limit);
  return {
    page,
    limit,
    totalCount,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

function validateImportProduct(productData: BulkImportData): string | null {
  if (!productData.title?.trim()) {
    return 'Product title is required';
  }

  if (!productData.variants?.length) {
    return 'Product must have at least one variant';
  }

  const hasValidVariant = productData.variants.some(variant => variant.price > 0);
  return hasValidVariant ? null : 'No valid variants found';
}
