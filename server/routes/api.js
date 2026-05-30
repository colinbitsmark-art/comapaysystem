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
} from "../middleware/authMiddleware.js";
import { loginRateLimiter, twoFactorRateLimiter, forgotPasswordRateLimiter, resetPasswordRateLimiter } from "../middleware/rateLimit.js";

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

protectedRouter.get("/kyc/schema", getKycSchema);
protectedRouter.put("/kyc/schema", putKycSchema);

protectedRouter.get("/kyc/builder/schema/versions", getBuilderVersions);
protectedRouter.get("/kyc/builder/schema/version/:id", getBuilderSchemaVersion);
protectedRouter.delete("/kyc/builder/schema/version/:id", deleteBuilderSchemaVersion);
protectedRouter.get("/kyc/builder/schema", getBuilderSchema);
protectedRouter.put("/kyc/builder/schema", putBuilderSchema);
protectedRouter.post("/kyc/builder/schema/publish", publishBuilderSchema);

protectedRouter.get("/currencies", listCurrencies);
protectedRouter.post("/currencies", createCurrency);
protectedRouter.put("/currencies/:id", updateCurrency);
protectedRouter.delete("/currencies/:id", deleteCurrency);

protectedRouter.get("/exchange-rates/:currency", getExchangeRates);

protectedRouter.get("/reference-rates", getReferenceRates);
protectedRouter.put("/reference-rates", updateReferenceRates);
protectedRouter.post("/reference-rates/send-telegram", sendReferenceRatesToTelegram);

protectedRouter.get("/customers", listCustomers);
protectedRouter.post("/customers", createCustomer);
protectedRouter.put("/customers/:id", updateCustomer);
protectedRouter.delete("/customers/:id", deleteCustomer);
protectedRouter.get("/customers/:id/beneficiaries", listCustomerBeneficiaries);
protectedRouter.post("/customers/:id/beneficiaries", addCustomerBeneficiary);
protectedRouter.put("/customers/:id/beneficiaries/:beneficiaryId", updateCustomerBeneficiary);
protectedRouter.delete("/customers/:id/beneficiaries/:beneficiaryId", deleteCustomerBeneficiary);

protectedRouter.get("/customers/:id/kyc", getCustomerKyc);
protectedRouter.put("/customers/:id/kyc", updateCustomerKyc);
protectedRouter.post("/customers/:id/kyc/documents", upload.single("file"), uploadCustomerKycDocument);
protectedRouter.delete("/customers/:id/kyc/documents/:documentId", deleteCustomerKycDocument);

protectedRouter.get("/customers/ledger/converted-balances", getAllCustomersConvertedBalances);
protectedRouter.get("/customers/:id/ledger", listLedgerEntries);
protectedRouter.get("/customers/:id/ledger/summary", getLedgerSummary);
protectedRouter.post("/customers/:id/ledger", createLedgerEntry);
protectedRouter.get("/customers/ledger/:entryId/changes", getLedgerEntryChanges);
protectedRouter.put("/customers/:id/ledger/:entryId", updateLedgerEntry);
protectedRouter.delete("/customers/:id/ledger/:entryId", deleteLedgerEntry);

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

protectedRouter.get("/orders", listOrders);
protectedRouter.get("/orders/export", exportOrders);
protectedRouter.get("/orders/pins", getPinnedOrderIds);
protectedRouter.put("/orders/pins/reorder", reorderPinnedOrders);
protectedRouter.post("/orders", createOrder);
protectedRouter.get("/orders/:id/changes", getOrderChanges);
protectedRouter.get("/orders/:id/details", getOrderDetails);
protectedRouter.post("/orders/:id/process", processOrder);
protectedRouter.post("/orders/:id/receipts", upload.single("file"), addReceipt);
protectedRouter.put("/orders/receipts/:receiptId", upload.single("file"), updateReceipt);
protectedRouter.delete("/orders/receipts/:receiptId", deleteReceipt);
protectedRouter.post("/orders/receipts/:receiptId/confirm", confirmReceipt);
protectedRouter.post("/orders/:id/beneficiaries", addBeneficiary);
protectedRouter.post("/orders/:id/payments", upload.single("file"), addPayment);
protectedRouter.put("/orders/payments/:paymentId", upload.single("file"), updatePayment);
protectedRouter.delete("/orders/payments/:paymentId", deletePayment);
protectedRouter.post("/orders/payments/:paymentId/confirm", confirmPayment);
protectedRouter.post("/orders/:id/profits", addProfitToOrder);
protectedRouter.put("/orders/profits/:profitId", updateProfit);
protectedRouter.delete("/orders/profits/:profitId", deleteProfit);
protectedRouter.post("/orders/profits/:profitId/confirm", confirmProfit);
protectedRouter.post("/orders/:id/service-charges", addServiceChargeToOrder);
protectedRouter.put("/orders/service-charges/:serviceChargeId", updateServiceCharge);
protectedRouter.delete("/orders/service-charges/:serviceChargeId", deleteServiceCharge);
protectedRouter.post("/orders/service-charges/:serviceChargeId/confirm", confirmServiceCharge);
protectedRouter.patch("/orders/:id/status", updateOrderStatus);
protectedRouter.post("/orders/:id/pin", pinOrder);
protectedRouter.delete("/orders/:id/pin", unpinOrder);
protectedRouter.put("/orders/:id", updateOrder);
protectedRouter.delete("/orders/:id", deleteOrder);

