import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { CustomerFilters, CustomerKycFilterStatus, CustomerTypeFilter } from "../../types/customersList";

interface Props {
  filters: CustomerFilters;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onFilterChange: <K extends keyof CustomerFilters>(key: K, value: CustomerFilters[K]) => void;
  onClearFilters: () => void;
  activeFilterCount: number;
}

const selectClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

export function CustomersFilters({
  filters,
  isExpanded,
  onToggleExpanded,
  onFilterChange,
  onClearFilters,
  activeFilterCount,
}: Props) {
  const { t } = useTranslation();

  const kycOptions = useMemo(
    (): { value: CustomerKycFilterStatus; label: string }[] => [
      { value: "all", label: t("customers.filterAll") },
      { value: "none", label: t("customers.filterKycNone") },
      { value: "submitted", label: t("customerKyc.status.submitted") },
      { value: "approved", label: t("customerKyc.status.approved") },
      { value: "rejected", label: t("customerKyc.status.rejected") },
    ],
    [t],
  );

  return (
    <div className="mb-4 border-b border-slate-200 pb-4">
      <button
        type="button"
        onClick={onToggleExpanded}
        className="flex items-center justify-between w-full text-left text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors"
      >
        <span className="flex items-center gap-2">
          <svg
            className={`w-5 h-5 transition-transform ${isExpanded ? "rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          {t("customers.filters")}
        </span>
        <span className="text-xs font-normal text-slate-500">
          {activeFilterCount > 0 && `(${activeFilterCount} ${t("customers.filtersActive")})`}
        </span>
      </button>

      {isExpanded && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t("customers.customerType")}
            </label>
            <select
              value={filters.customerType}
              onChange={(e) => onFilterChange("customerType", e.target.value as CustomerTypeFilter)}
              className={selectClass}
            >
              <option value="all">{t("customers.filterAll")}</option>
              <option value="individual">{t("customers.customerTypeLabel.individual")}</option>
              <option value="corporate">{t("customers.customerTypeLabel.corporate")}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t("customers.kyc")}
            </label>
            <select
              value={filters.kycStatus}
              onChange={(e) => onFilterChange("kycStatus", e.target.value as CustomerKycFilterStatus)}
              className={selectClass}
            >
              {kycOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={onClearFilters}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {t("customers.clearFilters")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
