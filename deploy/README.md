# Self-hosting «Поток» on the mini-PC (no VPN)

Everything runs in Docker on your Windows mini-PC: **Postgres + MinIO + the Next.js
app + the Telegram bot + Caddy** (auto-HTTPS). The bot reaches Telegram through a
**free Cloudflare Worker relay** (Cloudflare is reachable from RU), so no VPN and no
paid proxy are needed.

```
Browser ── HTTPS ──▶ Caddy ──▶ app (Next.js) ─┐
                                              ├─▶ Postgres (db)
                                              └─▶ MinIO (S3)
bot (long-polling) ──▶ Cloudflare Worker ──▶ api.telegram.org
```

## 0. Prerequisites
- **Docker Desktop** on the mini-PC (with WSL2 backend).
- **DNS**: `A` record `kanban.freshdv.ru` → your white IP `95.165.71.224`.
- **Router**: forward **80** and **443** to the mini-PC. (You no longer need to
  forward 6432/9000 — Postgres and MinIO are now internal to the compose network.)
- A **free Cloudflare account** (for the relay). No card required.

## 1. Deploy the Telegram relay (Cloudflare Worker)
```bash
cd deploy/telegram-relay
npx wrangler login        # opens the browser, log into Cloudflare (free)
npx wrangler deploy       # prints  https://tg-relay.<you>.workers.dev
```
Copy that URL — it goes into `TELEGRAM_API_ROOT`.

> Alternative without any account: run **GoodbyeDPI** or **Zapret** on Windows to
> unblock `api.telegram.org` directly, then leave `TELEGRAM_API_ROOT` empty. The
> relay is more reliable, so prefer it.

## 2. Configure env
```bash
cd deploy
cp .env.prod.example .env.prod
```
Fill `.env.prod`: strong passwords (`openssl rand -hex 32`), your bot token/username,
`ADMIN_TELEGRAM_USERNAME` (the @handle that becomes the first admin), and
`TELEGRAM_API_ROOT=https://tg-relay.<you>.workers.dev`.

## 3. Bring up the stack
```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```
This builds the app, runs DB migrations (`prisma migrate deploy`), creates the MinIO
bucket, starts the app + bot, and Caddy fetches a Let's Encrypt cert for the domain.

Check it: `docker compose -f docker-compose.prod.yml logs -f app bot caddy`.

## 4. Point the Telegram Login Widget at the domain
In [@BotFather](https://t.me/BotFather): `/setdomain` → pick your bot → send
`kanban.freshdv.ru` (host only, no `https://`, no path). Without this the login
button shows **"Bot domain invalid"**.

## 5. First login = admin
Open `https://kanban.freshdv.ru`, log in with the Telegram account whose @username
equals `ADMIN_TELEGRAM_USERNAME`. It is bootstrapped as **ADMIN** automatically. Add
the rest of the team from the «Управление доступом» screen (no demo/test users exist
in production).

## Updating after a code change
```bash
git pull
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```
`migrate` re-runs automatically and applies any new migrations.

## Backups (prod DB)
`deploy/backup.cmd` runs `pg_dump -Fc` of the kanban Postgres into
`C:\Users\minipc\kanban-backups\`, keeping the last 14 days. It's installed at
`C:\Users\minipc\kanban-backup.cmd` and scheduled daily at 03:30 via a Windows
Task (`KanbanBackup`).

Run on demand: `C:\Users\minipc\kanban-backup.cmd`
Restore a dump:
```cmd
docker exec -i kanban-pg pg_restore -U kanban -d kanban --clean --if-exists < kanban-YYYYMMDD-HHMMSS.dump
```
(Optional: copy the `kanban-backups` folder offsite / to MinIO periodically.)

## Heads-up: Login Widget needs the user's browser to reach Telegram
The official widget loads `telegram.org` / `oauth.telegram.org` **in each user's
browser**. Telegram messenger generally works in RU, but if the widget fails to load
for your users, switch to a **bot deep-link login** (user taps a `t.me/<bot>?start=…`
link, the bot authenticates them) — that only needs the Telegram app, which works
without VPN. Ask and we'll wire it up.
