import { useCallback, useEffect, useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import type { ReferenceRatePairId } from "../types";
import { mergePairOrder, PAIR_ORDER_STORAGE_KEY, readStoredPairOrder } from "../utils/referenceRatePairOrder";

const COLLAPSED_KEY = "referenceRatesPanel.collapsed";
const POSITION_KEY = "referenceRatesPanel.position";

const DEFAULT_POSITION = { x: 16, y: 80 };

type Position = { x: number; y: number };

const readPosition = (): Position => {
  try {
    const raw = localStorage.getItem(POSITION_KEY);
    if (!raw) return DEFAULT_POSITION;
    const parsed = JSON.parse(raw) as Position;
    if (typeof parsed.x === "number" && typeof parsed.y === "number") return parsed;
  } catch {
    /* ignore */
  }
  return DEFAULT_POSITION;
};

const readCollapsed = () => {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
};

export function useReferenceRatesPanelLayout() {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [position, setPosition] = useState<Position>(readPosition);
  const [pairOrder, setPairOrder] = useState<ReferenceRatePairId[]>(readStoredPairOrder);

  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  const persistPosition = useCallback((pos: Position) => {
    setPosition(pos);
    localStorage.setItem(POSITION_KEY, JSON.stringify(pos));
  }, []);

  const clampPosition = useCallback((pos: Position, width: number, height: number) => {
    const maxX = Math.max(8, window.innerWidth - width - 8);
    const maxY = Math.max(8, window.innerHeight - height - 8);
    return {
      x: Math.min(Math.max(8, pos.x), maxX),
      y: Math.min(Math.max(8, pos.y), maxY),
    };
  }, []);

  const persistPairOrder = useCallback((order: ReferenceRatePairId[]) => {
    setPairOrder(order);
    localStorage.setItem(PAIR_ORDER_STORAGE_KEY, JSON.stringify(order));
  }, []);

  const reorderPairs = useCallback((activeId: ReferenceRatePairId, overId: ReferenceRatePairId) => {
    setPairOrder((prev) => {
      const oldIndex = prev.indexOf(activeId);
      const newIndex = prev.indexOf(overId);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return prev;
      const next = arrayMove(prev, oldIndex, newIndex);
      localStorage.setItem(PAIR_ORDER_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetPairOrder = useCallback(() => {
    const next = mergePairOrder(null);
    persistPairOrder(next);
  }, [persistPairOrder]);

  return {
    collapsed,
    setCollapsed,
    position,
    persistPosition,
    clampPosition,
    pairOrder,
    reorderPairs,
    resetPairOrder,
  };
}
