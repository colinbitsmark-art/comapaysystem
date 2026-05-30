import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  useThemePreferences,
  PRESET_THEMES,
  DEFAULT_SIDEBAR_BG,
  DEFAULT_APP_BG,
  deriveTheme,
  applyThemeToCss,
  applyOverrides,
  isLightColor,
  shiftBrightness,
  type Theme,
  type ThemeColorOverrides,
} from "../hooks/useThemePreferences";
import TwoFactorSettings from "../components/auth/TwoFactorSettings";
import AccountSettings from "../components/auth/AccountSettings";
import EmailSettings from "../components/auth/EmailSettings";

// ─── Mini App Preview ─────────────────────────────────────────────────────────

function AppPreview({ sidebarBg, appBg, size = "md" }: { sidebarBg: string; appBg: string; size?: "sm" | "md" }) {
  const d = deriveTheme(sidebarBg, appBg);
  const navText = d.sidebarNavText;
  const activeNavBg = d.sidebarNavActiveBg;
  const activeNavText = d.sidebarNavActiveText;

  const isSmall = size === "sm";
  const w = isSmall ? 120 : 220;
  const h = isSmall ? 76 : 148;
  const sidebarW = isSmall ? 32 : 60;
  const px = isSmall ? 3 : 6;
  const py = isSmall ? 4 : 8;
  const gap = isSmall ? 2 : 4;
  const navH = isSmall ? 8 : 14;
  const navRadius = isSmall ? 2 : 5;

  return (
    <div
      className="rounded-lg overflow-hidden border flex-shrink-0"
      style={{ width: w, height: h, borderColor: d.border }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-1"
        style={{
          backgroundColor: d.headerBg,
          borderBottom: `1px solid ${d.border}`,
          padding: `${isSmall ? 3 : 6}px ${isSmall ? 3 : 8}px`,
          height: isSmall ? 16 : 28,
        }}
      >
        <div className="rounded-full" style={{ width: isSmall ? 20 : 36, height: isSmall ? 4 : 7, backgroundColor: d.border }} />
        <div className="flex-1" />
        <div className="rounded" style={{ width: isSmall ? 12 : 22, height: isSmall ? 4 : 7, backgroundColor: d.border }} />
      </div>
      <div className="flex flex-1" style={{ height: h - (isSmall ? 16 : 28) }}>
        {/* Sidebar */}
        <div
          className="flex flex-col"
          style={{ backgroundColor: sidebarBg, width: sidebarW, minWidth: sidebarW, padding: `${py}px ${px}px`, gap }}
        >
          {["", "", "", ""].map((_, i) => (
            <div
              key={i}
              className="rounded"
              style={{
                height: navH,
                borderRadius: navRadius,
                backgroundColor: i === 0 ? activeNavBg : d.sidebarNavInactive,
                color: i === 0 ? activeNavText : navText,
              }}
            />
          ))}
        </div>
        {/* Content */}
        <div
          className="flex-1 flex flex-col"
          style={{ backgroundColor: appBg, padding: isSmall ? 4 : 8, gap: isSmall ? 2 : 4 }}
        >
          <div
            className="rounded"
            style={{ height: isSmall ? 10 : 22, backgroundColor: d.cardBg, border: `1px solid ${d.border}` }}
          />
          <div className="flex gap-1 flex-1">
            <div
              className="flex-1 rounded"
              style={{ backgroundColor: d.cardBg, border: `1px solid ${d.border}` }}
            />
            <div
              className="flex-1 rounded"
              style={{ backgroundColor: d.cardBg, border: `1px solid ${d.border}` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Theme Preset Card ────────────────────────────────────────────────────────

function ThemeCard({
  theme,
  selected,
  onClick,
}: {
  theme: Theme;
  selected: boolean;
  onClick: () => void;
}) {
  const { i18n } = useTranslation();
  const isZh = i18n.language?.startsWith("zh");
  const label = isZh ? theme.nameZh : theme.name;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex flex-col items-center gap-2 rounded-xl p-3 transition-all border-2 hover:scale-[1.02]"
      style={{
        borderColor: selected ? "#3b82f6" : "#e2e8f0",
        backgroundColor: selected ? "#eff6ff" : "#f8fafc",
        boxShadow: selected ? "0 0 0 3px rgba(59,130,246,0.2)" : undefined,
      }}
    >
      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
      <AppPreview sidebarBg={theme.sidebarBgColor} appBg={theme.displayBgColor} size="sm" />
      <span className="text-xs font-semibold text-slate-700 text-center leading-tight">{label}</span>
    </button>
  );
}

// ─── Color Swatch Picker ──────────────────────────────────────────────────────

const SIDEBAR_SWATCHES = [
  "#0f172a", "#1e293b", "#334155", "#111827", "#18181b",
  "#0a1f44", "#1e1b4b", "#052e16", "#292019", "#4c0519",
  "#0d3447", "#3b0764", "#431407", "#164e63", "#f1f5f9",
  "#e2e8f0", "#ffffff",
];

const APP_BG_SWATCHES = [
  "#f8fafc", "#ffffff", "#f1f5f9", "#f3f4f6", "#fffbeb",
  "#fff1f2", "#faf5ff", "#f0fdf4", "#eff6ff", "#ecfeff",
  "#111827", "#09090b", "#18181b", "#0f172a", "#1c1917",
];

function ColorPickerRow({
  label,
  swatches,
  value,
  onChange,
}: {
  label: string;
  swatches: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400">{value}</span>
          <input
            type="color"
            value={value.length === 7 ? value : "#000000"}
            onChange={(e) => onChange(e.target.value)}
            className="w-7 h-7 rounded border border-slate-200 cursor-pointer p-0.5"
            title={t("preferences.customColor")}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {swatches.map((c) => (
          <button
            key={c}
            type="button"
            title={c}
            onClick={() => onChange(c)}
            className="w-7 h-7 rounded-md border-2 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{
              backgroundColor: c,
              borderColor: value === c ? "#3b82f6" : isLightColor(c) ? "#cbd5e1" : "transparent",
              boxShadow: value === c ? "0 0 0 2px rgba(59,130,246,0.4)" : undefined,
            }}
          >
            {value === c && (
              <svg
                className="w-3.5 h-3.5 mx-auto"
                fill="none"
                stroke={isLightColor(c) ? "#0f172a" : "#ffffff"}
                strokeWidth={3}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Override color cell ──────────────────────────────────────────────────────

function OverrideColorCell({
  labelKey,
  autoValue,
  overrideValue,
  onOverride,
  onReset,
}: {
  labelKey: string;
  autoValue: string;
  overrideValue: string | null | undefined;
  onOverride: (v: string) => void;
  onReset: () => void;
}) {
  const { t } = useTranslation();
  const isOverridden = !!overrideValue;
  const currentVal = overrideValue || autoValue;

  return (
    <div
      className="flex items-center gap-2 rounded-lg px-3 py-2"
      style={{
        backgroundColor: "var(--theme-app-bg)",
        border: `1px solid ${isOverridden ? "#3b82f6" : "var(--theme-border)"}`,
      }}
    >
      <input
        type="color"
        value={currentVal.length === 7 ? currentVal : "#000000"}
        onChange={(e) => onOverride(e.target.value)}
        className="w-6 h-6 rounded border-0 cursor-pointer p-0 flex-shrink-0"
        style={{ backgroundColor: "transparent" }}
        title={currentVal}
      />
      <div className="flex-1 min-w-0">
        <span className="text-xs block truncate" style={{ color: "var(--theme-text-secondary)" }}>
          {t(labelKey)}
        </span>
        {isOverridden && (
          <button
            type="button"
            onClick={onReset}
            className="text-[10px] text-blue-400 hover:text-blue-600 leading-none transition-colors"
          >
            {t("preferences.resetAuto")}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = ["account", "theme", "security"] as const;
type Tab = (typeof TABS)[number];

// Maps override key → derived theme key
const OVERRIDE_FIELDS: Array<{
  labelKey: string;
  overrideKey: keyof ThemeColorOverrides;
  derivedKey: keyof ReturnType<typeof deriveTheme>;
}> = [
  { labelKey: "preferences.colorHeader",  overrideKey: "themeHeaderBg",      derivedKey: "headerBg" },
  { labelKey: "preferences.colorCard",    overrideKey: "themeCardBg",         derivedKey: "cardBg" },
  { labelKey: "preferences.colorBorder",  overrideKey: "themeBorder",         derivedKey: "border" },
  { labelKey: "preferences.colorText",    overrideKey: "themeTextPrimary",    derivedKey: "textPrimary" },
  { labelKey: "preferences.colorTextSub", overrideKey: "themeTextSecondary",  derivedKey: "textSecondary" },
  { labelKey: "preferences.colorNavText", overrideKey: "themeSidebarNavText", derivedKey: "sidebarNavText" },
];

export default function ProfilePage() {
  const { t } = useTranslation();
  const { sidebarBgColor, appBgColor, colorOverrides, savePreferences, isLoading } = useThemePreferences();

  const [activeTab, setActiveTab] = useState<Tab>("account");
  const [localSidebar, setLocalSidebar] = useState(sidebarBgColor);
  const [localApp, setLocalApp] = useState(appBgColor);
  const [localOverrides, setLocalOverrides] = useState<ThemeColorOverrides>(colorOverrides);
  const [isCustom, setIsCustom] = useState(false);
  const [saved, setSaved] = useState(false);

  // Keep local state in sync when external (e.g. login) changes preferences
  useEffect(() => {
    setLocalSidebar(sidebarBgColor);
    setLocalApp(appBgColor);
    setLocalOverrides(colorOverrides);
  }, [sidebarBgColor, appBgColor]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasOverrides = Object.values(localOverrides).some(Boolean);

  // Find which preset matches current local selection (only if no overrides active)
  const matchedPreset = !hasOverrides
    ? PRESET_THEMES.find((th) => th.sidebarBgColor === localSidebar && th.displayBgColor === localApp)
    : undefined;

  const isDirty =
    localSidebar !== sidebarBgColor ||
    localApp !== appBgColor ||
    OVERRIDE_FIELDS.some(({ overrideKey }) =>
      (localOverrides[overrideKey] ?? null) !== (colorOverrides[overrideKey] ?? null)
    );

  // Live-preview: apply changes to CSS vars without saving
  useEffect(() => {
    applyThemeToCss(applyOverrides(deriveTheme(localSidebar, localApp), localOverrides));
  }, [localSidebar, localApp, localOverrides]);

  const selectPreset = (theme: Theme) => {
    setLocalSidebar(theme.sidebarBgColor);
    setLocalApp(theme.displayBgColor);
    setLocalOverrides({});
    setIsCustom(false);
  };

  const handleSave = async () => {
    await savePreferences({
      sidebarBgColor: localSidebar,
      displayBgColor: localApp,
      themeHeaderBg: localOverrides.themeHeaderBg ?? null,
      themeCardBg: localOverrides.themeCardBg ?? null,
      themeBorder: localOverrides.themeBorder ?? null,
      themeTextPrimary: localOverrides.themeTextPrimary ?? null,
      themeTextSecondary: localOverrides.themeTextSecondary ?? null,
      themeSidebarNavText: localOverrides.themeSidebarNavText ?? null,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleReset = () => {
    setLocalSidebar(DEFAULT_SIDEBAR_BG);
    setLocalApp(DEFAULT_APP_BG);
    setLocalOverrides({});
    setIsCustom(false);
  };

  const autoValues = deriveTheme(localSidebar, localApp);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Tab bar */}
      <div className="border-b" style={{ borderColor: "var(--theme-border)" }}>
        <div className="flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {t(`profile.tabs.${tab}`)}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "account" && (
        <div className="space-y-6">
          <EmailSettings />
          <AccountSettings />
        </div>
      )}

      {/* Theme tab */}
      {activeTab === "theme" && (
        <div className="space-y-6">

          {/* ── Live preview + actions row ── */}
          <div className="theme-card rounded-2xl border p-5 flex items-start gap-6">
            <div className="flex-shrink-0">
              <AppPreview sidebarBg={localSidebar} appBg={localApp} size="md" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold mb-1" style={{ color: "var(--theme-text-primary)" }}>
                {t("preferences.preview")}
              </h2>
              <p className="text-xs mb-4" style={{ color: "var(--theme-text-secondary)" }}>
                {matchedPreset
                  ? t("preferences.currentTheme", { name: t(`preferences.themeNames.${matchedPreset.id}`) })
                  : t("preferences.customMode")}
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isLoading || !isDirty}
                  className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? t("common.saving") : t("common.save")}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={localSidebar === DEFAULT_SIDEBAR_BG && localApp === DEFAULT_APP_BG && !hasOverrides}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {t("preferences.resetAll")}
                </button>
                {saved && (
                  <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {t("preferences.saved")}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── Preset themes grid ── */}
          <div className="theme-card rounded-2xl border p-5 space-y-4">
            <div>
              <h2 className="text-base font-semibold" style={{ color: "var(--theme-text-primary)" }}>
                {t("preferences.presetThemes")}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--theme-text-secondary)" }}>
                {t("preferences.presetThemesDesc")}
              </p>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {PRESET_THEMES.map((theme) => (
                <ThemeCard
                  key={theme.id}
                  theme={theme}
                  selected={!isCustom && !!matchedPreset && matchedPreset.id === theme.id}
                  onClick={() => selectPreset(theme)}
                />
              ))}
            </div>
          </div>

          {/* ── Custom / Advanced ── */}
          <div className="theme-card rounded-2xl border overflow-hidden">
            <button
              type="button"
              onClick={() => setIsCustom((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-opacity-50 transition-colors"
              style={{ backgroundColor: "transparent" }}
            >
              <div>
                <span className="text-sm font-semibold" style={{ color: "var(--theme-text-primary)" }}>
                  {t("preferences.customize")}
                </span>
                <p className="text-xs mt-0.5" style={{ color: "var(--theme-text-secondary)" }}>
                  {t("preferences.customizeDesc")}
                </p>
              </div>
              <svg
                className={`w-5 h-5 transition-transform flex-shrink-0 ${isCustom ? "rotate-180" : ""}`}
                style={{ color: "var(--theme-text-muted, #94a3b8)" }}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isCustom && (
              <div className="px-5 pb-5 space-y-5 border-t" style={{ borderColor: "var(--theme-border)" }}>
                <div className="pt-4">
                  <ColorPickerRow
                    label={t("preferences.sidebarColor")}
                    swatches={SIDEBAR_SWATCHES}
                    value={localSidebar}
                    onChange={(v) => setLocalSidebar(v)}
                  />
                </div>
                <div className="border-t pt-4" style={{ borderColor: "var(--theme-border)" }}>
                  <ColorPickerRow
                    label={t("preferences.appBgColor")}
                    swatches={APP_BG_SWATCHES}
                    value={localApp}
                    onChange={(v) => setLocalApp(v)}
                  />
                </div>

                {/* ── Override derived colors ── */}
                <div className="border-t pt-4" style={{ borderColor: "var(--theme-border)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold" style={{ color: "var(--theme-text-secondary)" }}>
                      {t("preferences.derivedColors")}
                    </p>
                    {hasOverrides && (
                      <button
                        type="button"
                        onClick={() => setLocalOverrides({})}
                        className="text-xs text-blue-500 hover:text-blue-700 font-medium transition-colors"
                      >
                        {t("preferences.resetDerived")}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {OVERRIDE_FIELDS.map(({ labelKey, overrideKey, derivedKey }) => (
                      <OverrideColorCell
                        key={overrideKey}
                        labelKey={labelKey}
                        autoValue={autoValues[derivedKey] as string}
                        overrideValue={localOverrides[overrideKey]}
                        onOverride={(v) => setLocalOverrides((prev) => ({ ...prev, [overrideKey]: v }))}
                        onReset={() => setLocalOverrides((prev) => ({ ...prev, [overrideKey]: null }))}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "security" && (
        <div className="space-y-6">
          <TwoFactorSettings />
        </div>
      )}
    </div>
  );
}
