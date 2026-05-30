/** Session is stored in httpOnly cookie; user profile is cached in localStorage. */
export function hasStoredSession(): boolean {
  return Boolean(localStorage.getItem("auth_user"));
}

/** SSE uses same-origin cookies — no token in the URL. */
export function getSseUrl(path: string): string {
  return path;
}

/** @deprecated Auth token is no longer stored client-side. */
export function getAuthToken(): string | null {
  return null;
}

/** @deprecated Auth token is no longer stored client-side. */
export function setAuthToken(_token: string | null): void {
  // no-op: session lives in httpOnly cookie
}
