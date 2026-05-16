import { useEffect } from "react";
import { useAppSelector, useAppDispatch } from "../app/hooks";
import { updateThemePreferences } from "../app/authSlice";
import { useUpdateUserPreferencesMutation } from "../services/api";

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Returns true when a hex color is perceptually light (luminance > 0.5). */
export function isLightColor(hex: string): boolean {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return true;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5;
}

/** Lightens (+) or darkens (-) a hex color by `amount` (0–255). */
export function shiftBrightness(hex: string, amount: number): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return hex;
  const clamp = (v: number) => Math.min(255, Math.max(0, Math.round(v)));
  const r = clamp(parseInt(clean.slice(0, 2), 16) + amount);
  const g = clamp(parseInt(clean.slice(2, 4), 16) + amount);
  const b = clamp(parseInt(clean.slice(4, 6), 16) + amount);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/** Blend hex color toward white (factor 0=original, 1=white). */
function blendToWhite(hex: string, factor: number): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return hex;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const nr = Math.round(r + (255 - r) * factor);
  const ng = Math.round(g + (255 - g) * factor);
  const nb = Math.round(b + (255 - b) * factor);
  return `#${nr.toString(16).padStart(2, "0")}${ng.toString(16).padStart(2, "0")}${nb.toString(16).padStart(2, "0")}`;
}

// ─── Preset themes ────────────────────────────────────────────────────────────

export interface Theme {
  id: string;
  name: string;
  nameZh: string;
  sidebarBgColor: string;
  displayBgColor: string;
}

export const PRESET_THEMES: Theme[] = [
  {
    id: "default",
    name: "Default",
    nameZh: "默认",
    sidebarBgColor: "#0f172a",
    displayBgColor: "#f8fafc",
  },
  {
    id: "light",
    name: "Clean Light",
    nameZh: "简洁亮色",
    sidebarBgColor: "#e2e8f0",
    displayBgColor: "#ffffff",
  },
  {
    id: "slate-pro",
    name: "Slate Pro",
    nameZh: "专业灰",
    sidebarBgColor: "#1e293b",
    displayBgColor: "#f1f5f9",
  },
  {
    id: "ocean",
    name: "Ocean",
    nameZh: "深海",
    sidebarBgColor: "#0a1f44",
    displayBgColor: "#eff6ff",
  },
  {
    id: "forest",
    name: "Forest",
    nameZh: "森林",
    sidebarBgColor: "#052e16",
    displayBgColor: "#f0fdf4",
  },
  {
    id: "twilight",
    name: "Twilight",
    nameZh: "暮光",
    sidebarBgColor: "#1e1b4b",
    displayBgColor: "#faf5ff",
  },
  {
    id: "warm",
    name: "Warm Desert",
    nameZh: "温暖沙漠",
    sidebarBgColor: "#292019",
    displayBgColor: "#fffbeb",
  },
  {
    id: "rose",
    name: "Rose",
    nameZh: "玫瑰",
    sidebarBgColor: "#4c0519",
    displayBgColor: "#fff1f2",
  },
  {
    id: "midnight",
    name: "Midnight",
    nameZh: "午夜",
    sidebarBgColor: "#0d0d11",
    displayBgColor: "#111827",
  },
  {
    id: "carbon",
    name: "Carbon Dark",
    nameZh: "碳黑",
    sidebarBgColor: "#18181b",
    displayBgColor: "#09090b",
  },
];

export const DEFAULT_SIDEBAR_BG = PRESET_THEMES[0].sidebarBgColor;
export const DEFAULT_APP_BG = PRESET_THEMES[0].displayBgColor;

// ─── Derived colors ───────────────────────────────────────────────────────────

export interface DerivedTheme {
  sidebarBg: string;
  appBg: string;
  headerBg: string;
  cardBg: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  sidebarNavText: string;
  sidebarNavHover: string;
  sidebarNavInactive: string;
  sidebarNavActiveBg: string;
  sidebarNavActiveText: string;
  btnNeutralBg: string;
}

export function deriveTheme(sidebarBg: string, appBg: string): DerivedTheme {
  const appIsLight = isLightColor(appBg);
  const sidebarIsLight = isLightColor(sidebarBg);

  const headerBg = appIsLight ? "#ffffff" : shiftBrightness(appBg, 18);
  const cardBg = appIsLight ? "#ffffff" : shiftBrightness(appBg, 14);
  const border = appIsLight ? "#e2e8f0" : shiftBrightness(appBg, 28);
  const textPrimary = appIsLight ? "#0f172a" : "#f1f5f9";
  const textSecondary = appIsLight ? "#64748b" : "#94a3b8";
  const textMuted = appIsLight ? "#94a3b8" : "#64748b";

  const sidebarNavText = sidebarIsLight ? "#1e293b" : "#f1f5f9";
  const sidebarNavInactive = shiftBrightness(sidebarBg, sidebarIsLight ? -8 : 14);
  const sidebarNavHover = shiftBrightness(sidebarBg, sidebarIsLight ? -18 : 28);

  // Active nav pill: dark sidebar → white; light sidebar → dark
  const sidebarNavActiveBg = sidebarIsLight ? "#1e293b" : "#ffffff";
  const sidebarNavActiveText = sidebarIsLight ? "#ffffff" : "#0f172a";

  // Neutral button background — slightly lighter than card on dark, very light on light
  const btnNeutralBg = appIsLight ? "#f8fafc" : shiftBrightness(cardBg, 18);

  return {
    sidebarBg,
    appBg,
    headerBg,
    cardBg,
    border,
    textPrimary,
    textSecondary,
    textMuted,
    sidebarNavText,
    sidebarNavHover,
    sidebarNavInactive,
    sidebarNavActiveBg,
    sidebarNavActiveText,
    btnNeutralBg,
  };
}

