import { isTelegramBotConfigured } from "./telegramApi.js";

export const isTelegramEnabled = () =>
  (process.env.ENABLE_TELEGRAM_NOTIFICATIONS || "").trim() === "true";

export const getRatesChatId = () =>
  process.env.TELEGRAM_RATES_CHAT_ID?.trim() ||
  process.env.TELEGRAM_NOTIFICATION_CHAT_ID?.trim() ||
  "";

export const getNotificationChatId = () =>
  process.env.TELEGRAM_NOTIFICATION_CHAT_ID?.trim() ||
  process.env.TELEGRAM_RATES_CHAT_ID?.trim() ||
  "";

export const getAllowedChatIds = () => {
  const raw = process.env.TELEGRAM_ALLOWED_CHAT_IDS?.trim();
  if (!raw) return null;
  return new Set(
    raw
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );
};

export const isChatAllowed = (chatId) => {
  const allowed = getAllowedChatIds();
  if (!allowed) return true;
  return allowed.has(String(chatId));
};

export const resolveWebhookUrl = () => {
  const explicit = process.env.TELEGRAM_WEBHOOK_URL?.trim();
  if (explicit) {
    return explicit.endsWith("/api/telegram/webhook")
      ? explicit
      : `${explicit.replace(/\/$/, "")}/api/telegram/webhook`;
  }

  const publicBase =
    process.env.PUBLIC_APP_URL?.trim() ||
    process.env.RAILWAY_PUBLIC_DOMAIN?.trim();

  if (!publicBase) return null;

  const base = publicBase.startsWith("http")
    ? publicBase.replace(/\/$/, "")
    : `https://${publicBase.replace(/\/$/, "")}`;

  return `${base}/api/telegram/webhook`;
};

export const canRegisterTelegramWebhook = () =>
  isTelegramEnabled() && isTelegramBotConfigured() && Boolean(resolveWebhookUrl());

export const canSendTelegramRates = () =>
  isTelegramEnabled() && isTelegramBotConfigured() && Boolean(getRatesChatId());

export const canSendTelegramNotifications = () =>
  isTelegramEnabled() && isTelegramBotConfigured() && Boolean(getNotificationChatId());
