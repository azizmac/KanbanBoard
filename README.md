# Kanban Tracker (Поток)

Таск-трекер с канбан-досками, чатом и Telegram для небольшой команды (регионы, группы, линейный персонал).

**Стек:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · PostgreSQL · Prisma 7 · dnd-kit · grammY (Telegram).

## Возможности

- Авторизация: демо-вход в dev; в production — Telegram (виджет и бот)
- Роли: Директор / Регионал / Линейный, регионы, группы доступа, должности, приглашения по ссылке
- Канбан: колонки (финальная помечена флагом `done`, имя можно менять), drag & drop, WIP, архив
- Задачи: исполнитель, приоритет, дедлайн, чеклисты, теги, вложения, учёт времени, шаблоны (в т.ч. по расписанию)
- «Моё»: мои задачи, календарь месяц/неделя с фильтром региона, инбокс уведомлений
- Чат «Поток»: личные диалоги и группы
- Сводка для руководства: нагрузка по доскам/людям + продажи iiko на той же странице
- Telegram: вход, уведомления, `/mytasks` `/today` `/tasks` `/new`, напоминания
- Web Push, вебхуки Genspark (персональные токены), файлы в S3/MinIO

## Быстрый старт

Требуется Node 20+ и Docker.

```bash
npm run db:up
npm run db:migrate
npm run db:seed
npm run dev
```

Открыть <http://localhost:3000>. На экране входа выбрать пользователя (демо-режим).

## Полезные команды

| Команда | Что делает |
|---|---|
| `npm run dev` | Dev-сервер |
| `npm run db:up` / `db:down` | Запустить / остановить Postgres (Docker) |
| `npm run db:migrate` | Применить миграции |
| `npm run db:seed` | Перезалить демо-данные |
| `npm run db:studio` | Prisma Studio |
| `npm run test` | Unit-тесты (vitest) |
| `npm run test:e2e` | Playwright smoke |
| `npm run bot` | Telegram-бот (long polling) |

## Telegram

1. Создайте бота у [@BotFather](https://t.me/BotFather), вставьте `TELEGRAM_BOT_TOKEN` и `TELEGRAM_BOT_USERNAME` в `.env`.
2. Запустите бота: `npm run bot` (один экземпляр) или webhook: `npm run webhook:set`.
3. **Команда → Подключить Telegram** → в боте **Start**.
4. Вход-виджет работает на публичном HTTPS: `/setdomain` у @BotFather. На `localhost` — демо-вход.

## Переменные окружения

См. `.env.example`. Ключевые: `DATABASE_URL`, `SESSION_SECRET`, `TELEGRAM_BOT_TOKEN` / `TELEGRAM_BOT_USERNAME`. Пока токен пуст — демо-вход; как заполнен — Telegram-вход и уведомления. Iiko: `IIKO_*`. Файлы: `S3_*`.

## Архитектура

- Серверные компоненты читают через Prisma; мутации — Server Actions.
- Сессии в БД (`Session`), токен — httpOnly cookie.
- Живые обновления доски и чата — Postgres `LISTEN/NOTIFY` + SSE.
- Закрытая колонка определяется флагом `Column.done`, не именем «Готово».
