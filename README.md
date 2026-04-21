# ScheduleConstructor

Веб-приложение для управления школьным расписанием (Next.js + MySQL).

## Production запуск через Docker

### 1. Подготовка окружения
```bash
cp .env.example .env
```

При необходимости обновите значения в `.env` (секреты, доступ к БД и т.д.).

### 2. Запуск
```bash
docker compose up -d
```

После запуска приложение доступно через Nginx:
- `http://localhost`

### 3. Пересборка образов
```bash
docker compose up -d --build
```

### 4. Остановка
```bash
docker compose down
```

## Что разворачивается
- `nextjs` — production build (`next build`) и запуск (`next start`) на порту `3000`.
- `nginx` — reverse proxy на порту `80`, проксирует запросы в `nextjs`, включает gzip и кеширование `/_next/static`.

## Пример структуры docker-конфигурации
```text
.
├─ Dockerfile
├─ Dockerfile.nginx
├─ docker-compose.yml
├─ nginx.conf
├─ .dockerignore
└─ .env.example
```

## Полезные команды
```bash
# Логи всех контейнеров
docker compose logs -f

# Логи только nginx
docker compose logs -f nginx

# Логи только nextjs
docker compose logs -f nextjs
```
