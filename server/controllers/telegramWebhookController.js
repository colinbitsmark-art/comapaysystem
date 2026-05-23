import { getTelegramWebhookSecret } from "../services/telegram/telegramApi.js";
import { handleTelegramUpdate } from "../services/telegram/telegramCommands.js";

export const handleTelegramWebhook = async (req, res) => {
  const expectedSecret = getTelegramWebhookSecret();
  if (expectedSecret) {
    const provided = req.headers["x-telegram-bot-api-secret-token"];
    if (provided !== expectedSecret) {
      return res.status(401).json({ ok: false, message: "Unauthorized" });
    }
  }

  res.status(200).json({ ok: true });

  const update = req.body;
  if (!update) return;

  handleTelegramUpdate(update).catch((error) => {
    console.error("Telegram webhook handler error:", error);
  });
};
