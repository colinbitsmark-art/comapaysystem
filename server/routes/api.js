import { Router } from "express";
import {
  listCurrencies,
  createCurrency,
  updateCurrency,
  deleteCurrency,
} from "../controllers/currenciesController.js";
import { getExchangeRates } from "../controllers/exchangeRatesController.js";
import {
  getReferenceRates,
  updateReferenceRates,
  sendReferenceRatesToTelegram,
} from "../controllers/referenceRatesController.js";
import {
  listCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  listCustomerBeneficiaries,
  addCustomerBeneficiary,
  updateCustomerBeneficiary,
  deleteCustomerBeneficiary,
} from "../controllers/customersController.js";
import {
  getKycSchema,
  putKycSchema,
  getCustomerKyc,
  updateCustomerKyc,
  uploadCustomerKycDocument,
  deleteCustomerKycDocument,
} from "../controllers/customerKycController.js";
import {
  getBuilderSchema,
  putBuilderSchema,
  publishBuilderSchema,
  getBuilderVersions,
  getBuilderSchemaVersion,
  deleteBuilderSchemaVersion,
} from "../controllers/kycSchemaBuilderController.js";
import {
  listLedgerEntries,
  getLedgerSummary,
  createLedgerEntry,
  updateLedgerEntry,
  deleteLedgerEntry,
  getLedgerEntryChanges,
  getAllCustomersConvertedBalances,
} from "../controllers/customerLedgerController.js";
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  updateUserPreferences,
} from "../controllers/usersController.js";
import { login, verify2fa, me, logout, get2faStatus, setup2fa, enable2fa, disable2fa, changePassword, changeEmail, forgotPassword, resetPassword } from "../controllers/authController.js";
import {
  listRoles,
  createRole,
  updateRole,
  deleteRole,
  subscribeToRoleUpdates,
  forceLogoutUsersByRole,
} from "../controllers/rolesController.js";
import {
  listOrders,
  exportOrders,
  getPinnedOrderIds,
  pinOrder,
  unpinOrder,
  reorderPinnedOrders,
  createOrder,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
  getOrderDetails,
  getOrderChanges,
  processOrder,
  addReceipt,
  addBeneficiary,
  addPayment,
  updateReceipt,
  deleteReceipt,
  confirmReceipt,
  updatePayment,
  deletePayment,
  confirmPayment,
  updateProfit,
  deleteProfit,
  confirmProfit,
  addProfitToOrder,
  updateServiceCharge,
  deleteServiceCharge,
  confirmServiceCharge,
  addServiceChargeToOrder,
} from "../controllers/ordersController.js";
import { upload, backupUpload, uploadBrandingFavicon } from "../middleware/upload.js";
import {
  listAccounts,
  getAccountsSummary,
  getAccountsByCurrency,
  createAccount,
  updateAccount,
  deleteAccount,
  addFunds,
  withdrawFunds,
  getAccountTransactions,
  clearAllTransactionLogs,
  getAccountReferences,
  getAllReferences,
} from "../controllers/accountsController.js";
import {
  listTransfers,
  exportTransfers,
  createTransfer,
  updateTransfer,
  deleteTransfer,
  getTransferChanges,
} from "../controllers/transfersController.js";
import {
  listExpenses,
  exportExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseChanges,
} from "../controllers/expensesController.js";
import {
  getProfitCalculations,
  getProfitCalculation,
  createProfitCalculation,
  updateProfitCalculation,
  deleteProfitCalculation,
  updateAccountMultiplier,
  updateExchangeRate,
  deleteGroup,
  renameGroup,
  setDefaultCalculation,
  unsetDefaultCalculation,
} from "../controllers/profitController.js";
import { 
  getSetting, 
  setSetting, 
  getPublicBranding,
  uploadSiteFavicon,
  deleteSiteFavicon,
  createBackup, 
  restoreBackup, 
  listSafetyBackups,
  restoreSafetyBackup,
  downloadSafetyBackup,
  deleteSafetyBackup,
  resetTableIds, 
  getDbSchema, 
  executeQuery,
  clearDatabase,
} from "../controllers/settingsController.js";
import {
  listTags,
  createTag,
  updateTag,
  deleteTag,
  batchAssignTags,
  batchUnassignTags,
} from "../controllers/tagsController.js";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getPreferences,
  updatePreferences,
  subscribeToNotifications,
  clearAllNotifications,
} from "../controllers/notificationsController.js";
import {
  listWallets,
  getWalletsSummary,
  createWallet,
  updateWallet,
  deleteWallet,
  refreshWalletBalance,
  getWalletTransactions,
  refreshAllWallets,
  stopPolling,
  startPolling,
  getPollingStatus,
} from "../controllers/walletsController.js";
import { serveUpload } from "../controllers/uploadsController.js";
import {
  authenticate,
  requireAdmin,
  requireSection,
  requireAnySection,
  requireAction,
} from "../middleware/authMiddleware.js";
import { loginRateLimiter, twoFactorRateLimiter, forgotPasswordRateLimiter, resetPasswordRateLimiter } from "../middleware/rateLimit.js";

