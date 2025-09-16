import prisma from '../db/prisma';

export const getProductInfoFunction = {
  type: 'function' as const,
  function: {
    name: 'get_product_info',
    description: 'Get detailed product information by ID. Returns price, title, variant details.',
    parameters: {
      type: 'object' as const,
      properties: {
        productId: {
          type: 'string' as const,
          description: 'Unique product identifier (ID or name)'
        }
      },
      required: ['productId'] as const
    }
  }
};

interface ProductVariant {
  id: number;
  title: string;
  price: number;
  sku: string | null;  // sku может быть null в базе данных
}

interface ProductVariantResult {
  id: number;
  title: string;
  price: number;
  sku: string;  // в результате sku всегда string (null преобразуется в пустую строку)
}

interface Product {
  id: number;
  title: string;
  variant: ProductVariantResult;
}

interface GetProductInfoSuccess {
  success: true;
  response: string;
  product: Product;
}

interface GetProductInfoFailure {
  success: false;
  response: string;
  error?: string;           // машинночитаемое сообщение
  productId?: number;
  variantId?: number;
  hostname?: string;
}

export type GetProductInfoResult = GetProductInfoSuccess | GetProductInfoFailure;

export async function getProductInfo(args: { productId: number; variantId?: number; hostname?: string }): Promise<GetProductInfoResult> {
  const { productId, variantId, hostname = 'localhost' } = args;
  // Логирование теперь в bot-execute.routes.ts

  // Простейшая рантайм-валидация
  if (!productId || productId <= 0) {
    return {
      success: false,
      response: 'ID товара должен быть положительным числом.',
      error: 'INVALID_PRODUCT_ID',
      productId,
      hostname
    };
  }

  if (variantId !== undefined && variantId <= 0) {
    return {
      success: false,
      response: 'ID варианта должен быть положительным числом.',
      error: 'INVALID_VARIANT_ID',
      productId,
      variantId,
      hostname
    };
  }

  try {
    // Проверяем что домен существует
    const domain = await prisma.domain.findUnique({
      where: { hostname }
    });

    if (!domain) {
      return {
        success: false,
        response: 'Домен не найден.',
        error: 'DOMAIN_NOT_FOUND',
        productId,
        variantId,
        hostname
      };
    }

    // Получаем товар с вариантами
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        domainId: domain.id
      },
      include: {
        variants: true
      }
    });

    if (!product) {
      return {
        success: false,
        response: 'Товар не найден.',
        error: 'PRODUCT_NOT_FOUND',
        productId,
        variantId,
        hostname
      };
    }

    // Находим конкретный вариант если указан
    let selectedVariant = product.variants[0]; // По умолчанию первый вариант
    if (variantId) {
      const variant = product.variants.find(v => v.id === variantId);
      if (variant) {
        selectedVariant = variant;
      } else {
        return {
          success: false,
          response: 'Вариант товара не найден.',
          error: 'VARIANT_NOT_FOUND',
          productId,
          variantId,
          hostname
        };
      }
    }

    if (!selectedVariant) {
      return {
        success: false,
        response: 'У товара нет доступных вариантов.',
        error: 'NO_VARIANTS_AVAILABLE',
        productId,
        variantId,
        hostname
      };
    }

    const priceFormatted = (selectedVariant.price / 100).toFixed(2);
    const variantInfo = selectedVariant.title === 'Default Title' ? '' : ` ${selectedVariant.title}`;
    
    const response = `${product.title}${variantInfo} стоит $${priceFormatted}.`;

    return {
      success: true,
      response,
      product: {
        id: product.id,
        title: product.title,
        variant: {
          id: selectedVariant.id,
          title: selectedVariant.title,
          price: selectedVariant.price,
          sku: selectedVariant.sku || '' // обрабатываем null как пустую строку
        }
      }
    };
  } catch (error: unknown) {
    // Нормализация ошибки
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in get_product_info function:', error);

    return {
      success: false,
      response: 'К сожалению, не удалось получить информацию о товаре.',
      error: message,
      productId,
      variantId,
      hostname
    };
  }
} 