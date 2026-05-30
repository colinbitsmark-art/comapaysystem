import { db } from "../db.js";

export const DEFAULT_APP_NAME = "Operations Console";
export const APP_DOCUMENT_TITLE_EN_KEY = "app_document_title_en";

export function getAppDisplayName() {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(APP_DOCUMENT_TITLE_EN_KEY);
  const branded = row?.value != null ? String(row.value).trim() : "";
  return branded || DEFAULT_APP_NAME;
}
