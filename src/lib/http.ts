import { getAuthGeneration } from "./authGeneration";
/* -----------------------------------------------------------------------------
 * File: src/lib/http.ts
 * ---------------------------------------------------------------------------- */

import axios, {
  type AxiosError,
  type AxiosResponse,
  type Method,
  type AxiosRequestConfig,
} from "axios";

import { type ApiErrorBody, type ApiSuccess } from "@/models/Api";
import {
  getAccess,
  setTokens,
  clearTokens,
  getOrgExternalIdStored,
  getUserIdStored,
  setUserIdStored,
} from "@/lib/tokens";
import "@/lib/netReport";
import { store } from "@/redux/store";

export const AUTH_SYNC_EVENT = "spifex:auth-sync";
export const SUBSCRIPTION_BLOCKED_EVENT = "spifex:subscription-blocked";

function emitWindowEvent(name: string, detail?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

const rawBaseURL = String(import.meta.env.VITE_API_BASE_URL || "").trim();

if (!rawBaseURL) {
  throw new Error("Missing VITE_API_BASE_URL (set it in .env.dev / .env.prod).");
}

const apiOrigin = new URL(rawBaseURL);
if (!["http:", "https:"].includes(apiOrigin.protocol) || apiOrigin.username || apiOrigin.password || apiOrigin.search || apiOrigin.hash) throw new Error("Invalid API base URL.");
if (import.meta.env.PROD && apiOrigin.protocol !== "https:") throw new Error("Production API requests require HTTPS.");

export const baseURL = rawBaseURL.endsWith("/") ? rawBaseURL : `${rawBaseURL}/`;

/* ------------------------------ Global scheduling --------------------------- */

let pauseUntil = 0;
function setGlobalPause(ms: number) {
  pauseUntil = Math.max(pauseUntil, Date.now() + ms);
}

const scopeMinGapMs: Record<"read" | "auth" | "write", number> = {
  read: 300,
  auth: 500,
  write: 0,
};

const lastByScope = new Map<string, number>();

function inferScope(method: Method, url: string): "read" | "auth" | "write" {
  const m = (method || "GET").toUpperCase();
  const u = url || "";
  if (m !== "GET") return "write";
  if (u.includes("/auth/")) return "auth";
  return "read";
}

async function scheduleByScope(method: Method, url: string) {
  const scope = inferScope(method, url);
  const gap = scopeMinGapMs[scope];
  if (!gap) return;

  const now = Date.now();
  const last = lastByScope.get(scope) ?? 0;
  const wait = last + gap - now;

  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastByScope.set(scope, Date.now());
}

/* --------------------------------- URL log -------------------------------- */

const SENSITIVE_PARAMS = ["token", "password", "old_password", "new_password", "refresh", "access", "uidb64"];

function sanitizeUrl(fullUrl: string): string {
  try {
    const hasProtocol = fullUrl.startsWith("http");
    const urlObj = new URL(fullUrl, hasProtocol ? undefined : "http://dummy.com");

    let changed = false;
    for (const p of SENSITIVE_PARAMS) {
      if (urlObj.searchParams.has(p)) {
        urlObj.searchParams.set(p, "[REDACTED]");
        changed = true;
      }
    }

    const sensitivePath = /\/(reset-password|verify-pending-password|verify-email|password\/reset|verify-change)\//;
    if (sensitivePath.test(urlObj.pathname)) { urlObj.pathname = urlObj.pathname.replace(/(\/(?:reset-password|verify-pending-password|verify-email|password\/reset|verify-change)\/).*/, "$1[REDACTED]"); changed = true; }
    if (!changed) return fullUrl;
    return hasProtocol ? urlObj.toString() : urlObj.pathname + urlObj.search;
  } catch {
    return fullUrl.split("?")[0] || fullUrl;
  }
}

/* ---------------------------------- Axios --------------------------------- */

// Auth Gate: blocks non-auth requests while a critical auth sync is running in this tab.
let gate: Promise<void> | null = null;

export function setAuthGate(p: Promise<void>) {
  gate = p;
}
export function clearAuthGate(expected?: Promise<void>) {
  if (!expected || gate === expected) gate = null;
}

export async function waitAuthGate(timeoutMs = 4000): Promise<void> {
  if (!gate) return;

  if (typeof window === "undefined") {
    await gate.catch(() => undefined);
    return;
  }

  let t: number | null = null;
  try {
    await Promise.race([
      gate.catch(() => undefined),
      new Promise<void>((resolve) => {
        t = window.setTimeout(resolve, timeoutMs);
      }),
    ]);
  } finally {
    if (t) window.clearTimeout(t);
  }
}

export const http = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 20_000,
});

