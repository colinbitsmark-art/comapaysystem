/** @typedef {'cash' | 'customer_balance'} ReceiptFundedFrom */

export const RECEIPT_FUNDED_CASH = "cash";
export const RECEIPT_FUNDED_CUSTOMER_BALANCE = "customer_balance";

export function normalizeReceiptFundedFrom(value) {
  if (value === RECEIPT_FUNDED_CUSTOMER_BALANCE) return RECEIPT_FUNDED_CUSTOMER_BALANCE;
  return RECEIPT_FUNDED_CASH;
}

export function isCustomerBalanceFunded(receiptOrFundedFrom) {
  const v =
    typeof receiptOrFundedFrom === "string"
      ? receiptOrFundedFrom
      : receiptOrFundedFrom?.fundedFrom;
  return v === RECEIPT_FUNDED_CUSTOMER_BALANCE;
}
