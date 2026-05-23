import type { WheelEvent } from "react";

/** Blur focused number inputs on wheel so page scroll does not change the value. */
export function preventNumberInputWheel(e: WheelEvent<HTMLInputElement>) {
  const target = e.currentTarget;
  if (document.activeElement === target) {
    target.blur();
  }
}
