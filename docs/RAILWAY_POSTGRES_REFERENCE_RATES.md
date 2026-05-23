# Railway Postgres + Telegram rate sheet

## Postgres sync

1. Add **PostgreSQL** in your Railway project.
2. On each **web** service, reference **`DATABASE_URL`** from Postgres.
3. Optional: `REFERENCE_RATES_CONFIG_ID=default` (same on all instances).

- **Save** writes Postgres + local SQLite cache.
- **Load** reads Postgres; falls back to SQLite if Postgres is unavailable.

## Send to Telegram (Reference rates page)

1. **Save** and check the **live preview**.
2. Click **Send to Telegram** — posts **last saved** rates (not unsaved form values).

Requires:

```env
ENABLE_TELEGRAM_NOTIFICATIONS=true
TELEGRAM_BOT_TOKEN=...
TELEGRAM_RATES_CHAT_ID=-100...
```

## `/command1` in Telegram group

In-app **Telegram webhook** (see `TELEGRAM_ENV_TEMPLATE.md`):

```env
TELEGRAM_WEBHOOK_URL=https://your-app.railway.app
TELEGRAM_WEBHOOK_SECRET=...
```

Commands are handled at `POST /api/telegram/webhook`. No external bot service.
