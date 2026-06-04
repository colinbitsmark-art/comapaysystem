import { db } from "../db.js";

export const CUSTOMER_KYC_ACTIONS = [
  "submitCustomerKyc",
  "approveCustomerKyc",
  "reopenCustomerKyc",
  "manageKycPolicy",
];

export const CUSTOMER_LEDGER_ACTIONS = [
  "viewCustomerLedger",
  "createLedgerDepositWithdraw",
  "editDeleteCustomerLedger",
];

function hasAction(permissions, actionKey) {
  return Boolean(permissions?.actions?.[actionKey]);
}

export function isAdminUserId(userId) {
  if (!userId) return false;
  const user = db.prepare("SELECT role FROM users WHERE id = ?").get(userId);
  return user?.role === "admin";
}

function allowed(permissions, userId, checkFn) {
  if (isAdminUserId(userId)) return true;
  return checkFn(permissions);
}

export function hasAnyCustomerKycAction(permissions) {
  return CUSTOMER_KYC_ACTIONS.some((key) => hasAction(permissions, key));
}

export function hasAnyCustomerLedgerAction(permissions) {
  return CUSTOMER_LEDGER_ACTIONS.some((key) => hasAction(permissions, key));
}

export function canViewCustomerLedger(permissions) {
  return hasAnyCustomerLedgerAction(permissions);
}

export function canCreateLedgerDepositWithdraw(permissions) {
  return (
    hasAction(permissions, "createLedgerDepositWithdraw") ||
    hasAction(permissions, "editDeleteCustomerLedger")
  );
}

export function canEditDeleteCustomerLedger(permissions) {
  return hasAction(permissions, "editDeleteCustomerLedger");
}

export function canPinCustomers(permissions, userId) {
  return allowed(permissions, userId, (p) => hasAction(p, "pinCustomers"));
}

export function canSubmitCustomerKyc(permissions, userId) {
  return allowed(permissions, userId, (p) => hasAction(p, "submitCustomerKyc"));
}

export function canApproveCustomerKyc(permissions, userId) {
  return allowed(permissions, userId, (p) => hasAction(p, "approveCustomerKyc"));
}

export function canReopenCustomerKyc(permissions, userId) {
  return allowed(permissions, userId, (p) => hasAction(p, "reopenCustomerKyc"));
}

export function canManageKycPolicy(permissions, userId) {
  return allowed(permissions, userId, (p) => hasAction(p, "manageKycPolicy"));
}

export function canFormatCustomerColors(permissions, userId) {
  return allowed(permissions, userId, (p) => hasAction(p, "formatCustomerColors"));
}

export function canUpdateCustomer(permissions, userId) {
  return allowed(permissions, userId, (p) => hasAction(p, "updateCustomer"));
}

/** PUT body only changes display colors. */
export function isDisplayColorOnlyUpdate(updates) {
  const keys = Object.keys(updates || {});
  if (!keys.length) return false;
  return keys.every((k) => k === "displayBgColor" || k === "displayTextColor");
}
