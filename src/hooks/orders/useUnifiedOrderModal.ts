import { useState, useEffect, useCallback, useRef, useLayoutEffect, type FormEvent } from "react";
import {
  useAddOrderMutation,
  useUpdateOrderMutation,
  useUpdateOrderStatusMutation,
  useGetOrderDetailsQuery,
  useAddReceiptMutation,
  useAddPaymentMutation,
  useDeleteReceiptMutation,
  useDeletePaymentMutation,
  useConfirmReceiptMutation,
  useConfirmPaymentMutation,
  useAddProfitToOrderMutation,
  useConfirmProfitMutation,
  useDeleteProfitMutation,
  useAddServiceChargeToOrderMutation,
  useConfirmServiceChargeMutation,
  useDeleteServiceChargeMutation,
} from "../../services/api";
import type { Account, AuthResponse, Currency, Tag } from "../../types";
import { ORDER_RECEIPT_PAYMENT_TOLERANCE } from "../../utils/orders/orderAmountTolerance";

export type UnifiedLineKind = "receipt" | "payment" | "profit" | "service_charge";

export type UnifiedLine = {
  localId: string;
  kind: UnifiedLineKind;
  amount: string;
  accountId: string;
  file: File | null;
  serverImagePath?: string;
  serverReceiptId?: number;
  serverPaymentId?: number;
  serviceChargeMode?: "fixed" | "percentage";
  serviceChargePercent?: string;
  /** Currency selected for this service charge (free choice, not restricted to the pair) */
  serviceChargeCurrency?: string;
};

function newLine(kind: UnifiedLineKind): UnifiedLine {
  return {
    localId: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    kind,
    amount: "",
    accountId: "",
    file: null,
    ...(kind === "service_charge" ? { serviceChargeMode: "fixed" as const, serviceChargePercent: "", serviceChargeCurrency: "" } : {}),
  };
}

function toDatetimeLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function useUnifiedOrderModal(
  currencies: Currency[],
  accounts: Account[],
  authUser: AuthResponse | null,
) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isSubmittingRef = useRef(false);

  const [customerName, setCustomerName] = useState("");
  const [fromCurrency, setFromCurrency] = useState("");
  const [toCurrency, setToCurrency] = useState("");
  const [amountBuy, setAmountBuy] = useState("");
  const [amountSell, setAmountSell] = useState("");
  const [rate, setRate] = useState("");
  const [handlerId, setHandlerId] = useState("");
  const [lines, setLines] = useState<UnifiedLine[]>([newLine("receipt"), newLine("payment")]);
  const [remarks, setRemarks] = useState("");
  const [showRemarks, setShowRemarks] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [orderDate, setOrderDate] = useState(() => toDatetimeLocal(new Date()));
  const amountsRef = useRef({ amountBuy, amountSell, rate, fromCurrency, toCurrency });
  amountsRef.current = { amountBuy, amountSell, rate, fromCurrency, toCurrency };

  useEffect(() => {
    if (fromCurrency && toCurrency && fromCurrency === toCurrency) {
      setToCurrency("");
    }
  }, [fromCurrency, toCurrency]);

  const { data: orderDetails } = useGetOrderDetailsQuery(editingOrderId || 0, {
    skip: !editingOrderId,
  });

  const [addOrder] = useAddOrderMutation();
  const [updateOrder] = useUpdateOrderMutation();
  const [updateOrderStatus] = useUpdateOrderStatusMutation();
  const [addReceipt] = useAddReceiptMutation();
  const [addPayment] = useAddPaymentMutation();
  const [deleteReceipt] = useDeleteReceiptMutation();
  const [deletePayment] = useDeletePaymentMutation();
  const [confirmReceipt] = useConfirmReceiptMutation();
  const [confirmPayment] = useConfirmPaymentMutation();
  const [addProfitToOrder] = useAddProfitToOrderMutation();
  const [confirmProfit] = useConfirmProfitMutation();
  const [deleteProfit] = useDeleteProfitMutation();
  const [addServiceChargeToOrder] = useAddServiceChargeToOrderMutation();
  const [confirmServiceCharge] = useConfirmServiceChargeMutation();
  const [deleteServiceCharge] = useDeleteServiceChargeMutation();

  const getBaseCurrency = useCallback(
    (from: string, to: string): boolean | null => {
      const fromC = currencies.find((c) => c.code === from);
      const toC = currencies.find((c) => c.code === to);
      if (!fromC || !toC) return null;
      const fromRate =
        fromC.conversionRateBuy ?? fromC.baseRateBuy ?? fromC.baseRateSell ?? fromC.conversionRateSell;
      const toRate =
        toC.conversionRateBuy ?? toC.baseRateBuy ?? toC.baseRateSell ?? toC.conversionRateSell;
      const fromIs = typeof fromRate === "number" ? fromRate <= 1 : from === "USDT";
      const toIs = typeof toRate === "number" ? toRate <= 1 : to === "USDT";
      if (fromIs !== toIs) return fromIs;
      if (typeof fromRate === "number" && typeof toRate === "number" && fromRate !== toRate) {
        return fromRate < toRate;
      }
      return true;
    },
    [currencies],
  );

  /** Same rules as OtcOrderModal: baseIsFrom → sell = buy×rate, else sell = buy/rate */
  const computeSellFromBuyStr = useCallback(
    (buyStr: string, rateStr: string): string | null => {
      if (!buyStr || !rateStr || !fromCurrency || !toCurrency) return null;
      const r = Number(rateStr);
      const buy = Number(buyStr);
      if (Number.isNaN(r) || r <= 0 || Number.isNaN(buy)) return null;
      const baseIsFrom = getBaseCurrency(fromCurrency, toCurrency);
      let sell: number;
      if (baseIsFrom === true) {
        sell = buy * r;
      } else if (baseIsFrom === false) {
        sell = buy / r;
      } else {
        sell = buy * r;
      }
      return sell.toFixed(4);
    },
    [fromCurrency, toCurrency, getBaseCurrency],
  );

  const computeBuyFromSellStr = useCallback(
    (sellStr: string, rateStr: string): string | null => {
      if (!sellStr || !rateStr || !fromCurrency || !toCurrency) return null;
      const r = Number(rateStr);
      const sell = Number(sellStr);
      if (Number.isNaN(r) || r <= 0 || Number.isNaN(sell)) return null;
      const baseIsFrom = getBaseCurrency(fromCurrency, toCurrency);
      let buy: number;
      if (baseIsFrom === true) {
        buy = sell / r;
      } else if (baseIsFrom === false) {
        buy = sell * r;
      } else {
        buy = sell / r;
      }
      return buy.toFixed(4);
    },
    [fromCurrency, toCurrency, getBaseCurrency],
  );

  const handleAmountBuyChange = useCallback(
    (value: string) => {
      setAmountBuy(value);
      if (value && rate && fromCurrency && toCurrency) {
        const next = computeSellFromBuyStr(value, rate);
        if (next != null) setAmountSell(next);
      }
    },
    [rate, fromCurrency, toCurrency, computeSellFromBuyStr],
  );

  const handleAmountSellChange = useCallback(
    (value: string) => {
      setAmountSell(value);
      if (value && rate && fromCurrency && toCurrency) {
        const next = computeBuyFromSellStr(value, rate);
        if (next != null) setAmountBuy(next);
      }
    },
    [rate, fromCurrency, toCurrency, computeBuyFromSellStr],
  );

  const handleRateChange = useCallback((value: string) => {
    setRate(value);
  }, []);

  // When pair or rate changes, refresh the derived side (same as OTC) without tying to every keystroke on amounts
  useLayoutEffect(() => {
    if (!isOpen || !fromCurrency || !toCurrency) return;
    const { amountBuy: b, amountSell: s, rate: rt } = amountsRef.current;
    const r = Number(rt);
    if (Number.isNaN(r) || r <= 0) return;
    const buyTrim = b.trim();
    const sellTrim = s.trim();
    if (buyTrim) {
      const next = computeSellFromBuyStr(buyTrim, rt);
      if (next != null) setAmountSell(next);
    } else if (sellTrim) {
      const next = computeBuyFromSellStr(sellTrim, rt);
      if (next != null) setAmountBuy(next);
    }
  }, [
    isOpen,
    fromCurrency,
    toCurrency,
    rate,
    computeSellFromBuyStr,
    computeBuyFromSellStr,
  ]);

  /** Set amounts on the first receipt and first payment rows from buy/sell totals. */
  const fillReceiptPaymentFromTotals = useCallback(() => {
    const buy = amountBuy.trim();
    const sell = amountSell.trim();
    if (!buy || !sell || Number(buy) <= 0 || Number(sell) <= 0) return;
    setLines((prev) => {
      let receiptDone = false;
      let paymentDone = false;
      return prev.map((line) => {
        if (line.kind === "receipt" && !receiptDone) {
          receiptDone = true;
          return { ...line, amount: buy };
        }
        if (line.kind === "payment" && !paymentDone) {
          paymentDone = true;
          return { ...line, amount: sell };
        }
        return line;
      });
    });
  }, [amountBuy, amountSell]);

  const resetForm = useCallback(() => {
    setCustomerName("");
    setFromCurrency("");
    setToCurrency("");
    setAmountBuy("");
    setAmountSell("");
    setRate("");
    setHandlerId("");
    setLines([newLine("receipt"), newLine("payment")]);
    setRemarks("");
    setShowRemarks(false);
    setSelectedTagIds([]);
    setShowTagPicker(false);
    setOrderDate(toDatetimeLocal(new Date()));
  }, []);

  const closeModal = useCallback(() => {
    resetForm();
    setIsOpen(false);
    setEditingOrderId(null);
    isSubmittingRef.current = false;
    setIsSaving(false);
  }, [resetForm]);

  useEffect(() => {
    if (!editingOrderId || !orderDetails?.order) return;
    const order = orderDetails.order;
    setCustomerName(order.customerName || "");
    setFromCurrency(order.fromCurrency);
    setToCurrency(order.toCurrency);
    setAmountBuy(String(order.amountBuy));
    setAmountSell(String(order.amountSell));
    setRate(String(order.rate));
    setHandlerId((order as { handlerId?: number | null }).handlerId ? String((order as { handlerId?: number | null }).handlerId) : "");
    const nextLines: UnifiedLine[] = [];
    for (const r of orderDetails.receipts || []) {
      nextLines.push({
        localId: `r-${r.id}`,
        kind: "receipt",
        amount: String(r.amount ?? ""),
        accountId: r.accountId ? String(r.accountId) : "",
        file: null,
        serverImagePath: r.imagePath,
        serverReceiptId: r.id,
      });
    }
    for (const p of orderDetails.payments || []) {
      nextLines.push({
        localId: `p-${p.id}`,
        kind: "payment",
        amount: String(p.amount ?? ""),
        accountId: p.accountId ? String(p.accountId) : "",
        file: null,
        serverImagePath: p.imagePath,
        serverPaymentId: p.id,
      });
    }
    const scs = orderDetails.serviceCharges || [];
    for (const sc of scs) {
      nextLines.push({
        localId: `sc-${sc.id}`,
        kind: "service_charge",
        amount: String(sc.amount ?? ""),
        accountId: sc.accountId ? String(sc.accountId) : "",
        file: null,
        serviceChargeMode: "fixed",
        serviceChargePercent: "",
        serviceChargeCurrency: sc.currencyCode || "",
      });
    }
    if (nextLines.length === 0) {
      nextLines.push(newLine("receipt"), newLine("payment"));
    }
    setLines(nextLines);
    const rm = (order as { remarks?: string | null }).remarks;
    if (rm && rm.trim()) {
      setRemarks(rm);
      setShowRemarks(true);
    } else {
      setRemarks("");
      setShowRemarks(false);
    }
    const tagList = (order as { tags?: Tag[] }).tags;
    if (tagList && Array.isArray(tagList) && tagList.length > 0) {
      setSelectedTagIds(tagList.map((x) => x.id));
      setShowTagPicker(true);
    } else {
      setSelectedTagIds([]);
      setShowTagPicker(false);
    }
    const existingDate = (order as { orderDate?: string | null; createdAt?: string | null }).orderDate
      || (order as { createdAt?: string | null }).createdAt;
    if (existingDate) {
      try {
        setOrderDate(toDatetimeLocal(new Date(existingDate)));
      } catch {
        setOrderDate(toDatetimeLocal(new Date()));
      }
    }
  }, [editingOrderId, orderDetails]);

  const addLineRow = useCallback((kind: UnifiedLineKind) => {
    setLines((prev) => [...prev, newLine(kind)]);
  }, []);

  const addPresetServiceCharge = useCallback((amount: string) => {
    setLines((prev) => [...prev, { ...newLine("service_charge"), amount }]);
  }, []);

  const buildPayload = useCallback(() => {
    const receiptLines = lines.filter((l) => l.kind === "receipt");
    const paymentLines = lines.filter((l) => l.kind === "payment");
    const scLines = lines.filter((l) => l.kind === "service_charge");
    const firstReceiptAcc = receiptLines.find((l) => l.accountId)?.accountId;
    const firstPayAcc = paymentLines.find((l) => l.accountId)?.accountId;
    const payload: Record<string, unknown> = {
      fromCurrency,
      toCurrency,
      amountBuy: Number(amountBuy || 0),
      amountSell: Number(amountSell || 0),
      rate: Number(rate || 1),
      handlerId: handlerId ? Number(handlerId) : null,
      buyAccountId: firstReceiptAcc ? Number(firstReceiptAcc) : undefined,
      sellAccountId: firstPayAcc ? Number(firstPayAcc) : undefined,
      remarks: showRemarks && remarks.trim() ? remarks.trim() : null,
      orderDate: orderDate ? new Date(orderDate).toISOString() : new Date().toISOString(),
      tagIds: selectedTagIds,
      // Signal updateOrder to delete any existing draft profits/SCs so we can recreate them
      profitAmount: null,
      serviceChargeAmount: null,
    };

    // Resolve service charge amounts (percentage → fixed)
    const resolvedScLines = scLines.map((scLine) => {
      if (!scLine.accountId) return null;
      const acc = accounts.find((a) => a.id === Number(scLine.accountId));
      if (!acc) return null;
      let resolvedAmount: number;
      if (scLine.serviceChargeMode === "percentage" && scLine.serviceChargePercent) {
        const pct = Number(scLine.serviceChargePercent);
        const base = acc.currencyCode === fromCurrency
          ? Number(amountBuy || 0)
          : Number(amountSell || 0);
        resolvedAmount = (pct / 100) * base;
      } else {
        resolvedAmount = Number(scLine.amount || 0);
      }
      if (resolvedAmount === 0) return null;
      return { amount: resolvedAmount, currencyCode: acc.currencyCode, accountId: Number(scLine.accountId) };
    }).filter((x): x is { amount: number; currencyCode: string; accountId: number } => x !== null);

    const resolvedProfitLines: { amount: number; currencyCode: string; accountId: number }[] = [];

    return { payload, receiptLines, paymentLines, resolvedProfitLines, resolvedScLines };
  }, [
    lines,
    fromCurrency,
    toCurrency,
    amountBuy,
    amountSell,
    rate,
    handlerId,
    remarks,
    showRemarks,
    accounts,
    orderDate,
    selectedTagIds,
  ]);

  const replaceReceiptsPayments = async (orderId: number, confirmEach: boolean) => {
    if (orderDetails) {
      for (const r of orderDetails.receipts || []) {
        try {
          await deleteReceipt(r.id).unwrap();
        } catch {
          /* ignore */
        }
      }
      for (const p of orderDetails.payments || []) {
        try {
          await deletePayment(p.id).unwrap();
        } catch {
          /* ignore */
        }
      }
    }
    const { receiptLines, paymentLines } = buildPayload();
    for (const line of receiptLines) {
      const amt = Number(line.amount) || 0;
      if (amt === 0 || !line.accountId) continue;
      const res = await addReceipt({
        id: orderId,
        amount: amt,
        accountId: Number(line.accountId),
        file: line.file || undefined,
        imagePath: line.file ? undefined : line.serverImagePath || "",
      } as { id: number; amount: number; accountId: number; file?: File; imagePath?: string }).unwrap();
      if (confirmEach) {
        await confirmReceipt((res as { id: number }).id).unwrap();
      }
    }
    for (const line of paymentLines) {
      const amt = Number(line.amount) || 0;
      if (amt === 0 || !line.accountId) continue;
      const res = await addPayment({
        id: orderId,
        amount: amt,
        accountId: Number(line.accountId),
        file: line.file || undefined,
        imagePath: line.file ? undefined : line.serverImagePath || "",
      } as { id: number; amount: number; accountId: number; file?: File; imagePath?: string }).unwrap();
      if (confirmEach) {
        await confirmPayment((res as { id: number }).id).unwrap();
      }
    }
  };

  /** Delete all existing profit and service charge entries for this order (both draft and confirmed), then create new ones. */
  const replaceProfitsAndSCs = async (
    orderId: number,
    resolvedProfitLines: { amount: number; currencyCode: string; accountId: number }[],
    resolvedScLines: { amount: number; currencyCode: string; accountId: number }[],
    confirm: boolean,
  ) => {
    if (orderDetails) {
      for (const p of orderDetails.profits || []) {
        try {
          await deleteProfit(p.id).unwrap();
        } catch {
          /* ignore */
        }
      }
      for (const sc of orderDetails.serviceCharges || []) {
        try {
          await deleteServiceCharge(sc.id).unwrap();
        } catch {
          /* ignore */
        }
      }
    }
    await createAndConfirmProfitsAndSCs(orderId, resolvedProfitLines, resolvedScLines, confirm);
  };

  const createAndConfirmProfitsAndSCs = async (
    orderId: number,
    resolvedProfitLines: { amount: number; currencyCode: string; accountId: number }[],
    resolvedScLines: { amount: number; currencyCode: string; accountId: number }[],
    confirm: boolean,
  ) => {
    for (const p of resolvedProfitLines) {
      try {
        const created = await addProfitToOrder({ orderId, ...p }).unwrap() as { id: number };
        if (confirm) {
          await confirmProfit(created.id).unwrap();
        }
      } catch {
        /* ignore individual failures so order save still completes */
      }
    }
    for (const sc of resolvedScLines) {
      try {
        const created = await addServiceChargeToOrder({ orderId, ...sc }).unwrap() as { id: number };
        if (confirm) {
          await confirmServiceCharge(created.id).unwrap();
        }
      } catch {
        /* ignore */
      }
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (isSaving || isSubmittingRef.current) return;
    if (!customerName.trim() || !fromCurrency || !toCurrency) {
      alert("Customer name and currency pair are required.");
      return;
    }
    isSubmittingRef.current = true;
    setIsSaving(true);
    try {
      const { payload, receiptLines, paymentLines, resolvedProfitLines, resolvedScLines } = buildPayload();
      if (editingOrderId && orderDetails?.order) {
        await updateOrder({
          id: editingOrderId,
          data: {
            ...payload,
            customerId: orderDetails.order.customerId,
          } as any,
        }).unwrap();
        // Delete all existing profits/SCs (including confirmed ones) then recreate as drafts
        await replaceProfitsAndSCs(editingOrderId, resolvedProfitLines, resolvedScLines, false);
        await replaceReceiptsPayments(editingOrderId, false);
      } else {
        const created = await addOrder({
          ...payload,
          customerName: customerName.trim(),
          status: "saved",
        } as any).unwrap();
        const orderId = created.id as number;
        await updateOrder({ id: orderId, data: payload as any }).unwrap();
        // Create all profit and SC draft entries (leave as drafts for saved orders)
        await createAndConfirmProfitsAndSCs(orderId, resolvedProfitLines, resolvedScLines, false);
        for (const line of receiptLines) {
          const amt = Number(line.amount) || 0;
          if (amt === 0 || !line.accountId) continue;
          await addReceipt({
            id: orderId,
            amount: amt,
            accountId: Number(line.accountId),
            file: line.file || undefined,
            imagePath: line.file ? undefined : "",
          } as any).unwrap();
        }
        for (const line of paymentLines) {
          const amt = Number(line.amount) || 0;
          if (amt === 0 || !line.accountId) continue;
          await addPayment({
            id: orderId,
            amount: amt,
            accountId: Number(line.accountId),
            file: line.file || undefined,
            imagePath: line.file ? undefined : "",
          } as any).unwrap();
        }
      }
      closeModal();
    } catch (err: any) {
      console.error(err);
      alert(err?.data?.message || err?.message || "Failed to save order");
    } finally {
      isSubmittingRef.current = false;
      setIsSaving(false);
    }
  };

  const handleComplete = async (e: FormEvent) => {
    e.preventDefault();
    if (isSaving || isSubmittingRef.current) return;
    if (!customerName.trim() || !fromCurrency || !toCurrency) {
      alert("Customer name and currency pair are required.");
      return;
    }
    const { receiptLines, paymentLines } = buildPayload();
    const hasValidReceiptLine = receiptLines.some((l) => (Number(l.amount) || 0) > 0 && !!l.accountId);
    const hasValidPaymentLine = paymentLines.some((l) => (Number(l.amount) || 0) > 0 && !!l.accountId);
    if (!hasValidReceiptLine) {
      alert("At least one receipt line must have amount and account before completing.");
      return;
    }
    if (!hasValidPaymentLine) {
      alert("At least one payment line must have amount and account before completing.");
      return;
    }

    const partialReceiptLines = receiptLines.filter((l) => {
      const hasAmount = (Number(l.amount) || 0) > 0;
      const hasAccount = !!l.accountId;
      return hasAmount !== hasAccount;
    });
    if (partialReceiptLines.length > 0) {
      alert("Each receipt line must have both amount and account, or leave both empty.");
      return;
    }

    const partialPaymentLines = paymentLines.filter((l) => {
      const hasAmount = (Number(l.amount) || 0) > 0;
      const hasAccount = !!l.accountId;
      return hasAmount !== hasAccount;
    });
    if (partialPaymentLines.length > 0) {
      alert("Each payment line must have both amount and account, or leave both empty.");
      return;
    }

    const receiptTotal = receiptLines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
    const paymentTotal = paymentLines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
    const buy = Number(amountBuy || 0);
    const sell = Number(amountSell || 0);
    if (Math.abs(receiptTotal - buy) > ORDER_RECEIPT_PAYMENT_TOLERANCE) {
      alert(`Receipt total (${receiptTotal.toFixed(2)}) must match Amount Buy (${buy.toFixed(2)})`);
      return;
    }
    if (Math.abs(paymentTotal - sell) > ORDER_RECEIPT_PAYMENT_TOLERANCE) {
      alert(`Payment total (${paymentTotal.toFixed(2)}) must match Amount Sell (${sell.toFixed(2)})`);
      return;
    }
    const badR = receiptLines.filter((l) => (Number(l.amount) || 0) > 0 && !l.accountId);
    if (badR.length) {
      alert("Each receipt line with an amount needs an account.");
      return;
    } 
    const badP = paymentLines.filter((l) => (Number(l.amount) || 0) > 0 && !l.accountId);
    if (badP.length) {
      alert("Each payment line with an amount needs an account.");
      return;
    }
    isSubmittingRef.current = true;
    setIsSaving(true);
    try {
      const { payload, resolvedProfitLines, resolvedScLines } = buildPayload();
      let orderId: number;
      if (editingOrderId && orderDetails?.order) {
        orderId = editingOrderId;
        await updateOrder({
          id: orderId,
          data: { ...payload, customerId: orderDetails.order.customerId } as any,
        }).unwrap();
        // Delete all existing profits/SCs (including confirmed ones) then recreate and confirm
        await replaceProfitsAndSCs(orderId, resolvedProfitLines, resolvedScLines, true);
        await replaceReceiptsPayments(orderId, true);
      } else {
        const created = await addOrder({
          ...payload,
          customerName: customerName.trim(),
          status: "saved",
        } as any).unwrap();
        orderId = created.id as number;
        await updateOrder({ id: orderId, data: payload as any }).unwrap();
        // Create and immediately confirm all profits and SCs
        await createAndConfirmProfitsAndSCs(orderId, resolvedProfitLines, resolvedScLines, true);
        const { receiptLines: rl, paymentLines: pl } = buildPayload();
        for (const line of rl) {
          const amt = Number(line.amount) || 0;
          if (amt === 0 || !line.accountId) continue;
          const res = await addReceipt({
            id: orderId,
            amount: amt,
            accountId: Number(line.accountId),
            file: line.file || undefined,
            imagePath: line.file ? undefined : "",
          } as any).unwrap();
          await confirmReceipt((res as { id: number }).id).unwrap();
        }
        for (const line of pl) {
          const amt = Number(line.amount) || 0;
          if (amt === 0 || !line.accountId) continue;
          const res = await addPayment({
            id: orderId,
            amount: amt,
            accountId: Number(line.accountId),
            file: line.file || undefined,
            imagePath: line.file ? undefined : "",
          } as any).unwrap();
          await confirmPayment((res as { id: number }).id).unwrap();
        }
      }
      await updateOrderStatus({ id: orderId, status: "completed" }).unwrap();
      closeModal();
    } catch (err: any) {
      console.error(err);
      alert(err?.data?.message || err?.message || "Failed to complete order");
    } finally {
      isSubmittingRef.current = false;
      setIsSaving(false);
    }
  };

  const openNew = useCallback(() => {
    resetForm();
    setEditingOrderId(null);
    setIsOpen(true);
  }, [resetForm]);

  const openEdit = useCallback((orderId: number) => {
    resetForm();
    setEditingOrderId(orderId);
    setIsOpen(true);
  }, [resetForm]);

  return {
    isOpen,
    setIsOpen,
    editingOrderId,
    setEditingOrderId,
    isSaving,
    customerName,
    setCustomerName,
    fromCurrency,
    setFromCurrency,
    toCurrency,
    setToCurrency,
    amountBuy,
    setAmountBuy,
    amountSell,
    setAmountSell,
    rate,
    setRate,
    handlerId,
    setHandlerId,
    lines,
    setLines,
    remarks,
    setRemarks,
    showRemarks,
    setShowRemarks,
    selectedTagIds,
    setSelectedTagIds,
    showTagPicker,
    setShowTagPicker,
    orderDate,
    setOrderDate,
    orderDetails,
    closeModal,
    openNew,
    openEdit,
    handleSave,
    handleComplete,
    addLineRow,
    addPresetServiceCharge,
    fillReceiptPaymentFromTotals,
    handleAmountBuyChange,
    handleAmountSellChange,
    handleRateChange,
    getBaseCurrency,
  };
}
