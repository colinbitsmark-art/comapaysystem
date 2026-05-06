export interface Currency {
  id: number;
  code: string;
  name: string;
  baseRateBuy: number;
  conversionRateBuy: number;
  baseRateSell: number;
  conversionRateSell: number;
  active: boolean | number;
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  remarks?: string;
}

export interface CustomerListResponse {
  customers: Customer[];
  total: number;
  page: number | null;
  limit: number | null;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  password?: string | null;
}

export interface AuthResponse {
  id: number;
  name: string;
  email: string;
  role: string;
  permissions?: RolePermissions;
  roleUpdatedAt?: string; // Timestamp when user's role was last updated (stored at login)
}

export interface RolePermissions {
  sections: string[];
  actions: Record<string, boolean>;
}

export interface Role {
  id: number;
  name: string;
  displayName: string;
  permissions: RolePermissions;
  updatedAt?: string;
}

export type OrderStatus = "saved" | "completed" | "cancelled";
export type PaymentFlow = "receive_first" | "pay_first";

export interface Tag {
  id: number;
  name: string;
  color: string;
  createdAt?: string;
}

export interface TagInput {
  name: string;
  color: string;
}

export interface Order {
  id: number;
  customerId: number;
  customerName?: string;
  fromCurrency: string;
  toCurrency: string;
  amountBuy: number;
  amountSell: number;
  rate: number;
  status: OrderStatus;
  handlerId?: number;
  handlerName?: string;
  createdBy?: number;
  createdByName?: string;
  paymentType?: "CRYPTO" | "FIAT";
  networkChain?: string;
  walletAddresses?: string[];
  bankDetails?: {
    bankName?: string;
    accountTitle?: string;
    accountNumber?: string;
    accountIban?: string;
    swiftCode?: string;
    bankAddress?: string;
  };
  hasBeneficiaries?: boolean;
  buyAccountId?: number;
  sellAccountId?: number;
  buyAccountName?: string;
  sellAccountName?: string;
  buyAccounts?: Array<{ accountId: number; accountName: string; amount: number }>;
  sellAccounts?: Array<{ accountId: number; accountName: string; amount: number }>;
  paymentFlow?: PaymentFlow;
  actualAmountBuy?: number;
  actualAmountSell?: number;
  actualRate?: number;
  serviceChargeAmount?: number | null;
  serviceChargeCurrency?: string | null;
  serviceChargeAccountId?: number | null;
  profitAmount?: number | null;
  profitCurrency?: string | null;
  profitAccountId?: number | null;
  orderType?: "online" | "otc";
  tags?: Tag[];
  remarks?: string;
  createdAt: string;
  orderDate?: string | null;
}

export interface OrderReceipt {
  id: number;
  orderId: number;
  imagePath: string;
  amount: number;
  accountId?: number;
  accountName?: string;
  status?: "draft" | "confirmed";
  createdAt: string;
}

export interface OrderBeneficiary {
  id: number;
  orderId: number;
  paymentType: "CRYPTO" | "FIAT";
  networkChain?: string;
  walletAddresses?: string[];
  bankName?: string;
  accountTitle?: string;
  accountNumber?: string;
  accountIban?: string;
  swiftCode?: string;
  bankAddress?: string;
  createdAt: string;
}

export interface OrderPayment {
  id: number;
  orderId: number;
  imagePath: string;
  amount: number;
  accountId?: number;
  accountName?: string;
  status?: "draft" | "confirmed";
  createdAt: string;
}

export interface OrderProfit {
  id: number;
  orderId: number;
  amount: number;
  currencyCode: string;
  accountId: number;
  accountName?: string;
  status: "draft" | "confirmed";
  createdAt: string;
}

export interface OrderServiceCharge {
  id: number;
  orderId: number;
  amount: number;
  currencyCode: string;
  accountId: number;
  accountName?: string;
  status: "draft" | "confirmed";
  createdAt: string;
}

export interface CustomerBeneficiary {
  id: number;
  customerId: number;
  paymentType: "CRYPTO" | "FIAT";
  networkChain?: string;
  walletAddresses?: string[];
  bankName?: string;
  accountTitle?: string;
  accountNumber?: string;
  accountIban?: string;
  swiftCode?: string;
  bankAddress?: string;
  createdAt: string;
}

export interface OrderInput {
  /** When set without customerId, server finds or creates customer by name */
  customerName?: string;
  customerId?: number;
  fromCurrency: string;
  toCurrency: string;
  amountBuy: number;
  amountSell: number;
  rate: number;
  status?: OrderStatus;
  buyAccountId?: number;
  sellAccountId?: number;
  paymentFlow?: PaymentFlow;
  serviceChargeAmount?: number | null;
  serviceChargeCurrency?: string | null;
  serviceChargeAccountId?: number | null;
  profitAmount?: number | null;
  profitCurrency?: string | null;
  profitAccountId?: number | null;
  orderType?: "online" | "otc";
  handlerId?: number;
  tagIds?: number[];
  remarks?: string;
  orderDate?: string | null;
}

export interface Account {
  id: number;
  currencyCode: string;
  currencyName?: string;
  name: string;
  balance: number;
  createdAt: string;
}

export interface AccountSummary {
  currencyCode: string;
  currencyName?: string;
  totalBalance: number;
  accountCount: number;
}

export interface AccountTransaction {
  id: number;
  accountId: number;
  type: "add" | "withdraw";
  amount: number;
  description?: string;
  createdAt: string;
}

