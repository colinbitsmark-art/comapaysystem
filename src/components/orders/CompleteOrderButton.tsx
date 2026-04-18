import React from "react";
import { ORDER_RECEIPT_PAYMENT_TOLERANCE } from "../../utils/orders/orderAmountTolerance";
import type { Currency, AuthResponse } from "../../types";
import { canPerformOrderActions } from "../../utils/orderPermissions";

interface OrderDetails {
  order: {
    amountBuy: number;
    amountSell: number;
    rate: number;
    fromCurrency: string;
    toCurrency: string;
    status: string;
  };
  totalReceiptAmount: number;
  totalPaymentAmount: number;
}

interface CompleteOrderButtonProps {
  orderId: number | null;
  orderDetails: OrderDetails;
  currencies: Currency[];
  updateOrderStatus: (payload: { id: number; status: "completed" }) => { unwrap: () => Promise<any> };
  calculateAmountSell: (amountBuy: number, rate: number, fromCurrency: string, toCurrency: string) => number;
  authUser?: AuthResponse | null;
  layout?: "grid" | "vertical";
  t: (key: string) => string | undefined;
}

const CompleteOrderButtonComponent: React.FC<CompleteOrderButtonProps> = ({
  orderId,
  orderDetails,
  currencies,
  updateOrderStatus,
  calculateAmountSell,
  authUser,
  layout = "vertical",
  t,
}) => {
  const isDisabled = orderDetails.order.status === "completed" || orderDetails.order.status === "cancelled";
  const canPerformActions = canPerformOrderActions(orderDetails.order as any, authUser || null);

  if (isDisabled || !canPerformActions) return null;

  const handleCompleteOrder = async () => {
    if (!orderId) return;

    const currentOrderDetails = orderDetails;
    if (!currentOrderDetails) return;

    if (currentOrderDetails.totalReceiptAmount <= 0) {
      alert(t("orders.pleaseUploadReceipts") || "Please upload at least one receipt before completing the order.");
      return;
    }

    if (currentOrderDetails.totalPaymentAmount <= 0) {
      alert(t("orders.pleaseUploadPayments") || "Please upload at least one payment before completing the order.");
      return;
    }

    const effectiveRate = currentOrderDetails.order.rate;
    const actualAmountBuy = currentOrderDetails.order.amountBuy;

    const actualReceiptAmount = currentOrderDetails.totalReceiptAmount;
    const receiptDifference = Math.abs(actualReceiptAmount - actualAmountBuy);
    if (receiptDifference > ORDER_RECEIPT_PAYMENT_TOLERANCE) {
      const missing = actualAmountBuy - actualReceiptAmount;
      if (missing > 0) {
        alert(
          `Please upload receipts for the remaining amount: ${missing.toFixed(2)} ${currentOrderDetails.order.fromCurrency}`
        );
        return;
      }
    }

    const expectedPaymentAmount = calculateAmountSell(
      actualAmountBuy,
      effectiveRate,
      currentOrderDetails.order.fromCurrency,
      currentOrderDetails.order.toCurrency
    );

    const actualPaymentAmount = currentOrderDetails.totalPaymentAmount;
    const difference = Math.abs(actualPaymentAmount - expectedPaymentAmount);

    if (difference > ORDER_RECEIPT_PAYMENT_TOLERANCE) {
      const missing = expectedPaymentAmount - actualPaymentAmount;
      if (missing > 0) {
        alert(
          `Please upload payments for the remaining amount: ${missing.toFixed(2)} ${currentOrderDetails.order.toCurrency}`
        );
        return;
      }

      const excess = actualPaymentAmount - expectedPaymentAmount;
      const getCurrencyRate = (code: string) => {
        const currency = currencies.find((c) => c.code === code);
        const candidate =
          currency?.conversionRateBuy ??
          currency?.baseRateBuy ??
          currency?.baseRateSell ??
          currency?.conversionRateSell;
        return typeof candidate === "number" ? candidate : null;
      };

      const fromRate = getCurrencyRate(currentOrderDetails.order.fromCurrency);
      const toRate = getCurrencyRate(currentOrderDetails.order.toCurrency);
      const inferredFromIsUSDT =
        fromRate !== null ? fromRate <= 1 : currentOrderDetails.order.fromCurrency === "USDT";
      const inferredToIsUSDT =
        toRate !== null ? toRate <= 1 : currentOrderDetails.order.toCurrency === "USDT";

      let baseIsFrom: boolean;
      if (inferredFromIsUSDT !== inferredToIsUSDT) {
        baseIsFrom = inferredFromIsUSDT;
      } else if (!inferredFromIsUSDT && !inferredToIsUSDT && fromRate !== null && toRate !== null) {
        baseIsFrom = fromRate < toRate;
      } else {
        baseIsFrom = true;
      }

      const additionalReceipts = baseIsFrom ? excess / effectiveRate : excess * effectiveRate;

      alert(
        `Payment exceeds expected amount. Please upload additional receipts: ${additionalReceipts.toFixed(2)} ${currentOrderDetails.order.fromCurrency}`
      );
      return;
    }

    if (window.confirm("Are you sure you want to complete this order?")) {
      await updateOrderStatus({
        id: orderId,
        status: "completed",
      }).unwrap();
    }
  };

  const containerClassName = layout === "grid" ? "lg:col-span-2 mt-6" : "mt-6";

  return (
    <div className={`${containerClassName} p-4 bg-emerald-50 border border-emerald-200 rounded-lg`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-900 mb-1">Ready to Complete Order</p>
          <p className="text-xs text-emerald-700">
            Total Receipts: {orderDetails.totalReceiptAmount.toFixed(2)} {orderDetails.order.fromCurrency} | Total
            Payments: {orderDetails.totalPaymentAmount.toFixed(2)} {orderDetails.order.toCurrency}
          </p>
        </div>
        <button
          type="button"
          onClick={handleCompleteOrder}
          className="px-6 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
        >
          Complete Order
        </button>
      </div>
    </div>
  );
};

export const CompleteOrderButton = React.memo(CompleteOrderButtonComponent);
