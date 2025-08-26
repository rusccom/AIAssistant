import prisma from '../db/prisma';

async function checkIphones() {
  console.log('🔍 Проверяем iPhone товары в базе данных...\n');

  try {
    const iphones = await prisma.product.findMany({
      where: {
        OR: [
          { title: { contains: 'iPhone', mode: 'insensitive' } },
          { title: { contains: 'айфон', mode: 'insensitive' } }
        ]
      },
      include: {
        variants: true
      }
    });

    console.log(`📱 Найдено iPhone товаров: ${iphones.length}\n`);
    
    iphones.forEach((product, index) => {
      console.log(`${index + 1}. ${product.title} (ID: ${product.id})`);
      console.log(`   Домен ID: ${product.domainId || 'не задан'}`);
      console.log(`   Вариантов: ${product.variants.length}`);
      
      product.variants.forEach((variant, vIndex) => {
        console.log(`   ${vIndex + 1}. ${variant.title} - $${(variant.price / 100).toFixed(2)} (ID: ${variant.id})`);
        console.log(`      SKU: ${variant.sku || 'не задан'}`);
      });
      console.log('');
    });

    // Дополнительная проверка всех продуктов
    const allProducts = await prisma.product.count();
    const allVariants = await prisma.productVariant.count();
    
    console.log(`📊 Статистика базы:`);
    console.log(`   Всего товаров: ${allProducts}`);
    console.log(`   Всего вариантов: ${allVariants}`);

  } catch (error) {
    console.error('❌ Ошибка при проверке:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkIphones(); 