const startAt = new WeakMap<AxiosRequestConfig, number>();

http.interceptors.request.use(async (cfg) => {
  const stamped = cfg as AxiosRequestConfig & { _authGeneration?: number };
  stamped._authGeneration ??= getAuthGeneration();
  const method = ((cfg.method || "GET").toUpperCase() as Method) ?? "GET";
  const url = cfg.url || "";

  if (!(cfg as AxiosRequestConfig & { _skipAuthGate?: boolean })._skipAuthGate && !/(^|\/)auth\//.test(String(url))) {
    await waitAuthGate(4000);
  }

  await scheduleByScope(method, url);

  if (pauseUntil > Date.now()) {
    await new Promise((r) => setTimeout(r, pauseUntil - Date.now()));
  }

  if (stamped._authGeneration !== getAuthGeneration()) throw new axios.CanceledError("Stale request discarded");
  startAt.set(cfg, typeof performance !== "undefined" ? performance.now() : Date.now());

  const fullUrl = cfg.baseURL ? cfg.baseURL + (cfg.url || "") : cfg.url || "";
  const safeUrl = sanitizeUrl(fullUrl);

  const headers = (cfg.headers ?? {}) as Record<string, unknown>;
  if (typeof window !== "undefined") {
    window.NetReport?.push({
      t: Date.now(),
      method,
      url: sanitizeUrl(url),
      fullUrl: safeUrl,
      reqId: typeof headers["X-Request-Id"] === "string" ? (headers["X-Request-Id"] as string) : undefined,
    });
  }

  return cfg;
});

function readOrgExternalId(): string | undefined {
  const s = store.getState() as unknown as {
    auth?: {
      orgExternalId?: string | null;
      organization?: { organization?: { id?: string } } | null;
    };
  };

  const fromRedux = s.auth?.orgExternalId || s.auth?.organization?.organization?.id;
  const fromSession = getOrgExternalIdStored();
  return (fromRedux || fromSession || "").trim() || undefined;
}

function readExpectedUserId(): string | undefined {
  const s = store.getState() as unknown as {
    auth?: { user?: { id?: string | null } | null };
  };

  const fromRedux = s.auth?.user?.id || "";
  const fromSession = getUserIdStored();
  return (fromRedux || fromSession || "").trim() || undefined;
}

http.interceptors.request.use((cfg) => {
  cfg.headers = cfg.headers ?? {};
  const headers = cfg.headers as Record<string, string>;

  const token = getAccess();
  if (token) headers.Authorization = `Bearer ${token}`;

  const orgExt = readOrgExternalId();
  if (orgExt) headers["X-Org-External-Id"] = orgExt;

  return cfg;
});

/* --------------------------------- Helpers -------------------------------- */

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

function hasApiError(payload: unknown): payload is { error: ApiErrorBody } {
  if (!isObject(payload)) return false;
  const e = payload.error;
  return isObject(e) && typeof e.code === "string";
}

function extractApiErrorCode(payload: unknown): string | undefined {
  if (!hasApiError(payload)) return undefined;
  return payload.error.code;
}

function getApiErrorCode(err: AxiosError): string | undefined {
  const data = err.response?.data;
  return extractApiErrorCode(data);
}

function getDetailMessage(err: AxiosError): string | undefined {
  const data = err.response?.data;

  if (typeof data === "string") return data;

  if (isObject(data)) {
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail)) return data.detail.filter((x) => typeof x === "string").join(" ") || undefined;
    if (typeof data.message === "string") return data.message;

    const e = data.error;
    if (isObject(e) && typeof e.message === "string") return e.message;
  }

  return undefined;
}

function isSubscriptionBlocked(err: AxiosError): boolean {
  const status = err.response?.status;
  if (status === 402) return true;
  if (status !== 403) return false;

  const code = getApiErrorCode(err);
  if (code === "subscription_required" || code === "subscription_inactive" || code === "payment_required") return true;

  const detail = getDetailMessage(err);
  return !!detail && /subscription required/i.test(detail);
}

function parseRetryAfter(headerValue: unknown): number {
  if (typeof headerValue === "string") {
    const secs = Number(headerValue);
    if (Number.isFinite(secs)) return Math.max(0, secs) * 1000;

    const dateMs = Date.parse(headerValue);
    if (!Number.isNaN(dateMs)) return Math.max(0, dateMs - Date.now());
  }
  return 1000;
}

function calc429DelayMs(err: AxiosError): number {
  const ra = (err.response?.headers as Record<string, unknown> | undefined)?.["retry-after"];
  return parseRetryAfter(ra) + Math.random() * 250;
}

