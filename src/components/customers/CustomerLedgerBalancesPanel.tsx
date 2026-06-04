import { useTranslation } from "react-i18next";
import type { CustomerLedgerSummary, CustomerTradeProfitLoss } from "../../types";
import { TotalMetricCard } from "./TotalMetricCard";

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Props {
  summary: CustomerLedgerSummary[];
  tradeProfit?: CustomerTradeProfitLoss;
  isLoading?: boolean;
  selectedCurrency?: string | null;
  onSelectCurrency: (code: string) => void;
}

export function CustomerLedgerBalancesPanel({
  summary,
  tradeProfit,
  isLoading,
  selectedCurrency,
  onSelectCurrency,
}: Props) {
  const { t } = useTranslation();

  const showTotal =
    tradeProfit?.targetCurrency != null && tradeProfit.profitLoss != null && summary.length > 0;

  const currencyCardClass =
    "rounded-xl border px-4 py-3 text-left transition-all min-w-[140px] w-[11.5rem] shrink-0";

  return (
    <section className="theme-card rounded-2xl border p-6 shadow-sm">
      {isLoading ? (
        <p className="text-sm text-slate-400">{t("common.loading")}</p>
      ) : summary.length === 0 ? (
        <p className="text-sm text-slate-400">{t("customerLedger.noCurrencies")}</p>
      ) : (
        <>
          <div className="flex flex-wrap items-stretch gap-3">
            {showTotal && tradeProfit ? (
              <TotalMetricCard
                label={t("customerLedger.totalProfit")}
                amount={tradeProfit.profitLoss}
                currency={tradeProfit.targetCurrency}
                hasUnknownRate={tradeProfit.hasUnknownRate}
                variant="company"
              />
            ) : null}
            {summary.map((s) => (
              <button
                key={s.currencyCode}
                type="button"
                onClick={() => onSelectCurrency(s.currencyCode)}
                className={`${currencyCardClass} ${
                  selectedCurrency === s.currencyCode
                    ? "border-blue-400 bg-blue-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {s.currencyCode}
                </div>
                <div
                  className={`text-lg font-bold mt-0.5 tabular-nums ${
                    s.balance < 0
                      ? "text-rose-600"
                      : s.balance > 0
                        ? "text-emerald-700"
                        : "text-slate-700"
                  }`}
                >
                  {s.balance < 0 ? "-" : ""}
                  {fmt(Math.abs(s.balance))}
                </div>
                <div className="text-xs text-slate-400 mt-1 tabular-nums">
                  ↑ {fmt(s.totalCredit)} &nbsp; ↓ -{fmt(s.totalDebit)}
                </div>
              </button>
            ))}
          </div>
          {showTotal && tradeProfit?.hasUnknownRate ? (
            <p className="text-xs text-amber-700 mt-3">{t("customers.profitLossUnknownRate")}</p>
          ) : null}
        </>
      )}
    </section>
  );
}
