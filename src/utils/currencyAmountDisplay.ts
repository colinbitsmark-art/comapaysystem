import type { CSSProperties } from "react";
import type { Currency, CurrencyAmountDisplayMode } from "../types";

const DEFAULT_POSITIVE_COLOR = "#ffffff";
const DEFAULT_NEGATIVE_COLOR = "#22c55e";

const DEFAULT_SYMBOLS: Record<string, string> = {
  USD: "$",
  CNY: "¥",
  RMB: "¥",
  HKD: "HK$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  USDT: "USDT ",
};

export function isTruthyFlag(value: boolean | number | undefined | null): boolean {
  return value !== false && value !== 0;
}

export function getAmountDisplayMode(currency: Currency | undefined): CurrencyAmountDisplayMode {
  return currency?.amountDisplayMode === "symbol" ? "symbol" : "code";
}

export function getCurrencySymbol(currencyCode: string, currency: Currency | undefined): string {
  const custom = currency?.currencySymbol?.trim();
  if (custom) return custom;
  return DEFAULT_SYMBOLS[currencyCode.toUpperCase()] ?? `${currencyCode} `;
}

export function isCurrencyDisplayConfigured(currency: Currency | undefined): boolean {
  return Boolean(currency?.displayBgColor?.trim());
}

export function isCurrencyCodeDisplaySameAsAmount(currency: Currency | undefined): boolean {
  if (!currency) return true;
  return isTruthyFlag(currency.codeDisplaySameAsAmount);
}

/** @deprecated Code colors are not used when amount uses unified code/symbol display */
export function getCurrencyCodeDisplayColors(
  currency: Currency | undefined,
): { bg: string; positive: string; negative: string } | null {
  if (!currency) return null;

  if (isCurrencyCodeDisplaySameAsAmount(currency) && isCurrencyDisplayConfigured(currency)) {
    return {
      bg: currency.displayBgColor!.trim(),
      positive: currency.displayPositiveColor?.trim() || DEFAULT_POSITIVE_COLOR,
      negative: currency.displayNegativeColor?.trim() || DEFAULT_NEGATIVE_COLOR,
    };
  }

  const bg = currency.codeDisplayBgColor?.trim();
  if (!bg) return null;

  return {
    bg,
    positive: currency.codeDisplayPositiveColor?.trim() || DEFAULT_POSITIVE_COLOR,
    negative: currency.codeDisplayNegativeColor?.trim() || DEFAULT_NEGATIVE_COLOR,
  };
}

export function isCurrencyCodeDisplayConfigured(currency: Currency | undefined): boolean {
  return getCurrencyCodeDisplayColors(currency) !== null;
}

function inlineStyleFromColors(
  amount: number,
  colors: { bg: string; positive: string; negative: string },
): CSSProperties {
  const isNegative = amount < 0;
  const isZero = amount === 0;

  return {
    backgroundColor: colors.bg,
    color: isZero
      ? colors.positive
      : isNegative
        ? colors.negative
        : colors.positive,
    fontWeight: 700,
  };
}

export function getCurrencyAmountInlineStyle(
  amount: number,
  currency: Currency | undefined,
): CSSProperties | undefined {
  if (!currency || !isCurrencyDisplayConfigured(currency)) {
    return undefined;
  }

  return inlineStyleFromColors(amount, {
    bg: currency.displayBgColor!.trim(),
    positive: currency.displayPositiveColor?.trim() || DEFAULT_POSITIVE_COLOR,
    negative: currency.displayNegativeColor?.trim() || DEFAULT_NEGATIVE_COLOR,
  });
}

export function getCurrencyCodeInlineStyle(
  amount: number,
  currency: Currency | undefined,
): CSSProperties | undefined {
  const colors = getCurrencyCodeDisplayColors(currency);
  if (!colors) return undefined;
  return inlineStyleFromColors(amount, colors);
}

export function buildCurrencyByCode(currencies: Currency[]): Map<string, Currency> {
  return new Map(currencies.map((c) => [c.code, c]));
}

/** Format amount for table display (unified label uses amount colors only) */
export function formatCurrencyAmountDisplay(
  signedAmount: number,
  currencyCode: string,
  currency: Currency | undefined,
  formatAbsValue: (abs: number) => string,
): string {
  const abs = Math.abs(signedAmount);
  const formatted = formatAbsValue(abs);
  const isNegative = signedAmount < 0;

  if (getAmountDisplayMode(currency) === "symbol") {
    const symbol = getCurrencySymbol(currencyCode, currency);
    return isNegative ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
  }

  return isNegative ? `-${formatted} ${currencyCode}` : `${formatted} ${currencyCode}`;
}

export type CurrencyDisplayFormFields = {
  displayBgColor: string;
  displayPositiveColor: string;
  displayNegativeColor: string;
  amountDisplayMode: CurrencyAmountDisplayMode;
  currencySymbol: string;
};

