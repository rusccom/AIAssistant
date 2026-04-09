import prisma from '../db/prisma';
import {
  findDomainIdByHostname,
  searchProductsByText,
  searchProductsByVector,
  searchVariantsByText,
  searchVariantsByVector,
} from '../features/product-search/product-search.repository';
import { SearchResult } from '../features/product-search/search-result.types';
import {
  applyIntelligentFiltering,
  formatPrice,
  groupResultsByProduct,
  mergeSearchResults,
} from '../features/product-search/search-result.utils';
import { embeddingService } from './embedding.service';
import openaiService from './openai.service';

class SemanticSearchService {
  async searchProducts(query: string, hostname: string, limit: number = 5): Promise<SearchResult[]> {
    try {
      const domainId = await findDomainIdByHostname(hostname);
      if (!domainId) {
        return [];
      }

      const vector = await this.createQueryVector(query);
      const results = await Promise.all([
        searchProductsByVector(domainId, vector, limit),
        searchVariantsByVector(domainId, vector, limit),
        searchProductsByText(domainId, query, limit),
        searchVariantsByText(domainId, query, limit),
      ]);

      return applyIntelligentFiltering(mergeSearchResults(results), query, limit);
    } catch (error) {
      console.error('❌ Semantic search error:', error);
      return [];
    }
  }

  async generateBotResponse(query: string, results: SearchResult[]): Promise<string> {
    if (results.length === 0) {
      return `К сожалению, я не нашел товары по запросу "${query}". Попробуйте изменить запрос или уточнить название товара.`;
    }

    const groupedProducts = groupResultsByProduct(results);
    if (groupedProducts.length === 1) {
      return this.buildSingleProductResponse(groupedProducts[0]);
    }

    return this.buildMultiProductResponse(query, groupedProducts);
  }

  async generateMissingEmbeddings(hostname?: string): Promise<void> {
    const domainId = hostname ? await findDomainIdByHostname(hostname) : undefined;

    if (hostname && !domainId) {
      return;
    }

    const products = await prisma.product.findMany({
      where: {
        domainId,
        OR: [
          { embeddingSourceText: null },
          { variants: { some: { embeddingSourceText: null } } },
        ],
      },
      select: { id: true },
    });

    for (const product of products) {
      await embeddingService.updateProductEmbedding(product.id);
    }
  }

  private async createQueryVector(query: string): Promise<string> {
    const embedding = await openaiService.createEmbedding(query);
    return `[${embedding.join(',')}]`;
  }

  private buildSingleProductResponse(grouped: ReturnType<typeof groupResultsByProduct>[number]): string {
    if (grouped.variants.length === 1) {
      return this.buildSingleVariantResponse(grouped.variants[0]);
    }

    const items = grouped.variants.map(formatVariantLine).join('\n');
    return `Найден товар "${grouped.title}" в нескольких вариантах:\n${items}`;
  }

  private buildSingleVariantResponse(item: SearchResult): string {
    const price = item.price ? ` стоит ${formatPrice(item.price)}` : '';
    const sku = item.sku ? ` (артикул: ${item.sku})` : '';
    return `${item.title}${price}${sku}.`;
  }

  private buildMultiProductResponse(
    query: string,
    groupedProducts: ReturnType<typeof groupResultsByProduct>,
  ): string {
    const items = groupedProducts.map(formatProductLine).join('\n');
    return `Найдено несколько товаров по запросу "${query}":\n${items}`;
  }
}

function formatVariantLine(variant: SearchResult, index: number): string {
  const price = variant.price ? ` - ${formatPrice(variant.price)}` : '';
  const sku = variant.sku ? ` (${variant.sku})` : '';
  return `${index + 1}. ${variant.title}${price}${sku}`;
}

function formatProductLine(
  product: ReturnType<typeof groupResultsByProduct>[number],
  index: number,
): string {
  const bestVariant = product.variants[0];
  const price = bestVariant.price ? ` - ${formatPrice(bestVariant.price)}` : '';
  const sku = bestVariant.sku ? ` (${bestVariant.sku})` : '';
  const variants = product.variants.length > 1 ? ` (${product.variants.length} вариантов)` : '';
  return `${index + 1}. ${product.title}${price}${sku}${variants}`;
}

export const semanticSearchService = new SemanticSearchService();
