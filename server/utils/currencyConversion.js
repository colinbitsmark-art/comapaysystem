/**
 * Mirrors src/utils/orders/orderCalculations.ts convertCurrency.
 * Uses currency table "strength" (conversionRateBuy / base rates) to decide
 * multiply vs divide — same behavior as Profit Calculation.
 */

const getCurrencyStrengthRate = (code, currencies) => {
  const currency = currencies.find((c) => c.code === code);
  const candidate =
    currency?.conversionRateBuy ??
    currency?.baseRateBuy ??
    currency?.baseRateSell ??
    currency?.conversionRateSell;
  return typeof candidate === "number" ? candidate : null;
};

/**
 * @param {number} amount
 * @param {number} rate
 * @param {string} fromCurrency
 * @param {string} toCurrency
 * @param {Array<{ code: string; conversionRateBuy?: number; baseRateBuy?: number; baseRateSell?: number; conversionRateSell?: number }>} currencies
 */
export const convertCurrency = (amount, rate, fromCurrency, toCurrency, currencies) => {
  if (!Number.isFinite(rate) || rate <= 0) return amount;
  if (fromCurrency === toCurrency) return amount;

  const fromRate = getCurrencyStrengthRate(fromCurrency, currencies);
  const toRate = getCurrencyStrengthRate(toCurrency, currencies);

  const fromIsBase = fromRate !== null ? fromRate <= 1 : fromCurrency === "USDT";
  const toIsBase = toRate !== null ? toRate <= 1 : toCurrency === "USDT";

  if (fromIsBase && toIsBase) {
    return amount * rate;
  }

  let baseIsFrom = null;
  if (fromIsBase !== toIsBase) {
    baseIsFrom = fromIsBase;
  } else if (!fromIsBase && !toIsBase && fromRate !== null && toRate !== null) {
    baseIsFrom = fromRate < toRate;
  } else {
    return amount * rate;
  }

  return baseIsFrom ? amount * rate : amount / rate;
};