const section = requireSection;
const action = requireAction;
const anySection = requireAnySection;

const router = Router();
const protectedRouter = Router();

const walletRefreshAuth = (req, res, next) => {
  const secret = process.env.INTERNAL_CRON_SECRET;
  const provided = req.headers["x-internal-cron-secret"];
  if (secret && provided === secret) {
    req.isInternalCron = true;
    return next();
  }
  return authenticate(req, res, next);
};

router.get("/health", (_req, res) => res.json({ ok: true }));

router.get("/settings/branding/public", getPublicBranding);

router.post("/auth/login", loginRateLimiter, login);
router.post("/auth/verify-2fa", twoFactorRateLimiter, verify2fa);
router.post("/auth/forgot-password", forgotPasswordRateLimiter, forgotPassword);
router.post("/auth/reset-password", resetPasswordRateLimiter, resetPassword);

// Before protectedRouter auth — internal polling uses x-internal-cron-secret, not session cookie
router.post("/wallets/refresh-all", walletRefreshAuth, refreshAllWallets);

protectedRouter.use(authenticate);

protectedRouter.get("/auth/me", me);
protectedRouter.post("/auth/logout", logout);
protectedRouter.get("/auth/2fa/status", get2faStatus);
protectedRouter.post("/auth/2fa/setup", setup2fa);
protectedRouter.post("/auth/2fa/enable", enable2fa);
protectedRouter.post("/auth/2fa/disable", disable2fa);
protectedRouter.post("/auth/change-password", changePassword);
protectedRouter.post("/auth/change-email", changeEmail);

protectedRouter.get("/uploads/*path", serveUpload);

protectedRouter.get("/roles/subscribe", subscribeToRoleUpdates);
protectedRouter.get("/notifications/subscribe", subscribeToNotifications);

protectedRouter.get("/kyc/schema", section("customers"), getKycSchema);
protectedRouter.put("/kyc/schema", section("customers"), putKycSchema);

protectedRouter.get("/kyc/builder/schema/versions", section("customers"), getBuilderVersions);
protectedRouter.get("/kyc/builder/schema/version/:id", section("customers"), getBuilderSchemaVersion);
protectedRouter.delete("/kyc/builder/schema/version/:id", section("customers"), deleteBuilderSchemaVersion);
protectedRouter.get("/kyc/builder/schema", section("customers"), getBuilderSchema);
protectedRouter.put("/kyc/builder/schema", section("customers"), putBuilderSchema);
protectedRouter.post("/kyc/builder/schema/publish", section("customers"), publishBuilderSchema);

protectedRouter.get(
  "/currencies",
  anySection("currencies", "orders", "accounts", "transfers", "expenses", "profit", "customers", "dashboard"),
  listCurrencies,
);
protectedRouter.post("/currencies", section("currencies"), action("createCurrency"), createCurrency);
protectedRouter.put("/currencies/:id", section("currencies"), action("updateCurrency"), updateCurrency);
protectedRouter.delete("/currencies/:id", section("currencies"), action("updateCurrency"), deleteCurrency);

protectedRouter.get("/exchange-rates/:currency", anySection("currencies", "orders", "accounts", "transfers", "expenses", "profit"), getExchangeRates);

