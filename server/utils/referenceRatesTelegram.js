import {
  buildReferenceRatesResponse,
  defaultReferenceRatesConfig,
  REFERENCE_RATE_PAIR_IDS,
} from "./referenceRatesCalculator.js";
import { loadReferenceRatesConfig } from "../services/referenceRatesStore.js";

/** Direction label → flag emoji. Unknown labels get no flag. */
const TELEGRAM_DIRECTION_FLAGS = {
  "PKR>USDT": "🇵🇰",
  "USDT>PKR": "🇵🇰",
  "PKR>CNY": "🇵🇰",
  "CNY>PKR": "🇵🇰",
  "PKR>HKD": "🇵🇰",
  "HKD>PKR": "🇵🇰",
  "PKR>AED": "🇦🇪",
  "AED>PKR": "🇦🇪",
  "AED>USDT": "🇦🇪",
  "USDT>AED": "🇦🇪",
  "PKR>SWIFT": "🇭🇰",
  "SWIFT>PKR": "🇭🇰",
  "HKD>USDT": "🇭🇰",
  "USDT>HKD": "🇭🇰",
  "USD>USDT (HK)": "🇭🇰",
  "USDT>USD (HK)": "🇭🇰",
  "USD>USDT (INTL)": "🇭🇰",
  "USDT>USD (INTL)": "🇭🇰",
  "CNY>USDT": "🇨🇳",
  "USDT>CNY": "🇨🇳",
};

export const emojiForTelegramDirection = (directionLabel) =>
  TELEGRAM_DIRECTION_FLAGS[directionLabel] ?? "";

const formatRate = (value, decimals = 3) => {
  if (value === null || value === undefined || !Number.isFinite(value)) return "NA";
  return String(Number(value.toFixed(decimals)));
};

const getBuySell = (pair) => {
  const buy =
    pair.computedBuy ??
    (pair.kind === "benchmark" ? pair.baseBuy ?? null : null);
  const sell =
    pair.computedSell ??
    (pair.kind === "benchmark" ? pair.baseSell ?? null : null);
  return { buy, sell };
};

/**
 * Parse UI pair label e.g. "USD/USDT (HK)" → { from: "USD", to: "USDT", tag: " (HK)" }.
 */
export const parseReferencePairLabel = (label) => {
  if (!label || typeof label !== "string") return null;
  const trimmed = label.trim();
  const paren = trimmed.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  const suffix = paren ? ` (${paren[2].trim()})` : "";
  const core = paren ? paren[1].trim() : trimmed;
  const slash = core.indexOf("/");
  if (slash < 0) return null;
  const from = core.slice(0, slash).trim();
  const to = core.slice(slash + 1).trim();
  if (!from || !to) return null;
  return { from, to, tag: suffix };
};

/**
 * Desk directions from pair buy/sell: FORWARD (from>to) uses sell, REVERSE (to>from) uses buy.
 */
export const buildDirectionLinesForPair = (pair) => {
  const parsed = parseReferencePairLabel(pair.label);
  if (!parsed) return [];

  const { from, to, tag } = parsed;
  const { buy, sell } = getBuySell(pair);
  const decimals = pair.displayDecimals ?? 3;

  return [
    { label: `${from}>${to}${tag}`, value: sell, decimals },
    { label: `${to}>${from}${tag}`, value: buy, decimals },
  ];
};

export const mergeReferenceRatesConfig = (stored) => {
  const defaults = defaultReferenceRatesConfig();
  if (!stored) {
    return { ...defaults, updatedAt: null };
  }
  return {
    version: stored.version ?? defaults.version,
    pkrSwiftFactor: stored.pkrSwiftFactor ?? defaults.pkrSwiftFactor,
    updatedAt: stored.updatedAt ?? null,
    pairs: { ...defaults.pairs, ...(stored.pairs || {}) },
  };
};

export const loadBuiltReferenceRatesResponse = async () => {
  const stored = await loadReferenceRatesConfig();
  const config = mergeReferenceRatesConfig(stored);
  return buildReferenceRatesResponse(config);
};

/**
 * @param {ReturnType<typeof buildReferenceRatesResponse>} response
 */
export const formatReferenceRatesTelegramMessage = (response) => {
  const pairs = response.pairs;
  const lines = [];

  for (const pairId of REFERENCE_RATE_PAIR_IDS) {
    const pair = pairs[pairId];
    if (!pair) continue;
    for (const { label, value, decimals } of buildDirectionLinesForPair(pair)) {
      const flag = emojiForTelegramDirection(label);
      lines.push(`${flag}${label}: ${formatRate(value, decimals)}`);
    }
  }

  return [
    "🔰 Hello! Team 🔰",
    "Price 💰 is",
    "------------------------",
    "🏢DEALING",
    ...lines,
  ].join("\n");
};

export const buildReferenceRatesTelegramMessage = async () => {
  const response = await loadBuiltReferenceRatesResponse();
  return formatReferenceRatesTelegramMessage(response);
};
