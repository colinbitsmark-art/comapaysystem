import type { Currency } from "../../types";
import {
  formatCurrencyAmountDisplay,
  isCurrencyDisplayConfigured,
} from "../../utils/currencyAmountDisplay";
import { CurrencyAmountCell } from "./CurrencyAmountCell";

interface StyledCurrencyAmountProps {
  /** Signed value as shown (negative → negative styling) */
  signedAmount: number;
  currencyCode: string;
  currencyByCode: Map<string, Currency>;
  formatAbsValue?: (abs: number) => string;
  defaultClassName?: string;
  /** When set, used instead of auto-format if amount colors are not configured */
  unconfiguredLabel?: string;
}

export function StyledCurrencyAmount({
  signedAmount,
  currencyCode,
  currencyByCode,
  formatAbsValue = (abs) => abs.toLocaleString(),
  defaultClassName = "",
  unconfiguredLabel,
}: StyledCurrencyAmountProps) {
  const currency = currencyByCode.get(currencyCode);
  const label =
    unconfiguredLabel ??
    formatCurrencyAmountDisplay(signedAmount, currencyCode, currency, formatAbsValue);
  const configured = isCurrencyDisplayConfigured(currency);

  if (!configured) {
    return <span className={defaultClassName || undefined}>{label}</span>;
  }

  return (
    <CurrencyAmountCell
      amount={signedAmount}
      currencyCode={currencyCode}
      currencyByCode={currencyByCode}
      defaultClassName={defaultClassName}
    >
      {label}
    </CurrencyAmountCell>
  );
}
