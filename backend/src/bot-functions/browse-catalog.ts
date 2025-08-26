import prisma from '../db/prisma';

export const browseCatalogFunction = {
  type: 'function' as const,
  function: {
    name: 'browse_catalog',
    description: 'Show product catalog when user asks general questions like "what do you have?", "show me your products", "what\'s available?", "browse catalog". Use this for general browsing requests.',
    parameters: {
      type: 'object' as const,
      properties: {
        action: {
          type: 'string' as const,
          description: 'Action to perform (always "browse" for catalog browsing)'
        }
      },
      required: ['action'] as const
    }
  }
};

interface ProductInfo {
  id: number;
  title: string;
  description?: string;
  variantsCount: number;
  priceRange: {
    min: number;
    max: number;
  };
  sampleVariants: Array<{
    id: number;
    title: string;
    price: number;
    sku?: string;
  }>;
}

interface BrowseCatalogSuccess {
  success: true;
  response: string;
  catalog: {
    totalProducts: number;
    featuredProducts: ProductInfo[];
    categories: string[];
  };
}

interface BrowseCatalogFailure {
  success: false;
  response: string;
  error: string;
  hostname?: string;
}

type BrowseCatalogResult = BrowseCatalogSuccess | BrowseCatalogFailure;

export async function browseCatalog(args: { 
  action: string;
  hostname?: string 
}): Promise<BrowseCatalogResult> {
  const { action, hostname = 'localhost' } = args;

  try {
    console.log(`📋 Просмотр каталога для домена: ${hostname}`);

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

    // Получаем основную статистику
    const totalProducts = await prisma.product.count({
      where: {
        domainId: domain.id,
        status: 'active'
      }
    });

    if (totalProducts === 0) {
      return {
        success: true,
        response: 'К сожалению, каталог товаров пока пуст. Скоро мы добавим новые товары!',
        catalog: {
          totalProducts: 0,
          featuredProducts: [],
          categories: []
        }
      };
    }

    // Получаем товары с их вариантами (ограничим топ-8 для обзора)
    const products = await prisma.product.findMany({
      where: {
        domainId: domain.id,
        status: 'active'
      },
      include: {
        variants: {
          orderBy: { price: 'asc' },
          take: 3 // Берем до 3 вариантов для показа
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 8
    });

    // Формируем информацию о товарах
    const featuredProducts: ProductInfo[] = products.map(product => {
      const prices = product.variants.map((v: any) => v.price);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);

      return {
        id: product.id,
        title: product.title,
        description: product.description || undefined,
        variantsCount: product.variants.length,
        priceRange: {
          min: minPrice,
          max: maxPrice
        },
        sampleVariants: product.variants.slice(0, 3).map((variant: any) => ({
          id: variant.id,
          title: variant.title,
          price: variant.price,
          sku: variant.sku || undefined
        }))
      };
    });

    // Извлекаем уникальные "категории" из названий товаров
    const allTitles = products.map(p => p.title.toLowerCase());
    const categories = Array.from(new Set([
      ...allTitles.filter(title => title.includes('iphone')).map(() => 'Смартфоны'),
      ...allTitles.filter(title => title.includes('кофе') || title.includes('латте') || title.includes('эспрессо')).map(() => 'Напитки'),
      ...allTitles.filter(title => title.includes('кружка') || title.includes('чашка')).map(() => 'Посуда'),
      ...allTitles.filter(title => title.includes('книга')).map(() => 'Книги'),
      ...allTitles.filter(title => title.includes('наушники')).map(() => 'Аудио')
    ]));

    // Форматируем цены
    const formatPrice = (priceInCents: number) => {
      return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 0
      }).format(priceInCents / 100);
    };

    // Генерируем человеко-читаемый ответ
    let response = `🛍️ **Наш каталог** содержит ${totalProducts} товар(ов)!\n\n`;
    
    if (categories.length > 0) {
      response += `📂 **Доступные категории:** ${categories.join(', ')}\n\n`;
    }

    response += `🌟 **Рекомендуемые товары:**\n\n`;

    featuredProducts.forEach((product, index) => {
      const priceInfo = product.priceRange.min === product.priceRange.max 
        ? formatPrice(product.priceRange.min)
        : `от ${formatPrice(product.priceRange.min)} до ${formatPrice(product.priceRange.max)}`;
      
      response += `${index + 1}. **${product.title}**\n`;
      if (product.description) {
        response += `   ${product.description}\n`;
      }
      response += `   💰 ${priceInfo}`;
      
      if (product.variantsCount > 1) {
        response += ` (${product.variantsCount} вариантов)`;
      }
      response += '\n\n';
    });

    if (products.length === 8 && totalProducts > 8) {
      response += `*И еще ${totalProducts - 8} товаров! Спросите про конкретный товар или категорию.*`;
    }

    console.log(`✅ Показан каталог: ${featuredProducts.length} товаров из ${totalProducts}`);

    return {
      success: true,
      response,
      catalog: {
        totalProducts,
        featuredProducts,
        categories
      }
    };

  } catch (error: any) {
    console.error('❌ Ошибка просмотра каталога:', error);
    
    return {
      success: false,
      response: 'Произошла ошибка при загрузке каталога. Попробуйте еще раз.',
      error: error.message || 'Unknown error',
      hostname
    };
  }
}
