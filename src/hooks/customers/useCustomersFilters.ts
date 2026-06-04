import { useCallback, useMemo, useState } from "react";
import type { CustomerFilters, CustomerListQueryParams } from "../../types/customersList";

const defaultFilters: CustomerFilters = {
  customerType: "all",
  kycStatus: "all",
};

export function useCustomersFilters(
  currentPage: number,
  setCurrentPage: (page: number) => void,
  search: string,
  sortBy?: "balance" | "profitLoss",
  sortDir?: "asc" | "desc",
  pageSize = 20,
) {
  const [filters, setFilters] = useState<CustomerFilters>(defaultFilters);
  const [isExpanded, setIsExpanded] = useState(false);

  const buildQueryParams = useCallback((): CustomerListQueryParams => {
    const params: CustomerListQueryParams = {
      page: currentPage,
      limit: pageSize,
    };
    const trimmed = search.trim();
    if (trimmed) params.search = trimmed;
    if (sortBy) params.sortBy = sortBy;
    if (sortDir) params.sortDir = sortDir;
    if (filters.customerType !== "all") params.customerType = filters.customerType;
    if (filters.kycStatus !== "all") params.kycStatus = filters.kycStatus;
    return params;
  }, [currentPage, pageSize, search, sortBy, sortDir, filters]);

  const queryParams = useMemo(() => buildQueryParams(), [buildQueryParams]);

  const updateFilter = useCallback(
    <K extends keyof CustomerFilters>(key: K, value: CustomerFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
      setCurrentPage(1);
    },
    [setCurrentPage],
  );

  const clearFilters = useCallback(() => {
    setFilters(defaultFilters);
    setCurrentPage(1);
  }, [setCurrentPage]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.customerType !== "all") n += 1;
    if (filters.kycStatus !== "all") n += 1;
    return n;
  }, [filters]);

  return {
    filters,
    isExpanded,
    setIsExpanded,
    queryParams,
    updateFilter,
    clearFilters,
    activeFilterCount,
  };
}
