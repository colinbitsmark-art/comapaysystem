import type { OrderStatus } from "../../types";

/**
 * Get the tone/badge color for an order status
 */
export function getStatusTone(status: OrderStatus): "amber" | "blue" | "emerald" | "rose" | "slate" | "orange" {
  switch (status) {
    case "saved":
      return "amber";
    case "completed":
      return "emerald";
    case "cancelled":
      return "rose";
    default:
      return "slate";
  }
}