type TelemetryExtra = { retried429?: number; retryAfterMs?: number };

function finishLog(cfg: AxiosRequestConfig, res?: AxiosResponse, err?: AxiosError, extra?: TelemetryExtra) {
  const t0 = startAt.get(cfg) ?? (typeof performance !== "undefined" ? performance.now() : Date.now());
  const t1 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const ms = t1 - t0;
  const status = res?.status ?? err?.response?.status;

  const resHeaders = res?.headers as Record<string, unknown> | undefined;
  const errHeaders = err?.response?.headers as Record<string, unknown> | undefined;

  const reqId =
    (typeof resHeaders?.["x-request-id"] === "string" ? (resHeaders["x-request-id"] as string) : undefined) ||
    (typeof errHeaders?.["x-request-id"] === "string" ? (errHeaders["x-request-id"] as string) : undefined);

  const fullUrl = cfg.baseURL ? cfg.baseURL + (cfg.url || "") : cfg.url || "";
  const safeUrl = sanitizeUrl(fullUrl);

  if (typeof window !== "undefined") {
    window.NetReport?.push({
      t: Date.now(),
      method: (cfg.method || "GET").toUpperCase() as Method,
      url: sanitizeUrl(cfg.url || ""),
      fullUrl: safeUrl,
      status,
      ms,
      reqId,
      ...extra,
    });
  }
}

/* ------------------------------- Token refresh ------------------------------ */

type RefreshPayload = { access: string; user_id: string };

function unwrapRefreshPayload(payload: unknown): RefreshPayload | null {
  if (!isObject(payload)) return null;

  const root = payload as Record<string, unknown>;
  const src = "data" in root && isObject(root.data) ? (root.data as Record<string, unknown>) : root;

  const access = typeof src.access === "string" ? src.access : "";
  const userId = typeof src.user_id === "string" ? src.user_id : "";

  if (!access || !userId) return null;
  return { access, user_id: userId };
}

let refreshingPromise: Promise<void> | null = null;
const REFRESH_FATAL_REASONS = new Set([
  "refresh_user_mismatch",
  "refresh_user_missing",
  "session_not_valid",
  "token_not_valid",
  "refresh_missing",
  "password_changed",
]);

const rawHttp = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 20_000,
  validateStatus: (s) => s < 500,
});

// Fetch the masked CSRF token from the API origin (works across subdomains).
// Share in-flight bootstrap requests, but do not persist the token in storage.
let csrfRequest: Promise<string> | null = null;
function getCsrfToken(): Promise<string> {
  if (!csrfRequest) csrfRequest = rawHttp.get("auth/csrf/").then(res => {
    const token = res.data?.data?.csrf_token ?? res.data?.csrf_token;
    if (res.status !== 200 || typeof token !== "string" || !token) throw new Error("csrf_bootstrap_failed");
    return token;
  }).finally(() => { csrfRequest = null; });
  return csrfRequest;
}
for (const client of [http, rawHttp]) client.interceptors.request.use(async cfg => {
  const destination = new URL(cfg.url || "", cfg.baseURL || baseURL);
  if (destination.origin !== apiOrigin.origin || !destination.pathname.startsWith(apiOrigin.pathname)) throw new Error("Refusing credentials to an untrusted API destination.");
  if (!/^(GET|HEAD|OPTIONS)$/i.test(cfg.method || "GET") && /\/auth\//.test(destination.pathname)) {
    cfg.headers.set("X-CSRFToken", await getCsrfToken());
  }
  return cfg;
});

async function doRefresh(): Promise<void> {
  const generation = getAuthGeneration();
  const res = await rawHttp.post("auth/refresh/", {});
  if (generation !== getAuthGeneration()) throw new axios.CanceledError("Identity changed during refresh");

  const { data, status } = res as AxiosResponse<unknown>;

  if (status !== 200) {
    // If backend used the envelope error format, preserve the code as a reason.
    const code = extractApiErrorCode(data);
    if (status === 401) throw new Error(code || "token_not_valid");
    throw new Error(`refresh_temporarily_unavailable:${status}`);
  }

  const parsed = unwrapRefreshPayload(data);
  if (!parsed) throw new Error("refresh_failed");

  const returnedUserId = (parsed.user_id || "").trim();
  if (!returnedUserId) throw new Error("refresh_user_missing");

  const expected = readExpectedUserId();

  // Security invariant: if this tab already knows who the user is, refresh must match.
  if (expected && expected !== returnedUserId) {
    throw new Error("refresh_user_mismatch");
  }

  // If this tab didn't know yet (fresh reload), lock the user id now.
  if (!expected) setUserIdStored(returnedUserId);

  setTokens(parsed.access);
  emitWindowEvent(AUTH_SYNC_EVENT, { reason: "token_refreshed" });
}

