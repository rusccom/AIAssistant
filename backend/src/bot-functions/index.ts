import { searchProductsFunction, executeSearchProducts } from './search-products';
import { addToCartFunction, addToCart } from './add-to-cart';
import { getCartInfoFunction, getCartInfo } from './get-cart-info';
import { browseCatalogFunction, browseCatalog } from './browse-catalog';

/**
 * Все доступные функции для голосового бота
 */
export const botFunctions = {
    search_products: {
        definition: searchProductsFunction,
        implementation: executeSearchProducts
    },
    add_to_cart: {
        definition: addToCartFunction,
        implementation: addToCart
    },
    get_cart_info: {
        definition: getCartInfoFunction,
        implementation: getCartInfo
    },
    browse_catalog: {
        definition: browseCatalogFunction,
        implementation: browseCatalog
    }
} as const;

/**
 * Получить все определения функций для OpenAI
 */
export function getAllFunctionDefinitions() {
    return Object.values(botFunctions).map(func => func.definition);
}

/**
 * Получить реализацию функции по имени
 */
export function getFunctionImplementation(name: string) {
    const func = botFunctions[name as keyof typeof botFunctions];
    return func?.implementation;
}

/**
 * Выполнить функцию бота
 */
export async function executeBotFunction(name: string, args: any) {
    if (name === 'search_products') {
        return await executeSearchProducts(args);
    } else if (name === 'add_to_cart') {
        return await addToCart(args);
    } else if (name === 'get_cart_info') {
        return await getCartInfo(args);
    } else if (name === 'browse_catalog') {
        return await browseCatalog(args);
    } else {
        throw new Error(`Function ${name} not found`);
    }
}

// Экспортируем отдельные функции для удобства
export { executeSearchProducts };
export { searchProductsFunction }; 