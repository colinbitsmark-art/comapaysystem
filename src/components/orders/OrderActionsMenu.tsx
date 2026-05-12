import React from "react";
import type { Order, AuthResponse } from "../../types";

interface OrderActionsMenuProps {
  order: Order;
  isOpen: boolean;
  menuPositionAbove: boolean;
  authUser: AuthResponse | null;
  onEdit: (orderId: number) => void;
  /** @deprecated Process flow removed; kept for table compatibility */
  onProcess?: (orderId: number) => void;
  onView: (orderId: number) => void;
  onCancel: (orderId: number) => void;
  onDelete: (orderId: number) => void;
  canCancelOrder: boolean;
  canDeleteOrder: boolean;
  canEditAnyOrder: boolean;
  isDeleting: boolean;
  t: (key: string) => string;
  /** Logged-in user: pin / unpin this order (max 5 pins per user, enforced server-side) */
  showPinActions?: boolean;
  isPinned?: boolean;
  canPinMore?: boolean;
  onPin?: () => void;
  onUnpin?: () => void;
}

const EDIT_VIEW_STATUSES: Order["status"][] = ["saved", "completed", "cancelled"];

/**
 * Action buttons menu for an order row
 */
export function OrderActionsMenu({
  order,
  isOpen,
  menuPositionAbove,
  authUser,
  onEdit,
  onView,
  onCancel,
  onDelete,
  canCancelOrder,
  canDeleteOrder,
  canEditAnyOrder,
  isDeleting,
  t,
  showPinActions,
  isPinned,
  canPinMore,
  onPin,
  onUnpin,
}: OrderActionsMenuProps) {
  if (!isOpen) return null;

  const buttons: React.ReactElement[] = [];
  const st = order.status;

  if (showPinActions && authUser) {
    if (isPinned && onUnpin) {
      buttons.push(
        <button
          key="unpin"
          type="button"
          className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 first:rounded-t-lg"
          onClick={onUnpin}
        >
          {t("orders.unpin")}
        </button>,
      );
    } else if (onPin) {
      const atLimit = !canPinMore;
      buttons.push(
        <button
          key="pin"
          type="button"
          disabled={atLimit}
          title={atLimit ? t("orders.pinLimitReached") : undefined}
          className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 first:rounded-t-lg ${
            atLimit ? "text-slate-400 cursor-not-allowed" : "text-slate-700"
          }`}
          onClick={() => {
            if (!atLimit) onPin();
          }}
        >
          {t("orders.pinToTop")}
        </button>,
      );
    }
  }
  const showViewAction = st === "completed" || st === "cancelled";
  /** Saved orders are always editable; completed/cancelled require editAnyOrder permission. */
  const canEdit = st === "saved" || ((st === "completed" || st === "cancelled") && canEditAnyOrder);

  if (authUser && EDIT_VIEW_STATUSES.includes(st)) {
    if (canEdit) {
      buttons.push(
        <button
          key="edit"
          className="w-full text-left px-4 py-2 text-sm text-amber-600 hover:bg-slate-50 first:rounded-t-lg"
          onClick={() => onEdit(order.id)}
        >
          {t("common.edit")}
        </button>,
      );
    }
    if (showViewAction) {
      buttons.push(
        <button
          key="view"
          className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-slate-50 first:rounded-t-lg"
          onClick={() => onView(order.id)}
        >
          {t("orders.view")}
        </button>,
      );
    }
  } else if (EDIT_VIEW_STATUSES.includes(st) && showViewAction) {
    buttons.push(
      <button
        key="view"
        className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-slate-50 first:rounded-t-lg"
        onClick={() => onView(order.id)}
      >
        {t("orders.view")}
      </button>,
    );
  }

  if (canCancelOrder && authUser && st !== "cancelled") {
    buttons.push(
      <button
        key="cancel"
        className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-slate-50"
        onClick={() => onCancel(order.id)}
      >
        {t("orders.cancel")}
      </button>,
    );
  }

  if (canDeleteOrder) {
    buttons.push(
      <button
        key="delete"
        className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 last:rounded-b-lg border-t border-slate-200"
        onClick={() => onDelete(order.id)}
        disabled={isDeleting}
      >
        {isDeleting ? t("common.deleting") : t("orders.delete")}
      </button>,
    );
  }

  return (
    <div
      className={`absolute right-0 w-40 bg-white border border-slate-200 rounded-lg shadow-lg z-[9999] ${
        menuPositionAbove ? "bottom-full mb-1" : "top-0"
      }`}
    >
      {buttons}
    </div>
  );
}