protectedRouter.get("/accounts", listAccounts);
protectedRouter.get("/accounts/summary", getAccountsSummary);
protectedRouter.get("/accounts/currency/:currencyCode", getAccountsByCurrency);
protectedRouter.get("/accounts/debug/references", requireAdmin, getAllReferences);
protectedRouter.get("/accounts/:id/references", getAccountReferences);
protectedRouter.post("/accounts", createAccount);
protectedRouter.put("/accounts/:id", updateAccount);
protectedRouter.delete("/accounts/:id", deleteAccount);
protectedRouter.post("/accounts/:id/add-funds", addFunds);
protectedRouter.post("/accounts/:id/withdraw-funds", withdrawFunds);
protectedRouter.get("/accounts/:id/transactions", getAccountTransactions);
protectedRouter.delete("/accounts/transactions/clear-all", requireAdmin, clearAllTransactionLogs);

protectedRouter.get("/transfers", listTransfers);
protectedRouter.get("/transfers/export", exportTransfers);
protectedRouter.post("/transfers", upload.single("file"), createTransfer);
protectedRouter.get("/transfers/:id/changes", getTransferChanges);
protectedRouter.put("/transfers/:id", upload.single("file"), updateTransfer);
protectedRouter.delete("/transfers/:id", deleteTransfer);

protectedRouter.get("/expenses", listExpenses);
protectedRouter.get("/expenses/export", exportExpenses);
protectedRouter.post("/expenses", upload.single("file"), createExpense);
protectedRouter.get("/expenses/:id/changes", getExpenseChanges);
protectedRouter.put("/expenses/:id", upload.single("file"), updateExpense);
protectedRouter.delete("/expenses/:id", deleteExpense);

protectedRouter.get("/profit-calculations", getProfitCalculations);
protectedRouter.get("/profit-calculations/:id", getProfitCalculation);
protectedRouter.post("/profit-calculations", createProfitCalculation);
protectedRouter.put("/profit-calculations/:id", updateProfitCalculation);
protectedRouter.delete("/profit-calculations/:id", deleteProfitCalculation);
protectedRouter.put("/profit-calculations/:id/multipliers/:accountId", updateAccountMultiplier);
protectedRouter.put("/profit-calculations/:id/exchange-rates", updateExchangeRate);
protectedRouter.delete("/profit-calculations/:id/groups", deleteGroup);
protectedRouter.put("/profit-calculations/:id/groups", renameGroup);
protectedRouter.put("/profit-calculations/:id/set-default", setDefaultCalculation);
protectedRouter.put("/profit-calculations/:id/unset-default", unsetDefaultCalculation);

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

protectedRouter.get("/tags", listTags);
protectedRouter.post("/tags", createTag);
protectedRouter.put("/tags/:id", updateTag);
protectedRouter.delete("/tags/:id", deleteTag);
protectedRouter.post("/tags/batch-assign", batchAssignTags);
protectedRouter.post("/tags/batch-unassign", batchUnassignTags);

protectedRouter.get("/notifications", getNotifications);
protectedRouter.get("/notifications/unread-count", getUnreadCount);
protectedRouter.patch("/notifications/:id/read", markAsRead);
protectedRouter.patch("/notifications/read-all", markAllAsRead);
protectedRouter.delete("/notifications/clear-all", clearAllNotifications);
protectedRouter.delete("/notifications/:id", deleteNotification);
protectedRouter.get("/notifications/preferences", getPreferences);
protectedRouter.put("/notifications/preferences", updatePreferences);

protectedRouter.get("/wallets", listWallets);
protectedRouter.get("/wallets/summary", getWalletsSummary);
protectedRouter.post("/wallets", createWallet);
protectedRouter.put("/wallets/:id", updateWallet);
protectedRouter.delete("/wallets/:id", deleteWallet);
protectedRouter.post("/wallets/:id/refresh", refreshWalletBalance);
protectedRouter.get("/wallets/:id/transactions", getWalletTransactions);
protectedRouter.post("/wallets/refresh-all", walletRefreshAuth, refreshAllWallets);

protectedRouter.get("/wallets/polling/status", getPollingStatus);
protectedRouter.post("/wallets/polling/stop", stopPolling);
protectedRouter.post("/wallets/polling/start", startPolling);

router.use(protectedRouter);

export default router;


