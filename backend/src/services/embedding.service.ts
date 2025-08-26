import OpenAI from 'openai';
import prisma from '../db/prisma';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Конфигурация для text-embedding-3-small (совместимость с semantic search)
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536; // Совместимо с HNSW индексами

export class EmbeddingService {
  
  /**
   * Генерирует embedding для текста
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: text.trim(),
        dimensions: EMBEDDING_DIMENSIONS,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  /**
   * Генерирует embedding для товара на основе title + description
   */
  async generateProductEmbedding(product: { title: string; description?: string | null }): Promise<number[]> {
    const text = [
      product.title,
      product.description || ''
    ].filter(Boolean).join(' ').trim();

    if (!text) {
      throw new Error('Product must have title or description for embedding');
    }

    return this.generateEmbedding(text);
  }

  /**
   * Генерирует embedding для варианта товара на основе product.title + variant.title + product.description
   */
  async generateVariantEmbedding(
    product: { title: string; description?: string | null }, 
    variant: { title: string; sku?: string | null }
  ): Promise<number[]> {
    const text = [
      product.title,
      variant.title,
      product.description || ''
    ].filter(Boolean).join(' ').trim();

    return this.generateEmbedding(text);
  }

  /**
   * Вычисляет косинусное сходство между двумя векторами
   */
  cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Обновляет embedding для существующего товара
   */
  async updateProductEmbedding(productId: number): Promise<void> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { variants: true }
    });

    if (!product) {
      throw new Error(`Product with id ${productId} not found`);
    }

    // Генерируем embedding для товара
    const productEmbedding = await this.generateProductEmbedding(product);

    // Обновляем товар используя $queryRaw для vector поля
    const productVector = '[' + productEmbedding.join(',') + ']';
    await prisma.$queryRaw`
      UPDATE "Product" 
      SET embedding = ${productVector}::vector 
      WHERE id = ${productId};
    `;

    // Генерируем embeddings для всех вариантов
    for (const variant of product.variants) {
      const variantEmbedding = await this.generateVariantEmbedding(product, variant);
      
      const variantVector = '[' + variantEmbedding.join(',') + ']';
      await prisma.$queryRaw`
        UPDATE "ProductVariant" 
        SET embedding = ${variantVector}::vector 
        WHERE id = ${variant.id};
      `;
    }

    console.log(`✅ Updated embeddings for product ${productId} and ${product.variants.length} variants`);
  }

  /**
   * Генерирует embeddings для всех товаров домена
   */
  async generateEmbeddingsForDomain(domainId: string): Promise<void> {
    const products = await prisma.product.findMany({
      where: { domainId },
      include: { variants: true }
    });

    console.log(`🚀 Generating embeddings for ${products.length} products in domain ${domainId}...`);

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      console.log(`Processing ${i + 1}/${products.length}: ${product.title}`);
      
      try {
        await this.updateProductEmbedding(product.id);
        
        // Небольшая задержка между запросами к OpenAI
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error processing product ${product.id}:`, error);
      }
    }

    console.log(`✅ Completed embedding generation for domain ${domainId}`);
  }
}

export const embeddingService = new EmbeddingService(); 