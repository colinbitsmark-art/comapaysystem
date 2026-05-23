import {
  deleteTelegramWebhook,
  getTelegramWebhookInfo,
  getTelegramWebhookSecret,
  setTelegramWebhook,
} from "./telegramApi.js";
import {
  canRegisterTelegramWebhook,
  resolveWebhookUrl,
} from "./telegramConfig.js";

export const registerTelegramWebhookIfConfigured = async () => {
  if (!canRegisterTelegramWebhook()) {
    const webhookUrl = resolveWebhookUrl();
    if (!webhookUrl) {
      console.log(
        "Telegram webhook: not registered (set TELEGRAM_WEBHOOK_URL or PUBLIC_APP_URL / RAILWAY_PUBLIC_DOMAIN)",
      );
    }
    return;
  }

  const webhookUrl = resolveWebhookUrl();
  const secret = getTelegramWebhookSecret();

  try {
    await deleteTelegramWebhook();
    await setTelegramWebhook(webhookUrl, secret);
    const info = await getTelegramWebhookInfo();
    console.log(`Telegram webhook registered: ${info?.url || webhookUrl}`);
  } catch (error) {
    console.error(
      "Telegram webhook registration failed:",
      error instanceof Error ? error.message : error,
    );
  }
};
