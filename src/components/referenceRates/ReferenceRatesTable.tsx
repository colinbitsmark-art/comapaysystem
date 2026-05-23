import { useTranslation } from "react-i18next";
import type { ReferenceRatePair, ReferenceRatePairId } from "../../types";
import { REFERENCE_RATE_PAIR_ORDER } from "../../constants/referenceRatePairs";
import { formatReferenceRate, getReferenceRateBuySell } from "../../utils/referenceRates";

function modeLabel(
  p: ReferenceRatePair,
  t: (key: string) => string,
): string {
  if (p.kind === "derived") return t("referenceRates.modeDerived");
  if (p.kind === "benchmark" && p.id === "AED_USDT") return t("referenceRates.modeBenchmark");
  if (p.kind === "benchmark") return t("referenceRates.modeBenchmarkComputed");
  if (p.baseMode === "chain") return t("referenceRates.modeChain");
  if (p.baseMode === "average") return t("referenceRates.modeAverage");
  if (p.baseMode === "dual") return t("referenceRates.modeDual");
  return "—";
}

export default function ReferenceRatesTable({
  pairs,
  compact = false,
}: {
  pairs: Record<ReferenceRatePairId, ReferenceRatePair>;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const cell = compact ? "px-2 py-1 text-xs" : "px-3 py-2 text-sm";
  const th = `${cell} text-left font-semibold`;
  const showMode = !compact;

  return (
    <div className="overflow-x-auto">
      <table className={`w-full border-collapse ${compact ? "min-w-[260px]" : "min-w-[360px]"}`}>
        <thead>
          <tr className="border-b" style={{ borderColor: "var(--theme-border)" }}>
            <th className={th}>{t("referenceRates.pair")}</th>
            {showMode && <th className={th}>{t("referenceRates.mode")}</th>}
            {!compact && <th className={th}>{t("referenceRates.base")}</th>}
            <th className={`${th} text-right`}>{t("referenceRates.buy")}</th>
            <th className={`${th} text-right`}>{t("referenceRates.sell")}</th>
          </tr>
        </thead>
        <tbody>
          {REFERENCE_RATE_PAIR_ORDER.map((id) => {
            const p = pairs[id];
            if (!p) return null;
            const baseSummary =
              p.kind === "derived"
                ? "—"
                : p.baseMode === "average"
                  ? formatReferenceRate(p.averageBase, 4)
                  : `${formatReferenceRate(p.baseBuy, 4)} / ${formatReferenceRate(p.baseSell, 4)}`;
            const { buy, sell } = getReferenceRateBuySell(p);
            const rateDecimals = compact ? (p.displayDecimals ?? 3) : 6;
            return (
              <tr
                key={id}
                className={`border-b last:border-0 ${p.kind === "derived" ? "bg-slate-50/80" : ""}`}
                style={{ borderColor: "var(--theme-border)" }}
              >
                <td className={`${cell} font-medium`}>{p.label}</td>
                {showMode && (
                  <td className={`${cell} text-slate-500`}>{modeLabel(p, t)}</td>
                )}
                {!compact && <td className={`${cell} text-slate-600`}>{baseSummary}</td>}
                <td className={`${cell} text-right font-mono tabular-nums`}>
                  {formatReferenceRate(buy, rateDecimals)}
                </td>
                <td className={`${cell} text-right font-mono tabular-nums`}>
                  {formatReferenceRate(sell, rateDecimals)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
