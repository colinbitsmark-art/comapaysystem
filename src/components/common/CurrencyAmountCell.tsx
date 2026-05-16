import type { ReactNode } from "react";
import type { Currency } from "../../types";
import {
  getCurrencyAmountInlineStyle,
  isCurrencyDisplayConfigured,
} from "../../utils/currencyAmountDisplay";

interface CurrencyAmountCellProps {
  /** Signed value as shown in the cell (negative = use negative color) */
  amount: number;
  currencyCode: string;
  currencyByCode: Map<string, Currency>;
  children: ReactNode;
  /** Applied to wrapper when currency has no display config */
  defaultClassName?: string;
  className?: string;
}

export function CurrencyAmountCell({
  amount,
  currencyCode,
  currencyByCode,
  children,
  defaultClassName = "",
  className = "",
}: CurrencyAmountCellProps) {
  const currency = currencyByCode.get(currencyCode);
  const style = getCurrencyAmountInlineStyle(amount, currency);
  const configured = isCurrencyDisplayConfigured(currency);

  if (!configured) {
    return (
      <span className={[defaultClassName, className].filter(Boolean).join(" ") || undefined}>
        {children}
      </span>
    );
  }

  return (
    <span
      className={["inline-block rounded-md px-1.5 py-0.5", className].filter(Boolean).join(" ")}
      style={style}
    >
      {children}
    </span>
  );
}
