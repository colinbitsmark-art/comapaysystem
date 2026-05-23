# Telegram (in-app) — .env configuration

Telegram runs inside the order app. No separate `ordersystem-telegram-bot` service.

## Required for Send to Telegram + notifications

```env
ENABLE_TELEGRAM_NOTIFICATIONS=true
TELEGRAM_BOT_TOKEN=123456789:ABC...          # @BotFather
TELEGRAM_RATES_CHAT_ID=-100xxxxxxxxxx        # rates group chat id
```

Get chat id: add bot to the group, send `/chatid` (after webhook is set) or use `getUpdates` while testing.

## Required for `/command1` in group (Telegram webhook)

Telegram must POST to your app over **HTTPS**.

```env
TELEGRAM_WEBHOOK_URL=https://your-app.railway.app
# or
PUBLIC_APP_URL=https://your-app.railway.app

TELEGRAM_WEBHOOK_SECRET=<openssl rand -base64 32>
```

On startup the app registers: `https://your-app.railway.app/api/telegram/webhook`

### Commands

| Command | Action |
|---------|--------|
| `/command1` | Post saved reference rate sheet |
| `/chatid` | Show chat id for `.env` |
| `/help` | List commands |

Optional restrict commands to specific chats:

```env
TELEGRAM_ALLOWED_CHAT_IDS=-100xxxxxxxxxx,-100yyyyyyyyyy
```

## Order notifications

Uses `TELEGRAM_NOTIFICATION_CHAT_ID` if set, otherwise `TELEGRAM_RATES_CHAT_ID`.

Admin toggle in the web app (Notification settings) still applies.

## Local development

- **Send to Telegram** works with token + chat id only.
- **Webhook commands** need a public HTTPS URL (e.g. ngrok → `TELEGRAM_WEBHOOK_URL=https://xxx.ngrok.io`).

## Removed (legacy external bot)

Do not set these for the in-app integration:

- `TELEGRAM_BOT_WEBHOOK_URL` (order app → external bot)
- `TELEGRAM_BOT_RATE_SHEET_WEBHOOK_URL`

## Verify webhook (production)

```bash
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

Expected `url` ends with `/api/telegram/webhook`.
