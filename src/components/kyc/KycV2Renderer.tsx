/**
 * KycV2Renderer
 * Shared component used in both the form builder preview panel and the
 * CustomerProfilePage to render a v2 section-based KYC schema.
 */
import type { KycV2Schema, KycV2Field, KycV2FieldOption } from "../../types";

interface Props {
  schema: KycV2Schema;
  answers?: Record<string, unknown>;
  onAnswer?: (key: string, value: unknown) => void;
  disabled?: boolean;
  /** "en" | "zh" — falls back to "en" */
  lang?: string;
  /** Preview mode: renders placeholder values instead of real inputs */
  preview?: boolean;
  documents?: { code: string; fileUrl?: string | null }[];
  onUpload?: (code: string) => void;
  onDeleteDoc?: (code: string) => void;
  uploadingCode?: string | null;
}

function L(item: { labelEn?: string; labelZh?: string; titleEn?: string; titleZh?: string }, lang: string): string {
  if (lang === "zh") return item.labelZh || item.titleZh || item.labelEn || item.titleEn || "";
  return item.labelEn || item.titleEn || "";
}

function optLabel(opt: KycV2FieldOption, lang: string) {
  if (lang === "zh") return opt.labelZh || opt.labelEn;
  return opt.labelEn;
}

const INPUT_BASE =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-slate-50 disabled:text-slate-500";

function FieldRenderer({
  field,
  lang,
  value,
  onChange,
  disabled,
  preview,
}: {
  field: KycV2Field;
  lang: string;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled?: boolean;
  preview?: boolean;
}) {
  const placeholder =
    lang === "zh"
      ? field.placeholderZh || field.placeholderEn || ""
      : field.placeholderEn || "";
  const strVal = value != null ? String(value) : "";

  if (preview) {
    // preview: show visual skeleton only, no real interaction
    switch (field.type) {
      case "textarea":
        return (
          <textarea
            className={INPUT_BASE + " opacity-60"}
            rows={3}
            placeholder={placeholder || (lang === "zh" ? "在此填写..." : "Fill in...")}
            disabled
            readOnly
          />
        );
      case "checkbox":
        return (
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-4 w-4 rounded border-slate-300" disabled />
            <span className="text-sm text-slate-600 opacity-70">
              {L(field, lang)}
            </span>
          </label>
        );
      case "radio":
        return (
          <div className="flex flex-wrap gap-4">
            {(field.options || []).map((opt) => (
              <label key={opt.value} className="flex items-center gap-1.5 text-sm text-slate-600 opacity-70">
                <input type="radio" disabled />
                {optLabel(opt, lang)}
              </label>
            ))}
          </div>
        );
      case "select":
        return (
          <select className={INPUT_BASE + " opacity-60"} disabled>
            <option>—</option>
          </select>
        );
      case "file":
        return (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled
              className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700 opacity-60"
            >
              {lang === "zh" ? "上传文件" : "Upload file"}
            </button>
          </div>
        );
      case "statement":
        // Rendered directly in the parent grid; nothing here
        return null;
      default:
        return (
          <input
            type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
            className={INPUT_BASE + " opacity-60"}
            placeholder={placeholder || (lang === "zh" ? "在此填写..." : "Fill in...")}
            disabled
          />
        );
    }
  }

  // Statement blocks are rendered directly in the parent grid
  if (field.type === "statement") return null;

  // Real render
  switch (field.type) {
    case "textarea":
      return (
        <textarea
          className={INPUT_BASE}
          rows={3}
          placeholder={placeholder}
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      );
    case "date":
      return (
        <input
          type="date"
          className={INPUT_BASE}
          value={strVal.length >= 10 ? strVal.slice(0, 10) : strVal}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      );
    case "number":
      return (
        <input
          type="number"
          className={INPUT_BASE}
          step="any"
          placeholder={placeholder}
          value={strVal}
          onChange={(e) => {
            const n = parseFloat(e.target.value);
            onChange(Number.isFinite(n) ? n : null);
          }}
          disabled={disabled}
        />
      );
    case "select":
      return (
        <select
          className={INPUT_BASE}
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        >
          <option value="">—</option>
          {(field.options || []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {optLabel(opt, lang)}
            </option>
          ))}
        </select>
      );
    case "radio":
      return (
        <div className="flex flex-wrap gap-4">
          {(field.options || []).map((opt) => (
            <label key={opt.value} className="flex items-center gap-1.5 text-sm text-slate-700 cursor-pointer">
              <input
                type="radio"
                className="h-4 w-4"
                name={field.key}
                value={opt.value}
                checked={strVal === opt.value}
                onChange={() => onChange(opt.value)}
                disabled={disabled}
              />
              {optLabel(opt, lang)}
            </label>
          ))}
        </div>
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
          <span className="text-sm text-slate-700">{L(field, lang)}</span>
        </label>
      );
    case "file":
      // File fields in v2 are document slots — handled separately below by doc section
      return (
        <p className="text-xs text-slate-400 italic">
          {lang === "zh" ? "（文件在下方上传区上传）" : "(Upload file in the Documents section below)"}
        </p>
      );
    default:
      return (
        <input
          type="text"
          className={INPUT_BASE}
          placeholder={placeholder}
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      );
  }
}

