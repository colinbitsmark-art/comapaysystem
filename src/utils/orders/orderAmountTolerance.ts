/**
 * Max allowed absolute difference between header amounts (Amount Buy / Amount Sell)
 * and summed receipt or payment lines when completing an order.
 * Currency exchange amounts are often rounded in practice.
 */
export const ORDER_RECEIPT_PAYMENT_TOLERANCE = 2;
