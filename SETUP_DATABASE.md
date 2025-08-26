# Настройка базы данных и pgvector

## Проблема
Эмбеддинги не работают из-за отсутствия:
1. Файла .env с настройками базы данных
2. Расширения pgvector в PostgreSQL

## Решение

### 1. Создайте файл .env в корне проекта:

```env
# База данных PostgreSQL
DATABASE_URL="postgresql://postgres:password@localhost:5432/aiassistant"

# OpenAI API для эмбеддингов и GPT
OPENAI_API_KEY="your_openai_api_key_here"

# Настройки JWT для аутентификации
JWT_SECRET="your_jwt_secret_here"

# Порт для backend сервера
PORT=3001
```

### 2. Настройте PostgreSQL с pgvector:

#### Вариант A: Docker (рекомендуется)
```bash
docker run -d \
  --name postgres-pgvector \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=aiassistant \
  -p 5432:5432 \
  pgvector/pgvector:pg16
```

#### Вариант B: Установка вручную
1. Установите PostgreSQL
2. Установите pgvector расширение
3. Создайте базу данных:
```sql
CREATE DATABASE aiassistant;
\c aiassistant;
CREATE EXTENSION vector;
```

### 3. Запустите миграции:
```bash
npx prisma migrate deploy
```

### 4. Проверьте установку:
```bash
npx ts-node backend/src/scripts/check-pgvector.ts
```

## Быстрый запуск с Docker

```bash
# 1. Запустите PostgreSQL с pgvector
docker run -d \
  --name postgres-pgvector \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=aiassistant \
  -p 5432:5432 \
  pgvector/pgvector:pg16

# 2. Создайте .env файл (см. выше)

# 3. Запустите миграции
npx prisma migrate deploy

# 4. Проверьте
npx ts-node backend/src/scripts/check-pgvector.ts
```
