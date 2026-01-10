// src/lib/ws/url.ts
type BuildOpts = { token: string; orgExternalId?: string | null };

function normalizeWsBase(raw: string): string {
  const v = (raw || "").trim();
  if (!v) throw new Error("Missing VITE_WS_BASE_URL");

  if (/^wss?:[^/]/i.test(v)) {
    const scheme = v.startsWith("wss:") ? "wss://" : "ws://";
    return scheme + v.replace(/^wss?:/i, "");
  }
  if (/^https?:\/\//i.test(v)) return v.replace(/^http/i, "ws");
  if (!/^[a-z]+:\/\//i.test(v)) return "ws://" + v;
  return v;
}

export function buildWsUrl({ token, orgExternalId }: BuildOpts): string {
  const baseRaw = import.meta.env.VITE_WS_BASE_URL as string | undefined;
  const base = normalizeWsBase(baseRaw || "");

  const url = new URL(base);
  url.pathname = "/ws/v1/stream/";
  url.searchParams.set("token", token);
  if (orgExternalId) url.searchParams.set("org", orgExternalId);

  return url.toString();
}
