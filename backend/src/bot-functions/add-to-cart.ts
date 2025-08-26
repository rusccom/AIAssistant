import prisma from '../db/prisma';

export const addToCartFunction = {
  type: 'function' as const,
  function: {
    name: 'add_to_cart',
    description: 'Add a product variant to shopping cart. Use when user wants to buy or add something to cart.',
    parameters: {
      type: 'object' as const,
      properties: {
        variantId: {
          type: 'string' as const,
          description: 'ID варианта товара для добавления в корзину'
        },
        quantity: {
          type: 'number' as const,
          description: 'Количество товара (по умолчанию 1)'
        }
      },
      required: ['variantId'] as const
    }
  }
};

interface AddToCartSuccess {
  success: true;
  response: string;
  cartItem: {
    id: number;
    variantId: number;
    quantity: number;
    productTitle: string;
    variantTitle: string;
    price: number;
    totalPrice: number;
  };
  cartSummary: {
    totalItems: number;
    totalAmount: number;
  };
}

interface AddToCartFailure {
  success: false;
  response: string;
  error: string;
  variantId?: string | number;
  hostname?: string;
}

type AddToCartResult = AddToCartSuccess | AddToCartFailure;

export async function addToCart(args: { 
  variantId: string | number; 
  quantity?: number; 
  hostname?: string 
}): Promise<AddToCartResult> {
  const { variantId, quantity = 1, hostname = 'localhost' } = args;

  // Валидация
  if (!variantId) {
    return {
      success: false,
      response: 'ID варианта товара обязателен.',
      error: 'INVALID_VARIANT_ID',
      variantId,
      hostname
    };
  }

  if (quantity <= 0) {
    return {
      success: false,
      response: 'Количество должно быть больше 0.',
      error: 'INVALID_QUANTITY',
      variantId,
      hostname
    };
  }

  try {
    // Находим домен
    const domain = await prisma.domain.findUnique({
      where: { hostname }
    });

    if (!domain) {
      return {
        success: false,
        response: 'Домен не найден.',
        error: 'DOMAIN_NOT_FOUND',
        variantId,
        hostname
      };
    }

    // Находим вариант товара
    const variant = await prisma.productVariant.findFirst({
      where: {
        id: Number(variantId),
        product: {
          domainId: domain.id
        }
      },
      include: {
        product: true
      }
    });

    if (!variant) {
      return {
        success: false,
        response: 'Товар не найден.',
        error: 'VARIANT_NOT_FOUND',
        variantId,
        hostname
      };
    }

    // Находим или создаем корзину пользователя для этого домена
    // Пока используем фиктивного пользователя (первого в базе)
    const user = await prisma.user.findFirst();
    if (!user) {
      return {
        success: false,
        response: 'Пользователь не найден. Войдите в систему.',
        error: 'USER_NOT_FOUND',
        variantId,
        hostname
      };
    }

    let cart = await prisma.cart.findUnique({
      where: {
        userId_domainId: {
          userId: user.id,
          domainId: domain.id
        }
      }
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          userId: user.id,
          domainId: domain.id
        }
      });
    }

    // Проверяем есть ли уже такой вариант в корзине
    const existingCartItem = await prisma.cartItem.findUnique({
      where: {
        cartId_variantId: {
          cartId: cart.id,
          variantId: Number(variantId)
        }
      }
    });

    let cartItem;
    if (existingCartItem) {
      // Увеличиваем количество
      cartItem = await prisma.cartItem.update({
        where: { id: existingCartItem.id },
        data: {
          quantity: existingCartItem.quantity + quantity
        }
      });
    } else {
      // Создаем новый элемент корзины
      cartItem = await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          variantId: Number(variantId),
          quantity: quantity
        }
      });
    }

    // Получаем статистику корзины
    const cartStats = await prisma.cartItem.aggregate({
      where: { cartId: cart.id },
      _sum: {
        quantity: true
      }
    });

    const cartItemsWithDetails = await prisma.cartItem.findMany({
      where: { cartId: cart.id },
      include: {
        variant: {
          include: {
            product: true
          }
        }
      }
    });

    const totalAmount = cartItemsWithDetails.reduce((sum, item) => 
      sum + (item.variant.price * item.quantity), 0
    );

    const totalPrice = variant.price * cartItem.quantity;

    // Форматируем цены
    const formatPrice = (priceInCents: number) => {
      return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 0
      }).format(priceInCents / 100);
    };

    const response = existingCartItem
      ? `Увеличено количество "${variant.product.title} ${variant.title}" в корзине. Теперь: ${cartItem.quantity} шт. на сумму ${formatPrice(totalPrice)}.`
      : `Добавлено в корзину: "${variant.product.title} ${variant.title}" ${quantity} шт. на сумму ${formatPrice(totalPrice)}.`;

    console.log(`✅ Товар добавлен в корзину: ${variant.product.title} ${variant.title} x${cartItem.quantity}`);

    return {
      success: true,
      response,
      cartItem: {
        id: cartItem.id,
        variantId: cartItem.variantId,
        quantity: cartItem.quantity,
        productTitle: variant.product.title,
        variantTitle: variant.title,
        price: variant.price,
        totalPrice: totalPrice
      },
      cartSummary: {
        totalItems: cartStats._sum.quantity || 0,
        totalAmount: totalAmount
      }
    };

  } catch (error: any) {
    console.error('❌ Ошибка добавления в корзину:', error);
    
    return {
      success: false,
      response: 'Произошла ошибка при добавлении товара в корзину. Попробуйте еще раз.',
      error: error.message || 'Unknown error',
      variantId,
      hostname
    };
  }
} 