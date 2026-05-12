import { useState, useEffect, useRef, useCallback, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import SectionCard from "../components/common/SectionCard";
import { Pagination } from "../components/common/Pagination";
import AlertModal from "../components/common/AlertModal";
import ConfirmModal from "../components/common/ConfirmModal";
import type { Customer, CustomerBeneficiary, CustomerType } from "../types";
import {
  useAddCustomerMutation,
  useGetCustomersQuery,
  useUpdateCustomerMutation,
  useDeleteCustomerMutation,
  useAddCustomerBeneficiaryMutation,
  useGetCustomerBeneficiariesQuery,
  useUpdateCustomerBeneficiaryMutation,
  useDeleteCustomerBeneficiaryMutation,
  useGetAllCustomersConvertedBalancesQuery,
} from "../services/api";

const PAGE_SIZE = 20;

export default function CustomersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const { data: customersData, isLoading } = useGetCustomersQuery({
    page: currentPage,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
  });
  const customers = customersData?.customers ?? [];
  const totalCustomers = customersData?.total ?? 0;
  const totalPages = Math.ceil(totalCustomers / PAGE_SIZE);
  const [addCustomer, { isLoading: isSaving }] = useAddCustomerMutation();
  const [addCustomerBeneficiary, { isLoading: isSavingBeneficiary }] =
    useAddCustomerBeneficiaryMutation();
  const [updateCustomerBeneficiary, { isLoading: isUpdatingBeneficiary }] =
    useUpdateCustomerBeneficiaryMutation();
  const [deleteCustomerBeneficiary, { isLoading: isDeletingBeneficiary }] =
    useDeleteCustomerBeneficiaryMutation();
  const [updateCustomer] = useUpdateCustomerMutation();
  const [deleteCustomer, { isLoading: isDeleting }] = useDeleteCustomerMutation();
  const { data: convertedBalancesData } = useGetAllCustomersConvertedBalancesQuery();

  // 3-dot action menu state
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [menuPositionAbove, setMenuPositionAbove] = useState<Record<number, boolean>>({});
  const menuRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const menuElementRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const handleMenuRef = useCallback(
    (id: number) => (el: HTMLDivElement | null) => { menuRefs.current[id] = el; },
    [],
  );
  const handleMenuElementRef = useCallback(
    (id: number) => (el: HTMLDivElement | null) => { menuElementRefs.current[id] = el; },
    [],
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (openMenuId === null) return;
      const menu = menuRefs.current[openMenuId];
      if (menu && !menu.contains(e.target as Node)) setOpenMenuId(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openMenuId]);

  useEffect(() => {
    if (openMenuId === null) return;
    const btn = menuRefs.current[openMenuId];
    const menuEl = menuElementRefs.current[openMenuId];
    if (!btn) return;
    requestAnimationFrame(() => {
      const rect = btn.getBoundingClientRect();
      const menuH = menuEl?.offsetHeight || 180;
      const spaceBelow = window.innerHeight - rect.bottom;
      const shouldPositionAbove = spaceBelow < menuH + 10 && rect.top > spaceBelow;
      setMenuPositionAbove((prev) => ({ ...prev, [openMenuId]: shouldPositionAbove }));
    });
  }, [openMenuId]);

  const balanceByCustomer = Object.fromEntries(
    (convertedBalancesData?.result ?? []).map((b) => [b.customerId, b])
  );
  const targetCurrency = convertedBalancesData?.targetCurrency ?? null;

  const fmtBalance = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; message: string; type?: "error" | "warning" | "info" | "success" }>({
    isOpen: false,
    message: "",
    type: "error",
  });

  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; message: string; customerId: number | null }>({
    isOpen: false,
    message: "",
    customerId: null,
  });

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    remarks: "",
    customerType: "individual" as CustomerType,
  });

  const [includeBeneficiary, setIncludeBeneficiary] = useState(false);
  const [beneficiaryForm, setBeneficiaryForm] = useState({
    paymentType: "CRYPTO" as "CRYPTO" | "FIAT",
    networkChain: "",
    walletAddresses: [""],
    bankName: "",
    accountTitle: "",
    accountNumber: "",
    accountIban: "",
    swiftCode: "",
    bankAddress: "",
  });

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedForm = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      remarks: form.remarks.trim(),
      customerType: form.customerType,
    };

    if (!trimmedForm.name) {
      setAlertModal({
        isOpen: true,
        message: t("customers.nameRequired") || "Customer name is required.",
        type: "warning",
      });
      return;
    }

    let newCustomer;
    try {
      newCustomer = await addCustomer({
        ...trimmedForm,
        id: undefined,
      }).unwrap();
    } catch (err: any) {
      let message = t("customers.saveFailed") || "Could not save customer. Please try again.";
      if (err?.status === 409) {
        message = t("customers.duplicateName") || message;
      } else if (err?.data) {
        if (typeof err.data === "string") {
          message = err.data;
        } else if (err.data.message) {
          message = err.data.message;
        }
      }

      setAlertModal({ isOpen: true, message, type: "error" });
      return;
    }

    const hasBeneficiaryData =
      includeBeneficiary &&
      (beneficiaryForm.paymentType === "CRYPTO"
        ? beneficiaryForm.networkChain || beneficiaryForm.walletAddresses.some((addr) => addr.trim())
        : beneficiaryForm.bankName ||
          beneficiaryForm.accountTitle ||
          beneficiaryForm.accountNumber ||
          beneficiaryForm.accountIban ||
          beneficiaryForm.swiftCode ||
          beneficiaryForm.bankAddress);

    if (newCustomer?.id && hasBeneficiaryData) {
      const payload: any = {
        customerId: newCustomer.id,
        paymentType: beneficiaryForm.paymentType,
      };

      if (beneficiaryForm.paymentType === "CRYPTO") {
        payload.networkChain = beneficiaryForm.networkChain || null;
        payload.walletAddresses = beneficiaryForm.walletAddresses.filter((addr) => addr.trim());
      } else {
        payload.bankName = beneficiaryForm.bankName || null;
        payload.accountTitle = beneficiaryForm.accountTitle || null;
        payload.accountNumber = beneficiaryForm.accountNumber || null;
        payload.accountIban = beneficiaryForm.accountIban || null;
        payload.swiftCode = beneficiaryForm.swiftCode || null;
        payload.bankAddress = beneficiaryForm.bankAddress || null;
      }

      await addCustomerBeneficiary(payload);
    }

    setForm({ name: "", email: "", phone: "", remarks: "", customerType: "individual" });
    setIncludeBeneficiary(false);
    setBeneficiaryForm({
      paymentType: "CRYPTO",
      networkChain: "",
      walletAddresses: [""],
      bankName: "",
      accountTitle: "",
      accountNumber: "",
      accountIban: "",
      swiftCode: "",
      bankAddress: "",
    });
    setIsCreateModalOpen(false);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    setForm({ name: "", email: "", phone: "", remarks: "", customerType: "individual" });
    setIncludeBeneficiary(false);
    setBeneficiaryForm({
      paymentType: "CRYPTO",
      networkChain: "",
      walletAddresses: [""],
      bankName: "",
      accountTitle: "",
      accountNumber: "",
      accountIban: "",
      swiftCode: "",
      bankAddress: "",
    });
  };

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<typeof form | null>(null);
  const [editingBeneficiaryId, setEditingBeneficiaryId] = useState<number | null>(null);
  const [editBeneficiaryForm, setEditBeneficiaryForm] = useState({
    paymentType: "CRYPTO" as "CRYPTO" | "FIAT",
    networkChain: "",
    walletAddresses: [""],
    bankName: "",
    accountTitle: "",
    accountNumber: "",
    accountIban: "",
    swiftCode: "",
    bankAddress: "",
  });

  const { data: editingBeneficiaries = [], isLoading: isLoadingBeneficiaries } =
    useGetCustomerBeneficiariesQuery(editingId ?? 0, {
      skip: !editingId,
    });

  const startEditBeneficiary = (beneficiaryId: number) => {
    const b = editingBeneficiaries.find((item: CustomerBeneficiary) => item.id === beneficiaryId);
    if (!b) return;
    setEditingBeneficiaryId(beneficiaryId);
    if (b.paymentType === "CRYPTO") {
      setEditBeneficiaryForm({
        paymentType: "CRYPTO",
        networkChain: b.networkChain || "",
        walletAddresses: b.walletAddresses && b.walletAddresses.length > 0 ? b.walletAddresses : [""],
        bankName: "",
        accountTitle: "",
        accountNumber: "",
        accountIban: "",
        swiftCode: "",
        bankAddress: "",
      });
    } else {
      setEditBeneficiaryForm({
        paymentType: "FIAT",
        networkChain: "",
        walletAddresses: [""],
        bankName: b.bankName || "",
        accountTitle: b.accountTitle || "",
        accountNumber: b.accountNumber || "",
        accountIban: b.accountIban || "",
        swiftCode: b.swiftCode || "",
        bankAddress: b.bankAddress || "",
      });
    }
  };

  const cancelEditBeneficiary = () => {
    setEditingBeneficiaryId(null);
    setEditBeneficiaryForm({
      paymentType: "CRYPTO",
      networkChain: "",
      walletAddresses: [""],
      bankName: "",
      accountTitle: "",
      accountNumber: "",
      accountIban: "",
      swiftCode: "",
      bankAddress: "",
    });
  };

  const startEdit = (id: number) => {
    const current = customers.find((c: Customer) => c.id === id);
    if (!current) return;
    setEditingId(id);
    setEditForm({
      name: current.name,
      email: current.email,
      phone: current.phone,
      remarks: current.remarks || "",
      customerType: current.customerType === "corporate" ? "corporate" : "individual",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
    cancelEditBeneficiary();
  };

  const editingCustomerRow =
    editingId != null ? customers.find((c: Customer) => c.id === editingId) : null;
  const initialEditCustomerType: CustomerType =
    editingCustomerRow?.customerType === "corporate" ? "corporate" : "individual";
  const editCustomerTypeChanged = Boolean(
    editingId && editForm && editForm.customerType !== initialEditCustomerType,
  );

  const submitEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingId || !editForm) return;

    const trimmedEditForm = {
      name: editForm.name.trim(),
      email: editForm.email.trim(),
      phone: editForm.phone.trim(),
      remarks: (editForm.remarks || "").trim(),
      customerType: editForm.customerType,
    };

    if (!trimmedEditForm.name) {
      setAlertModal({
        isOpen: true,
        message: t("customers.nameRequired") || "Customer name is required.",
        type: "warning",
      });
      return;
    }

    try {
      await updateCustomer({ id: editingId, data: trimmedEditForm }).unwrap();
      cancelEdit();
    } catch (err: any) {
      let message =
        t("customers.updateFailed") ||
        t("customers.saveFailed") ||
        "Could not update customer. Please try again.";

      if (err?.data) {
        if (typeof err.data === "string") {
          message = err.data;
        } else if (err.data.message) {
          message = err.data.message;
        }
      }

      setAlertModal({ isOpen: true, message, type: "error" });
    }
  };

  const submitEditBeneficiary = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingId || !editingBeneficiaryId) return;

    const payload: any = {
      customerId: editingId,
      beneficiaryId: editingBeneficiaryId,
      paymentType: editBeneficiaryForm.paymentType,
    };

    if (editBeneficiaryForm.paymentType === "CRYPTO") {
      payload.networkChain = editBeneficiaryForm.networkChain || null;
      payload.walletAddresses = editBeneficiaryForm.walletAddresses.filter((addr) => addr.trim());
    } else {
      payload.bankName = editBeneficiaryForm.bankName || null;
      payload.accountTitle = editBeneficiaryForm.accountTitle || null;
      payload.accountNumber = editBeneficiaryForm.accountNumber || null;
      payload.accountIban = editBeneficiaryForm.accountIban || null;
      payload.swiftCode = editBeneficiaryForm.swiftCode || null;
      payload.bankAddress = editBeneficiaryForm.bankAddress || null;
    }

    await updateCustomerBeneficiary(payload);
    cancelEditBeneficiary();
  };

  const handleDeleteClick = (id: number) => {
    const customer = customers.find((c: Customer) => c.id === id);
    if (!customer) return;
    
    setConfirmModal({
      isOpen: true,
      message: t("customers.confirmDelete") || `Are you sure you want to delete ${customer.name}?`,
      customerId: id,
    });
  };

  const remove = async (id: number) => {
    try {
      await deleteCustomer(id).unwrap();
      setConfirmModal({ isOpen: false, message: "", customerId: null });
    } catch (err: any) {
      // Surface backend validation errors (e.g. foreign key constraint)
      // RTK Query error structure: err.data.message
      let message = t("customers.cannotDeleteReferenced");
      
      if (err?.data) {
        let errorMessage = '';
        if (typeof err.data === 'string') {
          errorMessage = err.data;
        } else if (err.data.message) {
          errorMessage = err.data.message;
        }
        
        // Check for specific error messages and translate them
        if (errorMessage === "Cannot delete this item because it is referenced by other records.") {
          message = t("customers.cannotDeleteReferenced");
        } else if (errorMessage === "Cannot delete customer while they have existing orders. Please delete the orders first.") {
          message = t("customers.cannotDeleteWithOrders");
        } else if (errorMessage) {
          message = errorMessage;
        }
      }
      
      setConfirmModal({ isOpen: false, message: "", customerId: null });
      setAlertModal({ isOpen: true, message, type: "error" });
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard
        title={t("customers.title")}
        // 我 REMOVED DESCRIPTION UNDER THE TITLE BEING DISPLAYED
        // description={t("customers.titledescription")}
        actions={
          <div className="flex items-center gap-4">
            {isLoading ? t("common.loading") : `${totalCustomers} ${t("customers.records")}`}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 transition-colors"
            >
              {t("customers.createNew")}
            </button>
          </div>
        }
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t("customers.searchPlaceholder")}
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="overflow-x-auto min-h-[60vh]">
          <table className="w-full table-fixed text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="py-2 w-1/6">{t("customers.name")}</th>
                <th className="py-2 w-[7%] whitespace-nowrap">{t("customers.customerType")}</th>
                <th className="py-2 w-1/6">{t("customers.email")}</th>
                <th className="py-2 w-1/6">{t("customers.phone")}</th>
                <th className="py-2 w-1/6">{t("customers.remarks") || "Remarks"}</th>
                <th className="py-2 pr-4 w-1/6">
                  {t("customerLedger.balance")}
                  {targetCurrency && <span className="ml-1 text-xs font-normal text-slate-400">({targetCurrency})</span>}
                </th>
                <th className="py-2 pl-4 w-12">{t("customers.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer: Customer) => (
                <tr key={customer.id} className="border-b border-slate-100">
                  <td className="py-2 w-1/6 font-semibold truncate" title={customer.name}>
                    {customer.name}
                  </td>
                  <td className="py-2 w-[7%] text-xs text-slate-600 whitespace-nowrap">
                    {t(
                      `customers.customerTypeLabel.${
                        customer.customerType === "corporate" ? "corporate" : "individual"
                      }`,
                    )}
                  </td>
                  <td className="py-2 w-1/6 truncate" title={customer.email || undefined}>
                    {customer.email}
                  </td>
                  <td className="py-2 w-1/6 truncate" title={customer.phone || undefined}>
                    {customer.phone}
                  </td>
                  <td className="py-2 w-1/6 truncate" title={customer.remarks || undefined}>
                    {customer.remarks || "—"}
                  </td>
                  <td className="py-2 pr-4 w-1/6">
                    {(() => {
                      const b = balanceByCustomer[customer.id];
                      if (!b) return <span className="text-slate-300">—</span>;
                      const val = b.convertedBalance;
                      return (
                        <span
                          className={`font-semibold ${val < 0 ? "text-rose-600" : val > 0 ? "text-emerald-700" : "text-slate-500"}`}
                          title={
                            b.hasUnknownRate
                              ? "Some currencies have no exchange rate set"
                              : b.currencyBreakdown
                                  .map((c) => `${c.currencyCode}: ${c.balance >= 0 ? "" : "-"}${fmtBalance(Math.abs(c.balance))}`)
                                  .join("\n")
                          }
                        >
                          {val < 0 ? "-" : ""}{fmtBalance(Math.abs(val))}
                          {b.hasUnknownRate && <span className="ml-1 text-xs text-amber-500">*</span>}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="py-2 pl-4 w-12">
                    <div
                      className="relative inline-block"
                      ref={handleMenuRef(customer.id)}
                    >
                      <button
                        className="flex items-center justify-center p-1 hover:bg-slate-100 rounded transition-colors"
                        onClick={() => setOpenMenuId(openMenuId === customer.id ? null : customer.id)}
                        aria-label={t("customers.actions")}
                      >
                        <svg className="w-5 h-5 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </button>

                      {openMenuId === customer.id && (
                        <div
                          ref={handleMenuElementRef(customer.id)}
                          className={`absolute right-0 w-40 bg-white border border-slate-200 rounded-lg shadow-lg z-[9999] ${
                            menuPositionAbove[customer.id] ? "bottom-full mb-1" : "top-0"
                          }`}
                        >
                          <button
                            className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-slate-50 first:rounded-t-lg"
                            onClick={() => { navigate(`/customers/${customer.id}/ledger`); setOpenMenuId(null); }}
                          >
                            {t("customers.ledger")}
                          </button>
                          <button
                            className="w-full text-left px-4 py-2 text-sm text-emerald-600 hover:bg-slate-50"
                            onClick={() => { navigate(`/customers/${customer.id}/profile`); setOpenMenuId(null); }}
                          >
                            {t("customers.profile")}
                          </button>
                          <button
                            className="w-full text-left px-4 py-2 text-sm text-amber-600 hover:bg-slate-50"
                            onClick={() => { startEdit(customer.id); setOpenMenuId(null); }}
                          >
                            {t("common.edit")}
                          </button>
                          <button
                            className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 last:rounded-b-lg border-t border-slate-200"
                            onClick={() => { handleDeleteClick(customer.id); setOpenMenuId(null); }}
                            disabled={isDeleting}
                          >
                            {t("common.delete")}
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!customers.length && (
                <tr>
                  <td className="py-4 text-sm text-slate-500" colSpan={7}>
                    {t("customers.noCustomers")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalCustomers}
          itemsPerPage={PAGE_SIZE}
          onPageChange={setCurrentPage}
          t={t}
          entityName={t("customers.title")}
        />
      </SectionCard>

      {editingId && editForm && (
        <SectionCard
          title={t("customers.editTitle")}
          actions={<button onClick={cancelEdit} className="text-sm text-slate-600">{t("common.cancel")}</button>}
        >
          <form className="grid gap-3 md:grid-cols-3" onSubmit={submitEdit}>
            <input
              className="rounded-lg border border-slate-200 px-3 py-2"
              placeholder={t("customers.namePlaceholder")}
              value={editForm.name}
              onChange={(e) => setEditForm((p) => (p ? { ...p, name: e.target.value } : p))}
              required
            />
            <div className="grid gap-1">
              <label className="text-xs font-medium text-slate-600">{t("customers.customerType")}</label>
              <select
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={editForm.customerType}
                onChange={(e) =>
                  setEditForm((p) =>
                    p ? { ...p, customerType: e.target.value as CustomerType } : p,
                  )
                }
              >
                <option value="individual">{t("customers.customerTypeLabel.individual")}</option>
                <option value="corporate">{t("customers.customerTypeLabel.corporate")}</option>
              </select>
            </div>
            <input
              className="rounded-lg border border-slate-200 px-3 py-2"
              placeholder={t("customers.emailPlaceholder")}
              value={editForm.email}
              onChange={(e) => setEditForm((p) => (p ? { ...p, email: e.target.value } : p))}
              type="email"
            />
            <input
              className="rounded-lg border border-slate-200 px-3 py-2"
              placeholder={t("customers.phonePlaceholder")}
              value={editForm.phone}
              onChange={(e) => setEditForm((p) => (p ? { ...p, phone: e.target.value } : p))}
            />
            <textarea
              className="col-span-full rounded-lg border border-slate-200 px-3 py-2"
              placeholder={t("customers.remarksPlaceholder") || "Remarks (optional)"}
              value={editForm.remarks || ""}
              onChange={(e) => setEditForm((p) => (p ? { ...p, remarks: e.target.value } : p))}
              rows={3}
            />
            {editCustomerTypeChanged && (
              <p className="col-span-full text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                {t("customers.kycResetOnTypeChange")}
              </p>
            )}
            <button
              type="submit"
              className="col-span-full rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-amber-700"
            >
              {t("customers.updateCustomer")}
            </button>
          </form>

          <div className="mt-6">
            <h4 className="text-sm font-semibold text-slate-900 mb-2">
              {t("orders.customerBeneficiaryDetails")}
            </h4>
            {isLoadingBeneficiaries ? (
              <div className="text-sm text-slate-500">{t("common.loading")}</div>
            ) : !editingBeneficiaries.length ? (
              <div className="text-sm text-slate-500">
                {t("customers.noBeneficiaries")}
              </div>
            ) : (
              <div className="grid gap-3">
                {editingBeneficiaries.map((b: CustomerBeneficiary) => (
                  <div key={b.id} className="rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
                    {editingBeneficiaryId === b.id ? (
                      <form className="grid gap-3" onSubmit={submitEditBeneficiary}>
                        <div className="flex justify-between items-center">
                          <div className="font-semibold">{t("orders.paymentType")}</div>
                          <button
                            type="button"
                            className="text-sm text-slate-500 hover:underline"
                            onClick={cancelEditBeneficiary}
                          >
                            {t("common.cancel")}
                          </button>
                        </div>
                        <div className="flex gap-4">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name={`edit-beneficiary-${b.id}-type`}
                              value="CRYPTO"
                              checked={editBeneficiaryForm.paymentType === "CRYPTO"}
                              onChange={(e) =>
                                setEditBeneficiaryForm((p) => ({
                                  ...p,
                                  paymentType: e.target.value as "CRYPTO" | "FIAT",
                                }))
                              }
                              className="mr-2"
                            />
                            {t("orders.crypto")}
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name={`edit-beneficiary-${b.id}-type`}
                              value="FIAT"
                              checked={editBeneficiaryForm.paymentType === "FIAT"}
                              onChange={(e) =>
                                setEditBeneficiaryForm((p) => ({
                                  ...p,
                                  paymentType: e.target.value as "CRYPTO" | "FIAT",
                                }))
                              }
                              className="mr-2"
                            />
                            {t("orders.fiat")}
                          </label>
                        </div>

                        {editBeneficiaryForm.paymentType === "CRYPTO" ? (
                          <>
                            <select
                              className="rounded-lg border border-slate-200 px-3 py-2"
                              value={editBeneficiaryForm.networkChain}
                              onChange={(e) =>
                                setEditBeneficiaryForm((p) => ({
                                  ...p,
                                  networkChain: e.target.value,
                                }))
                              }
                            >
                              <option value="">{t("orders.selectNetworkChain")}</option>
                              <option value="TRC20">TRC20</option>
                              <option value="ERC20">ERC20</option>
                              <option value="BEP20">BEP20</option>
                              <option value="POLYGON">POLYGON</option>
                            </select>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">
                                {t("orders.walletAddresses")}
                              </label>
                              {editBeneficiaryForm.walletAddresses.map((addr, idx) => (
                                <div key={idx} className="mb-2">
                                  <input
                                    type="text"
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                                    placeholder={t("orders.walletAddress")}
                                    value={addr}
                                    onChange={(e) => {
                                      const newAddresses = [...editBeneficiaryForm.walletAddresses];
                                      newAddresses[idx] = e.target.value;
                                      setEditBeneficiaryForm((p) => ({
                                        ...p,
                                        walletAddresses: newAddresses,
                                      }));
                                    }}
                                  />
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() =>
                                  setEditBeneficiaryForm((p) => ({
                                    ...p,
                                    walletAddresses: [...p.walletAddresses, ""],
                                  }))
                                }
                                className="text-sm text-blue-600 hover:underline"
                              >
                                {t("orders.addAnotherAddress")}
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <input
                              type="text"
                              className="rounded-lg border border-slate-200 px-3 py-2"
                              placeholder={t("orders.bankName")}
                              value={editBeneficiaryForm.bankName}
                              onChange={(e) =>
                                setEditBeneficiaryForm((p) => ({
                                  ...p,
                                  bankName: e.target.value,
                                }))
                              }
                            />
                            <input
                              type="text"
                              className="rounded-lg border border-slate-200 px-3 py-2"
                              placeholder={t("orders.accountTitle")}
                              value={editBeneficiaryForm.accountTitle}
                              onChange={(e) =>
                                setEditBeneficiaryForm((p) => ({
                                  ...p,
                                  accountTitle: e.target.value,
                                }))
                              }
                            />
                            <input
                              type="text"
                              className="rounded-lg border border-slate-200 px-3 py-2"
                              placeholder={t("orders.accountNumber")}
                              value={editBeneficiaryForm.accountNumber}
                              onChange={(e) =>
                                setEditBeneficiaryForm((p) => ({
                                  ...p,
                                  accountNumber: e.target.value,
                                }))
                              }
                            />
                            <input
                              type="text"
                              className="rounded-lg border border-slate-200 px-3 py-2"
                              placeholder={t("orders.accountIban")}
                              value={editBeneficiaryForm.accountIban}
                              onChange={(e) =>
                                setEditBeneficiaryForm((p) => ({
                                  ...p,
                                  accountIban: e.target.value,
                                }))
                              }
                            />
                            <input
                              type="text"
                              className="rounded-lg border border-slate-200 px-3 py-2"
                              placeholder={t("orders.swiftCode")}
                              value={editBeneficiaryForm.swiftCode}
                              onChange={(e) =>
                                setEditBeneficiaryForm((p) => ({
                                  ...p,
                                  swiftCode: e.target.value,
                                }))
                              }
                            />
                            <input
                              type="text"
                              className="rounded-lg border border-slate-200 px-3 py-2"
                              placeholder={t("orders.bankAddress")}
                              value={editBeneficiaryForm.bankAddress}
                              onChange={(e) =>
                                setEditBeneficiaryForm((p) => ({
                                  ...p,
                                  bankAddress: e.target.value,
                                }))
                              }
                            />
                          </>
                        )}

                        <div className="flex gap-3 justify-end">
                          <button
                            type="button"
                            onClick={cancelEditBeneficiary}
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            {t("common.cancel")}
                          </button>
                          <button
                            type="submit"
                            disabled={isUpdatingBeneficiary}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-60"
                          >
                            {isUpdatingBeneficiary ? t("common.saving") : t("common.save")}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="flex justify-between items-center mb-2">
                          <div className="font-semibold">{b.paymentType}</div>
                          <div className="flex gap-3">
                            <button
                              type="button"
                              className="text-sm text-blue-600 hover:underline"
                              onClick={() => startEditBeneficiary(b.id)}
                            >
                              {t("common.edit")}
                            </button>
                            <button
                              type="button"
                              className="text-sm text-rose-600 hover:underline"
                              onClick={() => deleteCustomerBeneficiary({ customerId: editingId!, beneficiaryId: b.id })}
                              disabled={isDeletingBeneficiary}
                            >
                              {t("common.delete")}
                            </button>
                          </div>
                        </div>
                        {b.paymentType === "CRYPTO" ? (
                          <>
                            <div>Network: {b.networkChain || "—"}</div>
                            {b.walletAddresses && b.walletAddresses.length > 0 && (
                              <div>
                                Wallets:
                                <ul className="list-disc list-inside ml-4">
                              {b.walletAddresses.map((addr: string, idx: number) => (
                                    <li key={idx}>{addr}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div>
                              {t("orders.bankName")}: {b.bankName || "—"}
                            </div>
                            <div>
                              {t("orders.accountTitle")}: {b.accountTitle || "—"}
                            </div>
                            <div>
                              {t("orders.accountNumber")}: {b.accountNumber || "—"}
                            </div>
                            <div>
                              {t("orders.accountIban")}: {b.accountIban || "—"}
                            </div>
                            <div>
                              {t("orders.swiftCode")}: {b.swiftCode || "—"}
                            </div>
                            <div>
                              {t("orders.bankAddress")}: {b.bankAddress || "—"}
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {/* Create Customer Modal */}
      {isCreateModalOpen && (
        <div
          className="fixed top-0 left-0 right-0 bottom-0 w-full h-full z-[9999] flex items-center justify-center bg-black bg-opacity-50"
          style={{ margin: 0, padding: 0 }}
          onClick={closeCreateModal}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">{t("customers.addTitle")}</h2>
              <button
                onClick={closeCreateModal}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                aria-label={t("common.close")}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
              <div className="self-end">
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  placeholder={t("customers.namePlaceholder")}
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
              <div className="grid gap-1">
                <label className="text-xs font-medium text-slate-600">{t("customers.customerType")}</label>
                <select
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={form.customerType}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, customerType: e.target.value as CustomerType }))
                  }
                >
                  <option value="individual">{t("customers.customerTypeLabel.individual")}</option>
                  <option value="corporate">{t("customers.customerTypeLabel.corporate")}</option>
                </select>
              </div>
              <input
                className="rounded-lg border border-slate-200 px-3 py-2"
                placeholder={t("customers.emailPlaceholder")}
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                type="email"
              />
              <input
                className="rounded-lg border border-slate-200 px-3 py-2"
                placeholder={t("customers.phonePlaceholder")}
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              />
              <textarea
                className="col-span-full rounded-lg border border-slate-200 px-3 py-2"
                placeholder={t("customers.remarksPlaceholder") || "Remarks (optional)"}
                value={form.remarks}
                onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))}
                rows={3}
              />
              {/* <div className="col-span-full flex items-center gap-3 rounded-lg border border-dashed border-slate-300 px-3 py-2">
                <input
                  id="include-beneficiary"
                  type="checkbox"
                  checked={includeBeneficiary}
                  onChange={(e) => setIncludeBeneficiary(e.target.checked)}
                  className="h-4 w-4"
                />
                <label htmlFor="include-beneficiary" className="text-sm text-slate-700">
                  {t("customers.addBeneficiaryOptional")}
                </label>
              </div> */}

              {includeBeneficiary && (
                <div className="col-span-full grid gap-3 rounded-lg border border-slate-200 px-3 py-3 bg-slate-50 md:grid-cols-2">
                  <div className="col-span-full">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {t("orders.paymentType")}
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="customerBeneficiaryPaymentType"
                          value="CRYPTO"
                          checked={beneficiaryForm.paymentType === "CRYPTO"}
                          onChange={(e) =>
                            setBeneficiaryForm((p) => ({
                              ...p,
                              paymentType: e.target.value as "CRYPTO" | "FIAT",
                            }))
                          }
                          className="mr-2"
                        />
                        {t("orders.crypto")}
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="customerBeneficiaryPaymentType"
                          value="FIAT"
                          checked={beneficiaryForm.paymentType === "FIAT"}
                          onChange={(e) =>
                            setBeneficiaryForm((p) => ({
                              ...p,
                              paymentType: e.target.value as "CRYPTO" | "FIAT",
                            }))
                          }
                          className="mr-2"
                        />
                        {t("orders.fiat")}
                      </label>
                    </div>
                  </div>

                  {beneficiaryForm.paymentType === "CRYPTO" ? (
                    <>
                      <select
                        className="col-span-full rounded-lg border border-slate-200 px-3 py-2"
                        value={beneficiaryForm.networkChain}
                        onChange={(e) =>
                          setBeneficiaryForm((p) => ({
                            ...p,
                            networkChain: e.target.value,
                          }))
                        }
                      >
                        <option value="">{t("orders.selectNetworkChain")}</option>
                        <option value="TRC20">TRC20</option>
                        <option value="ERC20">ERC20</option>
                        <option value="BEP20">BEP20</option>
                        <option value="POLYGON">POLYGON</option>
                      </select>
                      <div className="col-span-full">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          {t("orders.walletAddresses")}
                        </label>
                        {beneficiaryForm.walletAddresses.map((addr, index) => (
                          <div key={index} className="mb-2">
                            <input
                              type="text"
                              className="w-full rounded-lg border border-slate-200 px-3 py-2"
                              placeholder="Wallet Address"
                              value={addr}
                              onChange={(e) => {
                                const newAddresses = [...beneficiaryForm.walletAddresses];
                                newAddresses[index] = e.target.value;
                                setBeneficiaryForm((p) => ({
                                  ...p,
                                  walletAddresses: newAddresses,
                                }));
                              }}
                            />
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() =>
                            setBeneficiaryForm((p) => ({
                              ...p,
                              walletAddresses: [...p.walletAddresses, ""],
                            }))
                          }
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {t("orders.addAnotherAddress")}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <input
                        type="text"
                        className="col-span-full rounded-lg border border-slate-200 px-3 py-2"
                        placeholder={t("orders.bankName")}
                        value={beneficiaryForm.bankName}
                        onChange={(e) =>
                          setBeneficiaryForm((p) => ({
                            ...p,
                            bankName: e.target.value,
                          }))
                        }
                      />
                      <input
                        type="text"
                        className="col-span-full rounded-lg border border-slate-200 px-3 py-2"
                        placeholder={t("orders.accountTitle")}
                        value={beneficiaryForm.accountTitle}
                        onChange={(e) =>
                          setBeneficiaryForm((p) => ({
                            ...p,
                            accountTitle: e.target.value,
                          }))
                        }
                      />
                      <input
                        type="text"
                        className="col-span-full rounded-lg border border-slate-200 px-3 py-2"
                        placeholder={t("orders.accountNumber")}
                        value={beneficiaryForm.accountNumber}
                        onChange={(e) =>
                          setBeneficiaryForm((p) => ({
                            ...p,
                            accountNumber: e.target.value,
                          }))
                        }
                      />
                      <input
                        type="text"
                        className="col-span-full rounded-lg border border-slate-200 px-3 py-2"
                        placeholder={t("orders.accountIban")}
                        value={beneficiaryForm.accountIban}
                        onChange={(e) =>
                          setBeneficiaryForm((p) => ({
                            ...p,
                            accountIban: e.target.value,
                          }))
                        }
                      />
                      <input
                        type="text"
                        className="col-span-full rounded-lg border border-slate-200 px-3 py-2"
                        placeholder={t("orders.swiftCode")}
                        value={beneficiaryForm.swiftCode}
                        onChange={(e) =>
                          setBeneficiaryForm((p) => ({
                            ...p,
                            swiftCode: e.target.value,
                          }))
                        }
                      />
                      <input
                        type="text"
                        className="col-span-full rounded-lg border border-slate-200 px-3 py-2"
                        placeholder={t("orders.bankAddress")}
                        value={beneficiaryForm.bankAddress}
                        onChange={(e) =>
                          setBeneficiaryForm((p) => ({
                            ...p,
                            bankAddress: e.target.value,
                          }))
                        }
                      />
                    </>
                  )}
                </div>
              )}

              <div className="col-span-full flex gap-3 mt-1">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isSaving || isSavingBeneficiary}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-60"
                >
                  {isSaving || isSavingBeneficiary ? t("common.saving") : t("customers.saveCustomer")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AlertModal
        isOpen={alertModal.isOpen}
        message={alertModal.message}
        type={alertModal.type || "error"}
        onClose={() => setAlertModal({ isOpen: false, message: "", type: "error" })}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        message={confirmModal.message}
        onConfirm={() => confirmModal.customerId && remove(confirmModal.customerId)}
        onCancel={() => setConfirmModal({ isOpen: false, message: "", customerId: null })}
        confirmText={t("common.delete")}
        cancelText={t("common.cancel")}
        type="warning"
      />
    </div>
  );
}


