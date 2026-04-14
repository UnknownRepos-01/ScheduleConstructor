# Документация проекта `ScheduleConstructor`

## 1. Общее описание проекта

### Что делает проект
`ScheduleConstructor` — это веб-приложение для школы, которое решает две задачи:
1. Администрирование справочников и расписания (параллели, классы, преподаватели, кабинеты, предметы, листы расписания).
2. Публикация актуального расписания для просмотра (общая версия и версия для преподавателей).

Ключевая особенность безопасности: вход по IP с подтверждением новых IP-адресов (статусы `Подтверждён` / `Ожидание подтверждения`).

### Основной стек технологий
- `Next.js 14` (App Router: страницы + API routes в одном проекте, осторожно при переходе на новые версии, была уязвимость CVE-2025-66478)
- `React 18`
- `TypeScript`
- `Drizzle ORM` + `mysql2`
- `MySQL 8` (через `docker-compose`)
- `@tanstack/react-query` (кэш + запросы/мутации на клиенте)
- `axios` (HTTP-клиент на фронте)
- `@dnd-kit/core` (drag-and-drop в конструкторе расписания)
- `Tailwind CSS`
- `bcryptjs` (хэширование паролей)

### Основные функции
- Логин/логаут + сессионная cookie.
- Смена пароля с валидацией.
- Подтверждение входов с новых IP.
- Ролевая модель: Админ / Менеджер / Преподаватель.
- Админ-панель с CRUD по справочникам.
- Конструктор расписания:
  - создание/редактирование ячеек,
  - назначение предмета/преподавателя/кабинетов,
  - drag-and-drop перенос (с дублированием через `Shift`),
  - листы расписания (создать/переименовать/дублировать/удалить/активировать).
- Публичный просмотр опубликованного (активного) листа.
- Просмотр расписания по преподавателям.

---

## 2. Структура проекта

## Обзор каталогов
- `src/app` — страницы и API-эндпоинты Next.js.
- `src/components` — UI и крупные клиентские модули.
- `src/lib` — инфраструктурная логика клиента и сервера.
- `src/db` — подключение БД, схема таблиц, сид.
- `src/providers` — провайдеры React (React Query).
- `drizzle` — SQL-миграции.
---

## Каталог `src/db`

| Файл | Назначение | Роль в системе | Взаимодействие |
|---|---|---|---|
| `src/db/index.ts` | Создание пула MySQL и инстанса Drizzle | Единая точка доступа к БД | Импортируется всеми API-роутами и `src/lib/auth.ts` |
| `src/db/schema.ts` | Описание таблиц и связей | Ядро модели данных | Используется Drizzle ORM и `drizzle.config.ts` |
| `src/db/seed.ts` | Начальная инициализация ролей/админа | Bootstrapping среды | Использует `hashPassword` из `src/lib/auth.ts` |

---

## Каталог `src/lib` (серверная и клиентская инфраструктура)

### `src/lib` корень

| Файл | Назначение | Роль в системе | Взаимодействие |
|---|---|---|---|
| `src/lib/access.ts` | Константы ролей и проверки доступа | Политика авторизации (роль) | Используется в UI и API-роутах |
| `src/lib/auth.ts` | Сессии, пароли, IP-trust, проверки админ-доступа | Главный auth/security модуль | Использует `db/schema`; вызывается API и layout-guard |
| `src/lib/cn.ts` | Обёртка над `clsx` | Утилита сборки CSS-классов | Используется в UI-компонентах |

### `src/lib/api`

| Файл | Назначение | Роль в системе | Взаимодействие |
|---|---|---|---|
| `src/lib/api/http-client.ts` | Axios-клиент + нормализация ошибок (`ApiError`) | Базовый HTTP-слой фронтенда | Вызывается сервисами `src/lib/api/services/*` |
| `src/lib/api/crud-service.ts` | Универсальная фабрика CRUD-сервисов | Уменьшает дублирование API-клиента | Используется сервисами сущностей |
| `src/lib/api/index.ts` | Barrel export API-слоя | Упрощённые импорты | Реэкспортирует client/crud/services |

