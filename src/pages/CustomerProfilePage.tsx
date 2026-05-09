import { useEffect, useState, useRef, type FormEvent } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SectionCard from "../components/common/SectionCard";
import AlertModal from "../components/common/AlertModal";
import {
  useGetCustomerKycQuery,
  useUpdateCustomerKycMutation,
  useUploadCustomerKycDocumentMutation,
  useDeleteCustomerKycDocumentMutation,
} from "../services/api";
import type { KycSchemaField, KycV2Schema } from "../types";
import { useAppSelector } from "../app/hooks";
import KycV2Renderer from "../components/kyc/KycV2Renderer";

const FIELD_KEY_ZH_FALLBACK: Record<string, string> = {
  fullLegalName: "英文姓名",
  dateOfBirth: "出生日期",
  nationality: "国籍",
  idDocumentType: "身份证件类型",
  idDocumentNumber: "身份证件号码",
  annualIncomeRange: "年收入范围",
  pepDeclaration: "我确认本人不是政治公众人物（PEP）或其关联人",
  legalEntityName: "公司法定名称",
  registrationNumber: "公司注册号",
  incorporationDate: "成立日期",
  registeredAddress: "注册地址",
  businessNature: "业务性质",
  uboName: "最终受益人姓名",
};

const DOCUMENT_CODE_ZH_FALLBACK: Record<string, string> = {
  id_front: "身份证件（正面）",
  id_back: "身份证件（背面）",
  proof_of_address: "地址证明（近3个月）",
  certificate_of_incorporation: "公司注册证书",
  articles_of_association: "公司章程",
  ubo_id: "最终受益人身份证明",
};

type LocalizableText = {
  title?: string;
  titleZh?: string;
  titleEn?: string;
  label?: string;
  labelZh?: string;
  labelEn?: string;
  placeholder?: string;
  placeholderZh?: string;
  placeholderEn?: string;
};

function FieldInput({
  field,
  labelText,
  placeholderText,
  optionLabels,
  value,
  onChange,
  disabled,
}: {
  field: KycSchemaField;
  labelText: string;
  placeholderText?: string;
  optionLabels?: string[];
  value: unknown;
  onChange: (v: unknown) => void;
  disabled?: boolean;
}) {
  const base =
    "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-slate-50 disabled:text-slate-500";

  switch (field.type) {
    case "textarea":
      return (
        <textarea
          className={base}
          rows={3}
          placeholder={placeholderText}
          value={value != null ? String(value) : ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      );
    case "number":
      return (
        <input
          type="number"
          className={base}
          step="any"
          placeholder={placeholderText}
          value={value === undefined || value === null ? "" : String(value)}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") {
              onChange(null);
              return;
            }
            const n = parseFloat(raw);
            onChange(Number.isFinite(n) ? n : null);
          }}
          disabled={disabled}
        />
      );
    case "date": {
      let dateStr = "";
      if (typeof value === "string" && value) {
        dateStr = value.length >= 10 ? value.slice(0, 10) : value;
      }
      return (
        <input
          type="date"
          className={base}
          value={dateStr}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      );
    }
    case "select":
      return (
        <select
          className={base}
          value={value != null ? String(value) : ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        >
          <option value="">—</option>
          {(field.options || []).map((opt, idx) => (
            <option key={opt} value={opt}>
              {optionLabels?.[idx] || opt}
            </option>
          ))}
        </select>
      );
    case "checkbox":
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
          />
          <span className="text-sm text-slate-700">{labelText}</span>
        </label>
      );
    default:
      return (
        <input
          type="text"
          className={base}
          placeholder={placeholderText}
          value={value != null ? String(value) : ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      );
  }
}