protectedRouter.get("/reference-rates", section("referenceRates"), getReferenceRates);
protectedRouter.put("/reference-rates", section("referenceRates"), updateReferenceRates);
protectedRouter.post("/reference-rates/send-telegram", section("referenceRates"), sendReferenceRatesToTelegram);

protectedRouter.get("/customers", section("customers"), listCustomers);
protectedRouter.post("/customers", section("customers"), action("createCustomer"), createCustomer);
protectedRouter.put("/customers/:id", section("customers"), updateCustomer);
protectedRouter.delete("/customers/:id", section("customers"), deleteCustomer);
protectedRouter.get("/customers/:id/beneficiaries", section("customers"), listCustomerBeneficiaries);
protectedRouter.post("/customers/:id/beneficiaries", section("customers"), addCustomerBeneficiary);
protectedRouter.put("/customers/:id/beneficiaries/:beneficiaryId", section("customers"), updateCustomerBeneficiary);
protectedRouter.delete("/customers/:id/beneficiaries/:beneficiaryId", section("customers"), deleteCustomerBeneficiary);

protectedRouter.get("/customers/:id/kyc", section("customers"), getCustomerKyc);
protectedRouter.put("/customers/:id/kyc", section("customers"), updateCustomerKyc);
protectedRouter.post("/customers/:id/kyc/documents", section("customers"), upload.single("file"), uploadCustomerKycDocument);
protectedRouter.delete("/customers/:id/kyc/documents/:documentId", section("customers"), deleteCustomerKycDocument);

protectedRouter.get("/customers/ledger/converted-balances", section("customers"), getAllCustomersConvertedBalances);
protectedRouter.get("/customers/:id/ledger", section("customers"), listLedgerEntries);
protectedRouter.get("/customers/:id/ledger/summary", section("customers"), getLedgerSummary);
protectedRouter.post("/customers/:id/ledger", section("customers"), createLedgerEntry);
protectedRouter.get("/customers/ledger/:entryId/changes", section("customers"), getLedgerEntryChanges);
protectedRouter.put("/customers/:id/ledger/:entryId", section("customers"), updateLedgerEntry);
protectedRouter.delete("/customers/:id/ledger/:entryId", section("customers"), deleteLedgerEntry);

protectedRouter.get("/users", requireAdmin, listUsers);
protectedRouter.post("/users", requireAdmin, createUser);
protectedRouter.put("/users/:id", requireAdmin, updateUser);
protectedRouter.delete("/users/:id", requireAdmin, deleteUser);
protectedRouter.patch("/users/:id/preferences", updateUserPreferences);

protectedRouter.get("/roles", requireAdmin, listRoles);
protectedRouter.post("/roles", requireAdmin, createRole);
protectedRouter.put("/roles/:id", requireAdmin, updateRole);
protectedRouter.post("/roles/:id/force-logout", requireAdmin, forceLogoutUsersByRole);
protectedRouter.delete("/roles/:id", requireAdmin, deleteRole);