/** Injects all theme CSS variables onto document.documentElement and toggles dark-theme class. */
export function applyThemeToCss(t: DerivedTheme) {
  const root = document.documentElement.style;
  root.setProperty("--theme-sidebar-bg", t.sidebarBg);
  root.setProperty("--theme-app-bg", t.appBg);
  root.setProperty("--theme-header-bg", t.headerBg);
  root.setProperty("--theme-card-bg", t.cardBg);
  root.setProperty("--theme-border", t.border);
  root.setProperty("--theme-text-primary", t.textPrimary);
  root.setProperty("--theme-text-secondary", t.textSecondary);
  root.setProperty("--theme-text-muted", t.textMuted);
  root.setProperty("--theme-sidebar-nav-text", t.sidebarNavText);
  root.setProperty("--theme-sidebar-nav-hover", t.sidebarNavHover);
  root.setProperty("--theme-sidebar-nav-inactive", t.sidebarNavInactive);
  root.setProperty("--theme-sidebar-nav-active-bg", t.sidebarNavActiveBg);
  root.setProperty("--theme-sidebar-nav-active-text", t.sidebarNavActiveText);
  root.setProperty("--theme-btn-neutral-bg", t.btnNeutralBg);

  // Toggle dark-theme class on <html> for global Tailwind overrides
  const isDark = !isLightColor(t.appBg);
  document.documentElement.classList.toggle("dark-theme", isDark);
}

// ─── Color overrides ──────────────────────────────────────────────────────────

export interface ThemeColorOverrides {
  themeHeaderBg?: string | null;
  themeCardBg?: string | null;
  themeBorder?: string | null;
  themeTextPrimary?: string | null;
  themeTextSecondary?: string | null;
  themeSidebarNavText?: string | null;
}

/** Merges manual overrides on top of a fully derived theme. */
export function applyOverrides(derived: DerivedTheme, overrides: ThemeColorOverrides): DerivedTheme {
  return {
    ...derived,
    headerBg: overrides.themeHeaderBg || derived.headerBg,
    cardBg: overrides.themeCardBg || derived.cardBg,
    border: overrides.themeBorder || derived.border,
    textPrimary: overrides.themeTextPrimary || derived.textPrimary,
    textSecondary: overrides.themeTextSecondary || derived.textSecondary,
    sidebarNavText: overrides.themeSidebarNavText || derived.sidebarNavText,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useThemePreferences() {
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();
  const [updatePrefs, { isLoading }] = useUpdateUserPreferencesMutation();

  const sidebarBgColor = user?.sidebarBgColor || DEFAULT_SIDEBAR_BG;
  const appBgColor = user?.displayBgColor || DEFAULT_APP_BG;

  const colorOverrides: ThemeColorOverrides = {
    themeHeaderBg: user?.themeHeaderBg,
    themeCardBg: user?.themeCardBg,
    themeBorder: user?.themeBorder,
    themeTextPrimary: user?.themeTextPrimary,
    themeTextSecondary: user?.themeTextSecondary,
    themeSidebarNavText: user?.themeSidebarNavText,
  };

  const derived = applyOverrides(deriveTheme(sidebarBgColor, appBgColor), colorOverrides);

  // Apply CSS vars whenever theme changes (covers initial load too)
  useEffect(() => {
    applyThemeToCss(derived);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sidebarBgColor, appBgColor, user?.themeHeaderBg, user?.themeCardBg, user?.themeBorder, user?.themeTextPrimary, user?.themeTextSecondary, user?.themeSidebarNavText]);

  const savePreferences = async (prefs: {
    sidebarBgColor?: string | null;
    displayBgColor?: string | null;
    themeHeaderBg?: string | null;
    themeCardBg?: string | null;
    themeBorder?: string | null;
    themeTextPrimary?: string | null;
    themeTextSecondary?: string | null;
    themeSidebarNavText?: string | null;
  }) => {
    if (!user?.id) return;
    const cur = colorOverrides;
    const payload = {
      id: user.id,
      sidebarBgColor: prefs.sidebarBgColor !== undefined ? prefs.sidebarBgColor : sidebarBgColor,
      displayBgColor: prefs.displayBgColor !== undefined ? prefs.displayBgColor : appBgColor,
      themeHeaderBg: prefs.themeHeaderBg !== undefined ? prefs.themeHeaderBg : (cur.themeHeaderBg ?? null),
      themeCardBg: prefs.themeCardBg !== undefined ? prefs.themeCardBg : (cur.themeCardBg ?? null),
      themeBorder: prefs.themeBorder !== undefined ? prefs.themeBorder : (cur.themeBorder ?? null),
      themeTextPrimary: prefs.themeTextPrimary !== undefined ? prefs.themeTextPrimary : (cur.themeTextPrimary ?? null),
      themeTextSecondary: prefs.themeTextSecondary !== undefined ? prefs.themeTextSecondary : (cur.themeTextSecondary ?? null),
      themeSidebarNavText: prefs.themeSidebarNavText !== undefined ? prefs.themeSidebarNavText : (cur.themeSidebarNavText ?? null),
    };
    const result = await updatePrefs(payload).unwrap();
    dispatch(updateThemePreferences({
      sidebarBgColor: result.sidebarBgColor,
      displayBgColor: result.displayBgColor,
      themeHeaderBg: result.themeHeaderBg,
      themeCardBg: result.themeCardBg,
      themeBorder: result.themeBorder,
      themeTextPrimary: result.themeTextPrimary,
      themeTextSecondary: result.themeTextSecondary,
      themeSidebarNavText: result.themeSidebarNavText,
    }));
  };

  return { sidebarBgColor, appBgColor, colorOverrides, derived, savePreferences, isLoading };
}