### `src/lib/api/services`

| Файл | Назначение | Роль в системе | Взаимодействие |
|---|---|---|---|
| `auth.service.ts` | `login/logout/me/change-password` | Клиент auth API | Используется `use-auth.ts` |
| `user.service.ts` | Адаптер текущего пользователя | Упрощение доступа к `authService.getCurrentUser` | Используется хуками/компонентами |
| `teacher.service.ts` | CRUD преподавателей/менеджеров по роли | Клиент сущности `users` (role=teacher/manager) | `use-teachers.ts`, admin pages |
| `manager.service.ts` | Список/создание менеджеров | Отдельный клиент для admin-only операций | `use-security.ts`, `admin/managers` |
| `grade.service.ts` | CRUD параллелей | Справочник для классов | `use-reference-data.ts` |
| `class.service.ts` | CRUD классов | Справочник для расписания | `use-reference-data.ts`, constructor |
| `subject.service.ts` | CRUD предметов | Справочник расписания | `use-reference-data.ts`, constructor |
| `classroom.service.ts` | CRUD кабинетов | Справочник расписания | `use-reference-data.ts`, constructor |
| `list.service.ts` | CRUD листов + `activate` + `duplicate` | Управление версиями расписания | `use-reference-data.ts`, constructor |
| `schedule.service.ts` | Публичное расписание, конструктор, подсказки | Клиент бизнес-операций расписания | `use-schedule.ts`, constructor hooks |
| `stats.service.ts` | Дашборд-метрики админки | Отчётная витрина | `use-dashboard-stats.ts` |
| `ip-auth.service.ts` | Управление IP-заявками (admin/self) | Клиент модуля безопасности IP | `use-security.ts`, account/admin pages |
| `index.ts` | Реэкспорт сервисов | Централизованный импорт | Используется хуками |

### `src/lib/react-query`

| Файл | Назначение | Роль в системе | Взаимодействие |
|---|---|---|---|
| `query-client.ts` | Конфиг QueryClient (stale/gc/retry) | Политика кэширования запросов | Используется провайдером |
| `query-keys.ts` | Имена ключей React Query | Согласованность кэша | Используется во всех хуках |
| `index.ts` | Barrel export React Query слоя | Удобство импорта | Реэкспорт hooks/client/keys |

### `src/lib/react-query/hooks`

| Файл | Назначение | Роль в системе | Взаимодействие |
|---|---|---|---|
| `use-auth.ts` | Запрос текущей сессии + мутации логина/логаута/пароля | Auth-state на клиенте | Вызывает `authService` |
| `use-schedule.ts` | Публичное расписание, list-schedule, autocomplete, upsert/delete | Основной data-layer расписания | Вызывает `scheduleService` |
| `use-teachers.ts` | CRUD преподавателей с optimistic updates | Быстрый UX в админке | Вызывает `teacherService`, инвалидирует кэш |
| `use-reference-data.ts` | CRUD справочников (grades/classes/subjects/classrooms/lists) | Data-layer справочников | Вызывает профильные services |
| `use-dashboard-stats.ts` | Запрос статистики дашборда | Витрина admin/home | `statsService` |
| `use-security.ts` | IP-заявки + менеджеры | Security/admin операции | `ipAuthService`, `managerService` |
| `index.ts` | Реэкспорт hook-ов | Единая точка импорта | Используется страницами и компонентами |

---

## Каталог `src/providers`

| Файл | Назначение | Роль в системе | Взаимодействие |
|---|---|---|---|
| `src/providers/react-query-provider.tsx` | Инициализирует QueryClientProvider | Подключение React Query в дереве приложения | Используется в `src/app/layout.tsx` |

---

## Каталог `src/app` (маршруты страниц)

