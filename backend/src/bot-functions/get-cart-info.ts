import prisma from '../db/prisma';

export const getCartInfoFunction = {
  type: 'function' as const,
  function: {
    name: 'get_cart_info',
    description: 'Show shopping cart contents and total. Use when user asks about cart, wants to see what\'s in cart, or asks for total.',
    parameters: {
      type: 'object' as const,
      properties: {},
      required: [] as const
    }
  }
};

interface CartItemInfo {
  id: number;
  variantId: number;
  quantity: number;
  productTitle: string;
  variantTitle: string;
  price: number;
  totalPrice: number;
  sku?: string;
}

interface GetCartInfoSuccess {
  success: true;
  response: string;
  cart: {
    id: string;
    totalItems: number;
    totalAmount: number;
    items: CartItemInfo[];
  };
}

interface GetCartInfoFailure {
  success: false;
  response: string;
  error: string;
  hostname?: string;
}

type GetCartInfoResult = GetCartInfoSuccess | GetCartInfoFailure;

export async function getCartInfo(args: { hostname?: string }): Promise<GetCartInfoResult> {
  const { hostname = 'localhost' } = args;

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
        hostname
      };
    }

    // Находим пользователя (пока первого в базе)
    const user = await prisma.user.findFirst();
    if (!user) {
      return {
        success: false,
        response: 'Пользователь не найден. Войдите в систему.',
        error: 'USER_NOT_FOUND',
        hostname
      };
    }

    // Находим корзину пользователя для этого домена
    const cart = await prisma.cart.findUnique({
      where: {
        userId_domainId: {
          userId: user.id,
          domainId: domain.id
        }
      },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true
              }
            }
          }
        }
      }
    });

    if (!cart || cart.items.length === 0) {
      return {
        success: true,
        response: 'Ваша корзина пуста.',
        cart: {
          id: cart?.id || '',
          totalItems: 0,
          totalAmount: 0,
          items: []
        }
      };
    }

    // Подсчитываем статистику корзины
    const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = cart.items.reduce((sum, item) => sum + (item.variant.price * item.quantity), 0);

    // Форматируем товары
    const cartItems: CartItemInfo[] = cart.items.map(item => ({
      id: item.id,
      variantId: item.variantId,
      quantity: item.quantity,
      productTitle: item.variant.product.title,
      variantTitle: item.variant.title,
      price: item.variant.price,
      totalPrice: item.variant.price * item.quantity,
      sku: item.variant.sku || undefined
    }));

    // Форматируем цены
    const formatPrice = (priceInCents: number) => {
      return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 0
      }).format(priceInCents / 100);
    };

    // Генерируем человеко-читаемый ответ
    let response = `🛒 В вашей корзине ${totalItems} товар(ов) на сумму ${formatPrice(totalAmount)}:\n\n`;
    
    cart.items.forEach((item, index) => {
      const itemTotal = item.variant.price * item.quantity;
      const sku = item.variant.sku ? ` (${item.variant.sku})` : '';
      response += `${index + 1}. ${item.variant.product.title} ${item.variant.title}${sku}\n`;
      response += `   Количество: ${item.quantity} шт. × ${formatPrice(item.variant.price)} = ${formatPrice(itemTotal)}\n\n`;
    });

    response += `💰 Итого: ${formatPrice(totalAmount)}`;

    console.log(`✅ Показана корзина: ${totalItems} товаров на сумму ${formatPrice(totalAmount)}`);

    return {
      success: true,
      response,
      cart: {
        id: cart.id,
        totalItems,
        totalAmount,
        items: cartItems
      }
    };

  } catch (error: any) {
    console.error('❌ Ошибка получения корзины:', error);
    
    return {
      success: false,
      response: 'Произошла ошибка при получении содержимого корзины. Попробуйте еще раз.',
      error: error.message || 'Unknown error',
      hostname
    };
  }
} 