export default function KycV2Renderer({
  schema,
  answers = {},
  onAnswer,
  disabled = false,
  lang = "en",
  preview = false,
  documents = [],
  onUpload,
  onDeleteDoc,
  uploadingCode,
}: Props) {
  const l = lang.toLowerCase().startsWith("zh") ? "zh" : "en";

  const sectionsSorted = [...(schema.sections || [])].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-8">
      {sectionsSorted.map((section) => (
        <div key={section.id}>
          <div className="mb-4 border-b border-slate-200 pb-1">
            <h3 className="text-sm font-semibold tracking-wide text-slate-800 uppercase">
              {L(section, l)}
            </h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {section.fields.map((field) => {
              const isFullWidth =
                field.type === "statement" ||
                field.type === "textarea" ||
                field.type === "checkbox" ||
                field.type === "radio" ||
                field.width === "full";
              const label = L(field, l);

              if (field.type === "statement") {
                const text = l === "zh"
                  ? (field.labelZh || field.labelEn || "")
                  : (field.labelEn || "");
                return (
                  <div key={field.id} className="md:col-span-2">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {text || (
                          <span className="italic text-slate-400">
                            {l === "zh" ? "（暂无声明内容）" : "(No statement text set)"}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={field.id}
                  className={isFullWidth ? "md:col-span-2" : ""}
                >
                  {field.type !== "checkbox" && (
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      {label}
                      {field.required && <span className="ml-0.5 text-rose-500">*</span>}
                    </label>
                  )}
                  <FieldRenderer
                    field={field}
                    lang={l}
                    value={answers[field.key]}
                    onChange={(v) => onAnswer?.(field.key, v)}
                    disabled={disabled || !onAnswer}
                    preview={preview}
                  />
                  {field.helpTextEn && (
                    <p className="mt-1 text-xs text-slate-400">
                      {l === "zh" ? field.helpTextZh || field.helpTextEn : field.helpTextEn}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Documents section */}
      {(schema.documents || []).length > 0 && (
        <div>
          <div className="mb-4 border-b border-slate-200 pb-1">
            <h3 className="text-sm font-semibold tracking-wide text-slate-800 uppercase">
              {l === "zh" ? "必备文件" : "Required Documents"}
            </h3>
          </div>
          <div className="space-y-3">
            {schema.documents.map((doc) => {
              const existing = documents.find((d) => d.code === doc.code);
              return (
                <div
                  key={doc.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-slate-200 p-3"
                >
                  <div>
                    <div className="text-sm font-medium text-slate-900">
                      {L(doc, l)}
                      {doc.required && <span className="ml-1 text-rose-500 text-xs">*</span>}
                    </div>
                    <div className="text-xs text-slate-400 font-mono">{doc.code}</div>
                  </div>
                  {!preview && (
                    <div className="flex flex-wrap items-center gap-2">
                      {existing?.fileUrl && (
                        <a
                          href={existing.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-semibold text-blue-600 hover:underline"
                        >
                          {l === "zh" ? "查看文件" : "View file"}
                        </a>
                      )}
                      {onUpload && (
                        <button
                          type="button"
                          disabled={disabled || uploadingCode === doc.code}
                          onClick={() => onUpload(doc.code)}
                          className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-800 hover:bg-slate-200 disabled:opacity-50"
                        >
                          {uploadingCode === doc.code
                            ? l === "zh" ? "上传中..." : "Uploading..."
                            : existing
                              ? l === "zh" ? "替换文件" : "Replace"
                              : l === "zh" ? "上传" : "Upload"}
                        </button>
                      )}
                      {existing && !disabled && onDeleteDoc && (
                        <button
                          type="button"
                          onClick={() => onDeleteDoc(doc.code)}
                          className="text-sm font-semibold text-rose-600 hover:text-rose-700"
                        >
                          {l === "zh" ? "删除" : "Delete"}
                        </button>
                      )}
                    </div>
                  )}
                  {preview && (
                    <button
                      type="button"
                      disabled
                      className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600 opacity-60"
                    >
                      {l === "zh" ? "上传" : "Upload"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
