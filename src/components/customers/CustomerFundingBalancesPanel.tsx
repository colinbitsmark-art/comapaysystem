import { useTranslation } from "react-i18next";
import type { CustomerFundingBalances } from "../../types";
import { TotalMetricCard } from "./TotalMetricCard";

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Props {
  data?: CustomerFundingBalances;
  isLoading?: boolean;
}

export function CustomerFundingBalancesPanel({
  data,
  isLoading,
}: Props) {
  const { t } = useTranslation();

  const currencies = data?.currencies ?? [];
  const epsilon = 0.005;
  const visibleCurrencies = currencies.filter(
    (c) =>
      Math.abs(c.fundedBalance) >= epsilon ||
      c.allocatable >= epsilon ||
      c.allocatableAdvance >= epsilon,
  );
  const showTotal = data?.targetCurrency != null && data.totalConverted != null;
  const hasVisibleContent = showTotal || visibleCurrencies.length > 0;

  const currencyCardClass =
    "rounded-xl border border-slate-200 bg-white px-4 py-3 w-[11.5rem] shrink-0";

  return (
    <section className="theme-card rounded-2xl border p-6 shadow-sm">
      {isLoading ? (
        <p className="text-sm text-slate-400">{t("common.loading")}</p>
      ) : !hasVisibleContent ? (
        <p className="text-sm text-slate-400">{t("customerLedger.noFundingBalances")}</p>
      ) : (
        <>
          <div className="flex flex-wrap items-stretch gap-3">
            {showTotal && data ? (
              <TotalMetricCard
                label={t("customerLedger.totalBalance")}
                amount={data.totalConverted}
                currency={data.targetCurrency}
                hasUnknownRate={data.hasUnknownRate}
                variant="funding"
              />
            ) : null}
            {visibleCurrencies.map((c) => (
              <div key={c.currencyCode} className={currencyCardClass}>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {c.currencyCode}
                </div>
                <div
                  className={`text-lg font-bold mt-0.5 tabular-nums ${
                    c.fundedBalance < 0
                      ? "text-rose-600"
                      : c.fundedBalance > 0
                        ? "text-emerald-700"
                        : "text-slate-700"
                  }`}
                >
                  {c.fundedBalance < 0 ? "-" : ""}
                  {fmt(Math.abs(c.fundedBalance))}
                </div>
                {data?.targetCurrency &&
                c.convertedAmount != null &&
                c.currencyCode !== data.targetCurrency ? (
                  <div className="text-xs text-slate-500 mt-1 tabular-nums">
                    ≈ {fmt(c.convertedAmount)} {data.targetCurrency}
                  </div>
                ) : null}
                {(c.allocatable >= 0.005 || c.allocatableAdvance >= 0.005) && (
                  <div className="text-xs text-slate-500 mt-1.5 space-y-0.5 border-t border-slate-100 pt-1.5">
                    {c.allocatable >= 0.005 ? (
                      <div className="text-emerald-700">
                        {t("customerLedger.usablePrepaid")}: {fmt(c.allocatable)}
                      </div>
                    ) : null}
                    {c.allocatableAdvance >= 0.005 ? (
                      <div className="text-amber-800">
                        {t("customerLedger.usableAdvance")}: {fmt(c.allocatableAdvance)}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ))}
          </div>
          {showTotal && data?.hasUnknownRate ? (
            <p className="text-xs text-amber-700 mt-3">{t("customerLedger.fundingUnknownRate")}</p>
          ) : null}
        </>
      )}
    </section>
  );
}
