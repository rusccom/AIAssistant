import prisma from '../db/prisma';
import openaiService from './openai.service'; // Используем обновленный сервис

interface SearchResult {
  id: number;
  title: string;
  description?: string;
  price?: number;
  sku?: string;
  type: 'product' | 'variant';
  similarity: number;
  productId?: number;
}

class SemanticSearchService {
  // Изменили сигнатуру: hostname вместо domainId
  async searchProducts(query: string, hostname: string, limit: number = 5): Promise<SearchResult[]> {
    try {
      console.log(`🔍 Семантический поиск: "${query}" для домена ${hostname}`);

      // 1. Находим домен по hostname
      const domain = await prisma.domain.findFirst({
        where: { hostname: hostname }
      });

      if (!domain) {
        console.log(`❌ Домен ${hostname} не найден`);
        return [];
      }

      const domainId = domain.id;
      console.log(`🌐 Найден домен: ${hostname} (ID: ${domainId})`);

      // 2. Создаем embedding для поискового запроса
      const queryEmbedding = await openaiService.createEmbedding(query);
      const queryVector = '[' + queryEmbedding.join(',') + ']';

      console.log('📊 Поиск с HNSW индексами (embedding)...');

      // 3. Поиск среди продуктов с использованием pgvector и HNSW индексов
      const productResults = await prisma.$queryRaw<Array<{
        id: number;
        title: string;
        description: string | null;
        distance: number;
      }>>`
        SELECT 
          p.id,
          p.title,
          p.description,
          (p.embedding <=> ${queryVector}::vector) as distance
        FROM "Product" p
        WHERE p.embedding IS NOT NULL 
          AND p."domainId" = ${domainId}
        ORDER BY p.embedding <=> ${queryVector}::vector
        LIMIT ${limit * 2};
      `;

      // 4. Поиск среди вариантов с использованием pgvector и HNSW индексов
      const variantResults = await prisma.$queryRaw<Array<{
        id: number;
        title: string;
        price: number;
        sku: string | null;
        distance: number;
        product_id: number;
        product_title: string;
        product_description: string | null;
      }>>`
        SELECT 
          pv.id,
          pv.title,
          pv.price,
          pv.sku,
          (pv.embedding <=> ${queryVector}::vector) as distance,
          p.id as product_id,
          p.title as product_title,
          p.description as product_description
        FROM "ProductVariant" pv
        JOIN "Product" p ON p.id = pv."productId"
        WHERE pv.embedding IS NOT NULL 
          AND p."domainId" = ${domainId}
        ORDER BY pv.embedding <=> ${queryVector}::vector
        LIMIT ${limit * 2};
      `;

      console.log(`📊 Найдено товаров: ${productResults.length}, вариантов: ${variantResults.length}`);

      // 5. Объединяем результаты
      const allResults: SearchResult[] = [
        ...productResults.map(p => ({
          id: p.id,
          title: p.title,
          description: p.description || undefined,
          type: 'product' as const,
          similarity: Math.max(0, 1 - p.distance) // Конвертируем distance в similarity
        })),
        ...variantResults.map(v => ({
          id: v.id,
          title: `${v.product_title} ${v.title}`,
          description: v.product_description || undefined,
          price: Number(v.price),
          sku: v.sku || undefined,
          type: 'variant' as const,
          similarity: Math.max(0, 1 - v.distance), // Конвертируем distance в similarity
          productId: v.product_id
        }))
      ];

      // 6. Применяем интеллектуальную фильтрацию
      const filteredResults = this.applyIntelligentFiltering(allResults, query, limit);

      console.log(`🎯 Найдено ${filteredResults.length} результатов после фильтрации`);
      return filteredResults;

    } catch (error) {
      console.error('❌ Ошибка семантического поиска:', error);
      return [];
    }
  }

