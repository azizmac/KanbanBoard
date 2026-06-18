# Деплой: фронт на Vercel, БД + S3 на мини-ПК

Архитектура: **Next.js на Vercel** (вне РФ → Telegram работает без прокси, бот через webhook),
**PostgreSQL и MinIO (S3)** — на вашем мини-ПК с белым IP.

```
[Пользователи] ──HTTPS──> [Vercel: web + bot webhook]
                                  │
                  ┌───────────────┴───────────────┐
            postgres://white-ip:5432        http://white-ip:9000 (MinIO/S3)
                  └──────────── мини-ПК ───────────┘
[Telegram] ──webhook──> [Vercel]   (api.telegram.org доступен с Vercel напрямую)
```

---

## 1. Мини-ПК: Postgres + MinIO

Через Docker Desktop (Windows). Пример `docker-compose.prod.yml`:

```yaml
services:
  db:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_USER: kanban
      POSTGRES_PASSWORD: "СИЛЬНЫЙ_ПАРОЛЬ"     # обязательно длинный
      POSTGRES_DB: kanban
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]

  minio:
    image: minio/minio
    restart: always
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: "S3_ACCESS_KEY"
      MINIO_ROOT_PASSWORD: "S3_SECRET_KEY_ДЛИННЫЙ"
    ports: ["9000:9000", "9001:9001"]
    volumes: ["minio:/data"]

volumes:
  pgdata:
  minio:
```

1. `docker compose -f docker-compose.prod.yml up -d`
2. Откройте консоль MinIO `http://localhost:9001`, создайте **bucket** `kanban`.
3. **Проброс портов на роутере** → мини-ПК: `5432` (Postgres) и `9000` (MinIO). В брандмауэре Windows разрешите эти порты.

> ⚠️ **Безопасность:** Postgres и MinIO будут видны из интернета. Обязательно длинные пароли/ключи. У Vercel Hobby нет статичных исходящих IP, поэтому зафаерволить «только Vercel» нельзя — по возможности позже спрячьте их за Cloudflare Tunnel + Access. Для постоянной нагрузки добавьте PgBouncer перед Postgres.

## 2. Миграции в боевую БД

С вашей машины (подставьте белый IP и пароль):

```bash
DATABASE_URL="postgresql://kanban:СИЛЬНЫЙ_ПАРОЛЬ@<WHITE_IP>:5432/kanban?schema=public" \
  npx prisma migrate deploy
```

Демо-данные **не заливаем** (в проде сид намеренно отключён). Первый пользователь появится при входе владельца (см. шаг 4).

## 3. Vercel

1. Запушьте репозиторий в GitHub и импортируйте его в Vercel (framework определится как Next.js, build = `prisma generate && next build`).
2. В **Settings → Environment Variables** задайте:

| Переменная | Значение |
|---|---|
| `DATABASE_URL` | `postgresql://kanban:ПАРОЛЬ@<WHITE_IP>:5432/kanban?schema=public` |
| `SESSION_SECRET` | `openssl rand -base64 48` |
| `NEXT_PUBLIC_APP_URL` | `https://<ваш-проект>.vercel.app` |
| `TELEGRAM_BOT_TOKEN` | токен от @BotFather |
| `TELEGRAM_BOT_USERNAME` | `taskmanagerpims_bot` |
| `TELEGRAM_WEBHOOK_SECRET` | любая длинная строка |
| `ADMIN_SECRET` | секрет для входа в `/admin` |
| `ADMIN_TELEGRAM_USERNAME` | ваш `@username` (без `@`) |
| `S3_ENDPOINT` | `http://<WHITE_IP>:9000` |
| `S3_REGION` | `us-east-1` |
| `S3_BUCKET` | `kanban` |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | ключи MinIO |

> `TELEGRAM_API_ROOT` **оставьте пустым** — с Vercel Telegram доступен напрямую, прокси не нужен.

3. Deploy.

## 4. После деплоя

1. **Webhook бота** (локально, с боевым токеном в `.env`):
   ```bash
   npm run webhook:set https://<ваш-проект>.vercel.app
   ```
   Проверить: `https://<проект>.vercel.app/api/telegram/webhook` должен принимать POST.
2. **Домен боту** для входа-виджета: @BotFather → `/setdomain` → `<ваш-проект>.vercel.app`.
3. **Первый вход:** откройте сайт → войдите через Telegram. Так как ваш `@username` указан в `ADMIN_TELEGRAM_USERNAME`, вы автоматически станете админом.
4. В `/admin` добавьте команду (имя + `@username`). Каждый участник входит через Telegram и привязывается по `@username`. Посторонние — отказ.

## Важно

- В проде **нет демо-входа** и **нет тестовых пользователей** — только вход через Telegram.
- У бота **один экземпляр**: либо webhook (прод), либо `npm run bot` (локальный polling). Запуск локального бота снимает прод-webhook — потом восстановите `npm run webhook:set`.
- Сервис зависит от мини-ПК: если дома пропадёт интернет/питание — приложение на Vercel не сможет достучаться до БД/файлов.
