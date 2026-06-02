import { db } from "../db.js";
import { getUserIdFromHeader } from "../utils/auth.js";
import { scheduleCacheSync } from "../services/cacheSyncBroadcast.js";
import { convertCurrency } from "../utils/currencyConversion.js";
import {
  buildAccountStatementRows,
  rebuildCustomerLedgerFromOrders,
} from "../services/customerLedgerOrders.js";

// ─────────────────────────────────────────────
// CONVERTED BALANCE for all customers
// Uses the default profit calculation's exchange rates
// to convert each customer's per-currency balance
// into the target currency.
// ─────────────────────────────────────────────
export const getAllCustomersConvertedBalances = (_req, res, next) => {
  try {
    // Find default profit calculation
    const defaultCalc = db
      .prepare("SELECT * FROM profit_calculations WHERE isDefault = 1 LIMIT 1;")
      .get();

    if (!defaultCalc) {
      // No default calc — return raw per-currency balances only
      const rows = db
        .prepare(
          `SELECT
             e.customerId,
             e.currencyCode,
             SUM(CASE WHEN e.type = 'credit' THEN e.amount ELSE -e.amount END) AS balance
           FROM customer_ledger_entries e
           WHERE e.deletedAt IS NULL
           GROUP BY e.customerId, e.currencyCode;`
        )
        .all();
      return res.json({ targetCurrency: null, rates: [], balances: rows });
    }

    // Get exchange rates for this calculation
    const rates = db
      .prepare(
        "SELECT fromCurrencyCode, toCurrencyCode, rate FROM profit_exchange_rates WHERE profitCalculationId = ?;"
      )
      .all(defaultCalc.id);

    // Currency rows for strength logic (same as Profit Calculation / convertCurrency)
    const currencies = db.prepare("SELECT * FROM currencies ORDER BY code ASC;").all();

    // Get per-currency balances for every customer
    const rows = db
      .prepare(
        `SELECT
           e.customerId,
           e.currencyCode,
           SUM(CASE WHEN e.type = 'credit' THEN e.amount ELSE -e.amount END) AS balance
         FROM customer_ledger_entries e
         WHERE e.deletedAt IS NULL
         GROUP BY e.customerId, e.currencyCode;`
      )
      .all();

    const targetCurrency = defaultCalc.targetCurrencyCode;

    // Direct rates: fromCurrency → targetCurrency (same convention as Profit page inputs)
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

    // Aggregate per customer
    const customerTotals = {};
    const customerRawBalances = {}; // keep per-currency detail too

    for (const row of rows) {
      if (!customerTotals[row.customerId]) {
        customerTotals[row.customerId] = { converted: 0, hasUnknownRate: false };
        customerRawBalances[row.customerId] = [];
      }

      customerRawBalances[row.customerId].push({
        currencyCode: row.currencyCode,
        balance: row.balance,
      });

      const converted = convertToTarget(row.balance, row.currencyCode);
      if (converted !== null) {
        customerTotals[row.customerId].converted += converted;
      } else if (row.balance !== 0) {
        customerTotals[row.customerId].hasUnknownRate = true;
      }
    }

    // Build response array (one entry per customer that has any ledger)
    const result = Object.entries(customerTotals).map(([customerId, data]) => ({
      customerId: parseInt(customerId, 10),
      convertedBalance: data.converted,
      hasUnknownRate: data.hasUnknownRate,
      currencyBreakdown: customerRawBalances[customerId],
    }));

    res.json({
      targetCurrency,
      result,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// LIST entries for a customer (all or filtered)
// ─────────────────────────────────────────────
export const listLedgerEntries = (req, res, next) => {
  try {
    const { id: customerId } = req.params;
    const { currencyCode, dateFrom, dateTo, showDeleted } = req.query;

    const conditions = ["e.customerId = @customerId"];
    const params = { customerId: parseInt(customerId, 10) };

    if (showDeleted !== "true") {
      conditions.push("e.deletedAt IS NULL");
    }
    if (currencyCode) {
      conditions.push("e.currencyCode = @currencyCode");
      params.currencyCode = currencyCode;
    }
    if (dateFrom) {
      conditions.push("DATE(COALESCE(e.entryDate, e.createdAt)) >= DATE(@dateFrom)");
      params.dateFrom = dateFrom;
    }
    if (dateTo) {
      conditions.push("DATE(COALESCE(e.entryDate, e.createdAt)) <= DATE(@dateTo)");
      params.dateTo = dateTo;
    }

    const where = conditions.join(" AND ");

    const rows = db
      .prepare(
        `SELECT
           e.*,
           c.name  AS customerName,
           u1.name AS createdByName,
           u2.name AS updatedByName,
           u3.name AS deletedByName
         FROM customer_ledger_entries e
         LEFT JOIN customers c  ON c.id  = e.customerId
         LEFT JOIN users     u1 ON u1.id = e.createdBy
         LEFT JOIN users     u2 ON u2.id = e.updatedBy
         LEFT JOIN users     u3 ON u3.id = e.deletedBy
         WHERE ${where}
         ORDER BY COALESCE(e.entryDate, e.createdAt) DESC, e.id DESC;`
      )
      .all(params);

    res.json(rows);
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// BALANCE SUMMARY for a customer (per currency)
// ─────────────────────────────────────────────
export const getLedgerSummary = (req, res, next) => {
  try {
    const { id: customerId } = req.params;

    const rows = db
      .prepare(
        `SELECT
           e.currencyCode,
           SUM(CASE WHEN e.type = 'credit' THEN e.amount ELSE 0 END) AS totalCredit,
           SUM(CASE WHEN e.type = 'debit'  THEN e.amount ELSE 0 END) AS totalDebit,
           SUM(CASE WHEN e.type = 'credit' THEN e.amount ELSE -e.amount END) AS balance
         FROM customer_ledger_entries e
         WHERE e.customerId = ? AND e.deletedAt IS NULL
         GROUP BY e.currencyCode
         ORDER BY e.currencyCode ASC;`
      )
      .all(parseInt(customerId, 10));

    res.json(rows);
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// CREATE a ledger entry
// ─────────────────────────────────────────────
export const createLedgerEntry = (req, res, next) => {
  try {
    const { id: customerId } = req.params;
    const { type, amount, currencyCode, description, entryDate } = req.body;
    const createdBy = getUserIdFromHeader(req);
    const now = new Date().toISOString();

    if (!type || !["credit", "debit"].includes(type)) {
      return res.status(400).json({ message: "Type must be 'credit' or 'debit'" });
    }

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ message: "Amount must be a positive number" });
    }

    if (!currencyCode) {
      return res.status(400).json({ message: "Currency is required" });
    }

    // Validate customer
    const customer = db.prepare("SELECT id FROM customers WHERE id = ?;").get(parseInt(customerId, 10));
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Validate currency
    const currency = db.prepare("SELECT code FROM currencies WHERE code = ?;").get(currencyCode);
    if (!currency) {
      return res.status(404).json({ message: "Currency not found" });
    }

    const finalEntryDate = entryDate ? new Date(entryDate).toISOString() : now;

    const result = db
      .prepare(
        `INSERT INTO customer_ledger_entries
           (customerId, currencyCode, type, amount, description, createdBy, createdAt, entryDate, source)
         VALUES (@customerId, @currencyCode, @type, @amount, @description, @createdBy, @createdAt, @entryDate, 'manual');`
      )
      .run({
        customerId: parseInt(customerId, 10),
        currencyCode,
        type,
        amount: parsedAmount,
        description: description || null,
        createdBy: createdBy || null,
        createdAt: now,
        entryDate: finalEntryDate,
      });

    const entryId = result.lastInsertRowid;

    // Log initial state as first change record
    db.prepare(
      `INSERT INTO customer_ledger_entry_changes
         (entryId, changedBy, changedAt, type, amount, description, currencyCode)
       VALUES (?, ?, ?, ?, ?, ?, ?);`
    ).run(entryId, createdBy || null, now, type, parsedAmount, description || null, currencyCode);

    const entry = db
      .prepare(
        `SELECT e.*, c.name AS customerName, u.name AS createdByName
         FROM customer_ledger_entries e
         LEFT JOIN customers c ON c.id = e.customerId
         LEFT JOIN users u ON u.id = e.createdBy
         WHERE e.id = ?;`
      )
      .get(entryId);

    res.status(201).json(entry);
    scheduleCacheSync({
      scopes: ["customerLedger", "customers"],
      customerId: parseInt(customerId, 10),
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// UPDATE a ledger entry
// ─────────────────────────────────────────────
export const updateLedgerEntry = (req, res, next) => {
  try {
    const { id: customerId, entryId } = req.params;
    const { type, amount, currencyCode, description, entryDate } = req.body;
    const updatedBy = getUserIdFromHeader(req);
    const now = new Date().toISOString();

    const existing = db
      .prepare(
        "SELECT * FROM customer_ledger_entries WHERE id = ? AND customerId = ? AND deletedAt IS NULL;"
      )
      .get(parseInt(entryId, 10), parseInt(customerId, 10));

    if (!existing) {
      return res.status(404).json({ message: "Entry not found" });
    }

    if (type && !["credit", "debit"].includes(type)) {
      return res.status(400).json({ message: "Type must be 'credit' or 'debit'" });
    }

    const parsedAmount = amount !== undefined ? parseFloat(amount) : existing.amount;
    if (parsedAmount <= 0) {
      return res.status(400).json({ message: "Amount must be a positive number" });
    }

    // Snapshot old values before overwriting
    db.prepare(
      `INSERT INTO customer_ledger_entry_changes
         (entryId, changedBy, changedAt, type, amount, description, currencyCode)
       VALUES (?, ?, ?, ?, ?, ?, ?);`
    ).run(
      existing.id,
      updatedBy || null,
      now,
      existing.type,
      existing.amount,
      existing.description,
      existing.currencyCode
    );

    const finalType = type || existing.type;
    const finalCurrency = currencyCode || existing.currencyCode;
    const finalDescription = description !== undefined ? description : existing.description;
    const finalEntryDate = entryDate ? new Date(entryDate).toISOString() : existing.entryDate;

    db.prepare(
      `UPDATE customer_ledger_entries
       SET type=@type, amount=@amount, currencyCode=@currencyCode,
           description=@description, entryDate=@entryDate,
           updatedBy=@updatedBy, updatedAt=@updatedAt
       WHERE id=@id;`
    ).run({
      type: finalType,
      amount: parsedAmount,
      currencyCode: finalCurrency,
      description: finalDescription || null,
      entryDate: finalEntryDate,
      updatedBy: updatedBy || null,
      updatedAt: now,
      id: existing.id,
    });

    const updated = db
      .prepare(
        `SELECT e.*, c.name AS customerName, u1.name AS createdByName, u2.name AS updatedByName
         FROM customer_ledger_entries e
         LEFT JOIN customers c  ON c.id  = e.customerId
         LEFT JOIN users     u1 ON u1.id = e.createdBy
         LEFT JOIN users     u2 ON u2.id = e.updatedBy
         WHERE e.id = ?;`
      )
      .get(existing.id);

    res.json(updated);
    scheduleCacheSync({
      scopes: ["customerLedger", "customers"],
      customerId: parseInt(customerId, 10),
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// SOFT DELETE a ledger entry
// ─────────────────────────────────────────────
export const deleteLedgerEntry = (req, res, next) => {
  try {
    const { id: customerId, entryId } = req.params;
    const deletedBy = getUserIdFromHeader(req);
    const now = new Date().toISOString();

    const existing = db
      .prepare(
        "SELECT * FROM customer_ledger_entries WHERE id = ? AND customerId = ? AND deletedAt IS NULL;"
      )
      .get(parseInt(entryId, 10), parseInt(customerId, 10));

    if (!existing) {
      return res.status(404).json({ message: "Entry not found" });
    }

    db.prepare(
      "UPDATE customer_ledger_entries SET deletedBy=?, deletedAt=? WHERE id=?;"
    ).run(deletedBy || null, now, existing.id);

    res.status(204).send();
    scheduleCacheSync({
      scopes: ["customerLedger", "customers"],
      customerId: parseInt(customerId, 10),
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// GET change history for a single entry
// ─────────────────────────────────────────────
export const getAccountStatement = (req, res, next) => {
  try {
    const { id: customerId } = req.params;
    const includeReversals = req.query.includeReversals !== "false";
    const rows = buildAccountStatementRows(parseInt(customerId, 10), { includeReversals });
    res.json(rows);
  } catch (error) {
    next(error);
  }
};

export const rebuildLedgerFromOrders = (req, res, next) => {
  try {
    const { id: customerId } = req.params;
    const createdBy = getUserIdFromHeader(req);
    const customer = db.prepare("SELECT id FROM customers WHERE id = ?;").get(parseInt(customerId, 10));
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    const result = rebuildCustomerLedgerFromOrders(parseInt(customerId, 10), createdBy);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getLedgerEntryChanges = (req, res, next) => {
  try {
    const { entryId } = req.params;

    const rows = db
      .prepare(
        `SELECT ch.*, u.name AS changedByName
         FROM customer_ledger_entry_changes ch
         LEFT JOIN users u ON u.id = ch.changedBy
         WHERE ch.entryId = ?
         ORDER BY ch.changedAt ASC;`
      )
      .all(parseInt(entryId, 10));

    res.json(rows);
  } catch (error) {
    next(error);
  }
};
