import { useCallback, type FormEvent } from "react";
import type { OrderStatus, Order } from "../../types";

interface UseOrdersActionsParams {
  orders: Order[];
  updateOrderStatus: any;
  deleteOrder: any;
  setOpenMenuId: (id: number | null) => void;
  setConfirmModal: (modal: {
    isOpen: boolean;
    message: string;
    orderId: number | null;
    isBulk?: boolean;
  }) => void;
  setAlertModal: (modal: {
    isOpen: boolean;
    message: string;
    type?: "error" | "warning" | "info" | "success";
  }) => void;
  openOrderEditor: (orderId: number) => void;
  selectedOrderIds: number[];
  setSelectedOrderIds: (ids: number[]) => void;
  setIsBatchDeleteMode: (isBatch: boolean) => void;
  t: (key: string) => string;
}

export function useOrdersActions({
  orders,
  updateOrderStatus,
  deleteOrder,
  setOpenMenuId,
  setConfirmModal,
  setAlertModal,
  openOrderEditor,
  selectedOrderIds,
  setSelectedOrderIds,
  setIsBatchDeleteMode,
  t,
}: UseOrdersActionsParams) {
  const setStatus = useCallback(
    async (id: number, status: OrderStatus) => {
      await updateOrderStatus({ id, status });
      setOpenMenuId(null);
    },
    [updateOrderStatus, setOpenMenuId],
  );

  const handleDeleteClick = useCallback(
    (id: number) => {
      setConfirmModal({
        isOpen: true,
        message: t("orders.confirmDeleteOrder") || "Are you sure you want to delete this order?",
        orderId: id,
        isBulk: false,
      });
      setOpenMenuId(null);
    },
    [t, setConfirmModal, setOpenMenuId],
  );

  const handleDelete = async (id: number) => {
    try {
      await deleteOrder(id).unwrap();
      setConfirmModal({ isOpen: false, message: "", orderId: null, isBulk: false });
    } catch (error: any) {
      let message = "Cannot delete order. An error occurred.";

      if (error?.data) {
        if (typeof error.data === "string") {
          message = error.data;
        } else if (error.data.message) {
          message = error.data.message;
        }
      }

      setConfirmModal({ isOpen: false, message: "", orderId: null, isBulk: false });
      setAlertModal({ isOpen: true, message, type: "error" });
    }
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(selectedOrderIds.map((id) => deleteOrder(id).unwrap()));
      setSelectedOrderIds([]);
      setIsBatchDeleteMode(false);
      setConfirmModal({ isOpen: false, message: "", orderId: null, isBulk: false });
    } catch (error: any) {
      let message = "Cannot delete orders. An error occurred.";

      if (error?.data) {
        if (typeof error.data === "string") {
          message = error.data;
        } else if (error.data.message) {
          message = error.data.message;
        }
      }

      setConfirmModal({ isOpen: false, message: "", orderId: null, isBulk: false });
      setAlertModal({ isOpen: true, message, type: "error" });
    }
  };

  const startEdit = useCallback(
    (orderId: number) => {
      openOrderEditor(orderId);
      setOpenMenuId(null);
    },
    [openOrderEditor, setOpenMenuId],
  );

  const submit = async (_event: FormEvent) => {};

  const handleProcess = async (_event: FormEvent) => {};

  return {
    setStatus,
    handleDeleteClick,
    handleDelete,
    handleBulkDelete,
    startEdit,
    submit,
    handleProcess,
  };
}
