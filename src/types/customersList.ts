import type { CustomerType } from "../types";

export type CustomerKycFilterStatus =
  | "all"
  | "none"
  | "submitted"
  | "approved"
  | "rejected";

export type CustomerTypeFilter = "all" | CustomerType;

export interface CustomerFilters {
  customerType: CustomerTypeFilter;
  kycStatus: CustomerKycFilterStatus;
}

export interface CustomerListQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: "balance" | "profitLoss";
  sortDir?: "asc" | "desc";
  customerType?: CustomerType;
  kycStatus?: Exclude<CustomerKycFilterStatus, "all">;
}
