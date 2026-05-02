import type { Currency } from "../../types";

/**
 * Determine the effective "strength" rate for a currency code.
 * Returns null if the currency is not found in the list.
 */
const getCurrencyStrengthRate = (code: string, currencies: Currency[]): number | null => {
  const currency = currencies.find((c) => c.code === code);
  const candidate =
    currency?.conversionRateBuy ??
    currency?.baseRateBuy ??
    currency?.baseRateSell ??
    currency?.conversionRateSell;
  return typeof candidate === "number" ? candidate : null;
};

/**
 * Convert an amount from one currency to another using the provided rate.
 * Decides whether to multiply or divide based on which currency is "stronger"
 * (lower rate = stronger/base, e.g. USDT ≈ 1).
 *
 * - Stronger → weaker (e.g. USDT → CNY): multiply  (100 USDT × 6.8 = 680 CNY)
 * - Weaker → stronger (e.g. CNY → USDT): divide    (100,000 CNY ÷ 6.8 = 14,706 USDT)
 */
export const convertCurrency = (
  amount: number,
  rate: number,
  fromCurrency: string,
  toCurrency: string,
  currencies: Currency[]
): number => {
  if (!Number.isFinite(rate) || rate <= 0) return amount;
  if (fromCurrency === toCurrency) return amount;

  const fromRate = getCurrencyStrengthRate(fromCurrency, currencies);
  const toRate = getCurrencyStrengthRate(toCurrency, currencies);

  const fromIsBase = fromRate !== null ? fromRate <= 1 : fromCurrency === "USDT";
  const toIsBase = toRate !== null ? toRate <= 1 : toCurrency === "USDT";

  if (fromIsBase && toIsBase) {
    // Both behave like base currencies — default to multiply
    return amount * rate;
  }

  let baseIsFrom: boolean | null = null;
  if (fromIsBase !== toIsBase) {
    baseIsFrom = fromIsBase;
  } else if (!fromIsBase && !toIsBase && fromRate !== null && toRate !== null) {
    baseIsFrom = fromRate < toRate;
  } else {
    return amount * rate;
  }

  return baseIsFrom ? amount * rate : amount / rate;
};

/**
 * Calculate amountSell from amountBuy using the same logic as order creation
 * Determines which side is the "stronger" currency to know which way to apply the rate.
 * Heuristic: USDT (or any currency with rate <= 1) is the base; otherwise pick the currency with the smaller rate.
 */
export const calculateAmountSell = (
  amountBuy: number,
  rate: number,
  fromCurrency: string,
  toCurrency: string,
  currencies: Currency[]
): number => {
  if (!Number.isFinite(rate) || rate <= 0) {
    return 0;
  }

  const getCurrencyRate = (code: string) => {
    const currency = currencies.find((c) => c.code === code);
    const candidate =
      currency?.conversionRateBuy ??
      currency?.baseRateBuy ??
      currency?.baseRateSell ??
      currency?.conversionRateSell;
    return typeof candidate === "number" ? candidate : null;
  };

  const fromRate = getCurrencyRate(fromCurrency);
  const toRate = getCurrencyRate(toCurrency);

  const inferredFromIsUSDT = fromRate !== null ? fromRate <= 1 : fromCurrency === "USDT";
  const inferredToIsUSDT = toRate !== null ? toRate <= 1 : toCurrency === "USDT";

  // If both sides look like USDT (rate <= 1), default to multiply
  if (inferredFromIsUSDT && inferredToIsUSDT) {
    return amountBuy * rate;
  }

  let baseIsFrom: boolean | null = null;
  if (inferredFromIsUSDT !== inferredToIsUSDT) {
    // One side is USDT (or behaves like it)
    baseIsFrom = inferredFromIsUSDT;
  } else if (!inferredFromIsUSDT && !inferredToIsUSDT && fromRate !== null && toRate !== null) {
    // Neither is USDT: pick the currency with the smaller rate as the stronger/base currency
    baseIsFrom = fromRate < toRate;
  } else {
    // Default to multiply if we can't determine
    return amountBuy * rate;
  }

  if (baseIsFrom) {
    // Stronger/base currency (fromCurrency) → weaker: multiply by rate
    return amountBuy * rate;
  } else {
    // Weaker → stronger/base currency (toCurrency): divide by rate
    return amountBuy / rate;
  }
};

