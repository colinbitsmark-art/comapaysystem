import { useTranslation } from "react-i18next";
import type { CustomerFundingBalanceRow } from "../../types";
import { formatLedgerAmount } from "./NewOrderModal";

const EPSILON = 0.005;

function formatFundingAmount(value: number) {
  const abs = formatLedgerAmount(Math.abs(value));
  return value < 0 ? `-${abs}` : abs;
}

interface Props {
  items: CustomerFundingBalanceRow[];
  loading?: boolean;
}

/** Compact prepaid (positive) / advance to settle (negative) per currency — no modal. */
export function CustomerFundingSummaryInline({ items, loading }: Props) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <p className="mt-1.5 text-xs text-slate-400">{t("orders.customerBalanceLoading")}</p>
    );
  }

  const chips = items
    .map((item) => {
      if (item.allocatable >= EPSILON) {
        return { currencyCode: item.currencyCode, value: item.allocatable };
      }
      if (item.allocatableAdvance >= EPSILON) {
        return { currencyCode: item.currencyCode, value: -item.allocatableAdvance };
      }
      return null;
    })
    .filter((c): c is { currencyCode: string; value: number } => c != null);

  if (chips.length === 0) return null;

  return (
    <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs font-medium tabular-nums">
      {chips.map(({ currencyCode, value }) => (
        <span
          key={currencyCode}
          className={value > 0 ? "text-emerald-700" : "text-amber-800"}
        >
          {currencyCode}: {formatFundingAmount(value)}
        </span>
      ))}
    </p>
  );
}
