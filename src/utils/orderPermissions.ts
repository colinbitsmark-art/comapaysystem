import type { Order, AuthResponse } from "../types";
import { hasActionPermission } from "./permissions";

/**
 * Check if user is admin
 */
export function isAdmin(user: AuthResponse | null): boolean {
  if (!user) return false;
  // Admin typically has deleteOrder permission
  return hasActionPermission(user, "deleteOrder");
}

/**
 * Check if user can modify an order (any logged-in user with an order row)
 */
export function canModifyOrder(order: Order, user: AuthResponse | null): boolean {
  if (!order || !user) {
    return false;
  }
  return true;
}

/**
 * Check if user can perform actions on an order (add receipts, payments, profit, service charges, complete)
 */
export function canPerformOrderActions(order: Order, user: AuthResponse | null): boolean {
  if (!user || !order) return false;
  // Admin can always perform actions
  if (isAdmin(user)) return true;
  // Creator or handler can perform actions
  return canModifyOrder(order, user);
}
