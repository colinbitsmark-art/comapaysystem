import type {
  ReferenceRateBaseMode,
  ReferenceRatePair,
  ReferenceRatePairId,
  ReferenceRatePairKind,
  ReferenceRatesResponse,
  ReferenceRatesUpdatePayload,
} from "../types";
import {
  CONFIG_PAIR_ORDER,
  DERIVED_PAIR_ORDER,
  PAIR_KINDS,
  REFERENCE_RATE_PAIR_LABELS,
} from "../constants/referenceRatePairs";

const toNum = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const hasPositive = (n: number | null) => n !== null && n > 0;

export const clampDisplayDecimals = (v: unknown, fallback = 3) => {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(8, Math.max(0, n));
};

export const resolveBaseMode = (input: {
  averageBase?: number | null;
  baseBuy?: number | null;
  baseSell?: number | null;
  baseMode?: ReferenceRateBaseMode;
  kind?: ReferenceRatePairKind;
}): ReferenceRateBaseMode => {
  if (input.kind === "chain") return "chain";
  if (input.kind === "benchmark") {
    const buy = toNum(input.baseBuy);
    const sell = toNum(input.baseSell);
    if (hasPositive(buy) || hasPositive(sell)) return "dual";
    return input.baseMode === "dual" ? "dual" : null;
  }
  const avg = toNum(input.averageBase);
  const buy = toNum(input.baseBuy);
  const sell = toNum(input.baseSell);
  if (hasPositive(avg)) return "average";
  if (hasPositive(buy) || hasPositive(sell)) return "dual";
  if (input.baseMode === "average" || input.baseMode === "dual") return input.baseMode;
  return null;
};

const getCnyBenchmarkBase = (cny: ReferenceRatePair) => {
  if (cny.baseMode === "average" && hasPositive(cny.averageBase)) return cny.averageBase;
  if (cny.baseMode === "dual" && hasPositive(cny.baseSell)) return cny.baseSell;
  return null;
};

const computeStandaloneRates = (pair: ReferenceRatePair) => {
  const markup = pair.markup ?? 0;
  const markdown = pair.markdown ?? 0;

  if (pair.baseMode === "average") {
    const avg = pair.averageBase;
    if (!hasPositive(avg)) return { buy: null, sell: null, error: "missing_average_base" as const };
    return { buy: avg * (1 - markdown), sell: avg * (1 + markup), error: null };
  }

  if (pair.baseMode === "dual") {
    const buy = hasPositive(pair.baseBuy) ? pair.baseBuy! * (1 - markdown) : null;
    const sell = hasPositive(pair.baseSell) ? pair.baseSell! * (1 + markup) : null;
    if (buy === null && sell === null) return { buy: null, sell: null, error: "missing_dual_base" as const };
    return { buy, sell, error: null };
  }

  return { buy: null, sell: null, error: "no_base_mode" as const };
};

const normalizeInput = (pairId: ReferenceRatePairId, raw: ReferenceRatesUpdatePayload["pairs"][ReferenceRatePairId] = {}) => {
  const kind = PAIR_KINDS[pairId];
  const markup = toNum(raw?.markup) ?? 0;
  const markdown = toNum(raw?.markdown) ?? 0;
  const baseMode = resolveBaseMode({
    averageBase: toNum(raw?.averageBase),
    baseBuy: toNum(raw?.baseBuy),
    baseSell: toNum(raw?.baseSell),
    baseMode: raw?.baseMode,
    kind,
  });

  const displayDecimals = clampDisplayDecimals(raw?.displayDecimals);

  if (kind === "chain") {
    return {
      id: pairId,
      label: REFERENCE_RATE_PAIR_LABELS[pairId],
      kind,
      baseMode: "chain" as const,
      averageBase: null,
      baseBuy: null,
      baseSell: null,
      markup: Math.max(0, markup),
      markdown: Math.max(0, markdown),
      displayDecimals,
    };
  }

  if (kind === "benchmark") {
    const baseBuy = toNum(raw?.baseBuy);
    const baseSell = toNum(raw?.baseSell);
    return {
      id: pairId,
      label: REFERENCE_RATE_PAIR_LABELS[pairId],
      kind,
      baseMode: "dual" as const,
      averageBase: null,
      baseBuy: hasPositive(baseBuy) ? baseBuy : null,
      baseSell: hasPositive(baseSell) ? baseSell : null,
      markup: 0,
      markdown: 0,
      displayDecimals,
    };
  }

  return {
    id: pairId,
    label: REFERENCE_RATE_PAIR_LABELS[pairId],
    kind,
    baseMode,
    averageBase: baseMode === "average" ? toNum(raw?.averageBase) : null,
    baseBuy: baseMode === "dual" ? toNum(raw?.baseBuy) : null,
    baseSell: baseMode === "dual" ? toNum(raw?.baseSell) : null,
    markup: Math.max(0, markup),
    markdown: Math.max(0, markdown),
    displayDecimals,
  };
};

