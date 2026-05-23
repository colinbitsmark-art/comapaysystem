/**
 * Push reference rate sheet to the external Telegram bot (Option A).
 * The bot must handle POST body: { type: "reference_rates", message: string }
 */
export const pushReferenceRatesToTelegramBot = async (message) => {
  const enabled = (process.env.ENABLE_TELEGRAM_NOTIFICATIONS || "").trim() === "true";
  if (!enabled) {
    throw new Error("Telegram is disabled (set ENABLE_TELEGRAM_NOTIFICATIONS=true)");
  }

  const secret = process.env.TELEGRAM_BOT_WEBHOOK_SECRET || "";
  const baseUrl = (process.env.TELEGRAM_BOT_WEBHOOK_URL || "").trim();
  if (!baseUrl) {
    throw new Error("TELEGRAM_BOT_WEBHOOK_URL is not configured");
  }

  const url =
    process.env.TELEGRAM_BOT_RATE_SHEET_WEBHOOK_URL?.trim() ||
    baseUrl.replace(/\/notification\/?$/, "/rate-sheet") ||
    baseUrl;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Webhook-Secret": secret,
    },
    body: JSON.stringify({
      type: "reference_rates",
      message,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Telegram bot returned ${response.status}: ${text || response.statusText}`);
  }

  return { ok: true };
};
