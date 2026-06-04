import type { AuthResponse } from "../types";
import { hasActionPermission } from "./permissions";

export const CUSTOMER_KYC_ACTIONS = [
  "submitCustomerKyc",
  "approveCustomerKyc",
  "reopenCustomerKyc",
  "manageKycPolicy",
] as const;

export const CUSTOMER_LEDGER_ACTIONS = [
  "viewCustomerLedger",
  "createLedgerDepositWithdraw",
  "editDeleteCustomerLedger",
] as const;

export const CUSTOMER_MENU_ACTIONS = [
  "updateCustomer",
  "pinCustomers",
  "deleteCustomer",
  ...CUSTOMER_KYC_ACTIONS,
  ...CUSTOMER_LEDGER_ACTIONS,
] as const;

export function hasAnyCustomerKycPermission(user: AuthResponse | null): boolean {
  return CUSTOMER_KYC_ACTIONS.some((action) => hasActionPermission(user, action));
}

/** Ledger page and ⋮ menu: any ledger permission grants view access. */
export function canViewCustomerLedger(user: AuthResponse | null): boolean {
  return CUSTOMER_LEDGER_ACTIONS.some((action) => hasActionPermission(user, action));
}

export function canCreateLedgerDepositWithdraw(user: AuthResponse | null): boolean {
  return (
    hasActionPermission(user, "createLedgerDepositWithdraw") ||
    hasActionPermission(user, "editDeleteCustomerLedger")
  );
}

export function canEditDeleteCustomerLedger(user: AuthResponse | null): boolean {
  return hasActionPermission(user, "editDeleteCustomerLedger");
}

export function canSubmitCustomerKyc(user: AuthResponse | null): boolean {
  return hasActionPermission(user, "submitCustomerKyc");
}

export function canApproveCustomerKyc(user: AuthResponse | null): boolean {
  return hasActionPermission(user, "approveCustomerKyc");
}

export function canReopenCustomerKyc(user: AuthResponse | null): boolean {
  return hasActionPermission(user, "reopenCustomerKyc");
}

export function canManageKycPolicy(user: AuthResponse | null): boolean {
  return hasActionPermission(user, "manageKycPolicy");
}

export function showCustomerActionsColumn(user: AuthResponse | null): boolean {
  return CUSTOMER_MENU_ACTIONS.some((action) => hasActionPermission(user, action));
}