export function refreshAccess(): Promise<void> {
  if (!refreshingPromise) {
    const generation = getAuthGeneration();
    const run = () => {
      if (generation !== getAuthGeneration()) throw new axios.CanceledError("Identity changed before refresh");
      return doRefresh();
    };
    // Tabs share rotating cookies. Serialize exchanges without sharing access JWTs.
    const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
    const task = locks ? locks.request("spifex:refresh", run) : run();
    const promise = task.catch(error => {
      if (generation === getAuthGeneration() && error instanceof Error && REFRESH_FATAL_REASONS.has(error.message)) {
        clearTokens();
        emitWindowEvent(AUTH_SYNC_EVENT, { reason: error.message });
      }
      throw error;
    }).finally(() => { if (refreshingPromise === promise) refreshingPromise = null; });
    refreshingPromise = promise;
  }
  return refreshingPromise;
}

type RetriableConfig = AxiosRequestConfig & { _retry?: boolean; _retried429?: number };

function isProfileUrl(url: string): boolean {
  return url.includes("/identity/profile/") || url.includes("identity/profile");
}

function shouldTryRefreshOnce(status: number | undefined, cfg: RetriableConfig): boolean {
  if (cfg._retry || /(?:^|\/)auth\/(?:signin|signup|signout|csrf)(?:\/|$)/.test(cfg.url || "")) return false;

  if (status === 401) return true;

  // Only do 403-refresh for profile when we have no access token (cookie-only auth bootstrap).
  if (status === 403) {
    const url = String(cfg.url || "");
    if (!isProfileUrl(url)) return false;
    if (getAccess()) return false;
    return true;
  }

  return false;
}

http.interceptors.response.use(
  (r) => {
    if ((r.config as AxiosRequestConfig & { _authGeneration?: number })._authGeneration !== getAuthGeneration()) throw new axios.CanceledError("Stale response discarded");
    finishLog(r.config, r);
    return r;
  },
  async (error: AxiosError) => {
    const original = (error.config || {}) as RetriableConfig;
    if ((original as AxiosRequestConfig & { _authGeneration?: number })._authGeneration !== undefined && (original as AxiosRequestConfig & { _authGeneration?: number })._authGeneration !== getAuthGeneration()) throw new axios.CanceledError("Stale response discarded");
    const status = error.response?.status;

    if (axios.isAxiosError(error) && isSubscriptionBlocked(error)) {
      emitWindowEvent(SUBSCRIPTION_BLOCKED_EVENT, {
        reason: "backend_blocked",
        status,
        detail: getDetailMessage(error),
        code: getApiErrorCode(error),
        url: original?.url,
        method: (original?.method || "GET").toUpperCase(),
      });
    }

    if (status === 429) {
      original._retried429 = (original._retried429 ?? 0) + 1;
      const delay = calc429DelayMs(error);

      finishLog(original, undefined, error, {
        retried429: original._retried429,
        retryAfterMs: delay,
      });

      if (/^(GET|HEAD|OPTIONS)$/i.test(original.method || "GET")) setGlobalPause(Math.min(delay * 1.1, 60_000));

      if (/^(GET|HEAD|OPTIONS)$/i.test(original.method || "GET") && original._retried429 <= 2) {
        await new Promise((r) => setTimeout(r, delay));
        return http(original);
      }
    }

    if (shouldTryRefreshOnce(status, original)) {
      original._retry = true;

      await refreshAccess();

      if (!getAccess()) {
        finishLog(original, undefined, error);
        return Promise.reject(error);
      }

      return http(original);
    }

    finishLog(original, undefined, error);
    return Promise.reject(error);
  },
);

/* ------------------------------ Request cache ------------------------------- */

const inflight = new Map<string, Promise<AxiosResponse<unknown>>>();
const responseCache = new Map<string, { t: number; res: AxiosResponse<unknown> }>();
const CACHE_TTL_MS = 500;

function keyFrom(cfg: AxiosRequestConfig) {
  const u = (cfg.baseURL || "") + (cfg.url || "");
  const p =
    cfg.params && typeof cfg.params === "object"
      ? JSON.stringify(cfg.params, Object.keys(cfg.params as Record<string, unknown>).sort())
      : "";
  return `${(cfg.method || "GET").toUpperCase()} ${u}?${p}`;
}