const attach = (pair: Omit<ReferenceRatePair, "computedBuy" | "computedSell" | "computeError">, computed: {
  buy: number | null;
  sell: number | null;
  error: string | null;
}): ReferenceRatePair => ({
  ...pair,
  computedBuy: computed.buy,
  computedSell: computed.sell,
  computeError: computed.error,
});

export const buildPreviewFromForm = (
  pairs: ReferenceRatesUpdatePayload["pairs"],
  pkrSwiftFactor = 1.01,
): Record<ReferenceRatePairId, ReferenceRatePair> => {
  const factor = hasPositive(toNum(pkrSwiftFactor)) ? toNum(pkrSwiftFactor)! : 1.01;
  const normalized = Object.fromEntries(
    CONFIG_PAIR_ORDER.map((id) => [id, normalizeInput(id, pairs?.[id])]),
  ) as Record<ReferenceRatePairId, ReferenceRatePair>;

  const result = {} as Record<ReferenceRatePairId, ReferenceRatePair>;

  const cny = normalized.CNY_USDT;
  const pkrAed = normalized.PKR_AED;
  const aed = normalized.AED_USDT;
  const hkd = normalized.HKD_USDT;
  const pkrSpread = normalized.PKR_USDT;

  result.CNY_USDT = attach(cny, computeStandaloneRates(cny));
  result.PKR_AED = attach(pkrAed, computeStandaloneRates(pkrAed));
  result.USD_USDT_HK = attach(normalized.USD_USDT_HK, computeStandaloneRates(normalized.USD_USDT_HK));
  result.USD_USDT_INTL = attach(normalized.USD_USDT_INTL, computeStandaloneRates(normalized.USD_USDT_INTL));
  result.AED_USDT = attach(aed, { buy: aed.baseBuy, sell: aed.baseSell, error: null });

  const pkrAedSell = result.PKR_AED.computedSell;
  const aedBaseSell = aed.baseSell;
  let pkrUsdtSell: number | null = null;
  let pkrUsdtBuy: number | null = null;
  let pkrUsdtError: string | null = null;

  if (!hasPositive(pkrAedSell)) pkrUsdtError = "missing_pkr_aed_sell";
  else if (!hasPositive(aedBaseSell)) pkrUsdtError = "missing_aed_base_sell";
  else {
    pkrUsdtSell = pkrAedSell! * aedBaseSell! * (1 + pkrSpread.markup);
    pkrUsdtBuy = pkrUsdtSell * (1 - pkrSpread.markdown);
  }

  result.PKR_USDT = attach(
    { ...pkrSpread, baseMode: "chain" },
    { buy: pkrUsdtBuy, sell: pkrUsdtSell, error: pkrUsdtError },
  );

  result.HKD_USDT = attach(
    { ...hkd, baseMode: "dual" },
    { buy: hkd.baseBuy, sell: hkd.baseSell, error: null },
  );

  let hkdPkrBuy: number | null = null;
  let hkdPkrSell: number | null = null;
  let hkdPkrError: string | null = null;
  if (!hasPositive(pkrUsdtBuy) || !hasPositive(pkrUsdtSell)) hkdPkrError = "missing_pkr_usdt";
  else if (!hasPositive(hkd.baseSell)) hkdPkrError = "missing_hkd_base_sell";
  else if (!hasPositive(hkd.baseBuy)) hkdPkrError = "missing_hkd_base_buy";
  else {
    hkdPkrBuy = pkrUsdtBuy! / hkd.baseSell!;
    hkdPkrSell = pkrUsdtSell! / hkd.baseBuy!;
  }
  result.HKD_PKR = attach(
    {
      id: "HKD_PKR",
      label: REFERENCE_RATE_PAIR_LABELS.HKD_PKR,
      kind: "derived",
      baseMode: "derived",
      averageBase: null,
      baseBuy: null,
      baseSell: null,
      markup: 0,
      markdown: 0,
      displayDecimals: clampDisplayDecimals(pairs?.HKD_PKR?.displayDecimals),
    },
    { buy: hkdPkrBuy, sell: hkdPkrSell, error: hkdPkrError },
  );

  const cnyBench = getCnyBenchmarkBase(cny);
  let cnyPkrBuy: number | null = null;
  let cnyPkrSell: number | null = null;
  let cnyPkrError: string | null = null;
  if (!hasPositive(pkrUsdtBuy) || !hasPositive(pkrUsdtSell)) cnyPkrError = "missing_pkr_usdt";
  else if (!hasPositive(cnyBench)) cnyPkrError = "missing_cny_benchmark";
  else {
    cnyPkrBuy = pkrUsdtBuy! / cnyBench!;
    cnyPkrSell = pkrUsdtSell! / cnyBench!;
  }
  result.CNY_PKR = attach(
    {
      id: "CNY_PKR",
      label: REFERENCE_RATE_PAIR_LABELS.CNY_PKR,
      kind: "derived",
      baseMode: "derived",
      averageBase: null,
      baseBuy: null,
      baseSell: null,
      markup: 0,
      markdown: 0,
      displayDecimals: clampDisplayDecimals(pairs?.CNY_PKR?.displayDecimals),
    },
    { buy: cnyPkrBuy, sell: cnyPkrSell, error: cnyPkrError },
  );

  let pkrSwiftSell: number | null = null;
  let pkrSwiftError: string | null = null;
  if (!hasPositive(pkrUsdtSell)) pkrSwiftError = "missing_pkr_usdt_sell";
  else pkrSwiftSell = pkrUsdtSell! * factor;

  result.PKR_SWIFT = attach(
    {
      id: "PKR_SWIFT",
      label: REFERENCE_RATE_PAIR_LABELS.PKR_SWIFT,
      kind: "derived",
      baseMode: "derived",
      averageBase: null,
      baseBuy: null,
      baseSell: null,
      markup: 0,
      markdown: 0,
      displayDecimals: clampDisplayDecimals(pairs?.PKR_SWIFT?.displayDecimals),
    },
    { buy: null, sell: pkrSwiftSell, error: pkrSwiftError },
  );

  return result;
};

