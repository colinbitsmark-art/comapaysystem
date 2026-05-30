import * as XLSX from "xlsx";
import { formatDate } from "../format";
import type { Account, AccountTransaction } from "../../types";

export function sanitizeSheetName(name: string, used: Set<string>): string {
  let base = name.replace(/[\\/?*[\]]/g, "_").slice(0, 31);
  let final = base || "Sheet";
  let n = 2;
  while (used.has(final)) {
    const suffix = ` (${n})`;
    final = base.slice(0, 31 - suffix.length) + suffix;
    n++;
  }
  used.add(final);
  return final;
}

function transactionToRow(account: Account, tx: AccountTransaction) {
  return {
    Date: formatDate(tx.createdAt),
    Type: tx.type === "add" ? "Add" : "Withdraw",
    Amount: tx.type === "add" ? tx.amount : -tx.amount,
    Currency: account.currencyCode,
    Description: tx.description || "-",
  };
}

export function exportAccountTransactionsToExcel(
  account: Account,
  transactions: AccountTransaction[]
) {
  const wb = XLSX.utils.book_new();
  const usedSheetNames = new Set<string>();
  const rows = transactions.map((tx) => transactionToRow(account, tx));
  const ws = XLSX.utils.json_to_sheet(
    rows.length
      ? rows
      : [{ Date: "", Type: "", Amount: "", Currency: "", Description: "No transactions" }]
  );
  XLSX.utils.book_append_sheet(wb, ws, sanitizeSheetName(account.name, usedSheetNames));
  const date = new Date().toISOString().split("T")[0];
  XLSX.writeFile(wb, `transactions_${account.name.replace(/[\\/?*[\]]/g, "_")}_${date}.xlsx`);
}

export function exportMultipleAccountTransactionsToExcel(
  accountsWithTransactions: { account: Account; transactions: AccountTransaction[] }[]
) {
  const wb = XLSX.utils.book_new();
  const usedSheetNames = new Set<string>();

  for (const { account, transactions } of accountsWithTransactions) {
    const rows = transactions.map((tx) => transactionToRow(account, tx));
    const ws = XLSX.utils.json_to_sheet(
      rows.length
        ? rows
        : [{ Date: "", Type: "", Amount: "", Currency: "", Description: "No transactions" }]
    );
    XLSX.utils.book_append_sheet(wb, ws, sanitizeSheetName(account.name, usedSheetNames));
  }

  const date = new Date().toISOString().split("T")[0];
  XLSX.writeFile(wb, `transaction_logs_${date}.xlsx`);
}
