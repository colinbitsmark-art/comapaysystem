import React, { useCallback, useEffect, useState } from "react";

interface PageJumpInputProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  t: (key: string) => string;
  className?: string;
}

function clampPage(page: number, totalPages: number): number {
  return Math.min(totalPages, Math.max(1, page));
}

/**
 * Page number field — type a page and press Enter to navigate.
 */
export function PageJumpInput({
  currentPage,
  totalPages,
  onPageChange,
  t,
  className = "",
}: PageJumpInputProps) {
  const [pageInput, setPageInput] = useState(String(currentPage));

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  const commitPage = useCallback(() => {
    const trimmed = pageInput.trim();
    if (!trimmed) {
      setPageInput(String(currentPage));
      return;
    }
    const parsed = Number.parseInt(trimmed, 10);
    if (!Number.isFinite(parsed)) {
      setPageInput(String(currentPage));
      return;
    }
    const page = clampPage(parsed, totalPages);
    onPageChange(page);
    setPageInput(String(page));
  }, [pageInput, currentPage, totalPages, onPageChange]);

  return (
    <span className={`inline-flex items-center gap-1.5 text-sm text-slate-600 ${className}`}>
      <span>{t("common.page") || "Page"}</span>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label={t("common.goToPage") || "Go to page"}
        title={t("common.goToPageHint") || "Enter a page number and press Enter"}
        value={pageInput}
        onChange={(e) => setPageInput(e.target.value.replace(/\D/g, ""))}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commitPage();
          }
        }}
        onBlur={commitPage}
        className="w-14 rounded-lg border border-slate-300 px-2 py-1.5 text-center text-sm font-semibold text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <span>
        {t("common.of") || "of"} {totalPages}
      </span>
    </span>
  );
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage?: number;
  onPageChange: (page: number) => void;
  t: (key: string) => string;
  entityName?: string; // e.g., "orders", "expenses", "transfers"
}

/**
 * Generic pagination component
 */
export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage = 20,
  onPageChange,
  t,
  entityName = "items",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
      <div className="text-sm text-slate-600">
        {t("common.showing") || "Showing"} {startItem} {t("common.to") || "to"}{" "}
        {endItem} {t("common.of") || "of"} {"("}{totalItems} {entityName}{")"}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {t("common.previous") || "Previous"}
        </button>
        <PageJumpInput
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          t={t}
        />
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {t("common.next") || "Next"}
        </button>
      </div>
    </div>
  );
}
