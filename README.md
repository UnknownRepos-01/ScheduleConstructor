# ScheduleConstructor

Коротко: веб-приложение для управления школьным расписанием.

## Что умеет
- Авторизация по логину/паролю с сессией в cookie.
- Подтверждение входа с нового IP-адреса.
- Админ-панель для справочников: параллели, классы, предметы, кабинеты, пользователи.
- Конструктор расписания с drag-and-drop.
- Один урок может иметь несколько преподавателей и несколько кабинетов.
- Публичный просмотр активного расписания (`/schedule`) и расписания по преподавателям (`/schedule/teachers`).

## Технологии
- Next.js 14 (App Router)
- React 18 + TypeScript
- Drizzle ORM + MySQL 8
- React Query + Axios
- Tailwind CSS

## Быстрый старт

### 1. Установка зависимостей
```bash
npm install
```

### 2. Запуск базы данных
```bash
docker compose up -d
```

По умолчанию поднимается MySQL:
- host: `localhost`
- port: `3306`
- db: `schedule_db`
- user: `root`
- password: `housemorningdinner`

### 3. Инициализация данных
```bash
npm run db:seed
```

Скрипт создаёт базовые роли и тестового администратора:
- login: `admin`
- password: `admin_password`

### 4. Запуск приложения
```bash
npm run dev
```

Откройте: `http://localhost:3000`

## Переменные окружения
Проект работает с дефолтами, но для стабильной настройки задайте значения явно:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=housemorningdinner
DB_NAME=schedule_db

SESSION_SECRET=change-me
NEXTAUTH_SECRET=change-me

BCRYPT_SALT_ROUNDS=12
TRUSTED_IP_TTL_DAYS=30

NEXT_PUBLIC_API_BASE_URL=/api
```

## Основные команды
```bash
npm run dev
npm run build
npm run start
npm run db:seed
```

## Структура проекта (кратко)
- `src/app` — страницы и API-роуты.
- `src/components` — UI и крупные клиентские модули.
- `src/lib` — бизнес-логика, auth, API-клиент, React Query hooks.
- `src/db` — подключение к БД, схема, seed.
- `drizzle` — SQL-миграции.

## Важно
- Для production обязательно задайте безопасные значения `SESSION_SECRET`/`NEXTAUTH_SECRET`.
- Проверьте cookie-настройки (`secure`) под HTTPS.


