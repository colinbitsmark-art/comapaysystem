import { sendTelegramMessage } from "./telegramApi.js";
import { canSendTelegramNotifications, getNotificationChatId } from "./telegramConfig.js";

const ICONS = {
  approval_approved: "✅",
  approval_rejected: "❌",
  approval_pending: "⏳",
  order_assigned: "👤",
  order_unassigned: "🔓",
  order_created: "📦",
  order_completed: "✅",
  order_cancelled: "❌",
  order_deleted: "🗑️",
  expense_created: "💰",
  expense_deleted: "🗑️",
  transfer_created: "🔄",
  transfer_deleted: "🗑️",
  wallet_incoming: "📥",
  wallet_outgoing: "📤",
  wallet_transaction: "💳",
};

const ORDER_TELEGRAM_TYPES = new Set([
  "order_created",
  "order_completed",
  "order_cancelled",
  "order_deleted",
  "order_assigned",
  "order_unassigned",
]);

const extractActorFromMessage = (message) => {
  const byCustomer = message.match(/\bby (.+?) - /);
  if (byCustomer) {
    return byCustomer[1];
  }
  const byEnd = message.match(/\bby (.+)$/);
  return byEnd?.[1] ?? null;
};

const formatOrderNotificationForTelegram = (notification) => {
  const { type, entityId, message, metadata } = notification;
  const orderId = entityId;
  if (!orderId) {
    return null;
  }

  const actorName = extractActorFromMessage(message) || "User";

  switch (type) {
    case "order_created":
      return `Order #${orderId} Created by ${actorName}`;
    case "order_completed":
      return `Order #${orderId} Completed by ${actorName}`;
    case "order_cancelled":
      return `Order #${orderId} Cancelled by ${actorName}`;
    case "order_deleted":
      return `Order #${orderId} Deleted by ${actorName}`;
    case "order_assigned": {
      const assigneeName = metadata?.assigneeName;
      if (!assigneeName) {
        return null;
      }
      return `Order #${orderId} Assigned to ${assigneeName} by ${actorName}.`;
    }
    case "order_unassigned": {
      const assigneeName = metadata?.assigneeName;
      if (!assigneeName) {
        return null;
      }
      return `Order #${orderId} Unassigned from ${assigneeName}.`;
    }
    default:
      return null;
  }
};

export const formatNotificationForTelegram = (notification) => {
  const { type, title, message, userName } = notification;
  const icon = ICONS[type] || "🔔";

  if (ORDER_TELEGRAM_TYPES.has(type)) {
    const orderLine = formatOrderNotificationForTelegram(notification);
    if (orderLine) {
      return `${icon} ${orderLine}`;
    }
  }

  let text = `${icon} ${title}\n${message}`;
  if (userName) {
    text += `\n👤 ${userName}`;
  }
  return text;
};

export const pushNotificationToTelegram = async (notification) => {
  if (!canSendTelegramNotifications()) {
    return false;
  }

  try {
    const text = formatNotificationForTelegram(notification);
    await sendTelegramMessage(getNotificationChatId(), text);
    console.log("Notification sent to Telegram:", notification.type);
    return true;
  } catch (error) {
    console.error(
      "Failed to send notification to Telegram:",
      error instanceof Error ? error.message : error,
    );
    return false;
  }
};
