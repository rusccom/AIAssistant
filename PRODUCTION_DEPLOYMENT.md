# 🚀 Деплой в продакшн

Данное руководство поможет развернуть AIAssistant на хостинге в продакшн режиме.

## 📋 Требования

- Node.js 18+ 
- PostgreSQL 12+ с расширением pgvector
- Домен с SSL сертификатом

## 🔧 Настройка переменных окружения

Создайте файл `.env` в корне проекта со следующими переменными:

```env
# Режим работы
NODE_ENV=production

# База данных PostgreSQL
DATABASE_URL="postgresql://username:password@host:port/database"

# OpenAI API для эмбеддингов и GPT
OPENAI_API_KEY="your_openai_api_key_here"

# Настройки JWT для аутентификации
JWT_SECRET="your_strong_jwt_secret_here_min_32_chars"

# Порт для backend сервера
PORT=3001

# Разрешенные домены для CORS (ОБЯЗАТЕЛЬНО для production!)
# Укажите все домены, с которых будут идти запросы к API
ALLOWED_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"
```

## 📦 Сборка проекта

```bash
# 1. Установить зависимости
npm run install-all

# 2. Собрать все компоненты
npm run build:all

# 3. Запустить миграции базы данных
npx prisma migrate deploy
```

## 🚀 Запуск в продакшене

```bash
# Устанавливаем NODE_ENV
export NODE_ENV=production

# Запускаем сервер
npm start
```

## 🌐 Настройка веб-сервера (Nginx)

Пример конфигурации Nginx:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL сертификаты
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    
    # Frontend статические файлы
    location / {
        root /path/to/your/project/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # API запросы
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # WebSocket соединения
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🔒 Безопасность

### ✅ Что настроено:
- CORS ограничен указанными доменами
- JWT аутентификация
- Валидация доменов для WebSocket подключений
- Минимизированное логирование в production

### ⚠️  Дополнительные рекомендации:
1. Используйте сильный JWT_SECRET (минимум 32 символа)
2. Настройте файрвол на сервере
3. Регулярно обновляйте зависимости
4. Настройте мониторинг логов
5. Используйте процесс-менеджер (PM2)

## 🔄 Развертывание с PM2

```bash
# Установить PM2
npm install -g pm2

# Создать конфигурацию PM2
echo 'module.exports = {
  apps: [{
    name: "aiassistant-backend",
    script: "./backend/dist/index.js",
    env: {
      NODE_ENV: "production",
      PORT: 3001
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: "1G",
    error_file: "./logs/err.log",
    out_file: "./logs/out.log",
    log_file: "./logs/combined.log"
  }]
};' > ecosystem.config.js

# Создать папку для логов
mkdir logs

# Запустить с PM2
pm2 start ecosystem.config.js

# Сохранить конфигурацию PM2
pm2 save
pm2 startup
```

## 📊 Мониторинг

```bash
# Статус приложения
pm2 status

# Логи
pm2 logs aiassistant-backend

# Перезапуск
pm2 restart aiassistant-backend
```

## 🐳 Docker (опционально)

Если хотите использовать Docker:

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build:all
EXPOSE 3001
ENV NODE_ENV=production
CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    depends_on:
      - postgres
  
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: aiassistant
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## 🚨 Чеклист перед деплоем

- [ ] `.env` файл создан с production переменными
- [ ] `ALLOWED_ORIGINS` настроен с вашими доменами
- [ ] `JWT_SECRET` использует сильный пароль
- [ ] База данных создана и настроена
- [ ] SSL сертификаты установлены
- [ ] Nginx конфигурация настроена
- [ ] Проект собран (`npm run build:all`)
- [ ] Миграции применены (`npx prisma migrate deploy`)
- [ ] Файрвол настроен
- [ ] PM2 или другой процесс-менеджер настроен

## ❓ Частые проблемы

### CORS ошибки
Убедитесь, что ваш домен добавлен в `ALLOWED_ORIGINS`:
```env
ALLOWED_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"
```

### WebSocket подключения не работают
Проверьте настройки Nginx для WebSocket:
```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

### 502 Bad Gateway
Проверьте, что backend запущен и слушает указанный порт:
```bash
pm2 status
netstat -tlnp | grep 3001
```
