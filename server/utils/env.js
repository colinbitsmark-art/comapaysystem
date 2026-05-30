/**
 * Detect production-like runtime (Railway may not set NODE_ENV).
 */
export function isProduction() {
  if (process.env.NODE_ENV === "production") return true;
  if (process.env.RAILWAY_ENVIRONMENT === "production") return true;
  if (process.env.RAILWAY_ENVIRONMENT_NAME === "production") return true;
  return false;
}

/** Secure auth cookies in production unless explicitly overridden. */
export function isSecureCookieEnabled() {
  const override = process.env.COOKIE_SECURE?.trim().toLowerCase();
  if (override === "true") return true;
  if (override === "false") return false;
  return isProduction();
}
