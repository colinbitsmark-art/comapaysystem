# Telegram Bot Integration - .env Configuration

Add these variables to your Order System's `.env` file to enable Telegram bot notifications.

```env
# ============================================
# TELEGRAM BOT INTEGRATION
# ============================================

# Enable notifications to Telegram bot
# Set to 'true' to enable, 'false' to disable
ENABLE_TELEGRAM_NOTIFICATIONS=true

# Webhook URL of the Telegram bot
# This is where the order system will send notifications
# Default for local development:
TELEGRAM_BOT_WEBHOOK_URL=http://localhost:3001/webhook/notification

# Webhook secret for authentication
# IMPORTANT: This must match WEBHOOK_SECRET in the Telegram bot's .env
# Use a strong random secret (32+ characters)
# Example: openssl rand -base64 32
TELEGRAM_BOT_WEBHOOK_SECRET=your-secure-random-secret-key-change-this-in-production

# Optional: dedicated URL for reference rate sheet (defaults to .../webhook/rate-sheet)
# TELEGRAM_BOT_RATE_SHEET_WEBHOOK_URL=http://localhost:3001/webhook/rate-sheet
```

## Reference rate sheet (Send to Telegram + /command1)

The order app POSTs to your bot when an editor clicks **Send to Telegram** on the Reference rates page:

```json
POST /webhook/rate-sheet
X-Webhook-Secret: <same as above>
{ "type": "reference_rates", "message": "<formatted text>" }
```

Your bot should call `sendMessage` to the rates group chat.

For `/command1`, fetch from the order app:

```http
GET /api/bot/reference-rates
X-Bot-Api-Key: <BOT_API_KEY>
```

See `docs/RAILWAY_POSTGRES_REFERENCE_RATES.md` for details.

## Instructions

1. Open your existing `.env` file in the ordersystem project
2. Add the three variables above to the end of the file
3. Replace `your-secure-random-secret-key-change-this-in-production` with a secure random secret
4. Make sure the secret matches the `WEBHOOK_SECRET` in your Telegram bot's `.env` file

## Generate Secure Secret

To generate a secure random secret, run:

```bash
openssl rand -base64 32
```

Copy the output and use it for both:
- Order System: `TELEGRAM_BOT_WEBHOOK_SECRET`
- Telegram Bot: `WEBHOOK_SECRET`

## Production Deployment

For production:
- Update `TELEGRAM_BOT_WEBHOOK_URL` to your bot's public URL
- Ensure both services can communicate (check firewalls, network settings)
- Use HTTPS for the webhook URL if possible

## Testing

After adding these variables:

1. Restart your order system server
2. Start the Telegram bot
3. Create/update an order in the system
4. You should receive a notification in Telegram

## Troubleshooting

If notifications aren't working:
1. Check `ENABLE_TELEGRAM_NOTIFICATIONS=true` is set
2. Verify `TELEGRAM_BOT_WEBHOOK_SECRET` matches bot's `WEBHOOK_SECRET`
3. Ensure the webhook URL is correct and reachable
4. Check both services are running
5. Look at server logs for error messages