| Файл | Назначение | Роль в системе | Взаимодействие |
|---|---|---|---|
| `src/app/layout.tsx` | Корневой layout + theme init + Yandex Metrika + ReactQueryProvider | Главный каркас приложения | Подключает `globals.css`, provider |
| `src/app/globals.css` | Глобальные переменные темы и базовые стили | Основа UI-темизации | Используется всеми UI-компонентами |
| `src/app/page.tsx` | Страница логина | Входная точка приложения | `useLoginMutation`, redirect по роли |
| `src/app/account/page.tsx` | Личный кабинет (смена пароля + pending IP) | Пользовательская безопасность | Использует `getSession`, account components |
| `src/app/schedule/page.tsx` | Публичная таблица расписания | Открытый просмотр активного листа | `usePublicScheduleQuery` |
| `src/app/schedule/teachers/page.tsx` | Расписание преподавателей | Режим для teacher/observer | `usePublicScheduleQuery`, `useCurrentUserQuery` |
| `src/app/schedule/focus/page.tsx` | Полноэкранный/обновляемый режим расписания | Витрина для экранов/панелей | Периодический `refetch` |
| `src/app/admin/layout.tsx` | Серверный guard + shell админки | Контроль доступа в `/admin/*` | `getSession`, `AdminCheck`, `AdminShell` |
| `src/app/admin/page.tsx` | Дашборд админки | Обзор метрик и быстрые действия | `useDashboardStatsQuery` |
| `src/app/admin/teachers/page.tsx` | Управление пользователями (teacher/manager) | CRUD пользователей | `useTeachers*`, `useManagersQuery` |
| `src/app/admin/managers/page.tsx` | Создание менеджеров (admin-only) | Делегирование полномочий | `useCreateManagerMutation`, `ROLE_ADMIN` |
| `src/app/admin/grades/page.tsx` | CRUD параллелей | Справочник учебных параллелей | `useGrades*` |
| `src/app/admin/classes/page.tsx` | CRUD классов | Справочник классов | `useClasses*`, `useGradesQuery` |
| `src/app/admin/subjects/page.tsx` | CRUD предметов | Справочник предметов | `useSubjects*` |
| `src/app/admin/classrooms/page.tsx` | CRUD кабинетов | Справочник помещений | `useClassrooms*` |
| `src/app/admin/ip-auths/page.tsx` | Админ-подтверждение IP-заявок | Контур безопасности | `useIpAuthsQuery`, `useUpdateIpAuthMutation` |
| `src/app/admin/constructor/page.tsx` | Основной маршрут конструктора расписания | Главная бизнес-страница редактирования | Реэкспорт `components/schedule/constructor-page` |
| `src/app/admin/constructor/page.legacy.tsx` | Легаси-обвязка конструктора (сейчас реэкспорт) | Исторический файл миграции | Содержит закомментированную старую реализацию |

---

## Каталог `src/app/api` (серверные эндпоинты)

### Auth и профиль

| Файл | Назначение | Роль | Взаимодействие |
|---|---|---|---|
| `src/app/api/auth/login/route.ts` | `POST /api/auth/login` | Логин + установка `schedule_session` | `authenticateUser`, `getClientIp` |
| `src/app/api/auth/logout/route.ts` | `POST /api/auth/logout` | Логаут + очистка cookie | Возвращает `Logged out` |
| `src/app/api/auth/me/route.ts` | `GET /api/auth/me` | Чтение текущей сессии | `getSession` |
| `src/app/api/auth/change-password/route.ts` | `POST /api/auth/change-password` | Смена пароля + перевод других IP в pending | `changePasswordForUser`, `ipAuths` |
| `src/app/api/auth/confirm-ip/route.ts` | `POST /api/auth/confirm-ip` | Подтверждение pending IP и вход | `validateUserCredentials`, `ipAuths`, cookie |

### Admin и безопасность

| Файл | Назначение | Роль | Взаимодействие |
|---|---|---|---|
| `src/app/api/admin/stats/route.ts` | `GET /api/admin/stats` | Метрики дашборда | Считает агрегаты по таблицам |
| `src/app/api/ip-auths/route.ts` | `GET/PATCH /api/ip-auths` | Список IP-записей + массовое подтверждение/ожидание | Admin-only, таблицы `ip_auths/statuses/users` |
| `src/app/api/ip-auths/[id]/route.ts` | `PATCH /api/ip-auths/:id` | Точечное подтверждение IP | Admin-only |
| `src/app/api/ip-auths/self/route.ts` | `GET/POST /api/ip-auths/self` | Самообслуживание пользователя по pending IP | Проверка trusted current IP |
| `src/app/api/users/managers/route.ts` | `GET/POST /api/users/managers` | Управление менеджерами | Admin-only, роль `Менеджер` |

