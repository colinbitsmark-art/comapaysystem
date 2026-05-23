import {
  buildReferenceRatesResponse,
  parseAndBuildConfig,
} from "../utils/referenceRatesCalculator.js";
import {
  userCanDisplayReferenceRatesPanel,
  userCanEditReferenceRates,
} from "../utils/referenceRatesAuth.js";
import {
  loadReferenceRatesConfig,
  saveReferenceRatesConfig,
} from "../services/referenceRatesStore.js";
import {
  buildReferenceRatesTelegramMessage,
  loadBuiltReferenceRatesResponse,
  mergeReferenceRatesConfig,
} from "../utils/referenceRatesTelegram.js";
import { pushReferenceRatesToTelegramBot } from "../services/telegram/telegramRateSheetService.js";

export { REFERENCE_RATES_SETTING_KEY } from "../services/referenceRatesStore.js";

export const getReferenceRates = async (req, res, next) => {
  try {
    if (!userCanDisplayReferenceRatesPanel(req) && !userCanEditReferenceRates(req)) {
      return res.status(403).json({ message: "Not allowed to view reference rates" });
    }
    const response = await loadBuiltReferenceRatesResponse();
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const updateReferenceRates = async (req, res, next) => {
  try {
    if (!userCanEditReferenceRates(req)) {
      return res.status(403).json({ message: "Not allowed to edit reference rates" });
    }
    const stored = mergeReferenceRatesConfig(await loadReferenceRatesConfig());
    const merged = {
      pkrSwiftFactor: req.body?.pkrSwiftFactor ?? stored.pkrSwiftFactor,
      pairs: {
        ...stored.pairs,
        ...(req.body?.pairs || {}),
      },
    };
    const config = parseAndBuildConfig(merged);
    await saveReferenceRatesConfig(config);
    res.json(buildReferenceRatesResponse(config));
  } catch (error) {
    next(error);
  }
};

/** Sends last saved rates to Telegram via bot webhook (does not save form). */
export const sendReferenceRatesToTelegram = async (req, res, next) => {
  try {
    if (!userCanEditReferenceRates(req)) {
      return res.status(403).json({ message: "Not allowed to send reference rates" });
    }
    const message = await buildReferenceRatesTelegramMessage();
    await pushReferenceRatesToTelegramBot(message);
    res.json({ ok: true, message: "Reference rates sent to Telegram" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to send to Telegram";
    res.status(502).json({ message: msg });
  }
};

/** Bot API: formatted rate sheet for /command1 (x-bot-api-key). */
export const getBotReferenceRatesSheet = async (_req, res, next) => {
  try {
    const message = await buildReferenceRatesTelegramMessage();
    const response = await loadBuiltReferenceRatesResponse();
    res.json({
      message,
      updatedAt: response.updatedAt,
    });
  } catch (error) {
    next(error);
  }
};