export interface Transfer {
  id: number;
  fromAccountId: number;
  fromAccountName?: string;
  toAccountId: number;
  toAccountName?: string;
  amount: number;
  currencyCode: string;
  description?: string;
  transactionFee?: number;
  imagePath?: string | null;
  createdBy?: number;
  createdByName?: string;
  createdAt: string;
  entryDate?: string | null;
  updatedBy?: number;
  updatedByName?: string;
  updatedAt?: string;
  tags?: Tag[];
}

export interface TransferChange {
  id: number;
  transferId: number;
  changedBy?: number;
  changedByName?: string;
  changedAt: string;
  fromAccountId: number;
  fromAccountName?: string;
  toAccountId: number;
  toAccountName?: string;
  amount: number;
  description?: string;
  transactionFee?: number;
}

export interface TransferInput {
  fromAccountId: number;
  toAccountId: number;
  amount: number;
  description?: string;
  transactionFee?: number;
  imagePath?: string | null;
  createdBy?: number;
  tagIds?: number[];
  currencyCode?: string;
  createdAt?: string;
  entryDate?: string | null;
}

export type ExpenseType = 'expense' | 'income';

export interface Expense {
  id: number;
  accountId: number;
  accountName?: string;
  amount: number;
  currencyCode: string;
  description?: string;
  imagePath?: string;
  type: ExpenseType;
  createdBy?: number;
  createdByName?: string;
  createdAt: string;
  entryDate?: string | null;
  updatedBy?: number;
  updatedByName?: string;
  updatedAt?: string;
  deletedBy?: number;
  deletedByName?: string;
  deletedAt?: string;
  tags?: Tag[];
}

export interface ExpenseInput {
  accountId: number;
  amount: number;
  description?: string;
  imagePath?: string;
  type?: ExpenseType;
  createdBy?: number;
  tagIds?: number[];
  currencyCode?: string;
  createdAt?: string;
  entryDate?: string | null;
}

export interface ExpenseChange {
  id: number;
  expenseId: number;
  changedBy?: number;
  changedByName?: string;
  changedAt: string;
  accountId: number;
  accountName?: string;
  amount: number;
  description?: string;
  type?: ExpenseType;
}

export interface ProfitCalculation {
  id: number;
  name: string;
  targetCurrencyCode: string;
  initialInvestment: number;
  groups?: string[];
  isDefault?: number | boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProfitAccountMultiplier {
  id: number;
  profitCalculationId: number;
  accountId: number;
  accountName?: string;
  currencyCode?: string;
  currencyName?: string;
  balance?: number;
  multiplier: number;
  groupId?: string | null;
  groupName?: string | null;
  createdAt: string;
}

export interface ProfitExchangeRate {
  id: number;
  profitCalculationId: number;
  fromCurrencyCode: string;
  toCurrencyCode: string;
  rate: number;
  createdAt: string;
}

export interface ProfitCalculationDetails extends ProfitCalculation {
  multipliers: ProfitAccountMultiplier[];
  exchangeRates: ProfitExchangeRate[];
}

export interface CustomerLedgerEntry {
  id: number;
  customerId: number;
  customerName?: string;
  currencyCode: string;
  type: "credit" | "debit";
  amount: number;
  description?: string;
  createdBy?: number;
  createdByName?: string;
  createdAt: string;
  entryDate?: string | null;
  updatedBy?: number;
  updatedByName?: string;
  updatedAt?: string;
  deletedBy?: number;
  deletedByName?: string;
  deletedAt?: string;
}

export interface CustomerLedgerEntryInput {
  customerId: number;
  currencyCode: string;
  type: "credit" | "debit";
  amount: number;
  description?: string;
  entryDate?: string | null;
}

export interface CustomerLedgerChange {
  id: number;
  entryId: number;
  changedBy?: number;
  changedByName?: string;
  changedAt: string;
  type: "credit" | "debit";
  amount: number;
  description?: string;
  currencyCode: string;
}

export interface CustomerLedgerSummary {
  currencyCode: string;
  totalCredit: number;
  totalDebit: number;
  balance: number;
}

export interface CustomerConvertedBalance {
  customerId: number;
  convertedBalance: number;
  hasUnknownRate: boolean;
  currencyBreakdown: Array<{ currencyCode: string; balance: number }>;
}

export interface AllCustomersConvertedBalances {
  targetCurrency: string | null;
  result: CustomerConvertedBalance[];
}

// Notification types
export type NotificationType = 
  | 'approval_approved'
  | 'approval_rejected'
  | 'approval_pending'
  | 'order_assigned'
  | 'order_unassigned'
  | 'order_created'
  | 'order_completed'
  | 'order_cancelled'
  | 'order_deleted'
  | 'expense_created'
  | 'expense_deleted'
  | 'transfer_created'
  | 'transfer_deleted';

export interface Notification {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: number;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationPreferences {
  id?: number;
  userId?: number;
  notifyApprovalApproved: boolean;
  notifyApprovalRejected: boolean;
  notifyApprovalPending: boolean;
  notifyOrderAssigned: boolean;
  notifyOrderUnassigned: boolean;
  notifyOrderCreated: boolean;
  notifyOrderCompleted: boolean;
  notifyOrderCancelled: boolean;
  notifyOrderDeleted: boolean;
  notifyExpenseCreated: boolean;
  notifyExpenseDeleted: boolean;
  notifyTransferCreated: boolean;
  notifyTransferDeleted: boolean;
  notifyWalletIncoming: boolean;
  notifyWalletOutgoing: boolean;
  enableEmailNotifications: boolean;
  enablePushNotifications: boolean;
  enableTelegramNotifications: boolean;
  updatedAt?: string;
}


