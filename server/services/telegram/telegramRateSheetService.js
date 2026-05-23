import { sendTelegramMessage } from "./telegramApi.js";
import { canSendTelegramRates, getRatesChatId, isTelegramEnabled } from "./telegramConfig.js";

/**
 * Send reference rate sheet directly via Telegram Bot API.
 */
export const sendReferenceRatesToTelegram = async (message) => {
  if (!isTelegramEnabled()) {
    throw new Error("Telegram is disabled (set ENABLE_TELEGRAM_NOTIFICATIONS=true)");
  }
  if (!canSendTelegramRates()) {
    throw new Error(
      "Telegram is not configured (set TELEGRAM_BOT_TOKEN and TELEGRAM_RATES_CHAT_ID)",
    );
  }

  await sendTelegramMessage(getRatesChatId(), message);
  return { ok: true };
};

/** @deprecated Use sendReferenceRatesToTelegram */
export const pushReferenceRatesToTelegramBot = sendReferenceRatesToTelegram;
