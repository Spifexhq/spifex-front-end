/**
 * Sign-in return URL validation.
 *
 * The OAuth authorize page redirects unauthenticated users to
 * `/signin?next=<authorize URL>`. Only the configured API origin and the
 * `/o/authorize/` path are ever allowed, so a crafted `next` cannot turn
 * sign-in into an open redirect.
 */

const AUTHORIZE_PATH = "/o/authorize/";

export function resolveSafeReturnTo(raw: string | null | undefined, apiBaseUrl: string): string | null {
  if (!raw) return null;

  let candidate: URL;
  let api: URL;
  try {
    candidate = new URL(raw);
    api = new URL(apiBaseUrl);
  } catch {
    return null;
  }

  if (!["http:", "https:"].includes(candidate.protocol)) return null;
  if (candidate.username || candidate.password) return null;
  if (candidate.hash) return null;
  if (candidate.origin !== api.origin) return null;
  if (candidate.pathname !== AUTHORIZE_PATH && !candidate.pathname.startsWith(AUTHORIZE_PATH)) {
    return null;
  }

  return candidate.toString();
}

export function safeReturnToFromLocation(
  search: string,
  apiBaseUrl: string,
): string | null {
  const raw = new URLSearchParams(search).get("next");
  return resolveSafeReturnTo(raw, apiBaseUrl);
}
