import { semanticSearchService } from '../services/semantic-search.service';

export const searchProductsFunction = {
  type: 'function' as const,
  function: {
    name: 'search_products',
    description: 'Search the catalog for purchase intent. Returns structured `products` results with `id`, `type`, `price`, `sku`, `productId`, and similarity. Use returned `variant` ids when calling `add_to_cart`. For follow-up detail questions about one of the found items, use `get_product_details`.',
    parameters: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string' as const,
          description: 'Natural-language catalog search query.'
        }
      },
      required: ['query'] as const
    }
  }
};

interface SearchProductItem {
  id: number;
  price?: number;
  productId?: number;
  sku?: string;
  title: string;
  type: 'product' | 'variant';
  similarity: number;
}

interface SearchProductsSuccess {
  success: true;
  response: string;
  products: SearchProductItem[];
}

interface SearchProductsFailure {
  success: false;
  response: string;
  error: string;
}

type SearchProductsResult = SearchProductsSuccess | SearchProductsFailure;

const buildProducts = (
  results: Awaited<ReturnType<typeof semanticSearchService.searchProducts>>
): SearchProductItem[] => {
  return results.map((result) => ({
    id: result.id,
    price: result.price,
    productId: result.productId,
    sku: result.sku,
    title: result.title,
    type: result.type,
    similarity: result.similarity
  }));
};

const buildNoResults = (query: string): SearchProductsSuccess => {
  return {
    success: true,
    response: `No products were found for "${query}". Try a more specific query.`,
    products: []
  };
};

const buildErrorResult = (message: string): SearchProductsFailure => {
  return {
    success: false,
    response: 'There was an error while searching the catalog.',
    error: message
  };
};

const logProducts = (products: SearchProductItem[]) => {
  products.forEach((product, index) => {
    const price = product.price ? ` | ${product.price / 100} RUB` : '';
    const sku = product.sku ? ` | SKU: ${product.sku}` : '';
    const productId = product.productId ? ` | productId: ${product.productId}` : '';
    const similarity = (product.similarity * 100).toFixed(1);
    console.log(
      `  ${index + 1}. ID:${product.id}${productId} | "${product.title}"${price}${sku} | ${similarity}% | ${product.type}`
    );
  });
};

const logResult = (query: string, result: SearchProductsResult) => {
  console.log('\nSearch tool result:');
  console.log('='.repeat(50));
  console.log(`Query: "${query}"`);
  console.log(`Success: ${result.success}`);
  console.log(`Response: "${result.response}"`);
  if ('products' in result) console.log(`Products (${result.products.length}):`);
  if ('products' in result) logProducts(result.products);
  if ('error' in result) console.log(`Error: "${result.error}"`);
  console.log(JSON.stringify(result, null, 2));
  console.log('='.repeat(50));
};

const buildSuccessResult = async (
  query: string,
  hostname: string
): Promise<SearchProductsResult> => {
  const results = await semanticSearchService.searchProducts(query, hostname, 5);
  if (!results.length) return buildNoResults(query);

  return {
    success: true,
    response: await semanticSearchService.generateBotResponse(query, results),
    products: buildProducts(results)
  };
};

const executeSearch = async (
  query: string,
  hostname: string
): Promise<SearchProductsResult> => {
  try {
    return await buildSuccessResult(query, hostname);
  } catch (error: any) {
    console.error('Search products failed:', error);
    return buildErrorResult(error.message || 'Unknown error');
  }
};

export async function executeSearchProducts(
  args: { query: string; hostname?: string }
): Promise<SearchProductsResult> {
  const { query, hostname = 'localhost' } = args;
  console.log(`Searching products for "${query}" on ${hostname}`);
  const result = await executeSearch(query, hostname);
  logResult(query, result);
  return result;
}
