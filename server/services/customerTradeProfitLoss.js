import { db } from "../db.js";
import { getDefaultProfitConversion } from "./profitConversion.js";

const TRADE_LEDGER_SOURCES_SQL = "('order', 'order_reversal')";
const POSITION_EPSILON = 0.005;

/**
 * Per-currency trade ledger position (customer sign: credit − debit).
 * @param {number | null} customerId — when set, only that customer
 */
function fetchTradePositions(customerId = null) {
  if (customerId != null) {
    return db
      .prepare(
        `SELECT
           e.currencyCode,
           SUM(CASE WHEN e.type = 'credit' THEN e.amount ELSE -e.amount END) AS balance
         FROM customer_ledger_entries e
         WHERE e.customerId = ?
           AND e.deletedAt IS NULL
           AND e.source IN ${TRADE_LEDGER_SOURCES_SQL}
         GROUP BY e.currencyCode
         ORDER BY e.currencyCode ASC;`,
      )
      .all(customerId);
  }

  return db
    .prepare(
      `SELECT
         e.customerId,
         e.currencyCode,
         SUM(CASE WHEN e.type = 'credit' THEN e.amount ELSE -e.amount END) AS balance
       FROM customer_ledger_entries e
       WHERE e.deletedAt IS NULL
         AND e.source IN ${TRADE_LEDGER_SOURCES_SQL}
       GROUP BY e.customerId, e.currencyCode;`,
    )
    .all();
}

/**
 * Convert trade positions to company P/L in target currency.
 * @param {{ currencyCode: string, balance: number }[]} positions
 */
export function aggregateTradeProfitLoss(positions) {
  const { targetCurrency, convertToTarget } = getDefaultProfitConversion();

  if (!targetCurrency) {
    return {
      targetCurrency: null,
      profitLoss: null,
      hasUnknownRate: false,
      currencyBreakdown: [],
    };
  }

  let converted = 0;
  let hasUnknownRate = false;
  const currencyBreakdown = [];

  for (const row of positions) {
    const balance = Number(row.balance ?? 0);
    currencyBreakdown.push({ currencyCode: row.currencyCode, balance });
    const amount = convertToTarget(balance, row.currencyCode);
    if (amount !== null) {
      converted += amount;
    } else if (Math.abs(balance) >= POSITION_EPSILON) {
      hasUnknownRate = true;
    }
  }

  return {
    targetCurrency,
    profitLoss: -converted,
    hasUnknownRate,
    currencyBreakdown,
  };
}

/** Single customer — same logic as customer list Profit/Loss column. */
export function getCustomerTradeProfitLoss(customerId) {
  const positions = fetchTradePositions(customerId);
  return aggregateTradeProfitLoss(positions);
}

/** All customers with trade activity — for customer list converted-balances API. */
export function getAllCustomersTradeProfitLoss() {
  const rows = fetchTradePositions(null);
  const { targetCurrency } = getDefaultProfitConversion();

  if (!targetCurrency) {
    return { targetCurrency: null, result: [] };
  }

  const byCustomer = {};
  for (const row of rows) {
    if (!byCustomer[row.customerId]) {
      byCustomer[row.customerId] = [];
    }
    byCustomer[row.customerId].push({
      currencyCode: row.currencyCode,
      balance: Number(row.balance ?? 0),
    });
  }

  const result = Object.entries(byCustomer).map(([customerId, positions]) => ({
    customerId: parseInt(customerId, 10),
    ...aggregateTradeProfitLoss(positions),
  }));

  return { targetCurrency, result };
}
