# 📊 SEO Configuration Guide

## 📁 Структура файла `seo-config.json`

Этот файл содержит все SEO настройки для вашего сайта. Изменяйте его для обновления мета-тегов, описаний и Open Graph данных.

### 🌍 **Global Settings** (применяются ко всем страницам):

```json
"global": {
  "siteName": "AIAssistant",                    // Название сайта
  "author": "AIAssistant Team",                // Автор/команда
  "themeColor": "#3b82f6",                     // Цвет темы (синий)
  "baseUrl": "https://yourdomain.com",         // ⚠️ ЗАМЕНИТЕ НА ВАШ ДОМЕН
  "twitterHandle": "@aiassistant",             // ⚠️ ЗАМЕНИТЕ НА ВАШ TWITTER
  "logo": "./logoAi.png"                       // Путь к логотипу
}
```

### 📄 **Page Settings** (индивидуальные настройки для каждой страницы):

#### 🏠 **Главная страница (index):**
- `title` - заголовок в браузере и поисковиках
- `description` - описание для Google (160 символов макс.)
- `keywords` - ключевые слова через запятую
- `ogTitle` - заголовок при публикации в соцсетях
- `ogDescription` - описание при публикации в соцсетях

#### 🔐 **Страницы авторизации (login, register):**
- Настройки для страниц входа и регистрации

#### ⚙️ **Админ страницы (dashboard, bot-settings):**
- Настройки для панели управления

## 🛠️ **Как изменить SEO для страницы:**

1. **Откройте** `frontend/src/seo-config.json`
2. **Найдите** нужную страницу в разделе `"pages"`
3. **Измените** нужные поля
4. **Перезапустите** `npm run dev` для применения изменений

### 📝 **Пример изменения описания главной страницы:**

```json
"index": {
  "title": "Ваш новый заголовок | AIAssistant",
  "description": "Ваше новое описание для Google поисковика",
  "keywords": "ваши, новые, ключевые, слова",
  "ogTitle": "Заголовок для соцсетей",
  "ogDescription": "Описание при публикации в Facebook/LinkedIn"
}
```

## 🚀 **Что автоматически генерируется:**

### ✅ **SEO мета-теги:**
- `<meta name="description">`
- `<meta name="keywords">`  
- `<meta name="robots" content="index, follow">`
- `<link rel="canonical">`

### ✅ **Open Graph (Facebook, LinkedIn):**
- `<meta property="og:title">`
- `<meta property="og:description">`
- `<meta property="og:image">`
- `<meta property="og:url">`

### ✅ **Twitter Cards:**
- `<meta name="twitter:card">`
- `<meta name="twitter:title">`
- `<meta name="twitter:description">`
- `<meta name="twitter:image">`

### ✅ **Structured Data (JSON-LD):**
- Schema.org разметка для Google Rich Snippets

### ✅ **PWA мета-теги:**
- `<meta name="theme-color">`
- Apple touch icon настройки

## 🔧 **Настройка перед публикацией:**

1. **Замените домен:** `"baseUrl": "https://yourdomain.com"` → ваш реальный домен
2. **Обновите Twitter:** `"twitterHandle": "@aiassistant"` → ваш Twitter
3. **Проверьте описания** на актуальность
4. **Обновите даты** в `sitemap.xml`

## 📁 **Дополнительные файлы:**

- `robots.txt` - указания для поисковых роботов
- `sitemap.xml` - карта сайта для Google Search Console

## 🔍 **Какие страницы индексируются:**

### ✅ **Индексируются (публичные страницы):**
- `index.html` - Главная страница (приоритет: 1.0)
- `login.html` - Страница входа
- `register.html` - Страница регистрации

### ❌ **НЕ индексируются (приватные админ страницы):**
- `dashboard.html` - Дашборд (требует авторизации)
- `bot-settings.html` - Настройки бота (требует авторизации) 
- `visual-editor.html` - Визуальный редактор (требует авторизации)

**Готово! Ваш сайт оптимизирован для Google! 🎉**
