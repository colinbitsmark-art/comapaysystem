import { db } from "../db.js";
import { convertCurrency } from "../utils/currencyConversion.js";

/** Default profit calculation rates for converting amounts to target currency. */
export function getDefaultProfitConversion() {
  const defaultCalc = db
    .prepare("SELECT * FROM profit_calculations WHERE isDefault = 1 LIMIT 1;")
    .get();

  if (!defaultCalc) {
    return { targetCurrency: null, convertToTarget: () => null };
  }

  const rates = db
    .prepare(
      "SELECT fromCurrencyCode, toCurrencyCode, rate FROM profit_exchange_rates WHERE profitCalculationId = ?;",
    )
    .all(defaultCalc.id);

  const currencies = db.prepare("SELECT * FROM currencies ORDER BY code ASC;").all();
  const targetCurrency = defaultCalc.targetCurrencyCode;
  const rateToTarget = {};
  for (const r of rates) {
    if (r.toCurrencyCode === targetCurrency) {
      rateToTarget[r.fromCurrencyCode] = r.rate;
    }
  }

  const convertToTarget = (amount, fromCode) => {
    if (fromCode === targetCurrency) return amount;
    const rate = rateToTarget[fromCode];
    if (rate === undefined || rate === null) return null;
    return convertCurrency(amount, rate, fromCode, targetCurrency, currencies);
  };

  return { targetCurrency, convertToTarget };
}
