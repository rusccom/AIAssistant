import { semanticSearchService } from '../services/semantic-search.service';

export const searchProductsFunction = {
  type: 'function' as const,
  function: {
    name: 'search_products',
    description: 'Searches products and returns items with price and availability when purchase intent is detected: product/category mention or questions about price/availability/assortment (incl. colloquial queries like ‘what hot items do you have?’).',
    parameters: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string' as const,
          description: 'Поисковый запрос (естественный язык, RU/EN).'
        }
      },
      required: ['query'] as const
    }
  }
};

interface SearchProductsSuccess {
  success: true;
  response: string;
  products: Array<{
    id: number;
    title: string;
    price?: number;
    sku?: string;
    type: 'product' | 'variant';
    similarity: number;
  }>;
}

interface SearchProductsFailure {
  success: false;
  response: string;
  error: string;
}

type SearchProductsResult = SearchProductsSuccess | SearchProductsFailure;

export async function executeSearchProducts(args: { query: string; hostname?: string }): Promise<SearchProductsResult> {
  const { query, hostname = 'localhost' } = args;
  try {
    console.log(`🔍 Поиск товаров: "${query}" для домена: ${hostname}`);

    // Используем hostname напрямую в semantic search
    const results = await semanticSearchService.searchProducts(query, hostname, 5);
    
    if (results.length === 0) {
      const response = `К сожалению, я не нашел товары по запросу "${query}". Попробуйте изменить запрос или уточнить название товара.`;
      
      const emptyResult = {
        success: true as const,
        response,
        products: []
      };

      console.log('\n📤 ЧТО ОТПРАВЛЯЕТСЯ АССИСТЕНТУ (пустой результат):');
      console.log('═'.repeat(50));
      console.log(`🎯 Query: "${query}"`);
      console.log(`✅ Success: ${emptyResult.success}`);
      console.log('\n📝 Response для чата:');
      console.log(`"${response}"`);
      console.log('\n📦 Products array: пустой массив []');
      console.log('\n📋 Полный JSON объект:');
      console.log(JSON.stringify(emptyResult, null, 2));
      console.log('═'.repeat(50));
      
      return emptyResult;
    }

    // Генерируем ответ для бота
    const response = await semanticSearchService.generateBotResponse(query, results);

    // Форматируем продукты для возврата
    const products = results.map(result => ({
      id: result.id,
      title: result.title,
      price: result.price,
      sku: result.sku,
      type: result.type,
      similarity: result.similarity
    }));

    console.log(`✅ Найдено ${results.length} товаров`);

    // Детальное логирование того, что отправляется ассистенту
    const finalResult = {
      success: true as const,
      response,
      products
    };

    console.log('\n📤 ЧТО ОТПРАВЛЯЕТСЯ АССИСТЕНТУ:');
    console.log('═'.repeat(50));
    console.log(`🎯 Query: "${query}"`);
    console.log(`✅ Success: ${finalResult.success}`);
    console.log('\n📝 Response для чата:');
    console.log(`"${response}"`);
    console.log(`\n📦 Products array (${products.length} товаров):`);
    
    products.forEach((product, i) => {
      const price = product.price ? ` | ${product.price/100}₽` : '';
      const sku = product.sku ? ` | SKU: ${product.sku}` : '';
      const similarity = (product.similarity * 100).toFixed(1);
      console.log(`  ${i+1}. ID:${product.id} | "${product.title}"${price}${sku} | ${similarity}% | ${product.type}`);
    });

    console.log('\n📋 Полный JSON объект:');
    console.log(JSON.stringify(finalResult, null, 2));
    console.log('═'.repeat(50));

    return finalResult;

  } catch (error: any) {
    console.error('❌ Ошибка поиска товаров:', error);
    
    const errorResult = {
      success: false as const,
      response: 'Произошла ошибка при поиске товаров. Попробуйте еще раз.',
      error: error.message || 'Unknown error'
    };

    console.log('\n📤 ЧТО ОТПРАВЛЯЕТСЯ АССИСТЕНТУ (ошибка):');
    console.log('═'.repeat(50));
    console.log(`🎯 Query: "${query}"`);
    console.log(`❌ Success: ${errorResult.success}`);
    console.log('\n📝 Response для чата:');
    console.log(`"${errorResult.response}"`);
    console.log(`\n⚠️ Error: "${errorResult.error}"`);
    console.log('\n📋 Полный JSON объект:');
    console.log(JSON.stringify(errorResult, null, 2));
    console.log('═'.repeat(50));
    
    return errorResult;
  }
} 