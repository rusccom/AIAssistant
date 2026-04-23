import { productDetailsService } from '../features/product-details/product-details.service';
import { GetProductDetailsArgs } from '../features/product-details/product-details.types';

export const getProductDetailsFunction = {
  type: 'function' as const,
  function: {
    name: 'get_product_details',
    description: 'Get detailed information about a specific item that was already shown or found earlier. Use this for follow-up questions like composition, description, ingredients, size, or more details. Prefer passing the product name from the current context, or productId/variantId when already known.',
    parameters: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string' as const,
          description: 'Product name or user reference from the recent conversation, for example "Pepperoni".'
        },
        productId: {
          type: 'number' as const,
          description: 'Exact product id when already known.'
        },
        variantId: {
          type: 'number' as const,
          description: 'Exact variant id when already known.'
        }
      }
    }
  }
};

export const getProductDetails = (args: GetProductDetailsArgs) => {
  return productDetailsService.getDetails(args);
};