### CRUD справочников и ролей

| Файл | Назначение | Роль | Взаимодействие |
|---|---|---|---|
| `src/app/api/teachers/route.ts` | `GET/POST /api/teachers` | Список преподавателей и создание user | Role-based create teacher/manager |
| `src/app/api/teachers/[id]/route.ts` | `PUT/DELETE /api/teachers/:id` | Обновление/удаление пользователя | `users`, `roles`, password hash |
| `src/app/api/grades/route.ts` | `GET/POST /api/grades` | CRUD (list/create) параллелей | `grades` |
| `src/app/api/grades/[id]/route.ts` | `PUT/DELETE /api/grades/:id` | Обновление/удаление параллели | `grades` |
| `src/app/api/classes/route.ts` | `GET/POST /api/classes` | CRUD классов + `displayName` | `classes`, `grades` |
| `src/app/api/classes/[id]/route.ts` | `PUT/DELETE /api/classes/:id` | Обновление/удаление класса | `classes` |
| `src/app/api/subjects/route.ts` | `GET/POST /api/subjects` | CRUD предметов (list/create) | `subjects` |
| `src/app/api/subjects/[id]/route.ts` | `PUT/DELETE /api/subjects/:id` | Обновление/удаление предмета | `subjects` |
| `src/app/api/classrooms/route.ts` | `GET/POST /api/classrooms` | CRUD кабинетов (list/create) | `classrooms` |
| `src/app/api/classrooms/[id]/route.ts` | `PUT/DELETE /api/classrooms/:id` | Обновление/удаление кабинета | `classrooms` |
| `src/app/api/roles/route.ts` | `GET/POST /api/roles` | CRUD ролей (list/create) | `roles` |
| `src/app/api/roles/[id]/route.ts` | `GET/PUT/DELETE /api/roles/:id` | Операции с конкретной ролью | `roles` |
| `src/app/api/lists/route.ts` | `GET/POST /api/lists` | Листы расписания (list/create) | `lists` |
| `src/app/api/lists/[id]/route.ts` | `PUT/PATCH/POST/DELETE /api/lists/:id` | rename/activate/duplicate/delete лист | `lists`, `schedules`, `lesson_classrooms`, `schedule_changes` |

### Расписание

| Файл | Назначение | Роль | Взаимодействие |
|---|---|---|---|
| `src/app/api/schedule/route.ts` | `GET /api/schedule` | Публичное активное расписание | Собирает join-подобную витрину из таблиц |
| `src/app/api/schedules/route.ts` | `GET/POST/DELETE /api/schedules` | Операции конструктора расписания | upsert ячейки + аудит изменений + кабинеты |
| `src/app/api/schedules/suggestions/route.ts` | `GET /api/schedules/suggestions` | Подсказки по преподавателям/предметам/кабинетам | Анализ исторических записей расписания |

---

## Каталог `src/components`

### `src/components/admin`

| Файл | Назначение | Роль | Взаимодействие |
|---|---|---|---|
| `src/components/admin/admin-shell.tsx` | Sidebar, навигация, logout, переключатель темы | Основной UI-контейнер админки | `useCurrentUserQuery`, `useLogoutMutation`, `ThemeToggleControl` |

### `src/components/account`

| Файл | Назначение | Роль | Взаимодействие |
|---|---|---|---|
| `src/components/account/change-password-form.tsx` | Форма смены пароля | UI безопасности профиля | `useChangePasswordMutation`, `useCurrentUserQuery` |
| `src/components/account/pending-ip-confirmations.tsx` | Список pending IP + подтверждение | UI self-service IP trust | `useSelfPendingIpAuthsQuery`, `useConfirmSelfIpAuthMutation` |

### `src/components/hooks`

