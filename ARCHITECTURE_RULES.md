# 🏗️ Правила проекта

## 🤖 Bot Functions
- **НЕ передавай hostname в OpenAI параметрах** - только бизнес-логика
- Widget автоматически добавляет hostname
- Формат ответа: `{success, response, ...}`

**Доступные функции (4):**
1. `search_products(query)` - поиск товаров
2. `add_to_cart(variantId, quantity?)` - добавить в корзину
3. `get_cart_info()` - показать корзину
4. `browse_catalog(action)` - обзор каталога

## 📊 Database  
- pgvector + HNSW для поиска
- embedding_small (text-embedding-3-small, 1536 размерность)
- Лимит: 5 результатов
- **Корзина:** Cart (на пользователя+домен), CartItem (с количеством)

## 🔄 Добавление функций
1. Файл в `bot-functions/`
2. Добавь в `index.ts` 
3. Обнови `executeBotFunction`
4. Добавь Zod схему в `widget/src/main.ts`
5. **БЕЗ технических параметров в OpenAI!**

## 📝 Изменения
**2025-01-16:** 
- Убрал hostname из OpenAI параметров
- Добавил функции корзины: add_to_cart, get_cart_info
- Исправил размерность векторов на 1536 для HNSW совместимости 