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
import { getAccess, setTokens, clearTokens, getOrgExternalIdStored } from "@/lib/tokens";
import "@/lib/netReport";
import { waitAuthGate } from "@/lib/authGate";
import { store } from "@/redux/store";

export const AUTH_SYNC_EVENT = "spifex:auth-sync";
export const SUBSCRIPTION_BLOCKED_EVENT = "spifex:subscription-blocked";

function emitWindowEvent(name: string, detail?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

const rawBaseURL = import.meta.env.DEV
  ? import.meta.env.VITE_SPIFEX_DEVELOPMENT_URL_API
  : import.meta.env.VITE_SPIFEX_URL_API || "https://spifex-backend.onrender.com/api/v1";

export const baseURL = rawBaseURL.endsWith("/") ? rawBaseURL : `${rawBaseURL}/`;

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

    if (!changed) return fullUrl;
    return hasProtocol ? urlObj.toString() : urlObj.pathname + urlObj.search;
  } catch {
    return fullUrl.split("?")[0] || fullUrl;
  }
}

export const http = axios.create({
  baseURL,
  withCredentials: true,
});

const startAt = new WeakMap<AxiosRequestConfig, number>();

http.interceptors.request.use(async (cfg) => {
  const method = ((cfg.method || "GET").toUpperCase() as Method) ?? "GET";
  const url = cfg.url || "";

  if (!String(url).includes("/auth/")) {
    await waitAuthGate(4000);
  }

  await scheduleByScope(method, url);

  if (pauseUntil > Date.now()) {
    await new Promise((r) => setTimeout(r, pauseUntil - Date.now()));
  }

  startAt.set(cfg, performance.now());

  const fullUrl = cfg.baseURL ? cfg.baseURL + (cfg.url || "") : cfg.url || "";
  const safeUrl = sanitizeUrl(fullUrl);

  const headers = (cfg.headers ?? {}) as Record<string, unknown>;
  window.NetReport?.push({
    t: Date.now(),
    method,
    url,
    fullUrl: safeUrl,
    reqId: typeof headers["X-Request-Id"] === "string" ? (headers["X-Request-Id"] as string) : undefined,
  });

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

http.interceptors.request.use((cfg) => {
  cfg.headers = cfg.headers ?? {};
  const headers = cfg.headers as Record<string, string>;

  const token = getAccess();
  if (token) headers.Authorization = `Bearer ${token}`;

  const orgExt = readOrgExternalId();
  if (orgExt) headers["X-Org-External-Id"] = orgExt;

  return cfg;
});

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

type Tokens = { access: string; refresh?: string };

function unwrapTokens(payload: unknown): Tokens | null {
  if (isObject(payload) && typeof payload.access === "string") return payload as Tokens;
  if (isObject(payload) && "data" in payload && isObject(payload.data) && typeof payload.data.access === "string") {
    return payload.data as Tokens;
  }
  return null;
}

function hasApiError(payload: unknown): payload is { error: ApiErrorBody } {
  if (!isObject(payload)) return false;
  const e = payload.error;
  return isObject(e) && typeof e.code === "string";
}

function getApiErrorCode(err: AxiosError): string | undefined {
  const data = err.response?.data;
  if (!isObject(data)) return undefined;
  const e = data.error;
  if (!isObject(e)) return undefined;
  return typeof e.code === "string" ? e.code : undefined;
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
  const t0 = startAt.get(cfg) ?? performance.now();
  const ms = performance.now() - t0;
  const status = res?.status ?? err?.response?.status;

  const resHeaders = res?.headers as Record<string, unknown> | undefined;
  const errHeaders = err?.response?.headers as Record<string, unknown> | undefined;

  const reqId =
    (typeof resHeaders?.["x-request-id"] === "string" ? (resHeaders["x-request-id"] as string) : undefined) ||
    (typeof errHeaders?.["x-request-id"] === "string" ? (errHeaders["x-request-id"] as string) : undefined);

  const fullUrl = cfg.baseURL ? cfg.baseURL + (cfg.url || "") : cfg.url || "";
  const safeUrl = sanitizeUrl(fullUrl);

  window.NetReport?.push({
    t: Date.now(),
    method: (cfg.method || "GET").toUpperCase() as Method,
    url: cfg.url || "",
    fullUrl: safeUrl,
    status,
    ms,
    reqId,
    ...extra,
  });
}

let refreshingPromise: Promise<void> | null = null;
const refreshSubscribers: Array<() => void> = [];

function notifyRefreshSubscribers() {
  refreshSubscribers.splice(0).forEach((fn) => fn());
}

async function doRefresh(): Promise<void> {
  const res = await axios.post(`${baseURL}auth/refresh/`, {}, {
    validateStatus: (s) => s < 500,
    withCredentials: true,
  });

  const { data, status } = res as AxiosResponse<unknown>;
  const tokens = unwrapTokens(data);

  if (status !== 200 || !tokens) throw new Error("refresh-failed");

  setTokens(tokens.access);
  emitWindowEvent(AUTH_SYNC_EVENT, { reason: "token_refreshed" });
}

type RetriableConfig = AxiosRequestConfig & { _retry?: boolean; _retried429?: number };

http.interceptors.response.use(
  (r) => {
    finishLog(r.config, r);
    return r;
  },
  async (error: AxiosError) => {
    const original = (error.config || {}) as RetriableConfig;
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

      setGlobalPause(delay * 1.1);

      if (original._retried429 <= 3) {
        await new Promise((r) => setTimeout(r, delay));
        return http(original);
      }
    }

    if (status === 401 && !original._retry) {
      original._retry = true;

      if (!refreshingPromise) {
        refreshingPromise = doRefresh()
          .catch((e) => {
            clearTokens();
            emitWindowEvent(AUTH_SYNC_EVENT, { reason: "refresh_failed" });
            throw e;
          })
          .finally(() => {
            notifyRefreshSubscribers();
            refreshingPromise = null;
          });
      }

      await new Promise<void>((resolve, reject) => {
        refreshSubscribers.push(resolve);
        refreshingPromise?.catch(reject);
      });

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
    out[k] = v;
  }
  return out;
}

export function clearHttpCaches() {
  inflight.clear();
  responseCache.clear();
  lastByScope.clear();
  pauseUntil = 0;
}

export async function request<T>(endpoint: string, method: Method = "GET", payload?: object): Promise<ApiSuccess<T>> {
  try {
    const cfg: AxiosRequestConfig = {
      url: endpoint,
      method,
      data: method !== "GET" ? payload : undefined,
      params: method === "GET" ? pruneParams(payload) : undefined,
      validateStatus: (s) => (s >= 200 && s < 300) || s === 304,
    };

    let res: AxiosResponse<unknown>;

    if ((cfg.method || "GET").toUpperCase() === "GET") {
      const k = keyFrom(cfg);

      const hit = responseCache.get(k);
      if (hit && Date.now() - hit.t < CACHE_TTL_MS) {
        res = hit.res;
      } else {
        if (!inflight.has(k)) {
          inflight.set(k, http.request(cfg).finally(() => inflight.delete(k)));
        }
        res = await inflight.get(k)!;

        if (res.status === 304) {
          const cached = responseCache.get(k);
          if (cached) {
            res = cached.res;
          } else {
            const refreshKey = `REFRESH ${k}`;
            const ts = Date.now();
            const baseParams = (cfg.params && typeof cfg.params === "object" ? (cfg.params as Record<string, unknown>) : {});
            const forceCfg: AxiosRequestConfig = { ...cfg, params: { ...baseParams, _r: ts } };

            if (!inflight.has(refreshKey)) {
              inflight.set(refreshKey, http.request(forceCfg).finally(() => inflight.delete(refreshKey)));
            }

            const fresh = await inflight.get(refreshKey)!;
            if (fresh.status >= 200 && fresh.status < 300) res = fresh;
            else throw new Error(`Revalidation returned ${fresh.status} — no materialized response available.`);
          }
        }

        if (res.status >= 200 && res.status < 300) {
          responseCache.set(k, { t: Date.now(), res });
        }
      }
    } else {
      res = await http.request(cfg);
    }

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
      if (hasApiError(body)) throw body.error;

      const msg = err.response ? `${err.response.status} ${err.response.statusText || "Request error"}` : err.message;
      throw new Error(msg);
    }
    throw e;
  }
}
