import type { ReferenceRatePairId } from "../types";
import { REFERENCE_RATE_PAIR_ORDER } from "../constants/referenceRatePairs";

export const PAIR_ORDER_STORAGE_KEY = "referenceRatesPanel.pairOrder";

export const mergePairOrder = (saved: unknown): ReferenceRatePairId[] => {
  const valid = new Set(REFERENCE_RATE_PAIR_ORDER);
  const result: ReferenceRatePairId[] = [];

  if (Array.isArray(saved)) {
    for (const id of saved) {
      if (typeof id === "string" && valid.has(id as ReferenceRatePairId) && !result.includes(id as ReferenceRatePairId)) {
        result.push(id as ReferenceRatePairId);
      }
    }
  }

  for (const id of REFERENCE_RATE_PAIR_ORDER) {
    if (!result.includes(id)) result.push(id);
  }

  return result;
};

export const readStoredPairOrder = (): ReferenceRatePairId[] => {
  try {
    const raw = localStorage.getItem(PAIR_ORDER_STORAGE_KEY);
    if (!raw) return [...REFERENCE_RATE_PAIR_ORDER];
    return mergePairOrder(JSON.parse(raw));
  } catch {
    return [...REFERENCE_RATE_PAIR_ORDER];
  }
};
