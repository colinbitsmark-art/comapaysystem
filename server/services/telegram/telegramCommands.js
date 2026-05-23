import { buildReferenceRatesTelegramMessage } from "../../utils/referenceRatesTelegram.js";
import { isChatAllowed } from "./telegramConfig.js";
import { sendTelegramMessage } from "./telegramApi.js";

const normalizeCommand = (text) => {
  if (!text) return "";
  const first = text.trim().split(/\s+/)[0];
  return first.split("@")[0].toLowerCase();
};

const HELP_TEXT = `Reference rates bot commands

/command1 — post the current saved rate sheet
/chatid — show this chat's id (for TELEGRAM_RATES_CHAT_ID)
/help — this message`;

export const handleTelegramUpdate = async (update) => {
  const message = update?.message;
  if (!message?.text) return;

  const chatId = message.chat?.id;
  if (chatId === undefined || chatId === null) return;

  if (!isChatAllowed(chatId)) {
    console.log(`Telegram: ignored message from disallowed chat ${chatId}`);
    return;
  }

  const command = normalizeCommand(message.text);

  try {
    if (command === "/command1") {
      const sheet = await buildReferenceRatesTelegramMessage();
      await sendTelegramMessage(chatId, sheet);
      return;
    }

    if (command === "/chatid" || command === "/id") {
      const lines = [
        `Chat ID: ${chatId}`
      ];

      await sendTelegramMessage(chatId, lines.join("\n"));
      return;
    }

    if (command === "/help" || command === "/start") {
      await sendTelegramMessage(chatId, HELP_TEXT);
    }
  } catch (error) {
    console.error("Telegram command error:", error);
    try {
      await sendTelegramMessage(
        chatId,
        `Could not complete that command: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    } catch (sendError) {
      console.error("Telegram error reply failed:", sendError);
    }
  }
};
