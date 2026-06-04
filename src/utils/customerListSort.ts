import type { CustomerListSortDir, CustomerListSortField } from "../types";

export const CUSTOMER_LIST_SORT_STORAGE_KEY = "customerListSortV1";

export interface CustomerListSortState {
  sortBy: CustomerListSortField;
  sortDir: CustomerListSortDir;
}

export function loadCustomerListSort(): CustomerListSortState | null {
  try {
    const raw = localStorage.getItem(CUSTOMER_LIST_SORT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CustomerListSortState;
    if (
      (parsed.sortBy === "balance" || parsed.sortBy === "profitLoss") &&
      (parsed.sortDir === "asc" || parsed.sortDir === "desc")
    ) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function saveCustomerListSort(state: CustomerListSortState | null) {
  if (!state) {
    localStorage.removeItem(CUSTOMER_LIST_SORT_STORAGE_KEY);
    return;
  }
  localStorage.setItem(CUSTOMER_LIST_SORT_STORAGE_KEY, JSON.stringify(state));
}
