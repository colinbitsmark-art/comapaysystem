import type { ReferenceRatePairId, ReferenceRatePairKind } from "../types";

export const CONFIG_PAIR_ORDER: ReferenceRatePairId[] = [
  "CNY_USDT",
  "PKR_AED",
  "AED_USDT",
  "HKD_USDT",
  "PKR_USDT",
  "USD_USDT_HK",
  "USD_USDT_INTL",
];

export const DERIVED_PAIR_ORDER: ReferenceRatePairId[] = ["HKD_PKR", "CNY_PKR", "PKR_SWIFT"];

export const REFERENCE_RATE_PAIR_ORDER: ReferenceRatePairId[] = [
  ...CONFIG_PAIR_ORDER,
  ...DERIVED_PAIR_ORDER,
];

export const REFERENCE_RATE_PAIR_LABELS: Record<ReferenceRatePairId, string> = {
  CNY_USDT: "CNY/USDT",
  PKR_AED: "PKR/AED",
  AED_USDT: "AED/USDT",
  HKD_USDT: "HKD/USDT",
  PKR_USDT: "PKR/USDT",
  USD_USDT_HK: "USD/USDT (HK)",
  USD_USDT_INTL: "USD/USDT (INTL)",
  HKD_PKR: "HKD/PKR",
  CNY_PKR: "CNY/PKR",
  PKR_SWIFT: "PKR/SWIFT",
};

export const PAIR_KINDS: Record<ReferenceRatePairId, ReferenceRatePairKind> = {
  CNY_USDT: "standalone",
  PKR_AED: "standalone",
  AED_USDT: "benchmark",
  HKD_USDT: "benchmark",
  PKR_USDT: "chain",
  USD_USDT_HK: "standalone",
  USD_USDT_INTL: "standalone",
  HKD_PKR: "derived",
  CNY_PKR: "derived",
  PKR_SWIFT: "derived",
};