protectedRouter.get("/orders", section("orders"), listOrders);
protectedRouter.get("/orders/export", section("orders"), action("exportOrder"), exportOrders);
protectedRouter.get("/orders/pins", section("orders"), getPinnedOrderIds);
protectedRouter.put("/orders/pins/reorder", section("orders"), reorderPinnedOrders);
protectedRouter.post("/orders", section("orders"), action("createOrder"), createOrder);
protectedRouter.get("/orders/:id/changes", section("orders"), getOrderChanges);
protectedRouter.get("/orders/:id/details", section("orders"), getOrderDetails);
protectedRouter.post("/orders/:id/process", section("orders"), processOrder);
protectedRouter.post("/orders/:id/receipts", section("orders"), upload.single("file"), addReceipt);
protectedRouter.put("/orders/receipts/:receiptId", section("orders"), upload.single("file"), updateReceipt);
protectedRouter.delete("/orders/receipts/:receiptId", section("orders"), deleteReceipt);
protectedRouter.post("/orders/receipts/:receiptId/confirm", section("orders"), confirmReceipt);
protectedRouter.post("/orders/:id/beneficiaries", section("orders"), addBeneficiary);
protectedRouter.post("/orders/:id/payments", section("orders"), upload.single("file"), addPayment);
protectedRouter.put("/orders/payments/:paymentId", section("orders"), upload.single("file"), updatePayment);
protectedRouter.delete("/orders/payments/:paymentId", section("orders"), deletePayment);
protectedRouter.post("/orders/payments/:paymentId/confirm", section("orders"), confirmPayment);
protectedRouter.post("/orders/:id/profits", section("orders"), addProfitToOrder);
protectedRouter.put("/orders/profits/:profitId", section("orders"), updateProfit);
protectedRouter.delete("/orders/profits/:profitId", section("orders"), deleteProfit);
protectedRouter.post("/orders/profits/:profitId/confirm", section("orders"), confirmProfit);
protectedRouter.post("/orders/:id/service-charges", section("orders"), addServiceChargeToOrder);
protectedRouter.put("/orders/service-charges/:serviceChargeId", section("orders"), updateServiceCharge);
protectedRouter.delete("/orders/service-charges/:serviceChargeId", section("orders"), deleteServiceCharge);
protectedRouter.post("/orders/service-charges/:serviceChargeId/confirm", section("orders"), confirmServiceCharge);
protectedRouter.patch("/orders/:id/status", section("orders"), updateOrderStatus);
protectedRouter.post("/orders/:id/pin", section("orders"), pinOrder);
protectedRouter.delete("/orders/:id/pin", section("orders"), unpinOrder);
protectedRouter.put("/orders/:id", section("orders"), updateOrder);
protectedRouter.delete("/orders/:id", section("orders"), deleteOrder);

protectedRouter.get("/accounts", section("accounts"), listAccounts);
protectedRouter.get("/accounts/summary", section("accounts"), getAccountsSummary);
protectedRouter.get("/accounts/currency/:currencyCode", section("accounts"), getAccountsByCurrency);
protectedRouter.get("/accounts/debug/references", requireAdmin, getAllReferences);
protectedRouter.get("/accounts/:id/references", section("accounts"), getAccountReferences);
protectedRouter.post("/accounts", section("accounts"), action("createAccount"), createAccount);
protectedRouter.put("/accounts/:id", section("accounts"), action("updateAccount"), updateAccount);
protectedRouter.delete("/accounts/:id", section("accounts"), action("deleteAccount"), deleteAccount);
protectedRouter.post("/accounts/:id/add-funds", section("accounts"), action("updateAccount"), addFunds);
protectedRouter.post("/accounts/:id/withdraw-funds", section("accounts"), action("updateAccount"), withdrawFunds);
protectedRouter.get("/accounts/:id/transactions", section("accounts"), getAccountTransactions);
protectedRouter.delete("/accounts/transactions/clear-all", requireAdmin, clearAllTransactionLogs);

protectedRouter.get("/transfers", section("transfers"), listTransfers);
protectedRouter.get("/transfers/export", section("transfers"), action("exportTransfer"), exportTransfers);
protectedRouter.post("/transfers", section("transfers"), action("createTransfer"), upload.single("file"), createTransfer);
protectedRouter.get("/transfers/:id/changes", section("transfers"), getTransferChanges);
protectedRouter.put("/transfers/:id", section("transfers"), action("updateTransfer"), upload.single("file"), updateTransfer);
protectedRouter.delete("/transfers/:id", section("transfers"), action("deleteTransfer"), deleteTransfer);

protectedRouter.get("/expenses", section("expenses"), listExpenses);
protectedRouter.get("/expenses/export", section("expenses"), action("exportExpense"), exportExpenses);
protectedRouter.post("/expenses", section("expenses"), action("createExpense"), upload.single("file"), createExpense);
protectedRouter.get("/expenses/:id/changes", section("expenses"), getExpenseChanges);
protectedRouter.put("/expenses/:id", section("expenses"), action("editExpense"), upload.single("file"), updateExpense);
protectedRouter.delete("/expenses/:id", section("expenses"), action("deleteExpense"), deleteExpense);