export default function CustomerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const authUser = useAppSelector((s) => s.auth.user);
  const isAdmin = authUser?.role === "admin";
  const isZh = (i18n.resolvedLanguage || i18n.language || "").toLowerCase().startsWith("zh");

  const customerId = parseInt(id ?? "0", 10);
  const { data, isLoading, isError, refetch } = useGetCustomerKycQuery(customerId, {
    skip: !Number.isFinite(customerId) || customerId <= 0,
  });
  const [updateKyc, { isLoading: isSaving }] = useUpdateCustomerKycMutation();
  const [uploadDoc, { isLoading: isUploading }] = useUploadCustomerKycDocumentMutation();
  const [deleteDoc, { isLoading: isDeletingDoc }] = useDeleteCustomerKycDocumentMutation();

  const [localAnswers, setLocalAnswers] = useState<Record<string, unknown>>({});
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    message: string;
    type?: "error" | "warning" | "info" | "success";
  }>({ isOpen: false, message: "", type: "error" });

  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (data?.profile?.answers) {
      setLocalAnswers({ ...data.profile.answers });
    }
  }, [data?.profile?.answers, data?.profile?.updatedAt]);

  const profile = data?.profile;
  const schema = data?.schema;
  const customer = data?.customer;
  const documents = data?.documents ?? [];
  const status = profile?.status ?? "draft";

  // Detect v2 schema (section-based builder schema)
  const isV2Schema = (schema as unknown as { schemaType?: string })?.schemaType === "v2";
  const v2Schema = isV2Schema ? (schema as unknown as KycV2Schema) : null;

  const [isReopening, setIsReopening] = useState(false);
  const canEditFields = status === "draft" || status === "submitted";
  const showReviewActions = status === "submitted";
  const showReopenButton = isAdmin && (status === "approved" || status === "rejected");

  const setAnswer = (key: string, v: unknown) => {
    setLocalAnswers((prev) => ({ ...prev, [key]: v }));
  };

  const pickLocalized = (item: LocalizableText, baseKey: "title" | "label" | "placeholder") => {
    const zhKey = `${baseKey}Zh`;
    const enKey = `${baseKey}En`;
    const zhVal = item[zhKey as keyof LocalizableText];
    const enVal = item[enKey as keyof LocalizableText];
    const baseVal = item[baseKey as keyof LocalizableText];
    if (isZh && typeof zhVal === "string" && zhVal.trim()) return zhVal;
    if (!isZh && typeof enVal === "string" && enVal.trim()) return enVal;
    if (typeof baseVal === "string") return baseVal;
    return "";
  };

  const handleSaveDraft = async (e?: FormEvent) => {
    e?.preventDefault();
    try {
      await updateKyc({
        customerId,
        answers: localAnswers,
        status: "draft",
      }).unwrap();
      setAlertModal({
        isOpen: true,
        message: t("customerKyc.saveDraftSuccess"),
        type: "success",
      });
      refetch();
    } catch (err: any) {
      setAlertModal({
        isOpen: true,
        message: err?.data?.message || t("customerKyc.saveFailed"),
        type: "error",
      });
    }
  };

  const handleSubmit = async () => {
    try {
      await updateKyc({
        customerId,
        answers: localAnswers,
        status: "submitted",
      }).unwrap();
      setAlertModal({
        isOpen: true,
        message: t("customerKyc.submitSuccess"),
        type: "success",
      });
      refetch();
    } catch (err: any) {
      setAlertModal({
        isOpen: true,
        message: err?.data?.message || t("customerKyc.submitFailed"),
        type: "error",
      });
    }
  };

  const handleReopen = async () => {
    const confirmed = window.confirm(
      isZh
        ? "确定要重新开放此 KYC 供编辑吗？状态将重置为草稿，审核记录将被清除。"
        : "Reopen this KYC for editing? Status will reset to draft and review records will be cleared.",
    );
    if (!confirmed) return;
    setIsReopening(true);
    try {
      await updateKyc({ customerId, status: "draft" }).unwrap();
      setAlertModal({
        isOpen: true,
        message: isZh ? "KYC 已重新开放，可继续编辑。" : "KYC reopened for editing.",
        type: "success",
      });
      refetch();
    } catch (err: any) {
      setAlertModal({
        isOpen: true,
        message: err?.data?.message || (isZh ? "操作失败，请重试。" : "Failed to reopen. Please try again."),
        type: "error",
      });
    } finally {
      setIsReopening(false);
    }
  };

  const handleApprove = async () => {
    try {
      await updateKyc({ customerId, status: "approved" }).unwrap();
      setAlertModal({
        isOpen: true,
        message: t("customerKyc.approveSuccess"),
        type: "success",
      });
      refetch();
    } catch (err: any) {
      setAlertModal({
        isOpen: true,
        message: err?.data?.message || t("customerKyc.actionFailed"),
        type: "error",
      });
    }
  };

  const handleRejectConfirm = async () => {
    const reason = rejectReason.trim();
    if (!reason) {
      setAlertModal({
        isOpen: true,
        message: t("customerKyc.rejectReasonRequired"),
        type: "warning",
      });
      return;
    }
    try {
      await updateKyc({
        customerId,
        status: "rejected",
        rejectionReason: reason,
      }).unwrap();
      setRejectOpen(false);
      setRejectReason("");
      setAlertModal({
        isOpen: true,
        message: t("customerKyc.rejectSuccess"),
        type: "success",
      });
      refetch();
    } catch (err: any) {
      setAlertModal({
        isOpen: true,
        message: err?.data?.message || t("customerKyc.actionFailed"),
        type: "error",
      });
    }
  };

  const triggerFile = (code: string) => {
    fileInputs.current[code]?.click();
  };

  const onFileSelected = async (code: string, files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    try {
      await uploadDoc({ customerId, documentCode: code, file }).unwrap();
      refetch();
    } catch (err: any) {
      setAlertModal({
        isOpen: true,
        message: err?.data?.message || t("customerKyc.uploadFailed"),
        type: "error",
      });
    }
  };

  const onDeleteDoc = async (documentId: number) => {
    try {
      await deleteDoc({ customerId, documentId }).unwrap();
      refetch();
    } catch {
      setAlertModal({
        isOpen: true,
        message: t("customerKyc.deleteDocFailed"),
        type: "error",
      });
    }
  };

  const statusClass =
    status === "approved"
      ? "bg-emerald-100 text-emerald-800"
      : status === "rejected"
        ? "bg-rose-100 text-rose-800"
        : status === "submitted"
          ? "bg-amber-100 text-amber-900"
          : "bg-slate-100 text-slate-700";

  if (!Number.isFinite(customerId) || customerId <= 0) {
    return <div className="p-8 text-slate-500">{t("customerKyc.invalidCustomer")}</div>;
  }

  if (isLoading) {
    return (
      <div className="p-8 text-slate-500">{t("common.loading")}</div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-8 text-slate-500">{t("customerKyc.loadFailed")}</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => navigate("/customers")}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t("customerLedger.backToCustomers")}
        </button>
        <Link
          to={`/customers/${customerId}/ledger`}
          className="text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          {t("customers.ledger")}
        </Link>
        {isAdmin && (
          <Link to="/customers/settings" className="text-sm font-semibold text-slate-600 hover:text-slate-900">
            {t("customerKyc.editPolicyLink")}
          </Link>
        )}
        {showReopenButton && (
          <button
            type="button"
            onClick={() => void handleReopen()}
            disabled={isReopening}
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            {isReopening
              ? (isZh ? "处理中..." : "Reopening...")
              : (isZh ? "重新开放编辑" : "Reopen for editing")}
          </button>
        )}
      </div>

      <SectionCard
        title={`${customer?.name ?? "…"} — ${t("customerKyc.title")}`}
        description={
          [customer?.phone, customer?.email].filter(Boolean).join(" · ") || undefined
        }
        actions={
          <div className="flex flex-wrap items-center gap-2 justify-end">
            <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
              {t(
                `customers.customerTypeLabel.${
                  customer?.customerType === "corporate" ? "corporate" : "individual"
                }`,
              )}
            </span>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}>
              {t(`customerKyc.status.${status}`)}
            </span>
          </div>
        }
      >
        {/* V2 Schema: section-based renderer */}
        {v2Schema ? (
          <>
            <KycV2Renderer
              schema={v2Schema}
              answers={localAnswers}
              onAnswer={canEditFields ? setAnswer : undefined}
              disabled={!canEditFields}
              lang={isZh ? "zh" : "en"}
              documents={documents.map((d) => ({ code: d.documentCode, fileUrl: d.fileUrl }))}
              onUpload={status !== "approved" && status !== "rejected" ? triggerFile : undefined}
              onDeleteDoc={
                status !== "approved" && status !== "rejected"
                  ? (code) => {
                      const doc = documents.find((d) => d.documentCode === code);
                      if (doc) void onDeleteDoc(doc.id);
                    }
                  : undefined
              }
              uploadingCode={isUploading ? null : null}
            />
            {/* Hidden file inputs for v2 documents */}
            {v2Schema.documents.map((doc) => (
              <input
                key={doc.code}
                ref={(el) => { fileInputs.current[doc.code] = el; }}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                className="hidden"
                onChange={(e) => { void onFileSelected(doc.code, e.target.files); e.target.value = ""; }}
              />
            ))}
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isSaving || !canEditFields}
                onClick={() => void handleSaveDraft()}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                {isSaving ? t("common.saving") : t("customerKyc.saveDraft")}
              </button>
              <button
                type="button"
                disabled={isSaving || !canEditFields}
                onClick={() => void handleSubmit()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-50"
              >
                {t("customerKyc.submitForReview")}
              </button>
            </div>
          </>
        ) : (
          <>
        {(schema?.title || schema?.titleZh || schema?.titleEn) && (
          <p className="text-sm text-slate-600 mb-4">{pickLocalized(schema!, "title")}</p>
        )}

        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSaveDraft}>
          {((schema as { fields?: KycSchemaField[] })?.fields ?? []).map((field) => (
            <div key={field.key} className={field.type === "textarea" ? "md:col-span-2" : ""}>
              {(() => {
                const localizedLabel =
                  pickLocalized(field, "label") ||
                  (isZh ? FIELD_KEY_ZH_FALLBACK[field.key] || field.label : field.label);
                const localizedPlaceholder = pickLocalized(field, "placeholder");
                const localizedOptions =
                  isZh && Array.isArray(field.optionsZh) && field.optionsZh.length === (field.options || []).length
                    ? field.optionsZh
                    : !isZh && Array.isArray(field.optionsEn) && field.optionsEn.length === (field.options || []).length
                      ? field.optionsEn
                      : undefined;
                return (
                  <>
              {field.type !== "checkbox" && (
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {localizedLabel}
                  {field.required && <span className="text-rose-500 ml-0.5">*</span>}
                </label>
              )}
              <FieldInput
                field={field}
                labelText={localizedLabel}
                placeholderText={localizedPlaceholder}
                optionLabels={localizedOptions}
                value={localAnswers[field.key]}
                onChange={(v) => setAnswer(field.key, v)}
                disabled={!canEditFields}
              />
                  </>
                );
              })()}
            </div>
          ))}

          <div className="md:col-span-2 flex flex-wrap gap-2 pt-2">
            <button
              type="submit"
              disabled={isSaving || !canEditFields}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            >
              {isSaving ? t("common.saving") : t("customerKyc.saveDraft")}
            </button>
            <button
              type="button"
              disabled={isSaving || !canEditFields}
              onClick={() => void handleSubmit()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-50"
            >
              {t("customerKyc.submitForReview")}
            </button>
          </div>
        </form>
          </>
        )}

        {profile?.rejectionReason && status === "rejected" && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
            <span className="font-semibold">{t("customerKyc.rejectionReason")}: </span>
            {profile.rejectionReason}
          </div>
        )}
      </SectionCard>

      {/* V1 only: separate documents section (v2 has them inline) */}
      {!v2Schema && (
      <SectionCard title={t("customerKyc.documentsTitle")}>
        <p className="text-sm text-slate-500 mb-4">{t("customerKyc.documentsHint")}</p>
        <div className="space-y-4">
          {((schema as { requiredDocuments?: { code: string; label: string; labelZh?: string; labelEn?: string }[] })?.requiredDocuments ?? []).map((doc) => {
            const existing = documents.find((d) => d.documentCode === doc.code);
            return (
              <div
                key={doc.code}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-slate-200 p-3"
              >
                <div>
                  <div className="font-medium text-slate-900">
                    {pickLocalized(doc, "label") ||
                      (isZh ? DOCUMENT_CODE_ZH_FALLBACK[doc.code] || doc.label : doc.label)}
                  </div>
                  <div className="text-xs text-slate-400 font-mono">{doc.code}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={(el) => {
                      fileInputs.current[doc.code] = el;
                    }}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      void onFileSelected(doc.code, e.target.files);
                      e.target.value = "";
                    }}
                  />
                  {existing?.fileUrl && (
                    <a
                      href={existing.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-blue-600 hover:underline"
                    >
                      {t("customerKyc.viewFile")}
                    </a>
                  )}
                  <button
                    type="button"
                    disabled={isUploading || status === "approved" || status === "rejected"}
                    onClick={() => triggerFile(doc.code)}
                    className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-800 hover:bg-slate-200 disabled:opacity-50"
                  >
                    {existing ? t("customerKyc.replaceFile") : t("customerKyc.upload")}
                  </button>
                  {existing && status !== "approved" && status !== "rejected" && (
                    <button
                      type="button"
                      disabled={isDeletingDoc}
                      onClick={() => void onDeleteDoc(existing.id)}
                      className="text-sm font-semibold text-rose-600 hover:text-rose-700"
                    >
                      {t("common.delete")}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {!((schema as { requiredDocuments?: unknown[] })?.requiredDocuments?.length) && (
            <p className="text-sm text-slate-400">{t("customerKyc.noDocumentsInPolicy")}</p>
          )}
        </div>
      </SectionCard>
      )}

      {showReviewActions && (
        <SectionCard title={t("customerKyc.reviewTitle")}>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleApprove()}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700"
            >
              {t("customerKyc.approve")}
            </button>
            <button
              type="button"
              onClick={() => setRejectOpen(true)}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-rose-700"
            >
              {t("customerKyc.reject")}
            </button>
          </div>
        </SectionCard>
      )}

      {rejectOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4"
          onClick={() => setRejectOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-900 mb-2">{t("customerKyc.rejectTitle")}</h3>
            <textarea
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm mb-4"
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={t("customerKyc.rejectPlaceholder")}
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                onClick={() => setRejectOpen(false)}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
                onClick={() => void handleRejectConfirm()}
              >
                {t("customerKyc.rejectConfirm")}
              </button>
            </div>
          </div>
        </div>
      )}

      <AlertModal
        isOpen={alertModal.isOpen}
        message={alertModal.message}
        type={alertModal.type || "error"}
        onClose={() => setAlertModal({ isOpen: false, message: "", type: "error" })}
      />
    </div>
  );
}