| Файл | Назначение | Роль | Взаимодействие |
|---|---|---|---|
| `src/components/hooks/use-theme.ts` | Хук переключения темы `light/dark` | Клиентская тема и localStorage | Используется `ThemeToggle*`, login, schedule pages |

### `src/components/ui`

| Файл | Назначение | Роль | Взаимодействие |
|---|---|---|---|
| `badge.tsx` | Бейджи статусов | Базовый UI элемент | Используется таблицами/карточками |
| `button.tsx` | `Button`/`ButtonLink` c вариантами | Базовый UI элемент действий | Используется во всём интерфейсе |
| `card.tsx` | `Card`/`CardHeader` | Базовый контейнер контента | Страницы админки и расписаний |
| `empty-state.tsx` | Пустые состояния + CTA | UX для пустых списков | CRUD-страницы и конструктор |
| `field.tsx` | `FieldGroup`/`FieldLabel`/`Input`/`Select` | Стандартизированные формы | Логин, CRUD, модалки |
| `icons.tsx` | Реестр иконок на `lucide-react` | Единый слой иконок | Все визуальные модули |
| `loading-state.tsx` | `Spinner` + `LoadingState` | Индикация загрузки | Все страницы с асинхронными данными |
| `Modal.tsx` | Универсальное модальное окно с анимацией/focus/esc | Диалоговые сценарии | CRUD-модалки и конструктор |
| `page-header.tsx` | Заголовки страниц | Единый стиль страниц | Админка/конструктор |
| `table.tsx` | Базовые компоненты таблицы | Единый табличный UI | CRUD-таблицы |
| `theme-toggle.tsx` | Презентационный toggle темы | UI переключатель | Используется в control и страницах |
| `theme-toggle-control.tsx` | Контроллер toggle + useTheme | Обвязка для быстрого включения | Используется в `admin-shell` |

### `src/components/schedule`

| Файл | Назначение | Роль | Взаимодействие |
|---|---|---|---|
| `constructor-page.tsx` | Контейнер конструктора | Сборка UI из модельных hook-ов | `useConstructorPageModel` + grid/toolbar/modals |
| `constructor-types.ts` | Типы конструктора | Контракт бизнес-модели | Используется всеми модулями schedule |
| `constructor-layout.ts` | Константы размеров ячеек | Единая геометрия таблицы | `constructor-cell`, `constructor-grid` |
| `constructor-dnd-utils.ts` | DnD ключи/парсеры + константы дней/уроков | Логика идентификации DnD | `constructor-grid`, `use-constructor-dnd` |
| `constructor-cell.tsx` | Ячейка расписания + draggable entry | Базовая клетка конструктора | `@dnd-kit/core`, callbacks из model |
| `constructor-drag-overlay.tsx` | Overlay перетаскивания | UX drag-and-drop | Используется в grid |
| `constructor-grid.tsx` | Таблица конструктора + DnDContext | Основная интерактивная сетка | Рендерит дни/уроки/классы и ячейки |
| `constructor-toolbar.tsx` | Управление листом (select/create/activate...) | Верхняя панель конструктора | Работает с list-management callbacks |
| `constructor-list-modal.tsx` | Модалка операций над листами | UX листов расписания | Использует callbacks list-management |
| `constructor-lesson-modal.tsx` | Модалка редактирования урока | UX редактирования ячейки + подсказки | Данные/действия из lesson-editor |
| `use-constructor-page-model-composed.ts` | Оркестратор состояния конструктора | Главная бизнес-логика на клиенте | Композит из `list-management`, `lesson-editor`, `dnd` |
| `use-constructor-page-model.legacy.ts` | Легаси-модель (в основном реэкспорт) | Исторический слой миграции | Содержит старый монолитный код |

### `src/components/schedule/hooks`

| Файл | Назначение | Роль | Взаимодействие |
|---|---|---|---|
| `use-constructor-list-management.ts` | CRUD/activate/duplicate/delete листов | Модуль управления версиями расписания | Использует list мутации React Query |
| `use-constructor-lesson-editor.ts` | Состояние модалки урока + autocomplete | Модуль редактирования уроков | Вызывает `useScheduleAutocompleteQuery`, `upsertCell` |
| `use-constructor-dnd.ts` | Drag-and-drop перенос/дублирование | Модуль DnD-логики конструктора | Парсинг DnD id + мутации upsert/delete |

