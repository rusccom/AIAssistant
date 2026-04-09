import { Prisma } from '@prisma/client';
import prisma from '../db/prisma';
import {
  buildProductSearchText,
  buildVariantSearchText,
} from '../features/product-search/search-text.builder';
import openaiService from './openai.service';

type ProductSource = {
  title: string;
  description?: string | null;
  brand?: string | null;
  category?: string | null;
  keywords?: string[];
};

type VariantSource = {
  id: number;
  title: string;
  attributes?: Prisma.JsonValue | null;
  isDefault?: boolean;
};

export class EmbeddingService {
  async generateEmbedding(text: string): Promise<number[]> {
    return openaiService.createEmbedding(text.trim());
  }

  async updateProductEmbedding(productId: number): Promise<void> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { variants: true },
    });

    if (!product) {
      throw new Error(`Product with id ${productId} not found`);
    }

    await this.updateProductVector(productId, product);
    await this.updateVariantVectors(product.variants, product);
    console.log(`✅ Updated embeddings for product ${productId} and ${product.variants.length} variants`);
  }

  async generateEmbeddingsForDomain(domainId: string): Promise<void> {
    const products = await prisma.product.findMany({
      where: { domainId },
      select: { id: true, title: true },
    });

    for (const product of products) {
      try {
        await this.updateProductEmbedding(product.id);
        await wait(100);
      } catch (error) {
        console.error(`Error processing product ${product.id}:`, error);
      }
    }
  }

  private async updateProductVector(productId: number, product: ProductSource) {
    const sourceText = buildProductSearchText(product);
    const embedding = await this.generateEmbedding(requireText(sourceText, 'Product'));
    await updateVectorRecord('Product', productId, embedding, sourceText);
  }

  private async updateVariantVectors(variants: VariantSource[], product: ProductSource) {
    for (const variant of variants) {
      const sourceText = buildVariantSearchText(product, variant);
      const embedding = await this.generateEmbedding(requireText(sourceText, 'Variant'));
      await updateVectorRecord('ProductVariant', variant.id, embedding, sourceText);
    }
  }
}

async function updateVectorRecord(
  table: 'Product' | 'ProductVariant',
  id: number,
  embedding: number[],
  sourceText: string,
) {
  const vector = `[${embedding.join(',')}]`;
  await prisma.$executeRawUnsafe(
    `UPDATE "${table}" SET embedding = $1::vector, "embeddingSourceText" = $2 WHERE id = $3`,
    vector,
    sourceText,
    id,
  );
}

function requireText(value: string, label: string): string {
  if (value) {
    return value;
  }

  throw new Error(`${label} must have searchable text for embedding`);
}

function wait(timeoutMs: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, timeoutMs));
}

export const embeddingService = new EmbeddingService();
