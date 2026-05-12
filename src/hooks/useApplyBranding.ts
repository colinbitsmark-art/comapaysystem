import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useGetPublicBrandingQuery } from "../services/api";

/**
 * Applies document title and favicon from server settings (Settings → Branding).
 * Runs for the whole app, including the login page.
 */
export function useApplyBranding() {
  const { t, i18n } = useTranslation();
  const { data } = useGetPublicBrandingQuery();

  useEffect(() => {
    const lang = i18n.resolvedLanguage || i18n.language || "en";
    const useZh = lang.startsWith("zh");
    const custom = (useZh ? data?.documentTitleZh : data?.documentTitleEn)?.trim() ?? "";
    document.title = custom || t("common.operationsConsole");

    const href = data?.faviconUrl || "/vite.svg";
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = href;
  }, [data, i18n.resolvedLanguage, i18n.language, t]);
}
