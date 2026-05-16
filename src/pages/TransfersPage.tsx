import { useState, type FormEvent, useRef, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import SectionCard from "../components/common/SectionCard";
import AlertModal from "../components/common/AlertModal";
import ConfirmModal from "../components/common/ConfirmModal";
import { ColumnDropdown } from "../components/common/ColumnDropdown";
import { TagSelectionModal } from "../components/common/TagSelectionModal";
import { ActionsMenu } from "../components/common/ActionsMenu";
import type { ActionMenuItem } from "../components/common/ActionsMenu";
import { TransfersFilters } from "../components/transfers/TransfersFilters";
import { ImportTransfersModal } from "../components/transfers/ImportTransfersModal";
import { Pagination } from "../components/common/Pagination";
import Badge from "../components/common/Badge";
import { AccountSelect } from "../components/common/AccountSelect";
import { Tooltip } from "../components/common/Tooltip";
import { useTransfersTable } from "../hooks/transfers/useTransfersTable";
import { useTransfersFilters } from "../hooks/transfers/useTransfersFilters";
import { useTransfersImportExport } from "../hooks/transfers/useTransfersImportExport";
import { useBatchDelete } from "../hooks/useBatchDelete";
import {
  useGetTransfersQuery,
  useCreateTransferMutation,
  useUpdateTransferMutation,
  useDeleteTransferMutation,
  useGetAccountsQuery,
  useGetTransferChangesQuery,
  useGetTagsQuery,
  useGetUsersQuery,
  useGetCurrenciesQuery,
  useBatchAssignTagsMutation,
  useBatchUnassignTagsMutation,
} from "../services/api";
import { useAppSelector } from "../app/hooks";
import { formatDate, formatDateTime } from "../utils/format";
import { hasActionPermission } from "../utils/permissions";
import { useCurrencyByCode } from "../hooks/useCurrencyByCode";
import { StyledCurrencyAmount } from "../components/common/StyledCurrencyAmount";

const formatAmount = (amount: number) =>
  Math.round(amount).toLocaleString("en-US");

const formatCurrency = (amount: number, currencyCode: string) =>
  `${formatAmount(amount)} ${currencyCode}`;

export default function TransfersPage() {
  const { t } = useTranslation();
  const authUser = useAppSelector((s) => s.auth.user);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter state and handlers
  const {
    filters,
    updateFilter,
    handleDatePresetChange,
    handleClearFilters,
    queryParams,
    exportQueryParams,
    isTagFilterOpen,
    setIsTagFilterOpen,
    tagFilterHighlight,
    setTagFilterHighlight,
    tagFilterListRef,
  } = useTransfersFilters(currentPage, setCurrentPage);

  const { data: transfersData, isLoading, refetch: refetchTransfers } = useGetTransfersQuery(queryParams);
  // Handle both paginated response (object) and array response
  const transfers = Array.isArray(transfersData) ? transfersData : (transfersData as any)?.transfers || [];
  const totalTransfers = Array.isArray(transfersData) ? transfers.length : (transfersData as any)?.total || transfers.length;
  const totalPages = Math.ceil(totalTransfers / 20);
  const { data: accounts = [] } = useGetAccountsQuery({ scope: "transfer.account" });
  const { data: tags = [] } = useGetTagsQuery();
  const { data: users = [] } = useGetUsersQuery();
  const { data: currencies = [] } = useGetCurrenciesQuery();
  const currencyByCode = useCurrencyByCode();
  const [createTransfer, { isLoading: isCreating }] = useCreateTransferMutation();
  const [updateTransfer, { isLoading: isUpdating }] = useUpdateTransferMutation();
  const [deleteTransfer, { isLoading: isDeleting }] = useDeleteTransferMutation();
  const [batchAssignTags, { isLoading: isTagging }] = useBatchAssignTagsMutation();
  const [batchUnassignTags, { isLoading: isUntagging }] = useBatchUnassignTagsMutation();

  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; message: string; type?: "error" | "warning" | "info" | "success" }>({
    isOpen: false,
    message: "",
    type: "error",
  });

  // Batch delete hook
  const {
    isBatchDeleteMode,
    selectedIds: selectedTransferIds,
    setSelectedIds: setSelectedTransferIds,
    setIsBatchDeleteMode,
    handleDeleteClick,
    handleDelete,
    handleBulkDelete,
    toggleBatchDeleteMode,
    exitBatchDeleteMode,
    confirmModal: batchDeleteConfirmModal,
    setConfirmModal: setBatchDeleteConfirmModal,
  } = useBatchDelete({
    deleteSingle: (id: number) => deleteTransfer(id),
    confirmMessage: t("transfers.confirmDelete"),
    confirmBulkMessage: t("transfers.confirmDeleteSelected"),
    errorMessage: t("transfers.errorDeleting"),
    t,
    setAlertModal,
  });

  // Adapter for confirm modal to match existing structure
  const confirmModal = {
    isOpen: batchDeleteConfirmModal.isOpen,
    message: batchDeleteConfirmModal.message,
    transferId: batchDeleteConfirmModal.entityId,
    isBulk: batchDeleteConfirmModal.isBulk,
  };
  const setConfirmModal = (modal: { isOpen: boolean; message: string; transferId: number | null; isBulk?: boolean }) => {
    setBatchDeleteConfirmModal({
      isOpen: modal.isOpen,
      message: modal.message,
      entityId: modal.transferId,
      isBulk: modal.isBulk || false,
    });
  };


  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransferId, setEditingTransferId] = useState<number | null>(null);
  const [viewImageTransferId, setViewImageTransferId] = useState<number | null>(null);
  const [imageDragOver, setImageDragOver] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [isBatchTagMode, setIsBatchTagMode] = useState(false);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [formTagIds, setFormTagIds] = useState<number[]>([]);
  const [showFormTagPicker, setShowFormTagPicker] = useState(false);
  const [viewAuditTrailTransferId, setViewAuditTrailTransferId] = useState<number | null>(null);
  
  // Column management via hook
  const {
    availableColumns,
    columnOrder,
    visibleColumns,
    getColumnLabel,
    toggleColumnVisibility,
    isColumnDropdownOpen,
    setIsColumnDropdownOpen,
    columnDropdownRef,
    draggedColumnIndex,
    dragOverIndex,
    handleColumnDragStart,
    handleColumnDragOver,
    handleColumnDragEnd,
    handleColumnDragLeave,
  } = useTransfersTable();
  
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Import/Export functionality
  const {
    isExporting,
    handleExportTransfers,
    handleDownloadTemplate,
    handleImportFile,
  } = useTransfersImportExport({
    exportQueryParams: exportQueryParams,
    accounts,
    tags,
    users,
    addTransfer: createTransfer,
    setAlertModal,
    setIsImporting,
    setImportModalOpen: setIsImportModalOpen,
    t,
  });

  const { data: transferChanges = [], isLoading: isLoadingChanges } = 
    useGetTransferChangesQuery(viewAuditTrailTransferId || 0, { skip: !viewAuditTrailTransferId });

  // Permission checks
  const canDeleteTransfer = hasActionPermission(authUser, "deleteTransfer");
  const canEditTransfer = hasActionPermission(authUser, "updateTransfer");
  const canViewTransferAuditTrail = hasActionPermission(authUser, "viewTransferAuditTrail");
  const hasAnyActionPermission = canDeleteTransfer || canEditTransfer || canViewTransferAuditTrail;

  const toDatetimeLocalParts = (date: Date) => {
    const y = date.getFullYear();
    const mo = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const h = String(date.getHours()).padStart(2, "0");
    const mi = String(date.getMinutes()).padStart(2, "0");
    return { datePart: `${y}-${mo}-${d}`, timePart: `${h}:${mi}` };
  };

  const [form, setForm] = useState<{
    fromAccountId: string;
    toAccountId: string;
    amount: string;
    description: string;
    transactionFee: string;
    entryDatePart: string;
    entryTimePart: string;
    imagePath: string;
    file?: File;
  }>(() => {
    const { datePart, timePart } = toDatetimeLocalParts(new Date());
    return {
      fromAccountId: "",
      toAccountId: "",
      amount: "",
      description: "",
      transactionFee: "",
      entryDatePart: datePart,
      entryTimePart: timePart,
      imagePath: "",
      file: undefined,
    };
  });

  const resetForm = () => {
    const { datePart, timePart } = toDatetimeLocalParts(new Date());
    setForm({
      fromAccountId: "",
      toAccountId: "",
      amount: "",
      description: "",
      transactionFee: "",
      entryDatePart: datePart,
      entryTimePart: timePart,
      imagePath: "",
      file: undefined,
    });
    setEditingTransferId(null);
    setFormTagIds([]);
    setShowFormTagPicker(false);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const handleImageUpload = (file: File) => {
    const isImage = file.type.startsWith("image/");
    const isPDF = file.type === "application/pdf";
    if (!isImage && !isPDF) {
      setAlertModal({ isOpen: true, message: t("expenses.invalidImageFile"), type: "error" });
      return;
    }
    setForm((p) => ({ ...p, file }));
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((p) => ({ ...p, imagePath: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setImageDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    const valid = files.filter((f) => f.type.startsWith("image/") || f.type === "application/pdf");
    if (valid.length > 0) handleImageUpload(valid[0]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setImageDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setImageDragOver(false);
  };

  const isPdfFile = (path: string): boolean => {
    if (!path) return false;
    if (path.startsWith("data:application/pdf")) return true;
    if (path.toLowerCase().endsWith(".pdf")) return true;
    return false;
  };

  const closeModal = () => {
    resetForm();
    setIsModalOpen(false);
  };

  const startEdit = (transferId: number) => {
    const transfer = transfers.find((t: any) => t.id === transferId);
    if (!transfer) return;
    
    setEditingTransferId(transferId);
    const existingDate = transfer.entryDate || transfer.createdAt;
    const { datePart, timePart } = existingDate
      ? toDatetimeLocalParts(new Date(existingDate))
      : toDatetimeLocalParts(new Date());
    setForm({
      fromAccountId: String(transfer.fromAccountId),
      toAccountId: String(transfer.toAccountId),
      amount: String(transfer.amount),
      description: transfer.description || "",
      transactionFee: transfer.transactionFee ? String(transfer.transactionFee) : "",
      entryDatePart: datePart,
      entryTimePart: timePart,
      imagePath: transfer.imagePath ? `/api/uploads/${transfer.imagePath}` : "",
      file: undefined,
    });
    const existingTags = (transfer as any).tags;
    if (Array.isArray(existingTags) && existingTags.length > 0) {
      setFormTagIds(existingTags.map((x: any) => x.id));
      setShowFormTagPicker(true);
    } else {
      setFormTagIds([]);
      setShowFormTagPicker(false);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.fromAccountId || !form.toAccountId || !form.amount) return;

    const entryDateIso = new Date(`${form.entryDatePart}T${form.entryTimePart}`).toISOString();

    try {
      if (editingTransferId) {
        await updateTransfer({
          id: editingTransferId,
          data: {
            fromAccountId: Number(form.fromAccountId),
            toAccountId: Number(form.toAccountId),
            amount: Number(form.amount),
            description: form.description || undefined,
            transactionFee: form.transactionFee ? Number(form.transactionFee) : undefined,
            updatedBy: authUser?.id,
            entryDate: entryDateIso,
            tagIds: formTagIds,
            ...(form.file ? { file: form.file } : { imagePath: form.imagePath || "" }),
          },
        }).unwrap();
      } else {
        await createTransfer({
          fromAccountId: Number(form.fromAccountId),
          toAccountId: Number(form.toAccountId),
          amount: Number(form.amount),
          description: form.description || undefined,
          transactionFee: form.transactionFee ? Number(form.transactionFee) : undefined,
          createdBy: authUser?.id,
          entryDate: entryDateIso,
          tagIds: formTagIds,
          ...(form.file ? { file: form.file } : {}),
        }).unwrap();
      }
      closeModal();
    } catch (error: any) {
      setAlertModal({ 
        isOpen: true, 
        message: error?.data?.message || t("transfers.errorCreating"), 
        type: "error" 
      });
    }
  };


  // Get selected accounts for validation
  const fromAccount = accounts.find((a: any) => a.id === Number(form.fromAccountId));
  const toAccount = accounts.find((a: any) => a.id === Number(form.toAccountId));

  // Handle Esc key to close create/edit transfer modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isModalOpen) {
        closeModal();
      }
    };
    const handlePaste = (event: ClipboardEvent) => {
      if (!isModalOpen) return;
      const items = event.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) handleImageUpload(file);
          break;
        }
      }
    };

    if (isModalOpen) {
      document.addEventListener("keydown", handleEscKey);
      document.addEventListener("paste", handlePaste);
      return () => {
        document.removeEventListener("keydown", handleEscKey);
        document.removeEventListener("paste", handlePaste);
      };
    }
  }, [isModalOpen]);

  // Handle Esc key to close audit trail modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && viewAuditTrailTransferId) {
        setViewAuditTrailTransferId(null);
      }
    };

    if (viewAuditTrailTransferId) {
      document.addEventListener("keydown", handleEscKey);
      return () => {
        document.removeEventListener("keydown", handleEscKey);
      };
    }
  }, [viewAuditTrailTransferId]);

  // Handle Esc key to close image view modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && viewImageTransferId) {
        setViewImageTransferId(null);
      }
    };

    if (viewImageTransferId) {
      document.addEventListener("keydown", handleEscKey);
      return () => {
        document.removeEventListener("keydown", handleEscKey);
      };
    }
  }, [viewImageTransferId]);

  const openPdfInNewTab = (pdfPath: string) => {
    try {
      if (pdfPath.startsWith("data:")) {
        const byteString = atob(pdfPath.split(",")[1]);
        const mimeString = pdfPath.split(",")[0].split(":")[1].split(";")[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
        const blob = new Blob([ab], { type: mimeString });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
        setTimeout(() => URL.revokeObjectURL(url), 100);
      } else {
        window.open(pdfPath, "_blank");
      }
    } catch {
      window.open(pdfPath, "_blank");
    }
  };

  // Tag selection handlers
  const handleTagSelectionChange = useCallback((tagId: number, checked: boolean) => {
    if (checked) {
      setSelectedTagIds((prev) => [...prev, tagId]);
    } else {
      setSelectedTagIds((prev) => prev.filter((id) => id !== tagId));
    }
  }, []);

  const handleApplyTags = useCallback(async () => {
    if (selectedTagIds.length === 0) {
      setAlertModal({
        isOpen: true,
        message: t("transfers.selectAtLeastOneTag"),
        type: "error",
      });
      return;
    }
    try {
      await batchAssignTags({
        entityType: "transfer",
        entityIds: selectedTransferIds,
        tagIds: selectedTagIds,
      }).unwrap();
      
      setIsTagModalOpen(false);
      setSelectedTagIds([]);
      setSelectedTransferIds([]);
      setIsBatchTagMode(false);
      
      setAlertModal({
        isOpen: true,
        message: t("transfers.tagsApplied"),
        type: "success",
      });
      
      setTimeout(async () => {
        try {
          await refetchTransfers();
        } catch (err) {
          console.error("Error refetching transfers:", err);
        }
      }, 100);
    } catch (error: any) {
      setAlertModal({
        isOpen: true,
        message: error?.data?.message || t("transfers.tagError"),
        type: "error",
      });
    }
  }, [selectedTagIds, selectedTransferIds, batchAssignTags, t, refetchTransfers]);

  const handleRemoveTags = useCallback(async () => {
    if (selectedTagIds.length === 0) {
      setAlertModal({
        isOpen: true,
        message: t("transfers.selectAtLeastOneTag"),
        type: "error",
      });
      return;
    }
    try {
      await batchUnassignTags({
        entityType: "transfer",
        entityIds: selectedTransferIds,
        tagIds: selectedTagIds,
      }).unwrap();

      setIsTagModalOpen(false);
      setSelectedTagIds([]);
      setSelectedTransferIds([]);
      setIsBatchTagMode(false);

      setAlertModal({
        isOpen: true,
        message: t("transfers.tagsRemovedSuccess"),
        type: "success",
      });

      setTimeout(async () => {
        try {
          await refetchTransfers();
        } catch (err) {
          console.error("Error refetching transfers:", err);
        }
      }, 100);
    } catch (error: any) {
      setAlertModal({
        isOpen: true,
        message:
          error?.data?.message ||
          error?.message ||
          t("transfers.failedToRemoveTags"),
        type: "error",
      });
    }
  }, [selectedTagIds, selectedTransferIds, batchUnassignTags, t, refetchTransfers]);

  const handleCloseTagModal = useCallback(() => {
    setIsTagModalOpen(false);
    setSelectedTagIds([]);
  }, []);

  // Tag filter helpers
  const selectedTagNames = useMemo(
    () =>
      filters.tagIds
        .map((id) => tags.find((t: any) => t.id === id)?.name)
        .filter((name): name is string => Boolean(name)),
    [filters.tagIds, tags],
  );

  const tagFilterLabel = useMemo(() => {
    if (selectedTagNames.length === 0) {
      return t("transfers.selectTag") || t("orders.selectTag") || "Select Tag";
    }
    return selectedTagNames.join(", ");
  }, [selectedTagNames, t]);

  const handleTagFilterKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isTagFilterOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === " ") {
        e.preventDefault();
        setIsTagFilterOpen(true);
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setIsTagFilterOpen(false);
      return;
    }

    if (tags.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setTagFilterHighlight((prev) => {
        const next = prev < tags.length - 1 ? prev + 1 : 0;
        return next;
      });
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setTagFilterHighlight((prev) => {
        if (prev <= 0) return tags.length - 1;
        return prev - 1;
      });
      return;
    }

    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (tagFilterHighlight >= 0 && tagFilterHighlight < tags.length) {
        const tag = tags[tagFilterHighlight];
        const exists = filters.tagIds.includes(tag.id);
        const next = exists ? filters.tagIds.filter((id) => id !== tag.id) : [...filters.tagIds, tag.id];
        updateFilter('tagIds', next);
      }
    }
  }, [isTagFilterOpen, tags, tagFilterHighlight, filters.tagIds, updateFilter, setIsTagFilterOpen, setTagFilterHighlight]);

  // Helper function to get action menu items for a transfer
  const getTransferActions = (transfer: typeof transfers[0]): ActionMenuItem[] => {
    const actions: ActionMenuItem[] = [];

    if (canViewTransferAuditTrail) {
      actions.push({
        key: "audit",
        label: t("transfers.auditTrail"),
        onClick: () => setViewAuditTrailTransferId(transfer.id),
        color: "blue",
      });
    }

    if (canEditTransfer) {
      actions.push({
        key: "edit",
        label: t("common.edit"),
        onClick: () => startEdit(transfer.id),
        color: "amber",
      });
    }

    if (canDeleteTransfer) {
      actions.push({
        key: "delete",
        label: t("common.delete"),
        onClick: () => handleDeleteClick(transfer.id),
        color: "rose",
        disabled: isDeleting,
        separator: true, // Add separator before delete
      });
    }

    return actions;
  };

  // Helper function to render cell content for a column
  const renderCellContent = (columnKey: string, transfer: typeof transfers[0]) => {
    switch (columnKey) {
      case "id":
        return <td key={columnKey} className="py-2 font-mono text-slate-600">#{transfer.id}</td>;
      case "date":
        return <td key={columnKey} className="py-2">{formatDate(transfer.entryDate || transfer.createdAt)}</td>;
      case "description":
        return (
          <td key={columnKey} className="py-2 text-slate-600">
            {transfer.description ? (
              transfer.description.length > 10 ? (
                <Tooltip 
                  content={<div className="text-sm text-slate-700">{transfer.description}</div>}
                  copyText={transfer.description}
                >
                  <span className="inline-block max-w-[10ch] truncate cursor-help">
                    {transfer.description.substring(0, 10) + "..."}
                  </span>
                </Tooltip>
              ) : (
                <span>{transfer.description}</span>
              )
            ) : (
              "-"
            )}
          </td>
        );
      case "fromAccount": {
        const fromAcct = accounts.find((a) => a.id === transfer.fromAccountId);
        const fromPool = fromAcct ? currencyByCode.get(fromAcct.currencyCode) : undefined;
        const fromBg = fromAcct?.displayBgColor || fromPool?.accountPoolDisplayBgColor;
        const fromText = fromAcct?.displayBgColor ? (fromAcct.displayTextColor || "#ffffff") : (fromPool?.accountPoolDisplayTextColor || "#ffffff");
        const fromStyle = fromBg
          ? { backgroundColor: fromBg, color: fromText, fontWeight: 700, borderRadius: "0.375rem", padding: "0.125rem 0.375rem" }
          : undefined;
        return (
          <td key={columnKey} className="py-2 font-semibold text-slate-900">
            <span style={fromStyle}>{transfer.fromAccountName || transfer.fromAccountId}</span>
          </td>
        );
      }
      case "toAccount": {
        const toAcct = accounts.find((a) => a.id === transfer.toAccountId);
        const toPool = toAcct ? currencyByCode.get(toAcct.currencyCode) : undefined;
        const toBg = toAcct?.displayBgColor || toPool?.accountPoolDisplayBgColor;
        const toText = toAcct?.displayBgColor ? (toAcct.displayTextColor || "#ffffff") : (toPool?.accountPoolDisplayTextColor || "#ffffff");
        const toStyle = toBg
          ? { backgroundColor: toBg, color: toText, fontWeight: 700, borderRadius: "0.375rem", padding: "0.125rem 0.375rem" }
          : undefined;
        return (
          <td key={columnKey} className="py-2 font-semibold text-slate-900">
            <span style={toStyle}>{transfer.toAccountName || transfer.toAccountId}</span>
          </td>
        );
      }
      case "amount":
        return (
          <td key={columnKey} className="py-2">
            <StyledCurrencyAmount
              signedAmount={transfer.amount}
              currencyCode={transfer.currencyCode}
              currencyByCode={currencyByCode}
              formatAbsValue={formatAmount}
              defaultClassName="font-semibold text-slate-900"
            />
          </td>
        );
      case "transactionFee":
        return (
          <td key={columnKey} className="py-2">
            {transfer.transactionFee !== null && transfer.transactionFee !== undefined ? (
              <StyledCurrencyAmount
                signedAmount={transfer.transactionFee}
                currencyCode={transfer.currencyCode}
                currencyByCode={currencyByCode}
                formatAbsValue={formatAmount}
                defaultClassName="text-slate-600"
              />
            ) : (
              "-"
            )}
          </td>
        );
      case "currency":
        return <td key={columnKey} className="py-2">{transfer.currencyCode}</td>;
      case "attachment":
        return (
          <td key={columnKey} className="py-2">
            {transfer.imagePath ? (
              <button
                onClick={() => setViewImageTransferId(transfer.id)}
                className="text-blue-600 hover:text-blue-700 underline text-sm"
              >
                {t("transfers.viewAttachment")}
              </button>
            ) : (
              "-"
            )}
          </td>
        );
      case "tags":
        return (
          <td key={columnKey} className="py-2">
            <div className="flex flex-wrap gap-1">
              {transfer.tags && Array.isArray(transfer.tags) && transfer.tags.length > 0 ? (
                transfer.tags.map((tag: { id: number; name: string; color: string }) => (
                  <Badge key={tag.id} tone="slate" backgroundColor={tag.color}>
                    {tag.name}
                  </Badge>
                ))
              ) : (
                <span className="text-slate-400 text-xs">-</span>
              )}
            </div>
          </td>
        );
      case "createdBy": {
        const createdByUser = transfer.createdBy ? users.find((u) => u.id === transfer.createdBy) : undefined;
        const createdByStyle = createdByUser?.displayBgColor
          ? { backgroundColor: createdByUser.displayBgColor, color: createdByUser.displayTextColor || "#ffffff", fontWeight: 700, borderRadius: "0.375rem", padding: "0.125rem 0.375rem", display: "inline-block" }
          : undefined;
        return (
          <td key={columnKey} className="py-2 text-slate-600">
            {transfer.createdByName
              ? <span style={createdByStyle}>{transfer.createdByName}</span>
              : "-"}
          </td>
        );
      }
      case "updatedBy": {
        const updatedByUser = transfer.updatedBy ? users.find((u) => u.id === transfer.updatedBy) : undefined;
        const updatedByStyle = updatedByUser?.displayBgColor
          ? { backgroundColor: updatedByUser.displayBgColor, color: updatedByUser.displayTextColor || "#ffffff", fontWeight: 700, borderRadius: "0.375rem", padding: "0.125rem 0.375rem", display: "inline-block" }
          : undefined;
        return (
          <td key={columnKey} className="py-2 text-slate-600">
            {transfer.updatedByName
              ? <span style={updatedByStyle}>{transfer.updatedByName}</span>
              : "-"}
          </td>
        );
      }
      case "updatedAt":
        return (
          <td key={columnKey} className="py-2 text-slate-600 text-xs">
            {transfer.updatedAt ? formatDate(transfer.updatedAt) : "-"}
          </td>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard
        title={t("transfers.title")}
        // 我 REMOVED DESCRIPTION UNDER THE TITLE BEING DISPLAYED
        // description={t("transfers.titledescription")}
        actions={
          <div className="flex items-center gap-4">
            {isLoading ? t("common.loading") : `${totalTransfers} ${t("transfers.transfers")}`}
            {hasActionPermission(authUser, "createTransfer") && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 transition-colors"
              >
                {t("transfers.createTransfer")}
              </button>
            )}
            {hasActionPermission(authUser, "assignUnassignTransferTag") && (
              <button
                onClick={async () => {
                  if (!isBatchTagMode) {
                    // Enable batch tag mode
                    setIsBatchTagMode(true);
                    setIsBatchDeleteMode(false); // Exit batch delete mode if active
                    setSelectedTransferIds([]);
                  } else {
                    // If no transfers selected, exit batch tag mode
                    if (!selectedTransferIds.length) {
                      setIsBatchTagMode(false);
                      setSelectedTransferIds([]);
                      return;
                    }
                    // Open tag selection modal
                    setIsTagModalOpen(true);
                  }
                }}
                disabled={isTagging || isUntagging}
                className="rounded-lg border border-blue-300 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60"
              >
                {isTagging || isUntagging
                  ? t("transfers.tagging")
                  : isBatchTagMode
                    ? (selectedTransferIds.length > 0 ? t("transfers.addTags") : t("common.cancel"))
                    : t("transfers.addTag")}
              </button>
            )}
            {canDeleteTransfer && (
              <button
                onClick={async () => {
                  if (!isBatchDeleteMode) {
                    // Enable batch delete mode
                    setIsBatchDeleteMode(true);
                    setIsBatchTagMode(false); // Exit batch tag mode if active
                    setSelectedTransferIds([]);
                  } else {
                    // If no transfers selected, exit batch delete mode
                    if (!selectedTransferIds.length) {
                      setIsBatchDeleteMode(false);
                      setSelectedTransferIds([]);
                      return;
                    }
                    // Delete selected transfers
                    setConfirmModal({
                      isOpen: true,
                      message: t("transfers.confirmDeleteSelected"),
                      transferId: -1,
                      isBulk: true,
                    });
                  }
                }}
                disabled={isDeleting}
                className="rounded-lg border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
              >
                {isDeleting 
                  ? t("common.deleting") 
                  : isBatchDeleteMode
                    ? (selectedTransferIds.length > 0 ? t("transfers.deleteSelected") : t("common.cancel"))
                    : t("transfers.batchDelete")}
              </button>
            )}
            {hasActionPermission(authUser, "importTransfer") && (
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                {t("transfers.import")}
              </button>
            )}
            <ColumnDropdown
              isOpen={isColumnDropdownOpen}
              onToggle={() => setIsColumnDropdownOpen(!isColumnDropdownOpen)}
              availableColumns={availableColumns}
              visibleColumns={visibleColumns}
              onToggleColumn={toggleColumnVisibility}
              draggedColumnIndex={draggedColumnIndex}
              dragOverIndex={dragOverIndex}
              onDragStart={handleColumnDragStart}
              onDragOver={handleColumnDragOver}
              onDragEnd={handleColumnDragEnd}
              onDragLeave={handleColumnDragLeave}
              dropdownRef={columnDropdownRef}
              t={t}
              translationKeys={{
                columns: "transfers.columns",
                showColumns: "transfers.showColumns",
              }}
            />
          </div>
        }
      >
        {/* Filter Section */}
        <TransfersFilters
          filters={filters}
          isExpanded={isFilterExpanded}
          onToggleExpanded={() => setIsFilterExpanded(!isFilterExpanded)}
          onDatePresetChange={handleDatePresetChange}
          onFilterChange={updateFilter}
          onClearFilters={handleClearFilters}
          onExport={handleExportTransfers}
          isExporting={isExporting}
          canExport={hasActionPermission(authUser, "exportTransfer")}
          isTagFilterOpen={isTagFilterOpen}
          setIsTagFilterOpen={setIsTagFilterOpen}
          tagFilterHighlight={tagFilterHighlight}
          setTagFilterHighlight={setTagFilterHighlight}
          tagFilterListRef={tagFilterListRef}
          onTagFilterKeyDown={handleTagFilterKeyDown}
          users={users}
          accounts={accounts}
          currencies={currencies}
          tags={tags}
          selectedTagNames={selectedTagNames}
          tagFilterLabel={tagFilterLabel}
        />

        <div className="overflow-x-auto min-h-[60vh]">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                {(isBatchDeleteMode || isBatchTagMode) && (
                  <th className="py-2 w-8">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={
                        !!transfers.length &&
                        selectedTransferIds.length === transfers.length
                      }
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setSelectedTransferIds(
                          e.target.checked ? transfers.map((t: any) => t.id) : [],
                        )
                      }
                    />
                  </th>
                )}
                {columnOrder.map((columnKey) => 
                  visibleColumns.has(columnKey) && (
                    <th key={columnKey} className="py-2">{getColumnLabel(columnKey)}</th>
                  )
                )}
                {!isBatchDeleteMode && !isBatchTagMode && hasAnyActionPermission && (
                  <th className="py-2">{t("transfers.actions")}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {transfers.map((transfer: any) => (
                <tr key={transfer.id} className="border-b border-slate-100">
                  {(isBatchDeleteMode || isBatchTagMode) && (
                    <td className="py-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={selectedTransferIds.includes(transfer.id)}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          if (e.target.checked) {
                            setSelectedTransferIds((prev: number[]) =>
                              prev.includes(transfer.id)
                                ? prev
                                : [...prev, transfer.id],
                            );
                          } else {
                            setSelectedTransferIds((prev: number[]) =>
                              prev.filter((id: number) => id !== transfer.id),
                            );
                          }
                        }}
                      />
                    </td>
                  )}
                  {columnOrder.map((columnKey) => 
                    visibleColumns.has(columnKey) ? renderCellContent(columnKey, transfer) : null
                  )}
                  {!isBatchDeleteMode && !isBatchTagMode && hasAnyActionPermission && (
                    <td className="py-2">
                      <ActionsMenu
                        actions={getTransferActions(transfer)}
                        entityId={transfer.id}
                        t={t}
                        buttonAriaLabel={t("transfers.actions")}
                      />
                    </td>
                  )}
                </tr>
              ))}
              {!transfers.length && (
                <tr>
                  <td
                    className="py-4 text-sm text-slate-500"
                    colSpan={
                      (isBatchDeleteMode || isBatchTagMode ? 1 : 0) +
                      columnOrder.filter((key) => visibleColumns.has(key)).length +
                      (hasAnyActionPermission && !isBatchDeleteMode && !isBatchTagMode ? 1 : 0)
                    }
                  >
                    {t("transfers.noTransfers")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalTransfers}
          onPageChange={setCurrentPage}
          t={t}
          entityName={t("transfers.transfers")}
        />
      </SectionCard>

      {/* Create/Edit Transfer Modal */}
      {isModalOpen && (
        <div className="fixed top-0 left-0 right-0 bottom-0 w-full h-full z-[9999] flex items-center justify-center bg-black bg-opacity-50" style={{ margin: 0, padding: 0 }}>
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">
                {editingTransferId
                  ? t("transfers.editTransferTitle")
                  : t("transfers.createTransferTitle")}
              </h2>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                aria-label={t("common.close")}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <form className="grid gap-3" onSubmit={handleSubmit}>
              <AccountSelect
                value={form.fromAccountId}
                onChange={(accountId) => {
                  setForm((p) => ({ 
                    ...p, 
                    fromAccountId: accountId, 
                    toAccountId: "" // Clear toAccount when fromAccount changes
                  }));
                }}
                accounts={accounts}
                label={t("transfers.fromAccount")}
                placeholder={t("transfers.selectFromAccount")}
                required
                showBalance={true}
                t={t}
              />

              <AccountSelect
                value={form.toAccountId}
                onChange={(accountId) => setForm((p) => ({ ...p, toAccountId: accountId }))}
                accounts={accounts}
                label={t("transfers.toAccount")}
                placeholder={form.fromAccountId ? t("transfers.selectToAccount") : t("transfers.selectFromAccountFirst")}
                required
                disabled={!form.fromAccountId}
                showBalance={true}
                filterByCurrency={fromAccount?.currencyCode}
                excludeAccountIds={form.fromAccountId ? [Number(form.fromAccountId)] : []}
                t={t}
              />

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t("transfers.amount")} {fromAccount && `(${fromAccount.currencyCode})`}
                </label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.amount}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, amount: e.target.value }))}
                  required
                  disabled={!form.fromAccountId}
                />
                {fromAccount && form.amount && (() => {
                  const amount = Number(form.amount);
                  const fee = form.transactionFee ? Number(form.transactionFee) : 0;
                  const totalDeduction = amount + fee;
                  return totalDeduction > fromAccount.balance && (
                    <div className="mt-1 text-xs text-amber-600">
                      {t("transfers.insufficientBalance")} -{" "}
                      {t("transfers.newBalanceWillBe")}:{" "}
                      {formatCurrency(
                        fromAccount.balance - totalDeduction,
                        fromAccount.currencyCode
                      )}
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t("transfers.transactionFee")} ({t("common.optional")})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={form.transactionFee}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, transactionFee: e.target.value }))}
                  placeholder={t("transfers.transactionFeePlaceholder") || "0.00"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t("transfers.description")} ({t("common.optional")})
                </label>
                <textarea
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  rows={3}
                  value={form.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder={t("transfers.descriptionPlaceholder")}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t("transfers.attachment")} ({t("common.optional")})
                </label>
                <div
                  className={`p-3 border-2 border-dashed rounded-lg transition-colors relative ${
                    imageDragOver ? "border-blue-500 bg-blue-50" : "border-slate-200"
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  {!form.imagePath && (
                    <div className="text-center py-4 text-slate-500 text-sm mb-2">
                      <p className="mb-2">{t("transfers.dragDropOrPaste")}</p>
                    </div>
                  )}
                  <div className="relative mb-2">
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file);
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      id="transfer-file-input"
                    />
                    <label
                      htmlFor="transfer-file-input"
                      className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-blue-50 hover:bg-blue-100 border-2 border-blue-300 border-dashed rounded-lg text-blue-700 font-medium cursor-pointer transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      <span>{t("transfers.chooseFile")}</span>
                    </label>
                  </div>
                  {form.imagePath && (
                    <div className="relative mt-2">
                      {form.imagePath.startsWith("data:image/") || (!form.imagePath.startsWith("data:") && !isPdfFile(form.imagePath)) ? (
                        <img
                          src={form.imagePath}
                          alt="Attachment"
                          className="max-w-full max-h-64 w-auto h-auto object-contain rounded"
                        />
                      ) : isPdfFile(form.imagePath) ? (
                        <div className="flex flex-col items-center justify-center p-6 bg-slate-50 border-2 border-slate-200 rounded-lg">
                          <svg className="w-12 h-12 text-red-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          <p className="text-sm font-medium text-slate-700">PDF Document</p>
                          <p className="text-xs text-slate-500 mt-1">{t("transfers.readyToUpload")}</p>
                        </div>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          setForm((p) => ({ ...p, imagePath: "", file: undefined }));
                          if (imageInputRef.current) imageInputRef.current.value = "";
                        }}
                        className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg transition-colors"
                        title={t("common.cancel")}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t("common.entryDate")}
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={form.entryDatePart}
                    onChange={(e) => setForm((p) => ({ ...p, entryDatePart: e.target.value }))}
                  />
                  <input
                    type="time"
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={form.entryTimePart}
                    onChange={(e) => setForm((p) => ({ ...p, entryTimePart: e.target.value }))}
                  />
                </div>
              </div>

              {/* Tag Picker */}
              {!showFormTagPicker ? (
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 w-fit"
                  onClick={() => setShowFormTagPicker(true)}
                >
                  {t("transfers.tag")}
                </button>
              ) : (
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-700">{t("transfers.tags")}</span>
                    {tags.length > 0 && formTagIds.length > 0 && (
                      <button
                        type="button"
                        className="text-xs text-slate-600 hover:text-slate-900"
                        onClick={() => setFormTagIds([])}
                      >
                        {t("common.clear")}
                      </button>
                    )}
                  </div>
                  {tags.length === 0 ? (
                    <p className="text-sm text-slate-500">{t("transfers.noTagsAvailable")}</p>
                  ) : (
                    <div className="flex max-h-48 flex-col gap-1.5 overflow-y-auto rounded-lg border border-slate-200 p-2">
                      {tags.map((tag) => (
                        <label
                          key={tag.id}
                          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 hover:bg-slate-50"
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={formTagIds.includes(tag.id)}
                            onChange={(e) => {
                              const on = e.target.checked;
                              setFormTagIds((prev) =>
                                on ? [...prev, tag.id] : prev.filter((id) => id !== tag.id),
                              );
                            }}
                          />
                          <Badge tone="slate" backgroundColor={tag.color}>
                            {tag.name}
                          </Badge>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isCreating || isUpdating || !form.fromAccountId || !form.toAccountId || !form.amount}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-60 transition-colors"
                >
                  {isCreating || isUpdating
                    ? t("common.saving")
                    : editingTransferId
                    ? t("transfers.updateTransfer")
                    : t("transfers.createTransfer")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Attachment Modal */}
      {viewImageTransferId && (() => {
        const transfer = transfers.find((t: any) => t.id === viewImageTransferId);
        const rawPath = transfer?.imagePath || "";
        const imagePath = rawPath && !rawPath.startsWith("data:") && !rawPath.startsWith("http") && !rawPath.startsWith("/")
          ? `/api/uploads/${rawPath}`
          : rawPath;
        const isPDF = isPdfFile(imagePath);

        return (
          <div
            className="fixed top-0 left-0 right-0 bottom-0 w-full h-full z-[9999] flex items-center justify-center bg-black bg-opacity-75"
            style={{ margin: 0, padding: 0 }}
            onClick={() => setViewImageTransferId(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh] p-4" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setViewImageTransferId(null)}
                className="absolute top-2 right-2 z-10 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75"
                aria-label={t("common.close")}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              {isPDF ? (
                <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg">
                  <svg className="w-24 h-24 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <p className="text-lg font-medium text-slate-700 mb-2">PDF Document</p>
                  <p className="text-sm text-slate-500 mb-4">Click the button below to view the PDF</p>
                  <button
                    onClick={() => openPdfInNewTab(imagePath)}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Open PDF in New Tab
                  </button>
                </div>
              ) : (
                <img
                  src={imagePath}
                  alt={t("transfers.attachment")}
                  className="max-w-full max-h-[90vh] rounded-lg"
                />
              )}
            </div>
          </div>
        );
      })()}

      {/* Audit Trail Modal */}
      {viewAuditTrailTransferId && (
        <div className="fixed top-0 left-0 right-0 bottom-0 w-full h-full z-[9999] flex items-center justify-center bg-black bg-opacity-50" style={{ margin: 0, padding: 0 }}>
          <div
            className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">
                {t("transfers.auditTrailTitle", {
                  id: viewAuditTrailTransferId,
                })}
              </h2>
              <button
                onClick={() => setViewAuditTrailTransferId(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                aria-label={t("common.close")}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {(() => {
              const transfer = transfers.find(
                (t: any) => t.id === viewAuditTrailTransferId
              );
              if (!transfer) return null;

              return (
                <div className="space-y-4">
                  {/* Summary Section */}
                  <div className="rounded-lg border border-slate-200 p-4 bg-slate-50">
                    <h3 className="font-semibold text-slate-900 mb-3">
                      {t("transfers.description")}
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-slate-700">
                          {t("transfers.created")}:
                        </span>{" "}
                        <span className="text-slate-600">
                          {formatDateTime(transfer.createdAt)} {t("transfers.by")} {transfer.createdByName || "-"}
                        </span>
                      </div>
                      {transfer.updatedAt && (
                        <div>
                          <span className="font-medium text-slate-700">
                            {t("transfers.updated")}:
                          </span>{" "}
                          <span className="text-slate-600">
                            {formatDateTime(transfer.updatedAt)} {t("transfers.by")} {transfer.updatedByName || "-"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Change History Table */}
                  <div className="mt-6">
                    <h3 className="font-semibold text-slate-900 mb-3">
                      {t("transfers.changeHistory")}
                    </h3>
                    {isLoadingChanges ? (
                      <div className="text-center py-4 text-slate-500">
                        {t("common.loading")}
                      </div>
                    ) : transferChanges.length === 0 ? (
                      <div className="text-center py-4 text-slate-500">
                        {t("transfers.noTransfers")}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border border-slate-200 rounded-lg">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="py-2 px-3 border-b border-slate-200 font-semibold text-slate-700">
                                {t("transfers.date")} & {t("transfers.updatedAt")}
                              </th>
                              <th className="py-2 px-3 border-b border-slate-200 font-semibold text-slate-700">
                                {t("transfers.updatedBy")}
                              </th>
                              <th className="py-2 px-3 border-b border-slate-200 font-semibold text-slate-700">
                                {t("transfers.fromAccount")}
                              </th>
                              <th className="py-2 px-3 border-b border-slate-200 font-semibold text-slate-700">
                                {t("transfers.toAccount")}
                              </th>
                              <th className="py-2 px-3 border-b border-slate-200 font-semibold text-slate-700">
                                {t("transfers.amount")}
                              </th>
                              <th className="py-2 px-3 border-b border-slate-200 font-semibold text-slate-700">
                                {t("transfers.description")}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {transferChanges.map((change, index) => (
                              <tr
                                key={change.id}
                                className={index % 2 === 0 ? "bg-white" : "bg-slate-50"}
                              >
                                <td className="py-2 px-3 border-b border-slate-100 text-slate-600">
                                  {formatDateTime(change.changedAt)}
                                </td>
                                <td className="py-2 px-3 border-b border-slate-100 text-slate-600">
                                  {change.changedByName || "-"}
                                </td>
                                <td className="py-2 px-3 border-b border-slate-100 text-slate-600">
                                  {change.fromAccountName || change.fromAccountId}
                                </td>
                                <td className="py-2 px-3 border-b border-slate-100 text-slate-600">
                                  {change.toAccountName || change.toAccountId}
                                </td>
                                <td className="py-2 px-3 border-b border-slate-100">
                                  <StyledCurrencyAmount
                                    signedAmount={change.amount}
                                    currencyCode={transfer.currencyCode}
                                    currencyByCode={currencyByCode}
                                    formatAbsValue={formatAmount}
                                    defaultClassName="font-semibold text-slate-900"
                                  />
                                </td>
                                <td className="py-2 px-3 border-b border-slate-100 text-slate-600">
                                  {change.description || "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
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
        onConfirm={() => {
          if (confirmModal.isBulk) {
            handleBulkDelete();
          } else if (confirmModal.transferId && confirmModal.transferId > 0) {
            handleDelete(confirmModal.transferId);
          }
        }}
        onCancel={() => setConfirmModal({ isOpen: false, message: "", transferId: null, isBulk: false })}
        confirmText={t("common.delete")}
        cancelText={t("common.cancel")}
        type="warning"
      />

      <TagSelectionModal
        isOpen={isTagModalOpen}
        onClose={handleCloseTagModal}
        tags={tags}
        selectedTagIds={selectedTagIds}
        onTagSelectionChange={handleTagSelectionChange}
        onApply={handleApplyTags}
        onRemove={handleRemoveTags}
        isApplying={isTagging}
        isRemoving={isUntagging}
        title={t("transfers.selectTags")}
        noTagsMessage={t("transfers.noTagsAvailable")}
        selectAtLeastOneMessage={t("transfers.selectAtLeastOneTag")}
        applyButtonText={t("transfers.apply")}
        removeButtonText={t("transfers.remove")}
        cancelButtonText={t("common.cancel")}
        applyingText={t("transfers.applying")}
        savingText={t("common.saving")}
        t={t}
      />

      {/* Import Transfers Modal */}
      <ImportTransfersModal
        isOpen={isImportModalOpen}
        isImporting={isImporting}
        onClose={() => setIsImportModalOpen(false)}
        onFileChange={handleImportFile}
        onDownloadTemplate={handleDownloadTemplate}
      />
    </div>
  );
}
