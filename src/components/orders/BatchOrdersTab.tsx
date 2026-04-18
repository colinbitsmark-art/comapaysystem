import React, { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import type { Account, Currency } from "../../types";
import { useAddOrderMutation } from "../../services/api";

type Row = {
  id: string;
  customerName: string;
  fromCurrency: string;
  toCurrency: string;
  rate: string;
  amountBuy: string;
  amountSell: string;
};

function emptyRow(): Row {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    customerName: "",
    fromCurrency: "",
    toCurrency: "",
    rate: "",
    amountBuy: "",
    amountSell: "",
  };
}

type Props = {
  currencies: Currency[];
  accounts: Account[];
  onDone: () => void;
  setAlertModal: (m: { isOpen: boolean; message: string; type?: "error" | "success" }) => void;
};

export function BatchOrdersTab({ currencies, accounts, onDone, setAlertModal }: Props) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<Row[]>([emptyRow(), emptyRow(), emptyRow()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addOrder] = useAddOrderMutation();

  const activeCurrencies = currencies.filter((c) => c.active);

  const submitAll = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    let ok = 0;
    try {
      for (const row of rows) {
        if (!row.customerName.trim() || !row.fromCurrency || !row.toCurrency) continue;
        const buy = Number(row.amountBuy);
        const sell = Number(row.amountSell);
        const r = Number(row.rate);
        if (!row.rate || Number.isNaN(r) || r <= 0) continue;
        if (Number.isNaN(buy) || Number.isNaN(sell)) continue;
        const firstBuyAcc = accounts.find((a) => a.currencyCode === row.fromCurrency)?.id;
        const firstSellAcc = accounts.find((a) => a.currencyCode === row.toCurrency)?.id;
        await addOrder({
          customerName: row.customerName.trim(),
          fromCurrency: row.fromCurrency,
          toCurrency: row.toCurrency,
          amountBuy: buy,
          amountSell: sell,
          rate: r,
          status: "saved",
          buyAccountId: firstBuyAcc,
          sellAccountId: firstSellAcc,
        } as any).unwrap();
        ok += 1;
      }
      setAlertModal({
        isOpen: true,
        message: t("orders.batchCreated", { count: ok }) || `Created ${ok} order(s).`,
        type: "success",
      });
      setRows([emptyRow(), emptyRow(), emptyRow()]);
      onDone();
    } catch (err: any) {
      setAlertModal({
        isOpen: true,
        message: err?.data?.message || err?.message || t("orders.batchFailed"),
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="mb-4 text-sm text-slate-600">{t("orders.batchTabHint")}</p>
      <form onSubmit={submitAll} className="space-y-4">
        {rows.map((row, idx) => (
          <div
            key={row.id}
            className="flex flex-wrap items-end gap-2 border-b border-slate-100 pb-4 last:border-0"
          >
            <span className="w-8 text-xs font-semibold text-slate-400">#{idx + 1}</span>
            <input
              type="text"
              placeholder={t("orders.customerName")}
              className="min-w-[120px] flex-1 rounded border border-slate-200 px-2 py-1.5 text-sm"
              value={row.customerName}
              onChange={(e) =>
                setRows((prev) =>
                  prev.map((r) => (r.id === row.id ? { ...r, customerName: e.target.value } : r)),
                )
              }
            />
            <select
              className="w-24 rounded border border-slate-200 px-1 py-1.5 text-sm"
              value={row.fromCurrency}
              onChange={(e) => {
                const v = e.target.value;
                setRows((prev) =>
                  prev.map((r) =>
                    r.id === row.id
                      ? {
                          ...r,
                          fromCurrency: v,
                          toCurrency: v && v === r.toCurrency ? "" : r.toCurrency,
                        }
                      : r,
                  ),
                );
              }}
            >
              <option value="">{t("orders.from")}</option>
              {activeCurrencies
                .filter((c) => c.code !== row.toCurrency)
                .map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
            </select>
            <select
              className="w-24 rounded border border-slate-200 px-1 py-1.5 text-sm"
              value={row.toCurrency}
              onChange={(e) => {
                const v = e.target.value;
                setRows((prev) =>
                  prev.map((r) =>
                    r.id === row.id
                      ? {
                          ...r,
                          toCurrency: v,
                          fromCurrency: v && v === r.fromCurrency ? "" : r.fromCurrency,
                        }
                      : r,
                  ),
                );
              }}
            >
              <option value="">{t("orders.to")}</option>
              {activeCurrencies
                .filter((c) => c.code !== row.fromCurrency)
                .map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder={t("orders.exchangeRate")}
              className="w-24 rounded border border-slate-200 px-2 py-1.5 text-sm"
              value={row.rate}
              onChange={(e) =>
                setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, rate: e.target.value } : r)))
              }
            />
            <input
              type="number"
              placeholder={t("orders.amountBuy")}
              className="w-24 rounded border border-slate-200 px-2 py-1.5 text-sm"
              value={row.amountBuy}
              onChange={(e) =>
                setRows((prev) =>
                  prev.map((r) => (r.id === row.id ? { ...r, amountBuy: e.target.value } : r)),
                )
              }
            />
            <input
              type="number"
              placeholder={t("orders.amountSell")}
              className="w-24 rounded border border-slate-200 px-2 py-1.5 text-sm"
              value={row.amountSell}
              onChange={(e) =>
                setRows((prev) =>
                  prev.map((r) => (r.id === row.id ? { ...r, amountSell: e.target.value } : r)),
                )
              }
            />
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            onClick={() => setRows((r) => [...r, emptyRow()])}
          >
            {t("orders.addBatchRow")}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? t("common.saving") : t("orders.createAllBatch")}
          </button>
        </div>
      </form>
    </div>
  );
}