  private applyIntelligentFiltering(results: SearchResult[], query: string, limit: number): SearchResult[] {
    // Сортируем по similarity (убывание)
    results.sort((a, b) => b.similarity - a.similarity);

    const queryLower = query.toLowerCase();
    
    // Поиск точных совпадений в названии (частичное вхождение)
    const exactMatches = results.filter(r => 
      r.title.toLowerCase().includes(queryLower)
    );
    
    // Поиск по отдельным словам запроса
    const queryWords = queryLower.split(' ').filter(word => word.length > 2);
    const wordMatches = results.filter(r => {
      const titleLower = r.title.toLowerCase();
      return queryWords.some(word => titleLower.includes(word));
    });

    // Определяем лучший набор результатов
    let candidateResults: SearchResult[] = [];
    
    // Если есть точные совпадения с хорошим similarity - приоритет им
    const goodExactMatches = exactMatches.filter(r => r.similarity > 0.4);
    if (goodExactMatches.length > 0) {
      console.log(`🎯 Найдены точные совпадения с высоким similarity`);
      candidateResults = goodExactMatches;
    }
    // Если есть совпадения по словам с хорошим similarity
    else if (wordMatches.filter(r => r.similarity > 0.5).length > 0) {
      console.log(`📝 Найдены совпадения по ключевым словам`);
      candidateResults = wordMatches.filter(r => r.similarity > 0.5);
    }
    // Иначе берем результаты с хорошим similarity
    else if (results.filter(r => r.similarity > 0.4).length > 0) {
      candidateResults = results.filter(r => r.similarity > 0.4);
    }
    // В крайнем случае - берем с базовым порогом
    else {
      candidateResults = results.filter(r => r.similarity > 0.25);
    }

    // 🎯 НОВАЯ ЛОГИКА: Если первый элемент имеет варианты - возвращаем только его
    if (candidateResults.length > 0) {
      const grouped = this.groupResultsByProduct(candidateResults);
      const firstProduct = grouped[0];
      
      if (firstProduct && firstProduct.variants.length > 1) {
        console.log(`🔥 Первый продукт "${firstProduct.title}" имеет ${firstProduct.variants.length} вариантов - возвращаем только его`);
        return firstProduct.variants.slice(0, limit);
      }
    }

    // Обычная логика - возвращаем топ результаты
    return candidateResults.slice(0, limit);
  }

  async generateBotResponse(query: string, results: SearchResult[]): Promise<string> {
    if (results.length === 0) {
      return `К сожалению, я не нашел товары по запросу "${query}". Попробуйте изменить запрос или уточнить название товара.`;
    }

    // Группируем результаты по товарам
    const groupedProducts = this.groupResultsByProduct(results);
    
    if (groupedProducts.length === 1) {
      // Найден только один товар (возможно с несколькими вариантами)
      const product = groupedProducts[0];
      
      if (product.variants.length === 1) {
        // Один товар с одним вариантом
        const item = product.variants[0];
        const price = item.price ? ` стоит ${this.formatPrice(item.price)}` : '';
        const sku = item.sku ? ` (артикул: ${item.sku})` : '';
        return `${item.title}${price}${sku}.`;
      } else {
        // Один товар с несколькими вариантами
        const mainTitle = product.title;
        const variantList = product.variants.map((variant, index) => {
          const price = variant.price ? ` - ${this.formatPrice(variant.price)}` : '';
          const sku = variant.sku ? ` (${variant.sku})` : '';
          return `${index + 1}. ${variant.title}${price}${sku}`;
        }).join('\n');
        
        return `Найден товар "${mainTitle}" в нескольких вариантах:\n${variantList}`;
      }
    }

    // Найдено несколько разных товаров
    const itemList = groupedProducts.map((product, index) => {
      const bestVariant = product.variants[0]; // Берем лучший вариант товара
      const price = bestVariant.price ? ` - ${this.formatPrice(bestVariant.price)}` : '';
      const sku = bestVariant.sku ? ` (${bestVariant.sku})` : '';
      const variantInfo = product.variants.length > 1 ? ` (${product.variants.length} вариантов)` : '';
      return `${index + 1}. ${product.title}${price}${sku}${variantInfo}`;
    }).join('\n');

    return `Найдено несколько товаров по запросу "${query}":\n${itemList}`;
  }