function pruneParams(p: unknown) {
  if (!p || typeof p !== "object") return p;

  const src = p as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  for (const k of Object.keys(src)) {
    const v = src[k];

    if (v === "" || v === undefined || v === null) continue;

    if (Array.isArray(v)) {
      const joined = v
        .flatMap((x) => (x === "" || x === undefined || x === null ? [] : [String(x)]))
        .map((s) => s.trim())
        .filter(Boolean)
        .join(",");

      if (joined) out[k] = joined;
      continue;
    }

    out[k] = v;
  }

  return out;
}

let cacheGeneration = 0;
export function clearHttpCaches() {
  cacheGeneration++;
  inflight.clear();
  responseCache.clear();
  lastByScope.clear();
  pauseUntil = 0;
}

function normalizeEndpoint(ep: string): string {
  return String(ep || "").replace(/^\/+/, "");
}

export async function request<T>(endpoint: string, method: Method = "GET", payload?: object, options?: { fresh?: boolean; skipAuthGate?: boolean }): Promise<ApiSuccess<T>> {
  try {
    const ep = normalizeEndpoint(endpoint);
    const generation = getAuthGeneration();
    const cacheVersion = cacheGeneration;
    const organization = readOrgExternalId();

    const cfg: AxiosRequestConfig = {
      url: ep,
      ...({ _skipAuthGate: options?.skipAuthGate, _authGeneration: generation } as AxiosRequestConfig),
      method,
      data: method !== "GET" ? payload : undefined,
      params: method === "GET" ? pruneParams(payload) : undefined,
      validateStatus: (s) => (s >= 200 && s < 300) || s === 304,
    };

    let res: AxiosResponse<unknown>;

    if ((cfg.method || "GET").toUpperCase() === "GET" && !options?.fresh) {
      const k = keyFrom(cfg);

      const hit = responseCache.get(k);
      if (hit && Date.now() - hit.t < CACHE_TTL_MS) {
        res = hit.res;
      } else {
        if (!inflight.has(k)) {
          inflight.set(k, http.request(cfg).finally(() => cacheVersion === cacheGeneration && inflight.delete(k)));
        }
        res = await inflight.get(k)!;

        if (res.status === 304) {
          const cached = responseCache.get(k);
          if (cached) {
            res = cached.res;
          } else {
            const refreshKey = `REFRESH ${k}`;
            const ts = Date.now();
            const baseParams =
              cfg.params && typeof cfg.params === "object" ? (cfg.params as Record<string, unknown>) : {};
            const forceCfg: AxiosRequestConfig = { ...cfg, params: { ...baseParams, _r: ts } };

            if (!inflight.has(refreshKey)) {
              inflight.set(refreshKey, http.request(forceCfg).finally(() => cacheVersion === cacheGeneration && inflight.delete(refreshKey)));
            }

            const fresh = await inflight.get(refreshKey)!;
            if (fresh.status >= 200 && fresh.status < 300) res = fresh;
            else throw new Error(`Revalidation returned ${fresh.status} — no materialized response available.`);
          }
        }

        if (cacheVersion === cacheGeneration && generation === getAuthGeneration() && res.status >= 200 && res.status < 300) {
          for (const [key, value] of responseCache) if (Date.now() - value.t >= CACHE_TTL_MS) responseCache.delete(key);
          if (responseCache.size >= 200) responseCache.delete(responseCache.keys().next().value!);
          responseCache.set(k, { t: Date.now(), res });
        }
      }
    } else {
      const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
      const changesSession = /^auth\/(signin|signout)(?:\/|$)/.test(ep);
      res = locks && changesSession ? await locks.request("spifex:refresh", () => http.request(cfg)) : await http.request(cfg);
    }

    if (generation !== getAuthGeneration() || (!options?.fresh && cacheVersion !== cacheGeneration) || (!ep.startsWith("auth/") && organization !== readOrgExternalId())) throw new axios.CanceledError("Stale request discarded");
    const body = res.data;

    if (res.status === 204 || body == null || (typeof body === "string" && body.trim() === "")) {
      return {} as ApiSuccess<T>;
    }

    if (hasApiError(body)) throw body.error;

    return body as ApiSuccess<T>;
  } catch (e) {
    const err = e as AxiosError<unknown>;
    if (axios.isAxiosError(err)) {
      const body = err.response?.data;
      if (hasApiError(body)) throw { ...body.error, status: err.response?.status };

      const msg = err.response ? `${err.response.status} ${err.response.statusText || "Request error"}` : err.message;
      throw new Error(msg);
    }
    throw e;
  }
}
