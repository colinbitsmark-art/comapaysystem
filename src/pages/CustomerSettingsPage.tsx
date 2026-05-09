import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import SectionCard from "../components/common/SectionCard";
import {
  useGetKycBuilderSchemaQuery,
  usePutKycBuilderSchemaMutation,
  usePublishKycBuilderSchemaMutation,
  useGetKycBuilderSchemaVersionQuery,
  useDeleteKycBuilderSchemaVersionMutation,
} from "../services/api";
import { useAppSelector } from "../app/hooks";
import type { CustomerType, KycV2Schema, KycSchemaVersion } from "../types";
import KycFormBuilder from "../components/kyc/KycFormBuilder";
import KycV2Renderer from "../components/kyc/KycV2Renderer";

const CUSTOMER_TYPES: { value: CustomerType; labelEn: string; labelZh: string }[] = [
  { value: "individual", labelEn: "Individual", labelZh: "个人" },
  { value: "corporate", labelEn: "Corporate", labelZh: "企业" },
];

const EMPTY_V2_SCHEMA: KycV2Schema = {
  schemaType: "v2",
  titleEn: "",
  titleZh: "",
  sections: [],
  documents: [],
};

function VersionPreviewModal({
  version,
  isAdmin,
  isSaving,
  isZh,
  onRestore,
  onClose,
}: {
  version: KycSchemaVersion;
  isAdmin: boolean;
  isSaving: boolean;
  isZh: boolean;
  onRestore: (v: KycSchemaVersion) => void;
  onClose: () => void;
}) {
  const [lang, setLang] = useState<"en" | "zh">("en");

  const schema = version.schema;
  if (!schema || schema.schemaType !== "v2") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-sm text-slate-500 max-w-sm w-full text-center">
          <p>{isZh ? "此版本为旧格式，无法预览。" : "This version uses a legacy format and cannot be previewed."}</p>
          <button type="button" onClick={onClose} className="mt-4 text-blue-600 underline">
            {isZh ? "关闭" : "Close"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl mt-8 mb-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {isZh ? `版本 v${version.version} 预览` : `Preview — v${version.version}`}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {version.status === "published" && version.publishedAt
                ? (isZh
                    ? `发布于 ${new Date(version.publishedAt).toLocaleString()}`
                    : `Published ${new Date(version.publishedAt).toLocaleString()}`)
                : (isZh
                    ? `创建于 ${new Date(version.createdAt).toLocaleString()}`
                    : `Created ${new Date(version.createdAt).toLocaleString()}`)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <button
                type="button"
                onClick={() => onRestore(version)}
                disabled={isSaving}
                className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
              >
                {isSaving
                  ? (isZh ? "还原中…" : "Restoring…")
                  : (isZh ? "还原到此版本" : "Restore this version")}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Language toggle */}
        <div className="px-6 pt-4 pb-2 flex items-center gap-2">
          <span className="text-xs text-slate-500">{isZh ? "预览语言：" : "Preview language:"}</span>
          {(["en", "zh"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                lang === l ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {l === "en" ? "English" : "中文"}
            </button>
          ))}
        </div>

        {/* Rendered form (read-only) */}
        <div className="px-6 pb-6 pt-2">
          <KycV2Renderer schema={schema} lang={lang} disabled />
        </div>
      </div>
    </div>
  );
}