---

## Прочие файлы `src`

| Файл | Назначение | Роль | Взаимодействие |
|---|---|---|---|
| `src/indext.ts` | Пустой файл-заглушка | Сейчас не участвует в runtime | Не импортируется |

---

## 3. Архитектура

### Архитектурный подход
- Монолитный `Next.js`-проект.
- Комбинация:
  - `Frontend` (React client components),
  - `Backend` (Next API routes в `src/app/api`),
  - `Data Access Layer` (Drizzle + MySQL).
- Стиль API: REST-подобные JSON эндпоинты.
- Клиентские данные: `React Query` + сервисы (`src/lib/api/services`).

### Поток взаимодействия frontend ↔ backend ↔ БД
1. UI-компонент вызывает React Query hook.
2. Hook вызывает сервис из `src/lib/api/services/*`.
3. Сервис делает HTTP через `apiClient` (`axios`) в `/api/...`.
4. API route валидирует сессию/роль (через `getSession`, `AdminCheck`, `AdminOnlyCheck`).
5. API route выполняет запросы к БД через Drizzle (`src/db/index.ts`, `src/db/schema.ts`).
6. JSON-ответ возвращается на фронт; React Query обновляет кэш.

---

## 4. Основные модули

## 4.1 Авторизация и безопасность
- Cookie-сессия `schedule_session` (`lib/auth.ts`).
- Логин:
  - валидация `login/password`,
  - проверка/миграция пароля в bcrypt,
  - проверка IP.
- Trusted IP:
  - первый вход с пользователя — IP автоматически подтверждается;
  - новый IP получает статус pending;
  - pending IP можно подтвердить:
    - администратором (`/admin/ip-auths`),
    - самим пользователем из уже доверенной сессии (`/account`).
- Смена пароля:
  - минимум длины и состав (буква + цифра),
  - после смены пароля другие подтверждённые IP переводятся в pending.

## 4.2 Работа с пользователями
- Роли в БД: `Админ`, `Менеджер`, `Преподаватель`.
- Менеджеров может создавать только администратор.
- Для преподавателей и менеджеров используется единая таблица `users` + `roleId`.
- `/admin/teachers` — объединённая таблица пользователей.

## 4.3 Бизнес-логика расписания
- Листы расписания (`lists`) работают как версии.
- Только один лист активен (`isActive=true`) и публикуется на `/schedule`.
- Конструктор (`/admin/constructor`) поддерживает:
  - upsert ячейки по ключу `(listId, classId, day, lessonNumber)`,
  - привязку нескольких кабинетов к уроку,
  - drag-and-drop перенос и дублирование (Shift),
  - автоподсказки на основе исторических данных.
- Отслеживание изменений (`schedule_changes`) при редактировании предмета/преподавателя.

## 4.4 API-модуль
- Все CRUD операции по справочникам в `app/api/*`.
- Единый подход к ошибкам: JSON `{ error }` + HTTP status.
- Проверка сессии и ролей на большинстве admin endpoint-ов.

---

## 5. База данных

## Таблицы и назначение

| Таблица | Назначение |
|---|---|
| `roles` | Роли пользователей |
| `statuses` | Статусы IP-авторизации (`Подтверждён`, `Ожидание подтверждения`) |
| `grades` | Параллели (номер, часы в неделю) |
| `classes` | Классы внутри параллели |
| `users` | Пользователи (преподаватели/менеджеры/админ) |
| `ip_auths` | История и состояние доверенных IP |
| `subjects` | Справочник предметов |
| `classrooms` | Справочник кабинетов |
| `lists` | Версии/листы расписания |
| `schedules` | Ячейки расписания (урок конкретного класса) |
| `lesson_classrooms` | Связь урока с кабинетами (многие-ко-многим) |
| `schedule_changes` | Аудит изменений по ячейкам |

