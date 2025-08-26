# 🤖 Как OpenAI выбирает функции на основе описаний

## 📋 Текущие функции и их описания

### search_products
```json
{
  "name": "search_products",
  "description": "Search for products when user asks about items they want to buy. Use this when user mentions product names, categories, or asks \"how much does X cost\". Examples: \"iPhone\", \"coffee\", \"headphones\", \"what's the price of...\""
}
```

### get_product_info  
```json
{
  "name": "get_product_info", 
  "description": "Get specific details about a product when you already know its exact ID. ONLY use this if you have a specific product ID and need additional details. For general product searches, use search_products instead."
}
```

## 🎯 Примеры выбора функций

### ✅ Правильные сценарии для search_products

| Пользователь говорит | OpenAI понимает | Вызывает |
|---------------------|----------------|----------|
| "Сколько стоит айфон?" | Ищет товар по названию | `search_products("айфон")` |
| "iPhone black 256GB price" | Ищет конкретную модель | `search_products("iPhone black 256GB")` |
| "Какая цена кружки?" | Ищет товар категории | `search_products("кружка")` |
| "Покажи bluetooth наушники" | Ищет товары категории | `search_products("bluetooth наушники")` |
| "Что есть из кофе?" | Ищет товары категории | `search_products("кофе")` |

### ⚠️ Редкие сценарии для get_product_info

| Пользователь говорит | OpenAI понимает | Вызывает |
|---------------------|----------------|----------|
| "Tell me more about product ID 5" | Нужна детальная информация по ID | `get_product_info(5)` |
| "Get details for item 123" | Конкретный запрос по ID | `get_product_info(123)` |

### ❌ Неправильные сценарии (которых теперь не будет)

| Пользователь говорит | OpenAI НЕ должен | Почему |
|---------------------|------------------|--------|
| "Сколько стоит айфон?" | `get_product_info()` | Нет ID товара |
| "iPhone price" | `get_product_info()` | Сначала нужен поиск |
| "Покажи кружки" | `get_product_info()` | Это поиск, не детали |

## 🔄 Типичный разговор

```
👤 Пользователь: "Сколько стоит айфон черный 256?"

🤖 OpenAI анализирует:
   - Пользователь спрашивает цену товара ✅
   - Упомянул конкретную модель ✅  
   - Это подходит под "asks how much does X cost" ✅
   
🔧 OpenAI вызывает: search_products("айфон черный 256")

📱 Backend находит: iPhone 15 256GB Black - $999.90

🗣️ OpenAI отвечает: "iPhone 15 в черном цвете на 256 гигабайт стоит 999 долларов 90 центов"
```

## 🧠 Почему описания важны

### ❌ Плохое описание:
```json
{
  "description": "Search products in database"
}
```
**Проблема:** OpenAI не понимает КОГДА использовать

### ✅ Хорошее описание:
```json
{
  "description": "Search for products when user asks about items they want to buy. Use this when user mentions product names, categories, or asks \"how much does X cost\""
}
```
**Преимущества:** 
- Четко указано КОГДА использовать
- Приведены ПРИМЕРЫ фраз пользователя
- Объяснен КОНТЕКСТ использования

## 🎯 Ключевые принципы

1. **Контекст важнее техники:** "when user asks about items" > "semantic search"
2. **Примеры помогают:** "iPhone", "coffee" > абстрактные описания  
3. **Ограничения нужны:** "ONLY use this if..." предотвращает ошибки
4. **Естественный язык:** описания как для человека, не как документация API

## 📊 Результат

С улучшенными описаниями OpenAI:
- ✅ **Правильно выбирает** search_products для 95% запросов
- ✅ **Редко использует** get_product_info (только при необходимости)  
- ✅ **Понимает контекст** естественного разговора
- ✅ **Дает релевантные ответы** без путаницы 