// src/lib/ws/url.ts
type BuildOpts = { token: string; orgExternalId?: string | null };

function normalizeWsBase(raw: string): string {
  const v = (raw || "").trim();
  if (!v) throw new Error("Missing WS base URL");

  // Fix "ws:localhost:8000" -> "ws://localhost:8000"
  if (/^wss?:[^/]/i.test(v)) {
    const scheme = v.startsWith("wss:") ? "wss://" : "ws://";
    return scheme + v.replace(/^wss?:/i, "");
  }

  // Convert http(s) -> ws(s)
  if (/^https?:\/\//i.test(v)) {
    return v.replace(/^http/i, "ws");
  }

  // If no scheme, assume ws://
  if (!/^[a-z]+:\/\//i.test(v)) {
    return "ws://" + v;
  }

  return v;
}

function deriveWsBaseFromApi(): string | null {
  const api =
    import.meta.env.DEV
      ? (import.meta.env.VITE_SPIFEX_DEVELOPMENT_URL_API as string | undefined)
      : ((import.meta.env.VITE_SPIFEX_URL_API as string | undefined) ||
         "https://spifex-backend.onrender.com/api/v1");

  if (!api) return null;

  // strip /api/v1 or trailing slashes
  const cleaned = api.replace(/\/api\/v1\/?$/i, "").replace(/\/+$/g, "");
  return cleaned;
}

export function buildWsUrl({ token, orgExternalId }: BuildOpts): string {
  const baseEnv =
    import.meta.env.DEV
      ? (import.meta.env.VITE_SPIFEX_WS_DEVELOPMENT_URL as string | undefined)
      : ((import.meta.env.VITE_SPIFEX_WS_URL as string | undefined) ||
         "wss://spifex-backend.onrender.com/api/v1");
  const baseRaw = baseEnv && baseEnv.trim() ? baseEnv : (deriveWsBaseFromApi() || "");
  const base = normalizeWsBase(baseRaw);

  const url = new URL(base);
  url.pathname = "/ws/v1/stream/";
  url.searchParams.set("token", token);

  if (orgExternalId) url.searchParams.set("org", orgExternalId);

  return url.toString();
}