export type CurrencyCodeDisplayFormFields = {
  codeDisplaySameAsAmount: boolean;
  codeDisplayBgColor: string;
  codeDisplayPositiveColor: string;
  codeDisplayNegativeColor: string;
};

export type CurrencyFullDisplayFormFields = CurrencyDisplayFormFields & CurrencyCodeDisplayFormFields;

export const emptyCurrencyDisplayFields = (): CurrencyDisplayFormFields => ({
  displayBgColor: "",
  displayPositiveColor: "",
  displayNegativeColor: "",
  amountDisplayMode: "code",
  currencySymbol: "",
});

export const emptyCurrencyCodeDisplayFields = (): CurrencyCodeDisplayFormFields => ({
  codeDisplaySameAsAmount: true,
  codeDisplayBgColor: "",
  codeDisplayPositiveColor: "",
  codeDisplayNegativeColor: "",
});

export const emptyCurrencyFullDisplayFields = (): CurrencyFullDisplayFormFields => ({
  ...emptyCurrencyDisplayFields(),
  ...emptyCurrencyCodeDisplayFields(),
});

export function currencyToDisplayFields(currency: Currency): CurrencyDisplayFormFields {
  return {
    displayBgColor: currency.displayBgColor ?? "",
    displayPositiveColor: currency.displayPositiveColor ?? "",
    displayNegativeColor: currency.displayNegativeColor ?? "",
    amountDisplayMode: getAmountDisplayMode(currency),
    currencySymbol: currency.currencySymbol ?? "",
  };
}

export function currencyToCodeDisplayFields(currency: Currency): CurrencyCodeDisplayFormFields {
  return {
    codeDisplaySameAsAmount: isCurrencyCodeDisplaySameAsAmount(currency),
    codeDisplayBgColor: currency.codeDisplayBgColor ?? "",
    codeDisplayPositiveColor: currency.codeDisplayPositiveColor ?? "",
    codeDisplayNegativeColor: currency.codeDisplayNegativeColor ?? "",
  };
}

export function currencyToFullDisplayFields(currency: Currency): CurrencyFullDisplayFormFields {
  return {
    ...currencyToDisplayFields(currency),
    ...currencyToCodeDisplayFields(currency),
  };
}

/** Payload for API: null clears styling */
export function displayFieldsToPayload(fields: CurrencyDisplayFormFields): {
  displayBgColor: string | null;
  displayPositiveColor: string | null;
  displayNegativeColor: string | null;
  amountDisplayMode: CurrencyAmountDisplayMode;
  currencySymbol: string | null;
} {
  const bg = fields.displayBgColor.trim();
  if (!bg) {
    return {
      displayBgColor: null,
      displayPositiveColor: null,
      displayNegativeColor: null,
      amountDisplayMode: fields.amountDisplayMode,
      currencySymbol: fields.currencySymbol.trim() || null,
    };
  }
  return {
    displayBgColor: bg,
    displayPositiveColor: fields.displayPositiveColor.trim() || DEFAULT_POSITIVE_COLOR,
    displayNegativeColor: fields.displayNegativeColor.trim() || DEFAULT_NEGATIVE_COLOR,
    amountDisplayMode: fields.amountDisplayMode,
    currencySymbol: fields.currencySymbol.trim() || null,
  };
}

export function codeDisplayFieldsToPayload(fields: CurrencyCodeDisplayFormFields): {
  codeDisplaySameAsAmount: number;
  codeDisplayBgColor: string | null;
  codeDisplayPositiveColor: string | null;
  codeDisplayNegativeColor: string | null;
} {
  if (fields.codeDisplaySameAsAmount) {
    return {
      codeDisplaySameAsAmount: 1,
      codeDisplayBgColor: null,
      codeDisplayPositiveColor: null,
      codeDisplayNegativeColor: null,
    };
  }

  const bg = fields.codeDisplayBgColor.trim();
  if (!bg) {
    return {
      codeDisplaySameAsAmount: 0,
      codeDisplayBgColor: null,
      codeDisplayPositiveColor: null,
      codeDisplayNegativeColor: null,
    };
  }

  return {
    codeDisplaySameAsAmount: 0,
    codeDisplayBgColor: bg,
    codeDisplayPositiveColor:
      fields.codeDisplayPositiveColor.trim() || DEFAULT_POSITIVE_COLOR,
    codeDisplayNegativeColor:
      fields.codeDisplayNegativeColor.trim() || DEFAULT_NEGATIVE_COLOR,
  };
}

export function fullDisplayFieldsToPayload(fields: CurrencyFullDisplayFormFields) {
  return {
    ...displayFieldsToPayload(fields),
    ...codeDisplayFieldsToPayload(fields),
  };
}