protectedRouter.get("/profit-calculations", section("profit"), getProfitCalculations);
protectedRouter.get("/profit-calculations/:id", section("profit"), getProfitCalculation);
protectedRouter.post("/profit-calculations", section("profit"), createProfitCalculation);
protectedRouter.put("/profit-calculations/:id", section("profit"), updateProfitCalculation);
protectedRouter.delete("/profit-calculations/:id", section("profit"), deleteProfitCalculation);
protectedRouter.put("/profit-calculations/:id/multipliers/:accountId", section("profit"), updateAccountMultiplier);
protectedRouter.put("/profit-calculations/:id/exchange-rates", section("profit"), updateExchangeRate);
protectedRouter.delete("/profit-calculations/:id/groups", section("profit"), deleteGroup);
protectedRouter.put("/profit-calculations/:id/groups", section("profit"), renameGroup);
protectedRouter.put("/profit-calculations/:id/set-default", section("profit"), setDefaultCalculation);
protectedRouter.put("/profit-calculations/:id/unset-default", section("profit"), unsetDefaultCalculation);

protectedRouter.post("/settings/branding/favicon", requireAdmin, uploadBrandingFavicon.single("file"), uploadSiteFavicon);
protectedRouter.delete("/settings/branding/favicon", requireAdmin, deleteSiteFavicon);
protectedRouter.get("/settings/:key", requireAdmin, getSetting);
protectedRouter.put("/settings", requireAdmin, setSetting);
protectedRouter.post("/settings/backup", requireAdmin, createBackup);
protectedRouter.post("/settings/restore", requireAdmin, backupUpload.single("file"), restoreBackup);
protectedRouter.get("/settings/restore/safety/list", requireAdmin, listSafetyBackups);
protectedRouter.post("/settings/restore/safety", requireAdmin, restoreSafetyBackup);
protectedRouter.get("/settings/restore/safety/download", requireAdmin, downloadSafetyBackup);
protectedRouter.post("/settings/restore/safety/delete", requireAdmin, deleteSafetyBackup);
protectedRouter.post("/settings/reset-ids", requireAdmin, resetTableIds);
protectedRouter.post("/settings/clear-database", requireAdmin, clearDatabase);
protectedRouter.get("/settings/debug/schema", requireAdmin, getDbSchema);
protectedRouter.post("/settings/debug/query", requireAdmin, executeQuery);

protectedRouter.get("/tags", section("tags"), listTags);
protectedRouter.post("/tags", section("tags"), action("createTag"), createTag);
protectedRouter.put("/tags/:id", section("tags"), updateTag);
protectedRouter.delete("/tags/:id", section("tags"), action("deleteTag"), deleteTag);
protectedRouter.post("/tags/batch-assign", section("tags"), batchAssignTags);
protectedRouter.post("/tags/batch-unassign", section("tags"), batchUnassignTags);

protectedRouter.get("/notifications", getNotifications);
protectedRouter.get("/notifications/unread-count", getUnreadCount);
protectedRouter.patch("/notifications/:id/read", markAsRead);
protectedRouter.patch("/notifications/read-all", markAllAsRead);
protectedRouter.delete("/notifications/clear-all", clearAllNotifications);
protectedRouter.delete("/notifications/:id", deleteNotification);
protectedRouter.get("/notifications/preferences", getPreferences);
protectedRouter.put("/notifications/preferences", updatePreferences);

protectedRouter.get("/wallets", section("wallets"), listWallets);
protectedRouter.get("/wallets/summary", section("wallets"), getWalletsSummary);
protectedRouter.post("/wallets", section("wallets"), action("createWallet"), createWallet);
protectedRouter.put("/wallets/:id", section("wallets"), action("updateWallet"), updateWallet);
protectedRouter.delete("/wallets/:id", section("wallets"), action("deleteWallet"), deleteWallet);
protectedRouter.post("/wallets/:id/refresh", section("wallets"), refreshWalletBalance);
protectedRouter.get("/wallets/:id/transactions", section("wallets"), getWalletTransactions);

protectedRouter.get("/wallets/polling/status", section("wallets"), getPollingStatus);
protectedRouter.post("/wallets/polling/stop", requireAdmin, stopPolling);
protectedRouter.post("/wallets/polling/start", requireAdmin, startPolling);

router.use(protectedRouter);

export default router;


