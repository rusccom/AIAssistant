# 🌊 DigitalOcean App Platform - Единое развертывание

Развертывание Backend + Frontend + Widget на одном сервисе App Platform с внешней базой данных.

## 🏗️ **Архитектура развертывания**

```
DigitalOcean App Platform (Единый сервис):
├── Backend API (/api/*) 
├── Frontend SPA (/, /login, /dashboard, etc.)
├── Widget (/widget/*)
└── Static files (/public/*)

Внешняя база данных:
└── PostgreSQL с pgvector (Supabase/отдельный сервер)
```

## 💰 **Стоимость**
- **App Platform (Basic XXS)**: $5/месяц
- **База данных**: $0 (Supabase Free) или $15-25/месяц

## 🚀 **Быстрое развертывание**

### 1. **Подготовка репозитория**
```bash
# Коммитим все изменения
git add .
git commit -m "Ready for unified DigitalOcean deployment"
git push origin main
```

### 2. **Создание App в DigitalOcean**
1. https://cloud.digitalocean.com/apps → **"Create App"**
2. **Repository**: выберите ваш AIAssistant-3 репозиторий
3. **Branch**: main

### 3. **Настройка сервиса**
- **Service Type**: Web Service
- **Name**: web
- **Source Directory**: `/` (корень проекта)
- **Build Command**: 
  ```bash
  npm run install-all && npm run build:all
  ```
- **Run Command**: 
  ```bash
  npm start
  ```
- **HTTP Port**: 3001
- **Instance**: Basic XXS ($5/мес)

### 4. **Переменные окружения**

| Переменная | Тип | Значение |
|------------|-----|----------|
| `NODE_ENV` | Plain Text | `production` |
| `DATABASE_URL` | Encrypted | URL вашей базы данных |
| `OPENAI_API_KEY` | Encrypted | Ваш OpenAI ключ |
| `JWT_SECRET` | Encrypted | Сильный пароль 32+ символов |
| `ALLOWED_ORIGINS` | Plain Text | `https://${_self.DOMAIN}` |
| `PORT` | Plain Text | `3001` |

## 🗄️ **Настройка внешней базы данных**

### Вариант 1: Supabase (рекомендуется)
1. Создайте проект на https://supabase.com
2. В SQL Editor выполните:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
3. Скопируйте Database URL из Settings → Database
4. Добавьте в переменную `DATABASE_URL`

### Вариант 2: DigitalOcean Droplet
```bash
# На Ubuntu 20.04+ Droplet
sudo apt update
sudo apt install postgresql postgresql-contrib

# Установка pgvector
cd /tmp
git clone https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install

# Настройка базы данных
sudo -u postgres createdb aiassistant
sudo -u postgres psql aiassistant -c "CREATE EXTENSION vector;"
```

## 📦 **Что происходит при сборке**

### Build процесс:
```bash
# 1. Установка зависимостей
npm run install-all

# 2. Сборка виджета (в backend/public/widget/)
npm run build:widget
# → Создает: backend/public/widget/widget.js

# 3. Сборка frontend (в frontend/dist/)
npm run build:frontend  
# → Создает: frontend/dist/* (HTML, CSS, JS)

# 4. Сборка backend (в backend/dist/)
npm run build:backend
# → Компилирует TypeScript в backend/dist/*
```

### Структура после сборки:
```
AIAssistant-3/
├── backend/
│   ├── dist/           # ← Скомпилированный backend
│   │   └── index.js   # ← Точка входа
│   └── public/
│       └── widget/     # ← Собранный виджет
│           └── widget.js
├── frontend/
│   └── dist/           # ← Собранный frontend
│       ├── index.html
│       └── *.js, *.css
```

## 🌐 **Маршрутизация**

После развертывания:
- `https://your-app.ondigitalocean.app/` → Frontend (index.html)
- `https://your-app.ondigitalocean.app/api/*` → Backend API
- `https://your-app.ondigitalocean.app/widget/widget.js` → Виджет
- `https://your-app.ondigitalocean.app/login` → Frontend (login.html)
- `https://your-app.ondigitalocean.app/dashboard` → Frontend (dashboard.html)

## 🔧 **Тестирование сборки локально**

Перед развертыванием протестируйте:
```bash
# 1. Соберите проект
npm run build:all

# 2. Проверьте файлы
ls -la backend/dist/
ls -la frontend/dist/ 
ls -la backend/public/widget/

# 3. Запустите в production режиме
NODE_ENV=production npm start

# 4. Проверьте endpoints
curl http://localhost:3001/api/auth/current
curl http://localhost:3001/widget/widget.js
curl http://localhost:3001/
```

## 📱 **Встройка виджета после развертывания**

```html
<!-- На вашем сайте -->
<div id="ai-widget"></div>
<script src="https://your-app.ondigitalocean.app/widget/widget.js"></script>
<script>
  AIWidget.init({
    apiUrl: 'https://your-app.ondigitalocean.app',
    containerId: 'ai-widget'
  });
</script>
```

## 🔍 **Мониторинг и отладка**

### Логи развертывания:
1. App Platform → ваш app → **"Activity"**
2. Смотрите Build Logs для отладки сборки

### Runtime логи:
1. App Platform → ваш app → **"Runtime Logs"**
2. Фильтр по сервису "web"

### Типичные ошибки:
- **Build failed**: Проверьте что все package.json файлы корректны
- **404 на frontend**: Убедитесь что `frontend/dist/` создался
- **API 500**: Проверьте переменные окружения и DATABASE_URL
- **Widget 404**: Убедитесь что `backend/public/widget/widget.js` существует

## 🔄 **Обновление приложения**

Просто push в Git репозиторий:
```bash
git add .
git commit -m "Update application"
git push origin main
# → Автоматический деплой на App Platform
```

## ⚡ **Оптимизация**

### Performance:
- Frontend файлы раздаются со статической компрессией
- Widget кешируется браузером
- API responses могут кешироваться

### Масштабирование:
- Увеличьте instance count при росте нагрузки  
- Мониторьте CPU/Memory usage
- При необходимости переходите на больший instance type

## 🆘 **Troubleshooting**

### Build не проходит:
```bash
# Проверьте локально
npm run install-all
npm run build:all
# Если ошибки - исправьте перед push
```

### Frontend не загружается:
```bash
# Проверьте что файлы созданы
ls -la frontend/dist/index.html
# Проверьте логи backend
```

### Widget не работает:
```bash
# Проверьте что файл создан
ls -la backend/public/widget/widget.js
# Проверьте доступность URL
curl https://your-app.ondigitalocean.app/widget/widget.js
```

### CORS ошибки:
```bash
# Проверьте ALLOWED_ORIGINS в переменных окружения
# Должно содержать домен вашего App Platform
```

## ✅ **Чеклист развертывания**

- [ ] Код в Git репозитории
- [ ] Внешняя база данных готова (Supabase/Droplet)
- [ ] DATABASE_URL получен
- [ ] OPENAI_API_KEY готов
- [ ] JWT_SECRET сгенерирован (32+ символов)
- [ ] App Platform приложение создано
- [ ] Переменные окружения настроены
- [ ] Build прошел успешно
- [ ] Все endpoints работают:
  - [ ] `https://your-app/` (frontend)
  - [ ] `https://your-app/api/auth/current` (API)
  - [ ] `https://your-app/widget/widget.js` (widget)
- [ ] Виджет тестируется на внешнем сайте
- [ ] Домен настроен (если нужен)
