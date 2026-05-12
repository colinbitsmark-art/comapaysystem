import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { OrdersTableRow } from "./OrdersTableRow";
import { Pagination } from "../common/Pagination";
import { getStatusTone } from "../../utils/orders/orderFormatters";
import type { Order, Account, AuthResponse } from "../../types";

interface OrdersTableProps {
  orders: Order[];
  accounts: Account[];
  // Column management
  columnOrder: string[];
  visibleColumns: Set<string>;
  getColumnLabel: (key: string) => string;
  // Selection
  showCheckbox: boolean;
  selectedOrderIds: number[];
  onSelectOrder: (orderId: number, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  // Actions
  openMenuId: number | null;
  menuPositionAbove: { [key: number]: boolean };
  menuRefs: React.MutableRefObject<{ [key: number]: HTMLDivElement | null }>;
  menuElementRefs: React.MutableRefObject<{ [key: number]: HTMLDivElement | null }>;
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
  // Pagination
  currentPage: number;
  totalPages: number;
  totalOrders: number;
  onPageChange: (page: number) => void;
  /** Pinned order ids for current user (for pin limit + reorder) */
  pinnedOrderIds?: number[];
  onReorderPinned?: (fromOrderId: number, toOrderId: number) => void;
  onPinOrder?: (orderId: number) => void;
  onUnpinOrder?: (orderId: number) => void;
  closeOrderMenu?: () => void;
}

/**
 * Main orders table component
 */
export function OrdersTable({
  orders,
  accounts,
  columnOrder,
  visibleColumns,
  getColumnLabel,
  showCheckbox,
  selectedOrderIds,
  onSelectOrder,
  onSelectAll,
  openMenuId,
  menuPositionAbove,
  menuRefs,
  menuElementRefs,
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
  currentPage,
  totalPages,
  totalOrders,
  onPageChange,
  pinnedOrderIds = [],
  onReorderPinned,
  onPinOrder,
  onUnpinOrder,
  closeOrderMenu,
}: OrdersTableProps) {
  const { t } = useTranslation();
  const [dragOverPinnedId, setDragOverPinnedId] = useState<number | null>(null);

  const pinnedOnPage = orders.filter((o) => o.pinned).map((o) => o.id);
  const canReorderPinned =
    Boolean(authUser && onReorderPinned) &&
    pinnedOrderIds.length > 1 &&
    pinnedOnPage.length === pinnedOrderIds.length &&
    pinnedOrderIds.every((id) => pinnedOnPage.includes(id));
  const showPinHandleColumn = Boolean(authUser && canReorderPinned);
  const canPinMore = pinnedOrderIds.length < 5;

  const handleMenuRef = useCallback((orderId: number) => (el: HTMLDivElement | null) => {
    menuRefs.current[orderId] = el;
  }, [menuRefs]);

  const handleMenuElementRef = useCallback((orderId: number) => (el: HTMLDivElement | null) => {
    menuElementRefs.current[orderId] = el;
  }, [menuElementRefs]);

  return (
    <>
      <div className="overflow-x-auto min-h-[60vh]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-600">
              {showPinHandleColumn && (
                <th className="py-2 w-8" aria-label={t("orders.pinReorderColumn")} />
              )}
              {showCheckbox && (
                <th className="py-2 w-8">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={!!orders.length && selectedOrderIds.length === orders.length}
                    onChange={(e) => onSelectAll(e.target.checked)}
                  />
                </th>
              )}
              {columnOrder.map((columnKey) => 
                visibleColumns.has(columnKey) && (
                  <th key={columnKey} className="py-2">{getColumnLabel(columnKey)}</th>
                )
              )}
              <th className="py-2">{t("orders.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <OrdersTableRow
                key={order.id}
                order={order}
                columnOrder={columnOrder}
                visibleColumns={visibleColumns}
                accounts={accounts}
                getStatusTone={getStatusTone}
                showCheckbox={showCheckbox}
                isSelected={selectedOrderIds.includes(order.id)}
                onSelect={onSelectOrder}
                openMenuId={openMenuId}
                menuPositionAbove={menuPositionAbove}
                menuRef={handleMenuRef(order.id)}
                menuElementRef={handleMenuElementRef(order.id)}
                onMenuToggle={onMenuToggle}
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
                showPinHandleColumn={showPinHandleColumn}
                canReorderPinned={canReorderPinned}
                dragOverPinned={dragOverPinnedId === order.id}
                onReorderPinnedDragOver={(id) => setDragOverPinnedId(id)}
                onReorderPinnedDragLeave={() => setDragOverPinnedId(null)}
                onReorderPinnedDragEnd={() => setDragOverPinnedId(null)}
                onReorderPinnedDrop={(fromId, toId) => {
                  setDragOverPinnedId(null);
                  onReorderPinned?.(fromId, toId);
                }}
                canPinMore={canPinMore}
                onPinOrder={
                  onPinOrder
                    ? () => {
                        onPinOrder(order.id);
                        closeOrderMenu?.();
                      }
                    : undefined
                }
                onUnpinOrder={
                  onUnpinOrder
                    ? () => {
                        onUnpinOrder(order.id);
                        closeOrderMenu?.();
                      }
                    : undefined
                }
              />
            ))}
            {!orders.length && (
              <tr>
                <td
                  className="py-4 text-sm text-slate-500"
                  colSpan={
                    columnOrder.filter((k) => visibleColumns.has(k)).length +
                    (showCheckbox ? 1 : 0) +
                    (showPinHandleColumn ? 1 : 0) +
                    1
                  }
                >
                  {t("orders.noOrders")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalOrders}
        onPageChange={onPageChange}
        t={t}
      />
    </>
  );
}