## Основные связи
- `classes.grade_id -> grades.id` (многие к одному)
- `users.role_id -> roles.id` (многие к одному)
- `users.class_id -> classes.id` (опционально)
- `ip_auths.user_id -> users.id`
- `ip_auths.status_id -> statuses.id`
- `schedules.list_id -> lists.id`
- `schedules.class_id -> classes.id`
- `schedules.subject_id -> subjects.id` (nullable)
- `schedules.teacher_id -> users.id` (nullable)
- `lesson_classrooms.schedule_id -> schedules.id`
- `lesson_classrooms.classroom_id -> classrooms.id`
- `schedule_changes.schedule_id -> schedules.id`

## Ограничения целостности
- Уникальный индекс `ip_auths_user_ip_unique (user_id, ip)`.
- PK на `id` во всех таблицах.

---

## 6. Запуск проекта

## Требования
- Node.js 18+
- npm
- MySQL 8 (локально или через Docker)

## Установка зависимостей
```bash
npm install
```

## Запуск БД через Docker
```bash
docker compose up -d
```

## Переменные окружения

Проект имеет значения по умолчанию, но для продакшена лучше задать явно:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=housemorningdinner
DB_NAME=schedule_db

SESSION_SECRET=change-me
# альтернативно:
NEXTAUTH_SECRET=change-me

BCRYPT_SALT_ROUNDS=12
TRUSTED_IP_TTL_DAYS=30

# для внешнего API-хоста (опционально)
NEXT_PUBLIC_API_BASE_URL=/api
```

## Инициализация данных
```bash
npm run db:seed
```

Скрипт создаёт базовые роли и тестового администратора.

## Запуск приложения
```bash
npm run dev
```

Продакшен-режим:
```bash
npm run build
npm run start
```

---

## 7. Примеры использования

## Примеры API-запросов

### Логин
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"admin","password":"admin_password"}'
```

### Получить текущего пользователя
```bash
curl http://localhost:3000/api/auth/me \
  --cookie "schedule_session=<COOKIE_VALUE>"
```

### Получить публичное активное расписание
```bash
curl http://localhost:3000/api/schedule
```

### Создать предмет (требуются права админ/менеджер)
```bash
curl -X POST http://localhost:3000/api/subjects \
  -H "Content-Type: application/json" \
  --cookie "schedule_session=<COOKIE_VALUE>" \
  -d '{"name":"Алгебра"}'
```

### Upsert ячейки расписания
```bash
curl -X POST http://localhost:3000/api/schedules \
  -H "Content-Type: application/json" \
  --cookie "schedule_session=<COOKIE_VALUE>" \
  -d '{
    "listId": 1,
    "classId": 3,
    "day": 1,
    "lessonNumber": 2,
    "subjectId": 5,
    "teacherId": 8,
    "classroomIds": [101, 203]
  }'
```

### Подтвердить pending IP из доверенной сессии
```bash
curl -X POST http://localhost:3000/api/ip-auths/self \
  -H "Content-Type: application/json" \
  --cookie "schedule_session=<COOKIE_VALUE>" \
  -d '{"id": 42}'
```

## Примеры пользовательских сценариев

1. Администратор создаёт справочники:
`Параллели -> Классы -> Предметы -> Кабинеты -> Преподаватели`.

2. Администратор/менеджер создаёт лист расписания в конструкторе:
`Создать служебный лист -> заполнить ячейки (указать всех преподователей для каждого класса)`.
`Создать лист -> заполнить ячейки -> активировать лист`.

3. Пользователи смотрят опубликованное расписание:
`/schedule` (общее) или `/schedule/teachers` (по преподавателям).

4. Пользователь входит с нового IP:
- получает pending при логине;
- подтверждает IP через админа или из ранее доверенной сессии в `/account`.

---

## 8. Дополнительные заметки для нового разработчика

- В проекте заметны следы проблемы с кодировкой строк (mojibake) в ряде файлов; для исправления есть `fix-encoding.js`.
- В `drizzle.config.ts` хардкод-пароль базы — для продакшена перенести в env.
- Cookie `secure: false` в auth-роутах подходит для dev, но для HTTPS-продакшена должно быть `secure: true`.