export default function CustomerSettingsPage() {
  const { t, i18n } = useTranslation();
  const user = useAppSelector((s) => s.auth.user);
  const isAdmin = user?.role === "admin";
  const isZh = (i18n.resolvedLanguage || i18n.language || "").toLowerCase().startsWith("zh");

  const [schemaTab, setSchemaTab] = useState<CustomerType>("individual");
  const [localSchema, setLocalSchema] = useState<KycV2Schema>(EMPTY_V2_SCHEMA);
  const [dirty, setDirty] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [viewingVersion, setViewingVersion] = useState<KycSchemaVersion | null>(null);
  const [loadingVersionId, setLoadingVersionId] = useState<number | null>(null);

  const { data, isLoading, refetch } = useGetKycBuilderSchemaQuery(schemaTab);
  const [putSchema, { isLoading: isSaving }] = usePutKycBuilderSchemaMutation();
  const [publishSchema, { isLoading: isPublishing }] = usePublishKycBuilderSchemaMutation();
  const [deleteVersion, { isLoading: isDeleting }] = useDeleteKycBuilderSchemaVersionMutation();
  const { data: versionData, isFetching: isFetchingVersion } = useGetKycBuilderSchemaVersionQuery(
    loadingVersionId!,
    { skip: loadingVersionId === null },
  );

  // Open version preview when data arrives
  useEffect(() => {
    if (versionData && loadingVersionId !== null) {
      setViewingVersion(versionData);
      setLoadingVersionId(null);
    }
  }, [versionData, loadingVersionId]);

  // Sync local schema from draft when tab or remote data changes
  useEffect(() => {
    if (data?.draft?.schema) {
      setLocalSchema(data.draft.schema);
      setDirty(false);
    } else {
      setLocalSchema(EMPTY_V2_SCHEMA);
      setDirty(false);
    }
  }, [data?.draft?.schema, data?.draft?.id]);

  const handleSchemaChange = (updated: KycV2Schema) => {
    setLocalSchema(updated);
    setDirty(true);
  };

  const handleSaveDraft = async () => {
    try {
      await putSchema({ customerType: schemaTab, schema: localSchema }).unwrap();
      setDirty(false);
      refetch();
    } catch (err: unknown) {
      const msg = (err as { data?: { message?: string } })?.data?.message || t("customerSettings.kyc.saveError");
      alert(msg);
    }
  };

  const handlePublish = async () => {
    const confirm = window.confirm(
      isZh
        ? `确定要发布此 ${schemaTab === "corporate" ? "企业" : "个人"} KYC 模板吗？发布后，新的 KYC 将使用此版本。`
        : `Publish this ${schemaTab} KYC schema? New KYC forms will use this version.`,
    );
    if (!confirm) return;
    try {
      if (dirty) await putSchema({ customerType: schemaTab, schema: localSchema }).unwrap();
      await publishSchema({ customerType: schemaTab }).unwrap();
      setDirty(false);
      refetch();
      alert(isZh ? "发布成功！" : "Published successfully!");
    } catch (err: unknown) {
      const msg = (err as { data?: { message?: string } })?.data?.message || t("customerSettings.kyc.saveError");
      alert(msg);
    }
  };

  const handleDeleteVersion = async (id: number, versionNum: number) => {
    const ok = window.confirm(
      isZh
        ? `确定要删除版本 v${versionNum}？此操作不可撤销。`
        : `Permanently delete v${versionNum}? This cannot be undone.`,
    );
    if (!ok) return;
    try {
      await deleteVersion({ id, customerType: schemaTab }).unwrap();
    } catch (err: unknown) {
      const msg = (err as { data?: { message?: string } })?.data?.message
        || (isZh ? "删除失败" : "Delete failed");
      alert(msg);
    }
  };

  const handleRestoreVersion = async (version: KycSchemaVersion) => {
    const ok = window.confirm(
      isZh
        ? `将草稿还原为 v${version.version} 的内容？当前草稿将被覆盖。`
        : `Restore draft to the content of v${version.version}? Your current draft will be overwritten.`,
    );
    if (!ok) return;
    try {
      await putSchema({ customerType: schemaTab, schema: version.schema }).unwrap();
      setLocalSchema(version.schema);
      setDirty(false);
      refetch();
      setViewingVersion(null);
      alert(isZh ? `已还原为 v${version.version}` : `Restored to v${version.version}. Remember to publish when ready.`);
    } catch (err: unknown) {
      const msg = (err as { data?: { message?: string } })?.data?.message || t("customerSettings.kyc.saveError");
      alert(msg);
    }
  };

  const versions = data?.versions || [];
  const publishedVersion = data?.published;

  return (
    <div className="space-y-6">
      <SectionCard
        title={isZh ? "KYC 表单设计" : "KYC Form Builder"}
        description={
          isZh
            ? "为个人及企业客户分别设计 KYC 表单，支持分节、多种字段类型及双语标签。"
            : "Design separate KYC forms for individual and corporate customers. Add sections, fields, and bilingual labels."
        }
      >
        {/* Customer type tabs */}
        <div className="flex flex-wrap gap-2 mb-5">
          {CUSTOMER_TYPES.map(({ value, labelEn, labelZh }) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                if (dirty) {
                  const ok = window.confirm(
                    isZh ? "您有未保存的更改，切换标签将丢失。是否继续？" : "You have unsaved changes. Discard and switch?",
                  );
                  if (!ok) return;
                }
                setSchemaTab(value);
                setDirty(false);
              }}
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${
                schemaTab === value
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {isZh ? labelZh : labelEn}
            </button>
          ))}
        </div>

        {/* Status bar */}
        <div className="flex flex-wrap items-center gap-3 mb-4 text-sm">
          {publishedVersion ? (
            <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
              {isZh ? `已发布版本 v${publishedVersion.version}` : `Published v${publishedVersion.version}`}
              {publishedVersion.publishedAt && (
                <span className="text-slate-400 font-normal">
                  · {new Date(publishedVersion.publishedAt).toLocaleDateString()}
                </span>
              )}
            </span>
          ) : (
            <span className="text-amber-600 font-medium">
              {isZh ? "⚠️ 尚未发布" : "⚠️ Not yet published"}
            </span>
          )}
          {dirty && (
            <span className="text-amber-600 text-xs font-medium">
              {isZh ? "● 有未保存的更改" : "● Unsaved changes"}
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowVersions((v) => !v)}
            className="ml-auto text-xs text-slate-500 hover:text-slate-800 underline"
          >
            {showVersions
              ? isZh ? "隐藏版本历史" : "Hide version history"
              : isZh ? "查看版本历史" : "Version history"}
          </button>
        </div>

        {/* Version history */}
        {showVersions && (
          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3 max-h-56 overflow-y-auto">
            {versions.length === 0 ? (
              <p className="text-xs text-slate-400">{isZh ? "暂无版本记录" : "No versions yet"}</p>
            ) : (
              <table className="w-full text-xs text-slate-700">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-200">
                    <th className="text-left py-1 pr-3">{isZh ? "版本" : "Version"}</th>
                    <th className="text-left py-1 pr-3">{isZh ? "状态" : "Status"}</th>
                    <th className="text-left py-1 pr-3">{isZh ? "日期" : "Date"}</th>
                    <th className="text-left py-1">{isZh ? "操作" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody>
                  {versions.map((v) => (
                    <tr key={v.id} className="border-b border-slate-100">
                      <td className="py-1.5 pr-3 font-mono">v{v.version}</td>
                      <td className="py-1.5 pr-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            v.status === "published"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {v.status}
                        </span>
                      </td>
                      <td className="py-1.5 pr-3 text-slate-400">
                        {new Date(v.status === "published" && v.publishedAt ? v.publishedAt : v.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-1.5">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="text-blue-600 hover:text-blue-800 underline disabled:opacity-50"
                            disabled={isFetchingVersion && loadingVersionId === v.id}
                            onClick={() => setLoadingVersionId(v.id)}
                          >
                            {isFetchingVersion && loadingVersionId === v.id
                              ? (isZh ? "加载中…" : "Loading…")
                              : (isZh ? "查看" : "View")}
                          </button>
                          {isAdmin && (
                            <button
                              type="button"
                              className="text-rose-600 hover:text-rose-800 underline disabled:opacity-50"
                              disabled={isDeleting}
                              onClick={() => handleDeleteVersion(v.id, v.version)}
                            >
                              {isZh ? "删除" : "Delete"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Builder */}
        {!isAdmin && (
          <p className="mb-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {t("customerSettings.kyc.adminOnlyHint")}
          </p>
        )}

        {isLoading ? (
          <div className="py-12 text-center text-slate-400">{t("common.loading")}</div>
        ) : (
          <KycFormBuilder
            schema={localSchema.schemaType === "v2" ? localSchema : { ...EMPTY_V2_SCHEMA, ...localSchema }}
            onChange={isAdmin ? handleSchemaChange : () => {}}
          />
        )}

        {/* Action bar */}
        {isAdmin && (
          <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSaving || isPublishing || !dirty}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            >
              {isSaving ? t("common.saving") : isZh ? "保存草稿" : "Save draft"}
            </button>
            <button
              type="button"
              onClick={handlePublish}
              disabled={isSaving || isPublishing}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-50"
            >
              {isPublishing ? (isZh ? "发布中..." : "Publishing...") : isZh ? "发布" : "Publish"}
            </button>
          </div>
        )}
      </SectionCard>
      {/* Version preview modal */}
      {viewingVersion && (
        <VersionPreviewModal
          version={viewingVersion}
          isAdmin={isAdmin}
          isSaving={isSaving}
          isZh={isZh}
          onRestore={handleRestoreVersion}
          onClose={() => setViewingVersion(null)}
        />
      )}
    </div>
  );
}
