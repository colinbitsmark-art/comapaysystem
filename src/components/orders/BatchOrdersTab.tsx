import React, { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import type { Account, Currency } from "../../types";
import {
  useAddOrderMutation,
  useAddPaymentMutation,
  useAddReceiptMutation,
  useConfirmPaymentMutation,
  useConfirmReceiptMutation,
  useUpdateOrderMutation,
  useUpdateOrderStatusMutation,
} from "../../services/api";
import { ORDER_RECEIPT_PAYMENT_TOLERANCE } from "../../utils/orders/orderAmountTolerance";
import FileUploadModal from "../common/FileUploadModal";

type Row = {
  id: string;
  customerName: string;
  fromCurrency: string;
  toCurrency: string;
  rate: string;
  amountBuy: string;
  amountSell: string;
  receiptAmount: string;
  paymentAmount: string;
  buyAccountId: string;
  sellAccountId: string;
  receiptFile: File | null;
  paymentFile: File | null;
  showExtras: boolean;
  serviceChargeAmount: string;
  serviceChargeAccountId: string;
  remarks: string;
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
    receiptAmount: "",
    paymentAmount: "",
    buyAccountId: "",
    sellAccountId: "",
    receiptFile: null,
    paymentFile: null,
    showExtras: false,
    serviceChargeAmount: "",
    serviceChargeAccountId: "",
    remarks: "",
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
  const [uploadModal, setUploadModal] = useState<{ rowId: string; kind: "receipt" | "payment" } | null>(null);
  const [addOrder] = useAddOrderMutation();
  const [updateOrder] = useUpdateOrderMutation();
  const [addReceipt] = useAddReceiptMutation();
  const [addPayment] = useAddPaymentMutation();
  const [confirmReceipt] = useConfirmReceiptMutation();
  const [confirmPayment] = useConfirmPaymentMutation();
  const [updateOrderStatus] = useUpdateOrderStatusMutation();

  const activeCurrencies = currencies.filter((c) => c.active);
  const numberToString = (n: number) => (Number.isFinite(n) ? String(n) : "");

  const setRow = (rowId: string, updater: (row: Row) => Row) => {
    setRows((prev) => prev.map((r) => (r.id === rowId ? updater(r) : r)));
  };

  /**
   * Returns true when `from` is the base (stronger) currency, false when `to` is,
   * null when currencies are unknown. Mirrors useUnifiedOrderModal's getBaseCurrency.
   */
  const getBaseCurrency = (from: string, to: string): boolean | null => {
    const fromC = currencies.find((c) => c.code === from);
    const toC = currencies.find((c) => c.code === to);
    if (!fromC || !toC) return null;
    const fromRate =
      fromC.conversionRateBuy ?? fromC.baseRateBuy ?? fromC.baseRateSell ?? fromC.conversionRateSell;
    const toRate =
      toC.conversionRateBuy ?? toC.baseRateBuy ?? toC.baseRateSell ?? toC.conversionRateSell;
    const fromIsBase = typeof fromRate === "number" ? fromRate <= 1 : from === "USDT";
    const toIsBase = typeof toRate === "number" ? toRate <= 1 : to === "USDT";
    if (fromIsBase !== toIsBase) return fromIsBase;
    if (typeof fromRate === "number" && typeof toRate === "number" && fromRate !== toRate) {
      return fromRate < toRate;
    }
    return true;
  };

  /** baseIsFrom=true → sell = buy×rate; false → sell = buy/rate */
  const computeSellFromBuy = (buy: number, rate: number, from: string, to: string): number => {
    const baseIsFrom = getBaseCurrency(from, to);
    return baseIsFrom === false ? buy / rate : buy * rate;
  };

  /** baseIsFrom=true → buy = sell/rate; false → buy = sell×rate */
  const computeBuyFromSell = (sell: number, rate: number, from: string, to: string): number => {
    const baseIsFrom = getBaseCurrency(from, to);
    return baseIsFrom === false ? sell * rate : sell / rate;
  };

  const applyRateFromBuy = (row: Row, amountBuyInput: string, rateInput?: string) => {
    const buy = Number(amountBuyInput);
    const r = Number(rateInput ?? row.rate);
    if (!Number.isNaN(buy) && !Number.isNaN(r) && r > 0 && row.fromCurrency && row.toCurrency) {
      const sellStr = numberToString(computeSellFromBuy(buy, r, row.fromCurrency, row.toCurrency));
      return {
        ...row,
        amountBuy: amountBuyInput,
        amountSell: sellStr,
        receiptAmount: amountBuyInput,
        paymentAmount: sellStr,
      };
    }
    return { ...row, amountBuy: amountBuyInput };
  };

  const applyRateFromSell = (row: Row, amountSellInput: string, rateInput?: string) => {
    const sell = Number(amountSellInput);
    const r = Number(rateInput ?? row.rate);
    if (!Number.isNaN(sell) && !Number.isNaN(r) && r > 0 && row.fromCurrency && row.toCurrency) {
      const buyStr = numberToString(computeBuyFromSell(sell, r, row.fromCurrency, row.toCurrency));
      return {
        ...row,
        amountSell: amountSellInput,
        amountBuy: buyStr,
        receiptAmount: buyStr,
        paymentAmount: amountSellInput,
      };
    }
    return { ...row, amountSell: amountSellInput };
  };

  const submitAll = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    let ok = 0;
    try {
      // Identify rows that have been filled in (skip completely empty rows)
      const activeRows = rows
        .map((row, index) => ({ row, index }))
        .filter(({ row }) => row.customerName.trim() || row.fromCurrency || row.toCurrency);

      if (activeRows.length === 0) {
        setAlertModal({ isOpen: true, message: t("orders.batchFailed"), type: "error" });
        return;
      }

      // --- Validation pass: check every active row before creating anything ---
      const validationErrors: string[] = [];
      for (const { row, index } of activeRows) {
        const rowNo = index + 1;
        const buy = Number(row.amountBuy);
        const sell = Number(row.amountSell);
        const receiptAmount = Number(row.receiptAmount);
        const paymentAmount = Number(row.paymentAmount);
        const r = Number(row.rate);

        if (!row.customerName.trim() || !row.fromCurrency || !row.toCurrency) {
          validationErrors.push(`#${rowNo} missing customer name or currencies`);
        } else if (!row.rate || Number.isNaN(r) || r <= 0) {
          validationErrors.push(`#${rowNo} invalid exchange rate`);
        } else if (Number.isNaN(buy) || Number.isNaN(sell) || buy <= 0 || sell <= 0) {
          validationErrors.push(`#${rowNo} invalid amount buy/sell`);
        } else if (Number.isNaN(receiptAmount) || receiptAmount <= 0) {
          validationErrors.push(`#${rowNo} invalid receipt amount`);
        } else if (Number.isNaN(paymentAmount) || paymentAmount <= 0) {
          validationErrors.push(`#${rowNo} invalid payment amount`);
        } else if (!row.buyAccountId || !row.sellAccountId) {
          validationErrors.push(`#${rowNo} select buy/sell accounts`);
        } else if (
          Math.abs(computeSellFromBuy(buy, r, row.fromCurrency, row.toCurrency) - sell) >
          ORDER_RECEIPT_PAYMENT_TOLERANCE
        ) {
          validationErrors.push(`#${rowNo} amount sell does not match amount buy × rate`);
        } else if (Math.abs(receiptAmount - buy) > ORDER_RECEIPT_PAYMENT_TOLERANCE) {
          validationErrors.push(`#${rowNo} receipt amount does not match amount buy`);
        } else if (Math.abs(paymentAmount - sell) > ORDER_RECEIPT_PAYMENT_TOLERANCE) {
          validationErrors.push(`#${rowNo} payment amount does not match amount sell`);
        }
      }

      if (validationErrors.length > 0) {
        setAlertModal({
          isOpen: true,
          message: validationErrors.join("\n"),
          type: "error",
        });
        return;
      }

      // --- Creation pass: all rows are valid, create them all ---
      for (const { row } of activeRows) {
        const buy = Number(row.amountBuy);
        const sell = Number(row.amountSell);
        const receiptAmount = Number(row.receiptAmount);
        const paymentAmount = Number(row.paymentAmount);
        const r = Number(row.rate);
        const created = await addOrder({
          customerName: row.customerName.trim(),
          fromCurrency: row.fromCurrency,
          toCurrency: row.toCurrency,
          amountBuy: buy,
          amountSell: sell,
          rate: r,
          status: "saved",
          buyAccountId: Number(row.buyAccountId),
          sellAccountId: Number(row.sellAccountId),
        } as any).unwrap();
        const orderId = created.id as number;

        const updatePayload: Record<string, unknown> = {
          fromCurrency: row.fromCurrency,
          toCurrency: row.toCurrency,
          amountBuy: buy,
          amountSell: sell,
          rate: r,
          buyAccountId: Number(row.buyAccountId),
          sellAccountId: Number(row.sellAccountId),
          remarks: row.remarks.trim() || null,
        };
        if (row.serviceChargeAmount && row.serviceChargeAccountId) {
          const scAcc = accounts.find((a) => a.id === Number(row.serviceChargeAccountId));
          if (scAcc) {
            updatePayload.serviceChargeAmount = Number(row.serviceChargeAmount);
            updatePayload.serviceChargeAccountId = Number(row.serviceChargeAccountId);
            updatePayload.serviceChargeCurrency = scAcc.currencyCode;
          }
        }
        await updateOrder({ id: orderId, data: updatePayload as any }).unwrap();

        const receipt = await addReceipt({
          id: orderId,
          amount: receiptAmount,
          accountId: Number(row.buyAccountId),
          file: row.receiptFile || undefined,
          imagePath: row.receiptFile ? undefined : "",
        } as any).unwrap();
        await confirmReceipt((receipt as { id: number }).id).unwrap();

        const payment = await addPayment({
          id: orderId,
          amount: paymentAmount,
          accountId: Number(row.sellAccountId),
          file: row.paymentFile || undefined,
          imagePath: row.paymentFile ? undefined : "",
        } as any).unwrap();
        await confirmPayment((payment as { id: number }).id).unwrap();

        await updateOrderStatus({ id: orderId, status: "completed" }).unwrap();
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
            className="space-y-3 border-b border-slate-100 pb-4 last:border-0"
          >
            <div className="flex items-center justify-between">
              <span className="w-8 text-xs font-semibold text-slate-400">#{idx + 1}</span>
              <button
                type="button"
                className="text-xs font-medium text-blue-600 hover:underline"
                onClick={() => setRow(row.id, (r) => ({ ...r, showExtras: !r.showExtras }))}
              >
                {row.showExtras ? t("common.hide") : t("common.show")} {t("orders.remarks")}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-6">
              <input
                type="text"
                placeholder={t("orders.customerName")}
                className="rounded border border-slate-200 px-2 py-1.5 text-sm"
                value={row.customerName}
                onChange={(e) => setRow(row.id, (r) => ({ ...r, customerName: e.target.value }))}
              />
              <select
                className="rounded border border-slate-200 px-1 py-1.5 text-sm"
                value={row.fromCurrency}
                onChange={(e) => {
                  const v = e.target.value;
                  setRow(row.id, (r) => ({
                    ...r,
                    fromCurrency: v,
                    toCurrency: v && v === r.toCurrency ? "" : r.toCurrency,
                    buyAccountId: "",
                  }));
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
                className="rounded border border-slate-200 px-1 py-1.5 text-sm"
                value={row.toCurrency}
                onChange={(e) => {
                  const v = e.target.value;
                  setRow(row.id, (r) => ({
                    ...r,
                    toCurrency: v,
                    fromCurrency: v && v === r.fromCurrency ? "" : r.fromCurrency,
                    sellAccountId: "",
                  }));
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
                className="rounded border border-slate-200 px-2 py-1.5 text-sm"
                value={row.rate}
                onChange={(e) => {
                  const v = e.target.value;
                  setRow(row.id, (r) => {
                    if (r.amountBuy) return applyRateFromBuy({ ...r, rate: v }, r.amountBuy, v);
                    if (r.amountSell) return applyRateFromSell({ ...r, rate: v }, r.amountSell, v);
                    return { ...r, rate: v };
                  });
                }}
              />
              <input
                type="number"
                placeholder={t("orders.amountBuy")}
                className="rounded border border-slate-200 px-2 py-1.5 text-sm"
                value={row.amountBuy}
                onChange={(e) => setRow(row.id, (r) => applyRateFromBuy(r, e.target.value))}
              />
              <input
                type="number"
                placeholder={t("orders.amountSell")}
                className="rounded border border-slate-200 px-2 py-1.5 text-sm"
                value={row.amountSell}
                onChange={(e) => setRow(row.id, (r) => applyRateFromSell(r, e.target.value))}
              />
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-6">
              {/* Receipt amount */}
              <input
                type="number"
                placeholder={`${t("orders.lineReceipt")} ${t("orders.amount")}`}
                className="rounded border border-slate-200 px-2 py-1.5 text-sm"
                value={row.receiptAmount}
                onChange={(e) => setRow(row.id, (r) => ({ ...r, receiptAmount: e.target.value }))}
              />
              {/* Receipt account */}
              <select
                className="rounded border border-slate-200 px-1 py-1.5 text-sm"
                value={row.buyAccountId}
                onChange={(e) => setRow(row.id, (r) => ({ ...r, buyAccountId: e.target.value }))}
              >
                <option value="">{t("orders.selectAccount")} ({t("orders.lineReceipt")})</option>
                {accounts
                  .filter((a) => a.currencyCode === row.fromCurrency)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.currencyCode})
                    </option>
                  ))}
              </select>
              {/* Receipt file upload */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  title={`${t("orders.upload")} ${t("orders.lineReceipt")}`}
                  onClick={() => setUploadModal({ rowId: row.id, kind: "receipt" })}
                  className={`flex flex-1 items-center gap-1.5 truncate rounded border px-2 py-1.5 text-sm transition-colors ${
                    row.receiptFile
                      ? "border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
                      : "border-slate-200 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0l-4 4m4-4l4 4" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
                  </svg>
                  <span className="truncate">
                    {row.receiptFile ? row.receiptFile.name : t("orders.lineReceipt")}
                  </span>
                </button>
                {row.receiptFile && (
                  <button
                    type="button"
                    title={t("common.remove")}
                    onClick={() => setRow(row.id, (r) => ({ ...r, receiptFile: null }))}
                    className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              {/* Payment amount */}
              <input
                type="number"
                placeholder={`${t("orders.linePayment")} ${t("orders.amount")}`}
                className="rounded border border-slate-200 px-2 py-1.5 text-sm"
                value={row.paymentAmount}
                onChange={(e) => setRow(row.id, (r) => ({ ...r, paymentAmount: e.target.value }))}
              />
              {/* Payment account */}
              <select
                className="rounded border border-slate-200 px-1 py-1.5 text-sm"
                value={row.sellAccountId}
                onChange={(e) => setRow(row.id, (r) => ({ ...r, sellAccountId: e.target.value }))}
              >
                <option value="">{t("orders.selectAccount")} ({t("orders.linePayment")})</option>
                {accounts
                  .filter((a) => a.currencyCode === row.toCurrency)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.currencyCode})
                    </option>
                  ))}
              </select>
              {/* Payment file upload */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  title={`${t("orders.upload")} ${t("orders.linePayment")}`}
                  onClick={() => setUploadModal({ rowId: row.id, kind: "payment" })}
                  className={`flex flex-1 items-center gap-1.5 truncate rounded border px-2 py-1.5 text-sm transition-colors ${
                    row.paymentFile
                      ? "border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
                      : "border-slate-200 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0l-4 4m4-4l4 4" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
                  </svg>
                  <span className="truncate">
                    {row.paymentFile ? row.paymentFile.name : t("orders.linePayment")}
                  </span>
                </button>
                {row.paymentFile && (
                  <button
                    type="button"
                    title={t("common.remove")}
                    onClick={() => setRow(row.id, (r) => ({ ...r, paymentFile: null }))}
                    className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {row.showExtras ? (
              <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <input
                    type="number"
                    placeholder={t("orders.serviceCharges")}
                    className="rounded border border-slate-200 px-2 py-1.5 text-sm"
                    value={row.serviceChargeAmount}
                    onChange={(e) =>
                      setRow(row.id, (r) => ({ ...r, serviceChargeAmount: e.target.value }))
                    }
                  />
                  <select
                    className="rounded border border-slate-200 px-1 py-1.5 text-sm"
                    value={row.serviceChargeAccountId}
                    onChange={(e) =>
                      setRow(row.id, (r) => ({ ...r, serviceChargeAccountId: e.target.value }))
                    }
                  >
                    <option value="">{t("orders.selectAccount")} ({t("orders.serviceCharges")})</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.currencyCode})
                      </option>
                    ))}
                  </select>
                </div>
                <textarea
                  placeholder={t("orders.remarks")}
                  className="min-h-[76px] rounded border border-slate-200 px-2 py-1.5 text-sm"
                  value={row.remarks}
                  onChange={(e) => setRow(row.id, (r) => ({ ...r, remarks: e.target.value }))}
                />
              </div>
            ) : null}
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

      <FileUploadModal
        isOpen={uploadModal !== null}
        onClose={() => setUploadModal(null)}
        title={uploadModal?.kind === "receipt"
          ? `${t("orders.upload")} ${t("orders.lineReceipt")}`
          : `${t("orders.upload")} ${t("orders.linePayment")}`
        }
        onFileSelected={(file) => {
          if (uploadModal) {
            const { rowId, kind } = uploadModal;
            setRow(rowId, (r) => ({
              ...r,
              ...(kind === "receipt" ? { receiptFile: file } : { paymentFile: file }),
            }));
          }
          setUploadModal(null);
        }}
      />
    </div>
  );
}
