const API_BASE = "https://api.telegram.org";

const getBotToken = () => process.env.TELEGRAM_BOT_TOKEN?.trim() || "";

export const isTelegramBotConfigured = () => Boolean(getBotToken());

export const getTelegramWebhookSecret = () =>
  process.env.TELEGRAM_WEBHOOK_SECRET?.trim() || "";

const telegramFetch = async (method, body) => {
  const token = getBotToken();
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  }

  const response = await fetch(`${API_BASE}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    const detail = data.description || response.statusText;
    throw new Error(`Telegram API ${method} failed: ${detail}`);
  }
  return data.result;
};

export const sendTelegramMessage = async (chatId, text) => {
  if (chatId === undefined || chatId === null || chatId === "") {
    throw new Error("Telegram chat id is not configured");
  }
  return telegramFetch("sendMessage", {
    chat_id: chatId,
    text,
  });
};

export const deleteTelegramWebhook = async () => {
  if (!isTelegramBotConfigured()) return;
  await telegramFetch("deleteWebhook", { drop_pending_updates: false });
};

export const setTelegramWebhook = async (webhookUrl, secretToken) => {
  const payload = {
    url: webhookUrl,
    allowed_updates: ["message"],
    drop_pending_updates: true,
  };
  if (secretToken) {
    payload.secret_token = secretToken;
  }
  await telegramFetch("setWebhook", payload);
};

export const getTelegramWebhookInfo = async () => {
  if (!isTelegramBotConfigured()) return null;
  return telegramFetch("getWebhookInfo", {});
};
