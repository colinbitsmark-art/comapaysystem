import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import * as XLSX from "xlsx";
import SectionCard from "../common/SectionCard";
import ConfirmModal from "../common/ConfirmModal";
import {
  useGetCustomerAccountStatementQuery,
  useGetCustomerLedgerSummaryQuery,
  useRebuildCustomerLedgerFromOrdersMutation,
} from "../../services/api";
import type { CustomerAccountStatementRow, CustomerLedgerSummary } from "../../types";

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDisplayDate = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

type ColumnKey =
  | "orderDate"
  | "description"
  | "currencyPair"
  | "exchangeRate"
  | "credit"
  | "debit"
  | "serviceCharges"
  | "remarks"
  | "createdBy";

const ALL_COLUMNS: ColumnKey[] = [
  "orderDate",
  "description",
  "currencyPair",
  "exchangeRate",
  "credit",
  "debit",
  "serviceCharges",
  "remarks",
  "createdBy",
];

interface Props {
  customerId: number;
  customerName?: string;
  canWrite: boolean;
  onAlert: (msg: string, type?: "error" | "success") => void;
}

export function CustomerAccountStatementPanel({
  customerId,
  customerName,
  canWrite,
  onAlert,
}: Props) {
  const { t } = useTranslation();
  const [includeReversalsView, setIncludeReversalsView] = useState(true);
  const { data: rows = [], isLoading, refetch } = useGetCustomerAccountStatementQuery({
    customerId,
    includeReversals: includeReversalsView,
  });
  const { data: summary = [] } = useGetCustomerLedgerSummaryQuery(customerId);
  const [rebuild, { isLoading: rebuilding }] = useRebuildCustomerLedgerFromOrdersMutation();

  const [exportOpen, setExportOpen] = useState(false);
  const [exportIncludeReversals, setExportIncludeReversals] = useState(false);
  const [exportColumns, setExportColumns] = useState<Set<ColumnKey>>(() => new Set(ALL_COLUMNS));
  const [rebuildConfirmOpen, setRebuildConfirmOpen] = useState(false);

  const columnLabels: Record<ColumnKey, string> = useMemo(
    () => ({
      orderDate: t("customerLedger.date"),
      description: t("customerLedger.description"),
      currencyPair: t("customerLedger.currencyPair"),
      exchangeRate: t("customerLedger.exchangeRate"),
      credit: t("customerLedger.credit"),
      debit: t("customerLedger.debit"),
      serviceCharges: t("customerLedger.serviceCharges"),
      remarks: t("customerLedger.remarks"),
      createdBy: t("customerLedger.createdBy"),
    }),
    [t],
  );

  const formatCredit = (row: CustomerAccountStatementRow) => {
    if (row.creditAmount == null || !row.creditCurrency) return "";
    const sign = row.creditAmount < 0 ? "-" : "";
    return `${sign}${fmt(Math.abs(row.creditAmount))} ${row.creditCurrency}`;
  };

  const formatDebit = (row: CustomerAccountStatementRow) => {
    if (row.debitAmount == null || !row.debitCurrency) return "";
    if (row.debitAmount < 0) {
      return `${fmt(Math.abs(row.debitAmount))} ${row.debitCurrency}`;
    }
    return `-${fmt(row.debitAmount)} ${row.debitCurrency}`;
  };

  const handleRebuild = async () => {
    try {
      const result = await rebuild(customerId).unwrap();
      await refetch();
      onAlert(
        t("customerLedger.rebuildSuccess", { count: result.ordersProcessed }) as string,
        "success",
      );
    } catch {
      onAlert(t("customerLedger.rebuildFailed"), "error");
    }
    setRebuildConfirmOpen(false);
  };

  const runExport = async () => {
    let exportRows = rows;
    if (!exportIncludeReversals) {
      const res = await fetch(
        `/api/customers/${customerId}/ledger/account-statement?includeReversals=false`,
        { credentials: "include" },
      );
      if (!res.ok) {
        onAlert(t("customerLedger.exportStatement") + " failed", "error");
        return;
      }
      exportRows = await res.json();
    }

    const sheetRows = exportRows.map((row: CustomerAccountStatementRow) => {
      const out: Record<string, string | number> = {};
      if (exportColumns.has("orderDate")) out[columnLabels.orderDate] = formatDisplayDate(row.orderDate);
      if (exportColumns.has("description")) out[columnLabels.description] = row.description;
      if (exportColumns.has("currencyPair")) out[columnLabels.currencyPair] = row.currencyPair;
      if (exportColumns.has("exchangeRate")) {
        out[columnLabels.exchangeRate] = row.exchangeRate != null ? Number(row.exchangeRate) : "";
      }
      if (exportColumns.has("credit")) out[columnLabels.credit] = formatCredit(row);
      if (exportColumns.has("debit")) out[columnLabels.debit] = formatDebit(row);
      if (exportColumns.has("serviceCharges")) out[columnLabels.serviceCharges] = row.serviceCharges || "";
      if (exportColumns.has("remarks")) out[columnLabels.remarks] = row.remarks || "";
      if (exportColumns.has("createdBy")) out[columnLabels.createdBy] = row.createdByName || "";
      return out;
    });

    const ws = XLSX.utils.json_to_sheet(sheetRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t("customerLedger.accountStatement"));
    const balanceRows = (summary as CustomerLedgerSummary[]).map((s) => ({
      Currency: s.currencyCode,
      Balance: s.balance,
    }));
    if (balanceRows.length > 0) {
      const wsBal = XLSX.utils.json_to_sheet(balanceRows);
      XLSX.utils.book_append_sheet(wb, wsBal, t("customerLedger.balancesSummary"));
    }
    const fileName = `account_statement_${customerName ?? customerId}_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    setExportOpen(false);
  };

  const toggleColumn = (key: ColumnKey) => {
    setExportColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size <= 1) return prev;
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <>
      <SectionCard
        title={t("customerLedger.accountStatement")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={includeReversalsView}
                onChange={(e) => setIncludeReversalsView(e.target.checked)}
                className="rounded border-slate-300"
              />
              {t("customerLedger.includeReversals")}
            </label>
            <button
              type="button"
              onClick={() => {
                setExportIncludeReversals(false);
                setExportColumns(new Set(ALL_COLUMNS));
                setExportOpen(true);
              }}
              className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {t("customerLedger.exportAccountStatement")}
            </button>
            {canWrite && (
              <button
                type="button"
                disabled={rebuilding}
                onClick={() => setRebuildConfirmOpen(true)}
                className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
              >
                {rebuilding ? t("common.loading") : t("customerLedger.rebuildFromOrders")}
              </button>
            )}
          </div>
        }
      >
        {isLoading ? (
          <div className="py-8 text-center text-sm text-slate-400">{t("common.loading")}</div>
        ) : rows.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">
            {t("customerLedger.noAccountStatement")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="py-2 pr-3 whitespace-nowrap">{t("customerLedger.date")}</th>
                  <th className="py-2 pr-3">{t("customerLedger.description")}</th>
                  <th className="py-2 pr-3">{t("customerLedger.currencyPair")}</th>
                  <th className="py-2 pr-3 text-right">{t("customerLedger.exchangeRate")}</th>
                  <th className="py-2 pr-3 text-right text-emerald-700">{t("customerLedger.credit")}</th>
                  <th className="py-2 pr-3 text-right text-rose-700">{t("customerLedger.debit")}</th>
                  <th className="py-2 pr-3">{t("customerLedger.serviceCharges")}</th>
                  <th className="py-2 pr-3">{t("customerLedger.remarks")}</th>
                  <th className="py-2 pr-3">{t("customerLedger.createdBy")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={`${row.orderId}-${row.ledgerBatch}-${row.source}`}
                    className={`border-b border-slate-100 hover:bg-slate-50 ${
                      row.isReversal ? "bg-slate-50/80 text-slate-600" : ""
                    }`}
                  >
                    <td className="py-2 pr-3 whitespace-nowrap text-slate-500">
                      {formatDisplayDate(row.orderDate)}
                    </td>
                    <td className="py-2 pr-3 text-slate-800">{row.description}</td>
                    <td className="py-2 pr-3 font-medium">{row.currencyPair}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {row.exchangeRate != null ? fmt(Number(row.exchangeRate)) : "—"}
                    </td>
                    <td className="py-2 pr-3 text-right text-emerald-700 font-medium tabular-nums">
                      {formatCredit(row) || "—"}
                    </td>
                    <td className="py-2 pr-3 text-right text-rose-700 font-medium tabular-nums">
                      {formatDebit(row) || "—"}
                    </td>
                    <td className="py-2 pr-3 text-slate-600">{row.serviceCharges || "—"}</td>
                    <td className="py-2 pr-3 text-slate-600 max-w-[200px] truncate" title={row.remarks || ""}>
                      {row.remarks || "—"}
                    </td>
                    <td className="py-2 pr-3 text-slate-500">{row.createdByName || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {exportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {t("customerLedger.exportAccountStatement")}
            </h3>
            <p className="text-xs font-medium text-slate-500 mb-2">{t("customerLedger.selectColumns")}</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {ALL_COLUMNS.map((key) => (
                <label key={key} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={exportColumns.has(key)}
                    onChange={() => toggleColumn(key)}
                    className="rounded border-slate-300"
                  />
                  {columnLabels[key]}
                </label>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700 mb-6">
              <input
                type="checkbox"
                checked={exportIncludeReversals}
                onChange={(e) => setExportIncludeReversals(e.target.checked)}
                className="rounded border-slate-300"
              />
              {t("customerLedger.includeReversals")}
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setExportOpen(false)}
                className="flex-1 rounded-lg border border-slate-300 py-2 text-sm font-semibold text-slate-700"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={runExport}
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                {t("customerLedger.exportStatement")}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={rebuildConfirmOpen}
        message={t("customerLedger.rebuildConfirm")}
        onConfirm={handleRebuild}
        onCancel={() => setRebuildConfirmOpen(false)}
        confirmText={t("customerLedger.rebuildFromOrders")}
        cancelText={t("common.cancel")}
        type="warning"
      />
    </>
  );
}
