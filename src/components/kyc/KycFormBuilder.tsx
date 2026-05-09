/**
 * KycFormBuilder
 * Visual drag-and-drop KYC schema builder with:
 * - Section management (add/rename/reorder/delete)
 * - Field palette (all v2 field types)
 * - Field properties panel (click a field to edit)
 * - Live preview tab (English/Chinese)
 */
import { useState, useRef } from "react";
import type { KycV2Schema, KycV2Section, KycV2Field, KycV2FieldType, KycV2Document, KycV2FieldOption } from "../../types";
import KycV2Renderer from "./KycV2Renderer";

// ── tiny uid ──────────────────────────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ── field type config ─────────────────────────────────────────────────────────
const FIELD_TYPES: { type: KycV2FieldType; icon: string; labelEn: string }[] = [
  { type: "text",      icon: "Aa",  labelEn: "Text" },
  { type: "textarea",  icon: "¶",   labelEn: "Long text" },
  { type: "number",    icon: "123", labelEn: "Number" },
  { type: "date",      icon: "📅",  labelEn: "Date" },
  { type: "select",    icon: "▼",   labelEn: "Dropdown" },
  { type: "radio",     icon: "◎",   labelEn: "Radio" },
  { type: "checkbox",  icon: "☑",   labelEn: "Checkbox" },
  { type: "file",      icon: "📎",  labelEn: "File upload" },
  { type: "statement", icon: "📋",  labelEn: "Statement" },
];

// ── empty defaults ─────────────────────────────────────────────────────────────
function newField(type: KycV2FieldType): KycV2Field {
  return {
    id: `f_${uid()}`,
    key: `field_${uid()}`,
    type,
    labelEn: "",
    labelZh: "",
    placeholderEn: "",
    placeholderZh: "",
    required: false,
    options: ["select", "radio"].includes(type)
      ? [{ value: "option_1", labelEn: "Option 1", labelZh: "" }]
      : undefined,
  };
}

function newSection(): KycV2Section {
  return {
    id: `sec_${uid()}`,
    titleEn: "New Section",
    titleZh: "",
    order: 0,
    fields: [],
  };
}

