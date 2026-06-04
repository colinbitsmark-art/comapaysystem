import React from "react";
import type { Order, AuthResponse, Currency, Customer, User } from "../../types";
import { renderOrderCell } from "./OrdersTableColumns";
import { OrderActionsMenu } from "./OrderActionsMenu";
import type { Account } from "../../types";
import type { OrderStatus } from "../../types";

interface OrdersTableRowProps {
  order: Order;
  columnOrder: string[];
  visibleColumns: Set<string>;
  accounts: Account[];
  customers?: import("../../types").CustomerOption[];
  users?: User[];
  currencyByCode: Map<string, Currency>;
  getStatusTone: (status: OrderStatus) => "amber" | "blue" | "emerald" | "rose" | "slate" | "orange";
  // Selection
  showCheckbox: boolean;
  isSelected: boolean;
  onSelect: (orderId: number, selected: boolean) => void;
  // Actions
  openMenuId: number | null;
  menuPositionAbove: { [key: number]: boolean };
  menuRef: (el: HTMLDivElement | null) => void;
  menuElementRef: (el: HTMLDivElement | null) => void;
  onMenuToggle: (orderId: number) => void;
  authUser: AuthResponse | null;
  onEdit: (orderId: number) => void;
  onProcess: (orderId: number) => void;
  onView: (orderId: number) => void;
  onCancel: (orderId: number) => void;
  onDelete: (orderId: number) => void;
  canCancelOrder: boolean;
  canDeleteOrder: boolean;
  canEditAnyOrder: boolean;
  isDeleting: boolean;
  t: (key: string) => string;
  showPinHandleColumn?: boolean;
  canReorderPinned?: boolean;
  dragOverPinned?: boolean;
  onReorderPinnedDragEnd?: () => void;
  onReorderPinnedDragOver?: (orderId: number) => void;
  onReorderPinnedDragLeave?: () => void;
  onReorderPinnedDrop?: (fromOrderId: number, toOrderId: number) => void;
  canPinMore?: boolean;
  onPinOrder?: () => void;
  onUnpinOrder?: () => void;
  showPinActions?: boolean;
}

/**
 * Individual row in the orders table
 */
export function OrdersTableRow({
  order,
  columnOrder,
  visibleColumns,
  accounts,
  customers,
  users,
  currencyByCode,
  getStatusTone,
  showCheckbox,
  isSelected,
  onSelect,
  openMenuId,
  menuPositionAbove,
  menuRef,
  menuElementRef,
  onMenuToggle,
  authUser,
  onEdit,
  onProcess,
  onView,
  onCancel,
  onDelete,
  canCancelOrder,
  canDeleteOrder,
  canEditAnyOrder,
  isDeleting,
  t,
  showPinHandleColumn,
  canReorderPinned,
  dragOverPinned,
  onReorderPinnedDragEnd,
  onReorderPinnedDragOver,
  onReorderPinnedDragLeave,
  onReorderPinnedDrop,
  canPinMore,
  onPinOrder,
  onUnpinOrder,
  showPinActions = false,
}: OrdersTableRowProps) {
  const isMenuOpen = openMenuId === order.id;
  const draggable = Boolean(order.pinned && canReorderPinned);

  return (
    <tr
      key={order.id}
      className={`border-b border-slate-100 ${order.pinned ? "bg-amber-50/50" : ""} ${
        dragOverPinned ? "ring-1 ring-inset ring-amber-400" : ""
      }`}
      draggable={draggable}
      onDragStart={
        draggable
          ? (e) => {
              e.dataTransfer.setData("text/plain", String(order.id));
              e.dataTransfer.effectAllowed = "move";
              onReorderPinnedDragStart?.(order.id);
            }
          : undefined
      }
      onDragEnd={draggable ? onReorderPinnedDragEnd : undefined}
      onDragOver={
        draggable
          ? (e) => {
              e.preventDefault();
              onReorderPinnedDragOver?.(order.id);
            }
          : undefined
      }
      onDragLeave={
        draggable
          ? () => {
              onReorderPinnedDragLeave?.();
            }
          : undefined
      }
      onDrop={
        draggable
          ? (e) => {
              e.preventDefault();
              const raw = e.dataTransfer.getData("text/plain");
              const fromId = parseInt(raw, 10);
              if (!Number.isNaN(fromId) && fromId !== order.id) {
                onReorderPinnedDrop?.(fromId, order.id);
              }
              onReorderPinnedDragEnd?.();
            }
          : undefined
      }
    >
      {showPinHandleColumn && (
        <td className="py-2 w-8 align-middle text-slate-400">
          {order.pinned && canReorderPinned ? (
            <span
              className="inline-flex cursor-grab active:cursor-grabbing select-none touch-none px-0.5"
              aria-label={t("orders.pinReorderColumn")}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <circle cx="9" cy="5" r="1.5" />
                <circle cx="15" cy="5" r="1.5" />
                <circle cx="9" cy="12" r="1.5" />
                <circle cx="15" cy="12" r="1.5" />
                <circle cx="9" cy="19" r="1.5" />
                <circle cx="15" cy="19" r="1.5" />
              </svg>
            </span>
          ) : null}
        </td>
      )}
      {showCheckbox && (
        <td className="py-2">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={isSelected}
            onChange={(e) => onSelect(order.id, e.target.checked)}
          />
        </td>
      )}
      {columnOrder.map((columnKey) => 
        visibleColumns.has(columnKey) ? renderOrderCell({
          columnKey,
          order,
          accounts,
          customers,
          users,
          currencyByCode,
          getStatusTone,
          t,
        }) : null
      )}
      <td className="py-2">
        <div
          className="relative inline-block"
          ref={menuRef}
        >
          <button
            className="flex items-center justify-center p-1 hover:bg-slate-100 rounded transition-colors"
            onClick={() => onMenuToggle(order.id)}
            aria-label={t("orders.actions")}
          >
            <svg
              className="w-5 h-5 text-slate-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>

          {isMenuOpen && (
            <div 
              ref={menuElementRef}
            >
              <OrderActionsMenu
                order={order}
                isOpen={isMenuOpen}
                menuPositionAbove={menuPositionAbove[order.id] || false}
                authUser={authUser}
                onEdit={onEdit}
                onProcess={onProcess}
                onView={onView}
                onCancel={onCancel}
                onDelete={onDelete}
                canCancelOrder={canCancelOrder}
                canDeleteOrder={canDeleteOrder}
                canEditAnyOrder={canEditAnyOrder}
                isDeleting={isDeleting}
                t={t}
                showPinActions={showPinActions}
                isPinned={Boolean(order.pinned)}
                canPinMore={canPinMore !== false}
                onPin={onPinOrder}
                onUnpin={onUnpinOrder}
              />
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

