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
TELEGRAM_BOT_WEBHOOK_URL=...
TELEGRAM_BOT_WEBHOOK_SECRET=...  # must match bot
```

Optional override:

```env
TELEGRAM_BOT_RATE_SHEET_WEBHOOK_URL=https://your-bot/webhook/rate-sheet
```

## Telegram bot (`@PRICE7GGBOT`) changes

### Webhook handler

Add a route (e.g. `POST /webhook/rate-sheet`) that accepts:

```json
{
  "type": "reference_rates",
  "message": "PRICE 7GG\n🔰 Hello! Team 🔰\n..."
}
```

Verify `X-Webhook-Secret`, then `sendMessage` to your group chat.

### `/command1` command

```http
GET https://YOUR-ORDER-APP/api/bot/reference-rates
X-Bot-Api-Key: <BOT_API_KEY>
```

Response:

```json
{
  "message": "...",
  "updatedAt": "2026-..."
}
```

Reply with `message` in the chat.
