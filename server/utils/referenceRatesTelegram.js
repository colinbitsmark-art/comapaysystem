import {
  buildReferenceRatesResponse,
  defaultReferenceRatesConfig,
} from "./referenceRatesCalculator.js";
import { loadReferenceRatesConfig } from "../services/referenceRatesStore.js";

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

/** Telegram desk sheet lines (direction → rate). */
const TELEGRAM_LINES = [
  { emoji: "🇵🇰", label: "PKR>USDT", pairId: "PKR_USDT", side: "sell" },
  { emoji: "🇵🇰", label: "USDT>PKR", pairId: "PKR_USDT", side: "buy" },
  { emoji: "🇵🇰", label: "PKR>RMB", pairId: "CNY_PKR", side: "sell" },
  { emoji: "🇵🇰", label: "RMB>PKR", pairId: "CNY_PKR", side: "buy" },
  { emoji: "🇭🇰", label: "USDT>RMB", pairId: "CNY_USDT", side: "sell" },
  { emoji: "🇭🇰", label: "RMB>USDT", pairId: "CNY_USDT", side: "buy" },
  { emoji: "🇵🇰", label: "PKR>AED", pairId: "PKR_AED", side: "sell" },
  { emoji: "🇭🇰", label: "PKR>SWIFT", pairId: "PKR_SWIFT", side: "sell" },
  { emoji: "🇭🇰", label: "SWIFT>PKR", pairId: "PKR_SWIFT", side: "buy" },
  { emoji: "🇪🇺", label: "EU>USDT", pairId: "USD_USDT_INTL", side: "sell" },
  { emoji: "🇪🇺", label: "USDT>EU", pairId: "USD_USDT_INTL", side: "buy" },
];

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
  const lines = TELEGRAM_LINES.map(({ emoji, label, pairId, side }) => {
    const pair = pairs[pairId];
    if (!pair) return `${emoji}${label}: NA`;
    const { buy, sell } = getBuySell(pair);
    const value = side === "buy" ? buy : sell;
    const decimals = pair.displayDecimals ?? 3;
    return `${emoji}${label}: ${formatRate(value, decimals)}`;
  });

  return [
    "PRICE 7GG",
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
