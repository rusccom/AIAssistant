# 🤖 Полный процесс работы виджета с голосовым ботом

## 📋 Архитектура

```
Пользователь → Виджет → OpenAI Realtime API → Виджет → Backend → Виджет → OpenAI → Пользователь
```

## 🔄 Пошаговый процесс

### 1. 🚀 **Инициализация виджета**

```javascript
// Виджет запрашивает токен и конфигурацию
const response = await fetch('/api/token', {
  method: 'POST',
  body: JSON.stringify({
    hostname: 'example.com',
    embedToken: 'SIGNED_TOKEN_FROM_WIDGET_SCRIPT_URL'
  })
});

const { token, instructions, tools, voice, model } = await response.json();
```

**Что происходит на сервере:**
- Проверка домена в БД
- Загрузка конфигурации бота для домена  
- Получение bot functions из файлов
- **Создание OpenAI session** с tools и instructions
- Возврат токена и готовой конфигурации

### 2. 🎤 **Подключение к OpenAI**

```javascript
// Виджет создает OpenAI клиента с полученными данными
const agent = new RealtimeAgent({
  name: 'Helpful Assistant',
  instructions: instructions, // Готовые с сервера
  tools: dynamicTools,        // Преобразованные из tools
});

const session = new RealtimeSession(agent, {
  transport,
  model: model,    // gpt-realtime
  config: {
    voice: voice   // alloy/echo/shimmer/etc
  }
});

await session.connect({ apiKey: token });
```

### 3. 🗣️ **Разговор пользователя**

```
Пользователь: "Сколько стоит айфон черный 256?"
      ↓
   OpenAI анализирует запрос
      ↓  
   OpenAI определяет нужную функцию: search_products
      ↓
   OpenAI вызывает функцию с параметрами: 
   {
     "name": "search_products",
     "arguments": {
       "query": "айфон черный 256",
       "hostname": "localhost"
     }
   }
```

### 4. 🔧 **Выполнение функции**

```javascript
// В виджете срабатывает execute функция
const universalExecute = async (params, toolName) => {
  // Виджет отправляет запрос на backend
  const response = await fetch(`/api/bot-execute/${toolName}`, {
    method: 'POST',
    body: JSON.stringify(params)
  });
  
  const result = await response.json();
  return result.response; // Готовый ответ для пользователя
};
```

**На backend:**
```typescript
// /api/bot-execute/search_products
export async function searchProducts(args: { query: string; hostname: string }) {
  // 1. Валидация параметров
  if (!query.trim()) {
    return { success: false, response: 'Запрос пустой.', error: 'EMPTY_QUERY' };
  }

  // 2. Семантический поиск
  const searchResult = await semanticSearchService.searchProductsForBot(query, hostname);
  
  // 3. Возврат результата
  return {
    success: true,
    response: searchResult.response, // "iPhone 15 256GB Black стоит $999.90"
    products: searchResult.products,
    searchType: searchResult.searchType
  };
}
```

### 5. 🎯 **Ответ пользователю**

```
Backend возвращает: "iPhone 15 256GB Black стоит $999.90"
      ↓
   Виджет передает результат в OpenAI
      ↓
   OpenAI преобразует в естественную речь
      ↓
   Пользователь слышит: "iPhone 15 в черном цвете на 256 гигабайт стоит 999 долларов 90 центов"
```

## 🛠️ **Доступные функции**

### search_products
- **Описание:** Семантический поиск товаров (RU/EN)
- **Параметры:** `query` (обязательный), `hostname` (опциональный)
- **Пример:** `"айфон черный 256"` → находит iPhone 15 256GB Black

### get_product_info  
- **Описание:** Детальная информация о товаре по ID
- **Параметры:** `productId` (обязательный), `variantId`, `hostname`
- **Пример:** `productId: 2, variantId: 3` → "iPhone 15 256GB Black стоит $999.90"

## 🔒 **Безопасность**

1. **Проверка домена:** Только авторизованные домены могут получить токен
2. **Серверная конфигурация:** Виджет не может изменить instructions или tools
3. **Валидация параметров:** Все входные данные проверяются на сервере
4. **Временные токены:** OpenAI токены имеют ограниченное время жизни

## 📊 **Мониторинг**

Все вызовы функций логируются:
```
🔍 Bot function search_products: "айфон черный 256" on localhost
✅ Bot function search_products executed successfully
```

## 🚨 **Обработка ошибок**

- **Пустой запрос:** `EMPTY_QUERY`
- **Неверный ID:** `INVALID_PRODUCT_ID`, `INVALID_VARIANT_ID`  
- **Домен не найден:** `DOMAIN_NOT_FOUND`
- **Товар не найден:** `PRODUCT_NOT_FOUND`, `VARIANT_NOT_FOUND`
- **Функция не найдена:** `Function ${name} not found`

Все ошибки возвращают понятное сообщение пользователю на русском языке. 