  private groupResultsByProduct(results: SearchResult[]): Array<{title: string, variants: SearchResult[]}> {
    const productMap = new Map<string, SearchResult[]>();
    
    for (const result of results) {
      let productKey: string;
      let productTitle: string;
      
      if (result.type === 'product') {
        productKey = `product_${result.id}`;
        productTitle = result.title;
      } else {
        // Для вариантов группируем по productId
        productKey = `product_${result.productId}`;
        // Извлекаем название товара из title варианта (убираем название варианта)
        const parts = result.title.split(' ');
        // Берем первые 2-3 слова как название товара
        productTitle = parts.slice(0, Math.min(3, parts.length - 1)).join(' ');
      }
      
      if (!productMap.has(productKey)) {
        productMap.set(productKey, []);
      }
      productMap.get(productKey)!.push(result);
    }
    
    return Array.from(productMap.entries()).map(([key, variants]) => ({
      title: variants[0].type === 'product' ? variants[0].title : this.extractProductTitle(variants[0]),
      variants: variants.sort((a, b) => b.similarity - a.similarity)
    }));
  }

  private extractProductTitle(variantResult: SearchResult): string {
    // Для вариантов извлекаем название товара из составного title
    const parts = variantResult.title.split(' ');
    // Убираем последнее слово (обычно это название варианта типа "Черные", "128GB" и т.д.)
    return parts.slice(0, -1).join(' ');
  }

  private formatPrice(price: number): string {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB'
    }).format(price);
  }

  // Генерация недостающих embeddings (обновленная версия для поиска по hostname)
  async generateMissingEmbeddings(hostname?: string): Promise<void> {
    console.log('🔄 Создание недостающих embedding...');

    try {
      let domainId: string | undefined;

      // Если указан hostname, находим соответствующий домен
      if (hostname) {
        const domain = await prisma.domain.findFirst({
          where: { hostname: hostname }
        });
        
        if (!domain) {
          console.log(`❌ Домен ${hostname} не найден`);
          return;
        }
        
        domainId = domain.id;
        console.log(`🌐 Работаем с доменом: ${hostname} (ID: ${domainId})`);
      }

      // Найти продукты без embedding
      const products = domainId
        ? await prisma.$queryRaw<Array<{ id: number; title: string; description: string | null }>>`
            SELECT id, title, description FROM "Product" 
            WHERE embedding IS NULL AND "domainId" = ${domainId}
          `
        : await prisma.$queryRaw<Array<{ id: number; title: string; description: string | null }>>`
            SELECT id, title, description FROM "Product" 
            WHERE embedding IS NULL
          `;

      for (const product of products) {
        const text = `${product.title} ${product.description || ''}`.trim();
        const embedding = await openaiService.createEmbedding(text);
        const embeddingVector = '[' + embedding.join(',') + ']';
        
        await prisma.$queryRaw`
          UPDATE "Product" 
          SET embedding = ${embeddingVector}::vector 
          WHERE id = ${product.id}
        `;
        
        console.log(`✅ Обновлен embedding для товара: ${product.title}`);
      }

      // Найти варианты без embedding
      const variants = domainId
        ? await prisma.$queryRaw<Array<{
            id: number;
            title: string;
            product_title: string;
            product_description: string | null;
          }>>`
            SELECT pv.id, pv.title, p.title as product_title, p.description as product_description
            FROM "ProductVariant" pv
            JOIN "Product" p ON p.id = pv."productId"
            WHERE pv.embedding IS NULL AND p."domainId" = ${domainId}
          `
        : await prisma.$queryRaw<Array<{
            id: number;
            title: string;
            product_title: string;
            product_description: string | null;
          }>>`
            SELECT pv.id, pv.title, p.title as product_title, p.description as product_description
            FROM "ProductVariant" pv
            JOIN "Product" p ON p.id = pv."productId"
            WHERE pv.embedding IS NULL
          `;

      for (const variant of variants) {
        const text = `${variant.product_title} ${variant.title} ${variant.product_description || ''}`.trim();
        const embedding = await openaiService.createEmbedding(text);
        const embeddingVector = '[' + embedding.join(',') + ']';
        
        await prisma.$queryRaw`
          UPDATE "ProductVariant" 
          SET embedding = ${embeddingVector}::vector 
          WHERE id = ${variant.id}
        `;
        
        console.log(`✅ Обновлен embedding для варианта: ${variant.product_title} ${variant.title}`);
      }

      console.log('✅ Все недостающие embedding созданы');

    } catch (error) {
      console.error('❌ Ошибка создания embedding:', error);
      throw error;
    }
  }
}

export const semanticSearchService = new SemanticSearchService(); 