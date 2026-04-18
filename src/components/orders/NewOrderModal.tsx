import React, { useRef, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import type { Account, Currency } from "../../types";
import type { UnifiedLine, UnifiedLineKind } from "../../hooks/orders/useUnifiedOrderModal";
import { CurrencyPairSwapButton } from "./CurrencyPairSwapButton";

export type NewOrderViewerState = {
  isOpen: boolean;
  src: string;
  type: "image" | "pdf";
  title: string;
} | null;

type Props = {
  isOpen: boolean;
  isSaving: boolean;
  editingOrderId: number | null;
  customerName: string;
  setCustomerName: (v: string) => void;
  fromCurrency: string;
  setFromCurrency: (v: string) => void;
  toCurrency: string;
  setToCurrency: (v: string) => void;
  amountBuy: string;
  amountSell: string;
  rate: string;
  onAmountBuyChange: (v: string) => void;
  onAmountSellChange: (v: string) => void;
  onRateChange: (v: string) => void;
  lines: UnifiedLine[];
  setLines: React.Dispatch<React.SetStateAction<UnifiedLine[]>>;
  remarks: string;
  setRemarks: (v: string) => void;
  showRemarks: boolean;
  setShowRemarks: (v: boolean) => void;
  currencies: Currency[];
  accounts: Account[];
  handleNumberInputWheel: (e: React.WheelEvent<HTMLInputElement>) => void;
  onSave: (e: FormEvent) => void;
  onComplete: (e: FormEvent) => void;
  onClose: () => void;
  onAutoFill: () => void;
  addLineRow: (kind: UnifiedLineKind) => void;
  viewerModal: NewOrderViewerState;
  setViewerModal: (v: NewOrderViewerState) => void;
};

const kindLabel = (k: UnifiedLineKind, t: (k: string) => string) => {
  switch (k) {
    case "receipt":
      return t("orders.lineReceipt");
    case "payment":
      return t("orders.linePayment");
    case "profit":
      return t("orders.profit");
    case "service_charge":
      return t("orders.serviceCharges");
    default:
      return k;
  }
};

export default function NewOrderModal({
  isOpen,
  isSaving,
  editingOrderId,
  customerName,
  setCustomerName,
  fromCurrency,
  setFromCurrency,
  toCurrency,
  setToCurrency,
  amountBuy,
  amountSell,
  rate,
  onAmountBuyChange,
  onAmountSellChange,
  onRateChange,
  lines,
  setLines,
  remarks,
  setRemarks,
  showRemarks,
  setShowRemarks,
  currencies,
  accounts,
  handleNumberInputWheel,
  onSave,
  onComplete,
  onClose,
  onAutoFill,
  addLineRow,
  viewerModal,
  setViewerModal,
}: Props) {
  const { t } = useTranslation();
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  if (!isOpen) return null;

  const activeCurrencies = currencies.filter((c) => c.active);

  const updateLine = (localId: string, patch: Partial<UnifiedLine>) => {
    setLines((prev) => prev.map((l) => (l.localId === localId ? { ...l, ...patch } : l)));
  };

  const clearLineRow = (localId: string) => {
    const input = fileRefs.current[localId];
    if (input) input.value = "";
    updateLine(localId, {
      amount: "",
      accountId: "",
      file: null,
      serverImagePath: undefined,
      serverReceiptId: undefined,
      serverPaymentId: undefined,
    });
  };

  const accountOptionsForLine = (line: UnifiedLine) => {
    if (line.kind === "receipt" || line.kind === "profit") {
      return accounts.filter((a) => a.currencyCode === fromCurrency);
    }
    if (line.kind === "payment") {
      return accounts.filter((a) => a.currencyCode === toCurrency);
    }
    return accounts;
  };

  return (
    <div
      className="fixed inset-0 z-[8000] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            {editingOrderId ? t("orders.editOrderTitle") : t("orders.newOrder")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label={t("common.close")}
          >
            ✕
          </button>
        </div>

        <form className="space-y-5 px-6 py-5" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t("orders.customerName")}</label>
            <input
              type="text"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder={t("orders.customerNamePlaceholder")}
              disabled={!!editingOrderId}
            />
            {editingOrderId ? (
              <p className="mt-1 text-xs text-slate-500">{t("orders.customerNameLockedWhenEditing")}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-700">{t("orders.from")}</label>
              <select
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={fromCurrency}
                onChange={(e) => setFromCurrency(e.target.value)}
              >
                <option value="">{t("orders.selectCurrency")}</option>
                {activeCurrencies
                  .filter((c) => c.code !== toCurrency)
                  .map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-center sm:pb-0.5">
              <CurrencyPairSwapButton
                label={t("orders.swapCurrencies")}
                disabled={!fromCurrency && !toCurrency}
                onClick={() => {
                  const wasFrom = fromCurrency;
                  const wasTo = toCurrency;
                  setFromCurrency(wasTo);
                  setToCurrency(wasFrom);
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-700">{t("orders.to")}</label>
              <select
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={toCurrency}
                onChange={(e) => setToCurrency(e.target.value)}
              >
                <option value="">{t("orders.selectCurrency")}</option>
                {activeCurrencies
                  .filter((c) => c.code !== fromCurrency)
                  .map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t("orders.exchangeRate")}</label>
            <input
              type="number"
              step="0.0001"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={rate}
              onChange={(e) => onRateChange(e.target.value)}
              onWheel={handleNumberInputWheel}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t("orders.amountBuy")}</label>
              <input
                type="number"
                step="0.0001"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={amountBuy}
                onChange={(e) => onAmountBuyChange(e.target.value)}
                onWheel={handleNumberInputWheel}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t("orders.amountSell")}</label>
              <input
                type="number"
                step="0.0001"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={amountSell}
                onChange={(e) => onAmountSellChange(e.target.value)}
                onWheel={handleNumberInputWheel}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <h3 className="text-sm font-semibold text-slate-800">{t("orders.linesSection")}</h3>
            <button
              type="button"
              onClick={onAutoFill}
              disabled={
                !amountBuy ||
                !amountSell ||
                Number(amountBuy) <= 0 ||
                Number(amountSell) <= 0
              }
              title={t("orders.autoFillTooltip")}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-purple-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("orders.autoFill")}
            </button>
          </div>
          <div>
            <div className="space-y-3">
              {lines.map((line) => (
                <div
                  key={line.localId}
                  className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 p-3"
                >
                  <span className="text-xs font-semibold uppercase text-slate-500">
                    {kindLabel(line.kind, t)}
                  </span>
                  <input
                    type="number"
                    placeholder={t("orders.amount")}
                    className="w-24 rounded border border-slate-200 px-2 py-1.5 text-sm"
                    value={line.amount}
                    onChange={(e) => updateLine(line.localId, { amount: e.target.value })}
                    onWheel={handleNumberInputWheel}
                  />
                  <select
                    className="min-w-[140px] flex-1 rounded border border-slate-200 px-2 py-1.5 text-sm"
                    value={line.accountId}
                    onChange={(e) => updateLine(line.localId, { accountId: e.target.value })}
                  >
                    <option value="">{t("orders.selectAccount")}</option>
                    {accountOptionsForLine(line).map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.currencyCode})
                      </option>
                    ))}
                  </select>
                  <input
                    ref={(el) => {
                      fileRefs.current[line.localId] = el;
                    }}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      if (f) {
                        updateLine(line.localId, { file: f, serverImagePath: undefined });
                      } else {
                        updateLine(line.localId, { file: null });
                      }
                      e.target.value = "";
                    }}
                  />
                  {line.file || line.serverImagePath ? (
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        onClick={() => {
                          if (line.file) {
                            const url = URL.createObjectURL(line.file);
                            const isPdf = line.file.type === "application/pdf";
                            setViewerModal({
                              isOpen: true,
                              src: url,
                              type: isPdf ? "pdf" : "image",
                              title: line.file.name,
                            });
                          } else if (line.serverImagePath) {
                            setViewerModal({
                              isOpen: true,
                              src: line.serverImagePath,
                              type: line.serverImagePath.toLowerCase().endsWith(".pdf") ? "pdf" : "image",
                              title: t("orders.uploadedFile"),
                            });
                          }
                        }}
                      >
                        {t("orders.view")}
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        title={t("orders.replaceUploadTooltip")}
                        onClick={() => fileRefs.current[line.localId]?.click()}
                      >
                        {t("orders.replaceUpload")}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      onClick={() => fileRefs.current[line.localId]?.click()}
                    >
                      {t("orders.upload")}
                    </button>
                  )}
                  <button
                    type="button"
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    title={t("orders.clearLineRowTooltip")}
                    onClick={() => clearLineRow(line.localId)}
                  >
                    {t("common.clear")}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-dashed border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50"
                    title={t("orders.addLine")}
                    onClick={() => addLineRow(line.kind)}
                  >
                    +
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                className="text-xs font-medium text-blue-600 hover:underline"
                onClick={() => addLineRow("receipt")}
              >
                + {t("orders.lineReceipt")}
              </button>
              <button
                type="button"
                className="text-xs font-medium text-blue-600 hover:underline"
                onClick={() => addLineRow("payment")}
              >
                + {t("orders.linePayment")}
              </button>
              <button
                type="button"
                className="text-xs font-medium text-blue-600 hover:underline"
                onClick={() => addLineRow("profit")}
              >
                + {t("orders.profit")}
              </button>
              <button
                type="button"
                className="text-xs font-medium text-blue-600 hover:underline"
                onClick={() => addLineRow("service_charge")}
              >
                + {t("orders.serviceCharges")}
              </button>
            </div>
          </div>

          {!showRemarks ? (
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => setShowRemarks(true)}
            >
              {t("orders.addRemarks")}
            </button>
          ) : (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t("orders.remarks")}</label>
              <textarea
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={onSave}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {isSaving ? t("common.saving") : t("orders.saveOrder")}
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={onComplete}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSaving ? t("common.saving") : t("orders.completeOrder")}
            </button>
          </div>
        </form>
      </div>

      {viewerModal?.isOpen ? (
        <div
          className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setViewerModal(null)}
        >
          <div
            className="max-h-[90vh] max-w-4xl overflow-auto rounded-lg bg-white p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex justify-between">
              <span className="font-medium">{viewerModal.title}</span>
              <button type="button" className="text-slate-500" onClick={() => setViewerModal(null)}>
                ✕
              </button>
            </div>
            {viewerModal.type === "image" ? (
              <img src={viewerModal.src} alt="" className="max-h-[80vh] max-w-full object-contain" />
            ) : (
              <iframe src={viewerModal.src} className="h-[80vh] w-full" title={viewerModal.title} />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
