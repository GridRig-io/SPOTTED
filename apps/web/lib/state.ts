// Which state the visitor is browsing. Remembered in a cookie so the home page opens on the same state next time.
export const STATE_COOKIE = "spotted_state";
export const DEFAULT_STATE = "fct";

export function rememberState(slug: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${STATE_COOKIE}=${encodeURIComponent(slug)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}
