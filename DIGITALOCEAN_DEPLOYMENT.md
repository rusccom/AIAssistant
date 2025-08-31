# 🌊 Развертывание на DigitalOcean App Platform

Полное руководство по развертыванию AIAssistant на DigitalOcean App Platform.

## 💰 **Стоимость (примерная)**
- **App (Basic XXS)**: $5-12/месяц
- **PostgreSQL (Dev Database)**: $15/месяц  
- **Общая стоимость**: ~$20-27/месяц

## 🚀 **Пошаговое развертывание**

### 1. **Подготовка репозитория**

```bash
# Убедитесь что код в Git репозитории (GitHub/GitLab)
git add .
git commit -m "Prepare for DigitalOcean deployment"
git push origin main
```

### 2. **Создание приложения в DigitalOcean**

1. Заходим на https://cloud.digitalocean.com/apps
2. Нажимаем **"Create App"**
3. **Service Provider**: GitHub/GitLab
4. **Repository**: Выбираем ваш репозиторий AIAssistant-3
5. **Branch**: main

### 3. **Настройка App**

#### 3.1 **Настройка Backend Service**
- **Type**: Web Service
- **Name**: aiassistant-backend
- **Source Directory**: `/` (корень)
- **Build Command**: 
  ```bash
  npm run install-all && npm run build:all
  ```
- **Run Command**: 
  ```bash
  npm start
  ```
- **HTTP Port**: 3001
- **Instance Size**: Basic XXS ($5/мес)
- **Instance Count**: 1

#### 3.2 **Настройка Static Site (опционально)**
Если хотите отдельно хостить frontend:
- **Type**: Static Site  
- **Name**: aiassistant-frontend
- **Source Directory**: `/frontend`
- **Build Command**: `npm install && npm run build`
- **Output Directory**: `/dist`

### 4. **Создание базы данных**

1. В разделе **"Database"** нажимаем **"Add Database"**
2. **Engine**: PostgreSQL
3. **Name**: aiassistant-db
4. **Size**: Dev Database ($15/мес)
5. **Version**: 14

### 5. **Настройка переменных окружения**

В разделе **"Environment Variables"**:

| Переменная | Тип | Значение |
|------------|-----|----------|
| `NODE_ENV` | Plain Text | `production` |
| `DATABASE_URL` | Plain Text | `${aiassistant-db.DATABASE_URL}` |
| `OPENAI_API_KEY` | Encrypted | `ваш_ключ_openai` |
| `JWT_SECRET` | Encrypted | `ваш_сильный_секрет_32+_символа` |
| `ALLOWED_ORIGINS` | Plain Text | `https://${_self.DOMAIN}` |
| `PORT` | Plain Text | `3001` |

### 6. **Деплой приложения**

1. Нажимаем **"Next"** → **"Review"**
2. Проверяем настройки
3. Нажимаем **"Create Resources"**
4. Ждем развертывания (5-10 минут)

## ⚠️ **Проблема с pgvector**

DigitalOcean Managed PostgreSQL **не поддерживает pgvector** из коробки.

### Решения:

#### Вариант 1: Отключить embeddings (быстро)
Временно отключите функции поиска по продуктам:

```typescript
// В backend/src/api/products.routes.ts
// Закомментируйте функции использующие embeddings
```

#### Вариант 2: Внешняя база с pgvector
Используйте Supabase (бесплатный tier):

1. Создайте проект на https://supabase.com
2. В SQL Editor выполните:
```sql
CREATE EXTENSION vector;
```
3. Замените `DATABASE_URL` на Supabase URL

#### Вариант 3: DigitalOcean Droplet с PostgreSQL
Создайте отдельный Droplet с PostgreSQL + pgvector:

```bash
# На Ubuntu Droplet
sudo apt update
sudo apt install postgresql postgresql-contrib
# Установите pgvector вручную
```

## 🔧 **Настройка домена**

1. В App Platform перейдите в **"Settings"** → **"Domains"**
2. Добавьте ваш домен
3. Обновите `ALLOWED_ORIGINS`:
```
https://yourdomain.com,https://aiassistant-xyz.ondigitalocean.app
```

## 🔍 **Мониторинг и логи**

### Просмотр логов:
1. App Platform → ваше приложение → **"Runtime Logs"**
2. Выберите сервис (backend)
3. Смотрите логи в реальном времени

### Метрики:
- CPU/Memory usage
- Request count  
- Response time
- Error rate

## 🚀 **Автоматический деплой**

App Platform автоматически выполняет деплой при:
- Push в main ветку
- Merge Pull Request
- Ручной деплой через интерфейс

## 📱 **Доступ к приложению**

После успешного деплоя:
- **Backend API**: `https://aiassistant-xyz.ondigitalocean.app/api`
- **Frontend**: `https://aiassistant-xyz.ondigitalocean.app`  
- **Виджет**: `https://aiassistant-xyz.ondigitalocean.app/widget`

## 🐛 **Отладка проблем**

### Build ошибки:
```bash
# Проверьте логи сборки
# Убедитесь что все зависимости установлены
```

### Runtime ошибки:
```bash
# Проверьте переменные окружения
# Проверьте подключение к базе данных
# Проверьте CORS настройки
```

### Database ошибки:
```bash
# Проверьте что миграции применились
# Проверьте DATABASE_URL
```

## 🔄 **CI/CD с GitHub Actions**

Создайте `.github/workflows/deploy.yml`:

```yaml
name: Deploy to DigitalOcean
on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm run install-all
      
    - name: Build project
      run: npm run build:all
      
    - name: Run tests
      run: npm test
```

## 💡 **Советы по оптимизации**

1. **Используйte CDN** для статических файлов
2. **Настройте кеширование** для API ответов  
3. **Мониторьте метрики** производительности
4. **Настройте алерты** на ошибки
5. **Регулярно обновляйте** зависимости

## 🆘 **Поддержка**

- DigitalOcean Community: https://www.digitalocean.com/community
- Documentation: https://docs.digitalocean.com/products/app-platform/
- Support tickets через панель управления

## ✅ **Чеклист развертывания**

- [ ] Код в Git репозитории
- [ ] `.do/app-simple.yaml` настроен
- [ ] App Platform приложение создано
- [ ] PostgreSQL база данных добавлена
- [ ] Переменные окружения настроены
- [ ] OPENAI_API_KEY добавлен
- [ ] JWT_SECRET сгенерирован и добавлен
- [ ] ALLOWED_ORIGINS настроен
- [ ] Приложение успешно развернуто
- [ ] API endpoints работают
- [ ] База данных подключена
- [ ] Домен настроен (опционально)
- [ ] Мониторинг настроен
