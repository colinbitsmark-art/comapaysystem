import type { OrderStatus } from "../types";

export type DatePreset = 'all' | 'currentWeek' | 'lastWeek' | 'currentMonth' | 'lastMonth' | 'custom';

export type OrderAccountFilterRole = 'any' | 'buy' | 'sell';

export interface OrderFilters {
  datePreset: DatePreset;
  dateFrom: string | null;
  dateTo: string | null;
  handlerId: number | null;
  customerId: number | null;
  currencyPairs: string[];
  accountId: number | null;
  accountRole: OrderAccountFilterRole;
  status: OrderStatus | null;
  tagIds: number[];
}

export interface OrderQueryParams {
  dateFrom?: string;
  dateTo?: string;
  handlerId?: number;
  customerId?: number;
  currencyPairs?: string;
  accountId?: number;
  accountRole?: OrderAccountFilterRole;
  status?: OrderStatus;
  tagIds?: string;
  page?: number;
  limit?: number;
}