function newDocument(): KycV2Document {
  return {
    id: `d_${uid()}`,
    code: `doc_${uid()}`,
    labelEn: "New document",
    labelZh: "",
    required: true,
  };
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function FieldTypeBadge({ type }: { type: KycV2FieldType }) {
  const cfg = FIELD_TYPES.find((f) => f.type === type);
  return (
    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs bg-slate-100 text-slate-600 font-mono">
      <span>{cfg?.icon}</span>
      <span>{type}</span>
    </span>
  );
}

interface FieldRowProps {
  field: KycV2Field;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}
function FieldRow({ field, selected, onSelect, onDelete, onMoveUp, onMoveDown, isFirst, isLast, dragHandleProps }: FieldRowProps) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors overflow-hidden ${
        selected
          ? "border-blue-400 bg-blue-50"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
      onClick={onSelect}
    >
      <div
        className="cursor-grab text-slate-300 select-none px-1 touch-none shrink-0"
        {...dragHandleProps}
        title="Drag to reorder"
      >
        ⠿
      </div>
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center gap-2 overflow-hidden">
          <FieldTypeBadge type={field.type} />
          {field.type === "statement" ? (
            <span className="text-sm font-medium text-slate-500 italic truncate">
              {field.labelEn
                ? field.labelEn.slice(0, 60) + (field.labelEn.length > 60 ? "…" : "")
                : "Statement / T&C"}
            </span>
          ) : (
            <span className="text-sm font-medium text-slate-800 truncate">
              {field.labelEn || <span className="text-slate-400 italic">Untitled field</span>}
            </span>
          )}
          {field.required && field.type !== "statement" && (
            <span className="text-xs text-rose-500 shrink-0">*</span>
          )}
        </div>
        {field.type !== "statement" && field.labelZh && (
          <div className="text-xs text-slate-400 truncate mt-0.5">{field.labelZh}</div>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
          disabled={isFirst}
          className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"
          title="Move up"
        >▲</button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
          disabled={isLast}
          className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"
          title="Move down"
        >▼</button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-0.5 text-slate-400 hover:text-rose-600"
          title="Delete field"
        >✕</button>
      </div>
    </div>
  );
}

interface FieldPropertiesProps {
  field: KycV2Field;
  onChange: (updated: KycV2Field) => void;
}
function FieldProperties({ field, onChange }: FieldPropertiesProps) {
  const hasOptions = field.type === "select" || field.type === "radio";
  const isStatement = field.type === "statement";
  const labelBase = "block text-xs font-medium text-slate-600 mb-0.5";
  const inputBase = "w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400";

  const up = (patch: Partial<KycV2Field>) => onChange({ ...field, ...patch });

  const updateOption = (idx: number, patch: Partial<KycV2FieldOption>) => {
    const opts = [...(field.options || [])];
    opts[idx] = { ...opts[idx], ...patch };
    up({ options: opts });
  };
  const addOption = () => {
    const opts = [...(field.options || []), { value: `opt_${uid()}`, labelEn: "", labelZh: "" }];
    up({ options: opts });
  };
  const removeOption = (idx: number) => {
    const opts = (field.options || []).filter((_, i) => i !== idx);
    up({ options: opts });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <FieldTypeBadge type={field.type} />
        <span className="text-sm font-semibold text-slate-800">
          {isStatement ? "Statement / T&C properties" : "Field properties"}
        </span>
      </div>

      {isStatement ? (
        /* Statement block: just body text in EN + ZH, no label/input/required */
        <div className="space-y-3">
          <div className="col-span-2">
            <label className={labelBase}>Field key <span className="text-slate-400">(unique identifier)</span></label>
            <input
              className={inputBase + " font-mono text-xs"}
              value={field.key}
              onChange={(e) => up({ key: e.target.value.replace(/\s/g, "_") })}
              placeholder="statement_key"
            />
          </div>
          <div>
            <label className={labelBase}>Statement text (EN)</label>
            <textarea
              className={inputBase}
              rows={6}
              value={field.labelEn}
              onChange={(e) => up({ labelEn: e.target.value })}
              placeholder="Type your terms and conditions or statement in English..."
            />
          </div>
          <div>
            <label className={labelBase}>声明内容 (ZH)</label>
            <textarea
              className={inputBase}
              rows={6}
              value={field.labelZh || ""}
              onChange={(e) => up({ labelZh: e.target.value })}
              placeholder="请输入中文声明内容（条款与条件等）..."
            />
          </div>
          <p className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
            This block displays read-only text to the customer. No input is collected.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={labelBase}>Field key <span className="text-slate-400">(unique identifier)</span></label>
            <input
              className={inputBase + " font-mono text-xs"}
              value={field.key}
              onChange={(e) => up({ key: e.target.value.replace(/\s/g, "_") })}
              placeholder="field_key"
            />
          </div>
          <div>
            <label className={labelBase}>Label (EN)</label>
            <input className={inputBase} value={field.labelEn} onChange={(e) => up({ labelEn: e.target.value })} placeholder="Field label" />
          </div>
          <div>
            <label className={labelBase}>标签 (ZH)</label>
            <input className={inputBase} value={field.labelZh || ""} onChange={(e) => up({ labelZh: e.target.value })} placeholder="字段标签" />
          </div>
          {field.type !== "checkbox" && field.type !== "radio" && field.type !== "select" && (
            <>
              <div>
                <label className={labelBase}>Placeholder (EN)</label>
                <input className={inputBase} value={field.placeholderEn || ""} onChange={(e) => up({ placeholderEn: e.target.value })} placeholder="Enter..." />
              </div>
              <div>
                <label className={labelBase}>提示文字 (ZH)</label>
                <input className={inputBase} value={field.placeholderZh || ""} onChange={(e) => up({ placeholderZh: e.target.value })} placeholder="请输入..." />
              </div>
            </>
          )}
          <div>
            <label className={labelBase}>Help text (EN)</label>
            <input className={inputBase} value={field.helpTextEn || ""} onChange={(e) => up({ helpTextEn: e.target.value })} placeholder="Optional hint..." />
          </div>
          <div>
            <label className={labelBase}>帮助文字 (ZH)</label>
            <input className={inputBase} value={field.helpTextZh || ""} onChange={(e) => up({ helpTextZh: e.target.value })} placeholder="可选提示..." />
          </div>
          <div>
            <label className={labelBase}>Width</label>
            <select className={inputBase} value={field.width || "half"} onChange={(e) => up({ width: e.target.value as "half" | "full" })}>
              <option value="half">Half (2-col)</option>
              <option value="full">Full width</option>
            </select>
          </div>
          <div className="flex items-center gap-2 pt-5">
            <input
              type="checkbox"
              id="req_check"
              checked={Boolean(field.required)}
              onChange={(e) => up({ required: e.target.checked })}
              className="h-4 w-4"
            />
            <label htmlFor="req_check" className="text-sm text-slate-700 cursor-pointer">Required</label>
          </div>
        </div>
      )}

      {hasOptions && (
        <div>
          <label className={labelBase + " mb-1"}>Options</label>
          <div className="space-y-2">
            {(field.options || []).map((opt, idx) => (
              <div key={idx} className="flex gap-1.5 items-center">
                <input
                  className={inputBase + " font-mono text-xs"}
                  style={{ width: "90px" }}
                  value={opt.value}
                  onChange={(e) => updateOption(idx, { value: e.target.value.replace(/\s/g, "_") })}
                  placeholder="value"
                  title="Option value (stored)"
                />
                <input
                  className={inputBase}
                  value={opt.labelEn}
                  onChange={(e) => updateOption(idx, { labelEn: e.target.value })}
                  placeholder="Label EN"
                />
                <input
                  className={inputBase}
                  value={opt.labelZh || ""}
                  onChange={(e) => updateOption(idx, { labelZh: e.target.value })}
                  placeholder="标签 ZH"
                />
                <button
                  type="button"
                  onClick={() => removeOption(idx)}
                  className="shrink-0 text-slate-400 hover:text-rose-600 px-1"
                >✕</button>
              </div>
            ))}
            <button
              type="button"
              onClick={addOption}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >+ Add option</button>
          </div>
        </div>
      )}
    </div>
  );
}

interface DocumentRowProps {
  doc: KycV2Document;
  onChange: (updated: KycV2Document) => void;
  onDelete: () => void;
}
function DocumentRow({ doc, onChange, onDelete }: DocumentRowProps) {
  const inputBase = "rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400";
  return (
    <div className="rounded-lg border border-slate-200 p-3 bg-white space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-lg">📎</span>
        <input
          className={inputBase + " flex-1 font-mono text-xs"}
          value={doc.code}
          onChange={(e) => onChange({ ...doc, code: e.target.value.replace(/\s/g, "_") })}
          placeholder="doc_code"
          title="Document code (unique)"
        />
        <div className="flex items-center gap-1.5">
          <input
            type="checkbox"
            id={`req_${doc.id}`}
            checked={Boolean(doc.required)}
            onChange={(e) => onChange({ ...doc, required: e.target.checked })}
            className="h-3.5 w-3.5"
          />
          <label htmlFor={`req_${doc.id}`} className="text-xs text-slate-600 cursor-pointer">Required</label>
        </div>
        <button type="button" onClick={onDelete} className="text-slate-400 hover:text-rose-600 px-1">✕</button>
      </div>
      <div className="flex gap-2">
        <input
          className={inputBase + " flex-1"}
          value={doc.labelEn}
          onChange={(e) => onChange({ ...doc, labelEn: e.target.value })}
          placeholder="Label EN"
        />
        <input
          className={inputBase + " flex-1"}
          value={doc.labelZh || ""}
          onChange={(e) => onChange({ ...doc, labelZh: e.target.value })}
          placeholder="标签 ZH"
        />
      </div>
    </div>
  );
}

// ── Main builder ───────────────────────────────────────────────────────────────

interface Props {
  schema: KycV2Schema;
  onChange: (schema: KycV2Schema) => void;
}

export default function KycFormBuilder({ schema, onChange }: Props) {
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    schema.sections[0]?.id ?? null,
  );
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [tab, setTab] = useState<"build" | "preview_en" | "preview_zh">("build");
  const [addingToSectionId, setAddingToSectionId] = useState<string | null>(null);
  const dragFieldRef = useRef<{ sectionId: string; fieldIdx: number } | null>(null);
  const dragOverRef = useRef<{ sectionId: string; fieldIdx: number } | null>(null);
  const dragSectionRef = useRef<number | null>(null);
  const dragOverSectionRef = useRef<number | null>(null);

  const up = (patch: Partial<KycV2Schema>) => onChange({ ...schema, ...patch });

  // ── Section helpers ──────────────────────────────────────────────────────────
  const sections = [...schema.sections].sort((a, b) => a.order - b.order);

  const updateSection = (id: string, patch: Partial<KycV2Section>) => {
    up({
      sections: schema.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    });
  };

  const addSection = () => {
    const sec = newSection();
    sec.order = sections.length;
    up({ sections: [...schema.sections, sec] });
    setSelectedSectionId(sec.id);
    setSelectedFieldId(null);
  };

  const deleteSection = (id: string) => {
    up({ sections: schema.sections.filter((s) => s.id !== id) });
    if (selectedSectionId === id) {
      setSelectedSectionId(sections.find((s) => s.id !== id)?.id ?? null);
      setSelectedFieldId(null);
    }
  };

  const moveSectionUp = (idx: number) => {
    if (idx === 0) return;
    const arr = [...sections];
    [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
    up({ sections: arr.map((s, i) => ({ ...s, order: i })) });
  };
  const moveSectionDown = (idx: number) => {
    if (idx >= sections.length - 1) return;
    const arr = [...sections];
    [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
    up({ sections: arr.map((s, i) => ({ ...s, order: i })) });
  };

  // ── Field helpers ────────────────────────────────────────────────────────────
  const addField = (sectionId: string, type: KycV2FieldType) => {
    const f = newField(type);
    updateSection(sectionId, {
      fields: [...(sections.find((s) => s.id === sectionId)?.fields || []), f],
    });
    setSelectedFieldId(f.id);
    setAddingToSectionId(null);
  };

  const updateField = (sectionId: string, fieldId: string, patch: Partial<KycV2Field>) => {
    updateSection(sectionId, {
      fields: (sections.find((s) => s.id === sectionId)?.fields || []).map((f) =>
        f.id === fieldId ? { ...f, ...patch } : f,
      ),
    });
  };

  const deleteField = (sectionId: string, fieldId: string) => {
    updateSection(sectionId, {
      fields: (sections.find((s) => s.id === sectionId)?.fields || []).filter((f) => f.id !== fieldId),
    });
    if (selectedFieldId === fieldId) setSelectedFieldId(null);
  };

  const moveFieldUp = (sectionId: string, idx: number) => {
    const sec = sections.find((s) => s.id === sectionId);
    if (!sec || idx === 0) return;
    const fields = [...sec.fields];
    [fields[idx - 1], fields[idx]] = [fields[idx], fields[idx - 1]];
    updateSection(sectionId, { fields });
  };

  const moveFieldDown = (sectionId: string, idx: number) => {
    const sec = sections.find((s) => s.id === sectionId);
    if (!sec || idx >= sec.fields.length - 1) return;
    const fields = [...sec.fields];
    [fields[idx], fields[idx + 1]] = [fields[idx + 1], fields[idx]];
    updateSection(sectionId, { fields });
  };

  // find current selected field
  const selectedField =
    selectedFieldId
      ? sections.flatMap((s) => s.fields).find((f) => f.id === selectedFieldId) ?? null
      : null;
  const selectedFieldSectionId =
    selectedFieldId
      ? sections.find((s) => s.fields.some((f) => f.id === selectedFieldId))?.id ?? null
      : null;

  // ── Documents helpers ─────────────────────────────────────────────────────────
  const docs = schema.documents || [];
  const addDoc = () => up({ documents: [...docs, newDocument()] });
  const updateDoc = (id: string, updated: KycV2Document) =>
    up({ documents: docs.map((d) => (d.id === id ? updated : d)) });
  const deleteDoc = (id: string) => up({ documents: docs.filter((d) => d.id !== id) });

  // ── Section drag ──────────────────────────────────────────────────────────────
  const onSectionDragStart = (idx: number) => { dragSectionRef.current = idx; };
  const onSectionDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    dragOverSectionRef.current = idx;
  };
  const onSectionDrop = () => {
    const from = dragSectionRef.current;
    const to = dragOverSectionRef.current;
    if (from == null || to == null || from === to) return;
    const arr = [...sections];
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    up({ sections: arr.map((s, i) => ({ ...s, order: i })) });
    dragSectionRef.current = null;
    dragOverSectionRef.current = null;
  };

  // ── Field drag within a section ────────────────────────────────────────────
  const onFieldDragStart = (sectionId: string, idx: number) => {
    dragFieldRef.current = { sectionId, fieldIdx: idx };
  };
  const onFieldDragOver = (e: React.DragEvent, sectionId: string, idx: number) => {
    e.preventDefault();
    dragOverRef.current = { sectionId, fieldIdx: idx };
  };
  const onFieldDrop = (targetSectionId: string) => {
    const from = dragFieldRef.current;
    const to = dragOverRef.current;
    if (!from || !to) return;
    if (from.sectionId !== targetSectionId) return; // cross-section not supported in simple mode
    if (from.fieldIdx === to.fieldIdx) return;
    const sec = sections.find((s) => s.id === targetSectionId);
    if (!sec) return;
    const fields = [...sec.fields];
    const [moved] = fields.splice(from.fieldIdx, 1);
    fields.splice(to.fieldIdx, 0, moved);
    updateSection(targetSectionId, { fields });
    dragFieldRef.current = null;
    dragOverRef.current = null;
  };

  // ── Tabs ──────────────────────────────────────────────────────────────────────
  const tabBtn = (t: typeof tab, label: string) => (
    <button
      key={t}
      type="button"
      onClick={() => setTab(t)}
      className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
        tab === t ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      }`}
    >
      {label}
    </button>
  );

  const labelBase = "block text-xs font-medium text-slate-600 mb-0.5";
  const inputBase = "w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400";

  return (
    <div className="flex flex-col gap-4">
      {/* Header controls */}
      <div className="flex flex-wrap gap-3 items-start">
        <div className="flex-1 min-w-[220px]">
          <label className={labelBase}>Form title (EN)</label>
          <input className={inputBase} value={schema.titleEn} onChange={(e) => up({ titleEn: e.target.value })} placeholder="KYC form title" />
        </div>
        <div className="flex-1 min-w-[220px]">
          <label className={labelBase}>表单标题 (ZH)</label>
          <input className={inputBase} value={schema.titleZh || ""} onChange={(e) => up({ titleZh: e.target.value })} placeholder="KYC 表单标题" />
        </div>
        <div className="flex items-end gap-2 pb-0">
          {tabBtn("build", "Build")}
          {tabBtn("preview_en", "Preview EN")}
          {tabBtn("preview_zh", "Preview ZH")}
        </div>
      </div>

      {/* Build tab */}
      {tab === "build" && (
        <div className="flex gap-4 min-h-[600px]">
          {/* Left: Sections + fields canvas */}
          <div className="flex-1 min-w-0 overflow-x-hidden space-y-4 overflow-y-auto max-h-[78vh] pr-1">
            {sections.map((section, secIdx) => (
              <div
                key={section.id}
                draggable
                onDragStart={() => onSectionDragStart(secIdx)}
                onDragOver={(e) => onSectionDragOver(e, secIdx)}
                onDrop={onSectionDrop}
                className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden"
              >
                {/* Section header */}
                <div className="flex items-center gap-2 px-3 pt-3 pb-2">
                  <div className="cursor-grab text-slate-300 select-none" title="Drag section">⠿</div>
                  <div className="flex-1 flex flex-col sm:flex-row gap-2">
                    <input
                      className="flex-1 rounded-lg border border-transparent bg-white px-2.5 py-1 text-sm font-semibold text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                      value={section.titleEn}
                      onChange={(e) => updateSection(section.id, { titleEn: e.target.value })}
                      placeholder="Section title (EN)"
                      onClick={() => { setSelectedSectionId(section.id); setSelectedFieldId(null); }}
                    />
                    <input
                      className="flex-1 rounded-lg border border-transparent bg-white px-2.5 py-1 text-sm text-slate-600 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                      value={section.titleZh || ""}
                      onChange={(e) => updateSection(section.id, { titleZh: e.target.value })}
                      placeholder="节标题 (ZH)"
                    />
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => moveSectionUp(secIdx)} disabled={secIdx === 0} className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30" title="Move up">▲</button>
                    <button type="button" onClick={() => moveSectionDown(secIdx)} disabled={secIdx === sections.length - 1} className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30" title="Move down">▼</button>
                    <button type="button" onClick={() => deleteSection(section.id)} className="p-1 text-slate-400 hover:text-rose-600" title="Delete section">✕</button>
                  </div>
                </div>

                {/* Fields */}
                <div
                  className="space-y-1.5 px-3 pb-1 min-h-[40px] overflow-hidden"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onFieldDrop(section.id)}
                >
                  {section.fields.map((field, fIdx) => (
                    <div
                      key={field.id}
                      draggable
                      onDragStart={() => onFieldDragStart(section.id, fIdx)}
                      onDragOver={(e) => onFieldDragOver(e, section.id, fIdx)}
                      className="overflow-hidden"
                    >
                      <FieldRow
                        field={field}
                        selected={selectedFieldId === field.id}
                        onSelect={() => {
                          setSelectedFieldId(field.id);
                          setSelectedSectionId(section.id);
                        }}
                        onDelete={() => deleteField(section.id, field.id)}
                        onMoveUp={() => moveFieldUp(section.id, fIdx)}
                        onMoveDown={() => moveFieldDown(section.id, fIdx)}
                        isFirst={fIdx === 0}
                        isLast={fIdx === section.fields.length - 1}
                      />
                    </div>
                  ))}
                  {section.fields.length === 0 && (
                    <div className="py-2 text-center text-xs text-slate-400">
                      No fields yet — add one below
                    </div>
                  )}
                </div>

                {/* Add field to section */}
                <div className="px-3 pb-3">
                  {addingToSectionId === section.id ? (
                    <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-2">
                      <p className="text-xs font-semibold text-slate-600 mb-2">Choose field type</p>
                      <div className="flex flex-wrap gap-1.5">
                        {FIELD_TYPES.map(({ type, icon, labelEn }) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => addField(section.id, type)}
                            className="flex items-center gap-1 rounded-lg bg-white border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                          >
                            <span>{icon}</span>
                            <span>{labelEn}</span>
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setAddingToSectionId(null)}
                          className="rounded-lg px-2 py-1.5 text-xs text-slate-400 hover:text-slate-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAddingToSectionId(section.id)}
                      className="mt-2 w-full rounded-lg border border-dashed border-slate-300 py-1.5 text-xs font-semibold text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
                    >
                      + Add field
                    </button>
                  )}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addSection}
              className="w-full rounded-xl border-2 border-dashed border-slate-300 py-3 text-sm font-semibold text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
            >
              + Add section
            </button>

            {/* Documents area */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-700">📎 Required Documents</h4>
                <button
                  type="button"
                  onClick={addDoc}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  + Add document
                </button>
              </div>
              <div className="space-y-2">
                {docs.map((doc) => (
                  <DocumentRow
                    key={doc.id}
                    doc={doc}
                    onChange={(updated) => updateDoc(doc.id, updated)}
                    onDelete={() => deleteDoc(doc.id)}
                  />
                ))}
                {docs.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-2">No document slots yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Right: Properties panel */}
          <div className="w-80 shrink-0 rounded-xl border border-slate-200 bg-white p-4 overflow-y-auto max-h-[78vh]">
            {selectedField && selectedFieldSectionId ? (
              <FieldProperties
                field={selectedField}
                onChange={(updated) => updateField(selectedFieldSectionId, selectedField.id, updated)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-sm text-slate-400 gap-2 py-12">
                <span className="text-3xl">←</span>
                <p>Click a field to edit its properties</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview tabs */}
      {(tab === "preview_en" || tab === "preview_zh") && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 max-h-[78vh] overflow-y-auto">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">
              {tab === "preview_zh" ? schema.titleZh || schema.titleEn : schema.titleEn}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {tab === "preview_zh" ? "预览模式" : "Preview mode"} — {tab === "preview_zh" ? "字段不可编辑" : "Fields are not editable"}
            </p>
          </div>
          <KycV2Renderer
            schema={schema}
            lang={tab === "preview_zh" ? "zh" : "en"}
            preview
          />
        </div>
      )}
    </div>
  );
}
