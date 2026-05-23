import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useGetReferenceRatesQuery } from "../../services/api";
import { useReferenceRatesPanelLayout } from "../../hooks/useReferenceRatesPanelLayout";
import { hasActionPermission, hasSectionAccess } from "../../utils/permissions";
import { useAppSelector } from "../../app/hooks";
import ReferenceRatesPanelTable from "./ReferenceRatesPanelTable";

const PANEL_WIDTH = 320;
/** Wide enough for short title + locale datetime + chevron on one row */
const PANEL_COLLAPSED_WIDTH = 252;
const DRAG_THRESHOLD_PX = 6;

export default function ReferenceRatesFloatingPanel() {
  const { t, i18n } = useTranslation();
  const user = useAppSelector((s) => s.auth.user);
  const canDisplayPanel = hasActionPermission(user, "displayReferenceRatesPanel");
  const canOpenConfig = hasSectionAccess(user, "referenceRates");

  const { data, isLoading, isError } = useGetReferenceRatesQuery(undefined, {
    skip: !user || !canDisplayPanel,
    refetchOnMountOrArgChange: true,
    pollingInterval: canDisplayPanel ? 30_000 : 0,
  });
  const { collapsed, setCollapsed, position, persistPosition, clampPosition, pairOrder, reorderPairs } =
    useReferenceRatesPanelLayout();

  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(
    null,
  );
  const headerInteractionRef = useRef<{ moved: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);

  const lastUpdatedLabel =
    data?.updatedAt != null
      ? new Date(data.updatedAt).toLocaleString(i18n.language)
      : null;

  const handleResizeClamp = useCallback(() => {
    const w = collapsed ? PANEL_COLLAPSED_WIDTH : PANEL_WIDTH;
    const h = panelRef.current?.offsetHeight ?? 48;
    persistPosition(clampPosition(position, w, h));
  }, [collapsed, clampPosition, persistPosition, position]);

  useEffect(() => {
    window.addEventListener("resize", handleResizeClamp);
    return () => window.removeEventListener("resize", handleResizeClamp);
  }, [handleResizeClamp]);

  const onHeaderPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    headerInteractionRef.current = { moved: false };
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: position.x,
      originY: position.y,
    };
  };

  const onHeaderPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || !headerInteractionRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (
      !headerInteractionRef.current.moved &&
      (Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX)
    ) {
      headerInteractionRef.current.moved = true;
      setDragging(true);
    }
    if (!headerInteractionRef.current.moved) return;
    const w = collapsed ? PANEL_COLLAPSED_WIDTH : PANEL_WIDTH;
    const h = panelRef.current?.offsetHeight ?? 200;
    persistPosition(
      clampPosition(
        {
          x: dragRef.current.originX + dx,
          y: dragRef.current.originY + dy,
        },
        w,
        h,
      ),
    );
  };

  const onHeaderPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (headerInteractionRef.current && !headerInteractionRef.current.moved) {
      setCollapsed(!collapsed);
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    dragRef.current = null;
    headerInteractionRef.current = null;
    setDragging(false);
  };

  const onHeaderKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setCollapsed(!collapsed);
    }
  };

  if (!user || !canDisplayPanel) return null;

  return (
    <div
      ref={panelRef}
      className="fixed z-[8000] select-none"
      style={{
        left: position.x,
        top: position.y,
        width: collapsed ? PANEL_COLLAPSED_WIDTH : PANEL_WIDTH,
      }}
    >
      <div
        className="theme-card overflow-hidden rounded-xl border shadow-lg"
        style={{ borderColor: "var(--theme-border)" }}
      >
        <div
          role="button"
          tabIndex={0}
          aria-expanded={!collapsed}
          aria-label={collapsed ? t("referenceRates.expandPanel") : t("referenceRates.collapsePanel")}
          className={`flex min-h-[2.5rem] flex-row items-center gap-2 border-b px-3 py-2 outline-none transition-colors hover:bg-slate-50/80 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/40 ${
            dragging ? "cursor-grabbing" : "cursor-pointer"
          }`}
          style={{
            borderColor: "var(--theme-border)",
            backgroundColor: "var(--theme-card-bg)",
            touchAction: "none",
          }}
          onPointerDown={onHeaderPointerDown}
          onPointerMove={onHeaderPointerMove}
          onPointerUp={onHeaderPointerUp}
          onPointerCancel={onHeaderPointerUp}
          onKeyDown={onHeaderKeyDown}
        >
          <span
            className={`shrink-0 truncate font-semibold ${collapsed ? "text-xs" : "text-sm"}`}
            title={collapsed ? t("referenceRates.shortTitle") : t("referenceRates.title")}
          >
            {collapsed ? t("referenceRates.shortTitle") : t("referenceRates.title")}
          </span>
          {lastUpdatedLabel ? (
            <span
              className="min-w-0 flex-1 truncate text-right text-[10px] leading-tight text-slate-500"
              title={`${t("referenceRates.lastUpdated")}: ${lastUpdatedLabel}`}
            >
              {lastUpdatedLabel}
            </span>
          ) : (
            <span className="flex-1" aria-hidden />
          )}
          <span
            className="shrink-0 text-base leading-none"
            style={{ color: "var(--theme-text-secondary)" }}
            aria-hidden
          >
            {collapsed ? "▸" : "▾"}
          </span>
        </div>

        {!collapsed && (
          <div
            className="max-h-[min(70vh,420px)] overflow-y-auto p-2"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {isLoading && (
              <p className="px-2 py-4 text-center text-sm text-slate-500">{t("common.loading")}</p>
            )}
            {isError && (
              <p className="px-2 py-4 text-center text-sm text-red-600">{t("referenceRates.loadError")}</p>
            )}
            {data?.pairs && (
              <ReferenceRatesPanelTable
                pairs={data.pairs}
                pairOrder={pairOrder}
                onReorder={reorderPairs}
              />
            )}
            {canOpenConfig && (
              <div className="mt-2 border-t pt-2 text-center" style={{ borderColor: "var(--theme-border)" }}>
                <Link
                  to="/reference-rates"
                  className="text-xs font-semibold text-blue-600 hover:underline"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  {t("referenceRates.configure")}
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