/** Buy/sell for display; benchmark pairs fall back to base when computed is absent (e.g. stale API). */
export const getReferenceRateBuySell = (pair: ReferenceRatePair) => ({
  buy:
    pair.computedBuy ??
    (pair.kind === "benchmark" ? pair.baseBuy ?? null : null),
  sell:
    pair.computedSell ??
    (pair.kind === "benchmark" ? pair.baseSell ?? null : null),
});

export const formatReferenceRate = (value: number | null, decimals = 6) => {
  if (value === null || !Number.isFinite(value)) return "—";
  return String(Number(value.toFixed(decimals)));
};

export const displayToPercentFraction = (displayPercent: string) => {
  const n = Number(displayPercent);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n / 100);
};

export const fractionToDisplayPercent = (fraction: number) => {
  if (!Number.isFinite(fraction)) return "";
  return String(Number((fraction * 100).toFixed(4)));
};

export const responseToFormPairs = (
  data: ReferenceRatesResponse,
): ReferenceRatesUpdatePayload["pairs"] => {
  const pairs: ReferenceRatesUpdatePayload["pairs"] = {};
  for (const id of CONFIG_PAIR_ORDER) {
    const p = data.pairs[id];
    if (!p) continue;
    pairs[id] = {
      baseMode: p.baseMode === "chain" ? undefined : p.baseMode ?? undefined,
      averageBase: p.averageBase,
      baseBuy: p.baseBuy,
      baseSell: p.baseSell,
      markup: p.markup,
      markdown: p.markdown,
      displayDecimals: p.displayDecimals,
    };
  }
  return pairs;
};

export const responseDerivedDecimals = (data: ReferenceRatesResponse) => ({
  HKD_PKR: String(data.pairs.HKD_PKR?.displayDecimals ?? 3),
  CNY_PKR: String(data.pairs.CNY_PKR?.displayDecimals ?? 3),
  PKR_SWIFT: String(data.pairs.PKR_SWIFT?.displayDecimals ?? 3),
});

export { CONFIG_PAIR_ORDER, DERIVED_PAIR_ORDER };
