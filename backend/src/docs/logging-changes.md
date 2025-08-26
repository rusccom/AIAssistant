# 🔇 Изменения в логировании

## ❌ Временно отключено (избыточное логирование)

### Widget (`widget/src/main.ts`)
```typescript
// 🔇 Закомментировано
// console.log('Transport event:', event);
```
**Причина:** Логировал ВСЕ события транспорта включая весь аудио стрим и разговор

### Backend WebSocket (`backend/src/index.ts`)
```typescript
// 🔇 Закомментировано  
// console.log(`[WSS] Connection from authorized hostname: ${hostname}`);
// console.log(`[WSS] Session ${sessionId} registered for user ${domain.userId}`);
// console.log(`WebSocket client connected for session ${sessionId}, track ${track}`);
```
**Причина:** Избыточное логирование WebSocket соединений

### Bot Functions (`backend/src/bot-functions/`)
```typescript
// 🔇 Закомментировано
// console.log(`🔍 Bot function search_products: "${query}"`);
// console.log(`📦 Bot function get_product_info: Product ${productId}`);
// console.log(`🤖 Executing bot function: ${name}`);
```
**Причина:** Дублирование с централизованным логированием в routes

## ✅ Новое специальное логирование function calls

### 1. Widget Function Call Events
```typescript
// 🤖 Специальное логирование для function calls
if (event.type === 'response.function_call_arguments.delta' || 
    event.type === 'response.function_call_arguments.done') {
  console.log('🔧 OpenAI Function Call Event:', {
    type: event.type,
    call_id: event.call_id,
    name: event.name,
    arguments: event.arguments
  });
}
```

### 2. Widget Function Execution
```typescript
console.log(`🚀 Widget executing function: ${toolName}`, enhancedParams);
console.log(`📥 Widget received result from ${toolName}:`, result.success ? '✅ Success' : '❌ Failed');
```

### 3. Backend Function Execution
```typescript
console.log(`\n🤖 FUNCTION CALL RECEIVED:`);
console.log(`📝 Function: ${functionName}`);
console.log(`🌐 Hostname: ${args.hostname || 'not provided'}`);
console.log(`📋 Parameters:`, JSON.stringify(args, null, 2));

console.log(`✅ Function ${functionName} completed successfully`);
console.log(`📤 Response type: ${result.success ? 'Success' : 'Error'}`);
console.log(`📄 Response preview: ${result.response?.substring(0, 100)}...`);
```

## 🎯 Результат

### ❌ ДО (проблемы):
- Дублировалось логирование всего разговора
- Избыточные WebSocket логи
- Дублирование логов в разных местах
- Сложно найти function calls среди шума

### ✅ ПОСЛЕ (решение):
- ✅ Чистые логи без дублирования разговора
- ✅ Четкое выделение function calls
- ✅ Централизованное логирование в routes
- ✅ Легко отслеживать: OpenAI → Widget → Backend → Response

## 📊 Пример лога function call

```
🔧 OpenAI Function Call Event: {
  type: 'response.function_call_arguments.done',
  call_id: 'call_123',
  name: 'search_products',
  arguments: '{"query":"iPhone","hostname":"example.com"}'
}

🚀 Widget executing function: search_products {query: "iPhone", hostname: "example.com"}

🤖 FUNCTION CALL RECEIVED:
📝 Function: search_products
🌐 Hostname: example.com  
📋 Parameters: {
  "query": "iPhone",
  "hostname": "example.com"
}

✅ Function search_products completed successfully
📤 Response type: Success
📄 Response preview: Нашел 3 варианта iPhone на example.com. Вот что доступно: iPhone 15 Pro Max (256GB) - $1199...

📥 Widget received result from search_products: ✅ Success
``` 