// src/lib/http.ts
// =============================================================================
// Axios HTTP layer with:
// - Base URL resolution
// - Auth + Org headers
// - Telemetry hooks
// - 429 backoff and global pause
// - 401 refresh (single-flight)
// - GET single-flight + micro-cache (0.5s)
// - request<T> envelope returning ApiSuccess<T>
// - clearHttpCaches() to wipe in-memory state on sign-out
// =============================================================================

import axios, {
  type AxiosError,
  type AxiosResponse,
  type Method,
  type AxiosRequestConfig,
} from "axios";

import {
  type ApiErrorBody,
  type ApiResponse,
  type ApiSuccess,
} from "@/models/Api";

import { getAccess, getRefresh, setTokens, clearTokens } from "@/lib/tokens";

// Ensure NetReport singleton is present (no side effects if absent)
import "@/lib/netReport";

// Redux store (used for reading the org external id header)
import { store } from "@/redux/store";

// =============================================================================
// Base URL
// =============================================================================
const rawBaseURL =
  import.meta.env.VITE_ENVIRONMENT === "development"
    ? import.meta.env.VITE_SPIFEX_DEVELOPMENT_URL_API
    : import.meta.env.VITE_SPIFEX_URL_API ||
      "https://spifex-backend.onrender.com/api/v1";

const baseURL = rawBaseURL.endsWith("/") ? rawBaseURL : `${rawBaseURL}/`;

// =============================================================================
/**
 * Global 429 pause & per-scope pacing (anti-stampede)
 */
// =============================================================================
let pauseUntil = 0; // epoch ms until which requests wait

function setGlobalPause(ms: number) {
  pauseUntil = Math.max(pauseUntil, Date.now() + ms);
}

const scopeMinGapMs: Record<string, number> = {
  read: 300, // ~3.3 req/s
  auth: 500, // auth endpoints are more sensitive
  write: 0,  // POST/PUT/PATCH/DELETE are not paced
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
  if (wait > 0) {
    await new Promise((r) => setTimeout(r, wait));
  }
  lastByScope.set(scope, Date.now());
}

// =============================================================================
// Axios instance
// =============================================================================
export const http = axios.create({
  baseURL,
  withCredentials: false,
});

// =============================================================================
// Telemetry: start/end timing of requests
// =============================================================================
const startAt = new WeakMap<AxiosRequestConfig, number>();

http.interceptors.request.use(async (cfg) => {
  const method = (cfg.method || "GET").toUpperCase() as Method;
  const url = cfg.url || "";

  // Respect local pacing & global pause
  await scheduleByScope(method, url);

  if (pauseUntil > Date.now()) {
    await new Promise((resolve) => setTimeout(resolve, pauseUntil - Date.now()));
  }

  // Start timer + telemetry
  startAt.set(cfg, performance.now());
  (window).NetReport?.push({
    t: Date.now(),
    method,
    url,
    fullUrl: cfg.baseURL ? cfg.baseURL + (cfg.url || "") : cfg.url || "",
  });

  return cfg;
});

// =============================================================================
// Request interceptor: Authorization + org scope header
// =============================================================================
function readOrgExternalId(): string | undefined {
  const s = store.getState() as unknown as {
    auth?: {
      orgExternalId?: string;
      organization?: { organization?: { external_id?: string } };
    };
  };
  return s.auth?.orgExternalId || s.auth?.organization?.organization?.external_id;
}

http.interceptors.request.use((cfg) => {
  cfg.headers = cfg.headers ?? {};

  // Authorization
  const token = getAccess();
  if (token) {
    (cfg.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }

  // Org scope header
  const orgExt = readOrgExternalId();
  if (orgExt) {
    (cfg.headers as Record<string, string>)["X-Org-External-Id"] = orgExt;
  }

  return cfg;
});

// =============================================================================
// Narrowing helpers (avoid "any")
// =============================================================================
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

type Tokens = { access: string; refresh?: string };
const hasAccessToken = (v: unknown): v is Tokens => {
  if (!isObject(v)) return false;
  if (typeof v.access !== "string") return false;
  if ("refresh" in v && typeof v.refresh !== "string" && typeof v.refresh !== "undefined") {
    return false;
  }
  return true;
};

const hasErrorKey = (v: unknown): v is { error: ApiErrorBody } =>
  isObject(v) && "error" in v;

// =============================================================================
// Refresh (single-flight)
// =============================================================================
let refreshingPromise: Promise<void> | null = null;
const subscribers: Array<() => void> = [];

function notifySubscribers() {
  subscribers.splice(0).forEach((fn) => fn());
}

async function doRefresh(): Promise<void> {
  const refresh = getRefresh();
  if (!refresh) throw new Error("no-refresh-token");

  // Use raw axios to bypass interceptors and avoid refresh loops
  const res = await axios.post(
    `${baseURL}auth/refresh/`,
    { refresh },
    { validateStatus: (s) => s < 500 }
  );

  const { data, status } = res as AxiosResponse<unknown>;
  if (status !== 200 || !hasAccessToken(data)) {
    throw new Error("refresh-failed");
  }

  setTokens(data.access, (data as Tokens).refresh ?? refresh);
}

// =============================================================================
// 429 handlers: parse Retry-After + jitter + record global pause
// =============================================================================
function parseRetryAfter(headerValue: unknown): number {
  // returns delay in ms
  if (typeof headerValue === "string") {
    // Either seconds (e.g., "120") or an HTTP date
    const secs = Number(headerValue);
    if (Number.isFinite(secs)) return Math.max(0, secs) * 1000;

    const dateMs = Date.parse(headerValue);
    if (!Number.isNaN(dateMs)) {
      return Math.max(0, dateMs - Date.now());
    }
  }
  return 1000; // default 1s
}

function calc429DelayMs(err: AxiosError): number {
  const ra = err.response?.headers?.["retry-after"];
  const base = parseRetryAfter(ra);
  const jitter = Math.random() * 250;
  return base + jitter;
}

// =============================================================================
// Response interceptor: telemetry + 429 retry + 401 refresh
// =============================================================================
type TelemetryExtra = { retried429?: number; retryAfterMs?: number };

function finishLog(
  cfg: AxiosRequestConfig,
  res?: AxiosResponse,
  err?: AxiosError,
  extra?: TelemetryExtra
) {
  const t0 = startAt.get(cfg) ?? performance.now();
  const ms = performance.now() - t0;
  const status = res?.status ?? err?.response?.status;
  const reqId =
    (res?.headers?.["x-request-id"] ||
      err?.response?.headers?.["x-request-id"]) as string | undefined;

  (window).NetReport?.push({
    t: Date.now(),
    method: (cfg.method || "GET").toUpperCase() as Method,
    url: cfg.url || "",
    fullUrl: cfg.baseURL ? cfg.baseURL + (cfg.url || "") : cfg.url || "",
    status,
    ms,
    reqId,
    ...extra,
  });
}

type RetriableConfig = AxiosRequestConfig & {
  _retry?: boolean;      // already tried refresh?
  _retried429?: number;  // 429 retry counter
};

http.interceptors.response.use(
  (r) => {
    // success: telemetry + request id surface
    finishLog(r.config, r);

    const reqId = (r.headers as Record<string, unknown> | undefined)?.["x-request-id"];
    if (typeof reqId === "string") {
      console.debug("🔗 request-id", reqId);
    }
    return r;
  },
  async (error: AxiosError) => {
    const original = (error.config || {}) as RetriableConfig;
    const status = error.response?.status;

    // 429: exponential-ish backoff honoring Retry-After; up to 3 retries
    if (status === 429) {
      original._retried429 = (original._retried429 ?? 0) + 1;

      const delay = calc429DelayMs(error);

      // Telemetry before waiting/retry
      finishLog(original, undefined, error, {
        retried429: original._retried429,
        retryAfterMs: delay,
      });

      // Apply a small margin to the global pause
      setGlobalPause(delay * 1.1);

      if (original._retried429 <= 3) {
        await new Promise((r) => setTimeout(r, delay));
        return http(original);
      }
      // else fall through to propagate the error
    }

    // 401: attempt single-flight refresh (only once per request)
    if (status === 401 && !original._retry) {
      original._retry = true;

      if (!refreshingPromise) {
        refreshingPromise = doRefresh()
          .catch((e) => {
            clearTokens(); // hard fail → avoid loops
            throw e;
          })
          .finally(() => {
            notifySubscribers();
            refreshingPromise = null;
          });
      }

      // wait for refresh to complete
      await new Promise<void>((resolve, reject) => {
        if (!refreshingPromise) return resolve();
        subscribers.push(resolve);
        refreshingPromise!.catch(reject);
      });

      // If we still have no access token, propagate
      if (!getAccess()) {
        finishLog(original, undefined, error);
        return Promise.reject(error);
      }

      // retry with fresh access token
      return http(original);
    }

    // Other errors: telemetry + propagate
    finishLog(original, undefined, error);
    return Promise.reject(error);
  }
);

// =============================================================================
// GET single-flight + 0.5s micro-cache
// =============================================================================
const inflight = new Map<string, Promise<AxiosResponse>>();
const responseCache = new Map<string, { t: number; res: AxiosResponse }>();
const CACHE_TTL_MS = 500;

function keyFrom(cfg: AxiosRequestConfig) {
  const u = (cfg.baseURL || "") + (cfg.url || "");
  const p =
    cfg.params && typeof cfg.params === "object"
      ? JSON.stringify(
          cfg.params,
          Object.keys(cfg.params as Record<string, unknown>).sort()
        )
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

// =============================================================================
// Public cache reset (used on sign-out)
// =============================================================================
export function clearHttpCaches() {
  inflight.clear();
  responseCache.clear();
  lastByScope.clear();
  pauseUntil = 0;
}

// =============================================================================
// Request envelope: returns ApiSuccess<T> or {} for 204
// - Uses the micro-cache + single-flight for GETs only
// - Non-GET requests bypass the client cache
// =============================================================================
export async function request<T>(
  endpoint: string,
  method: Method = "GET",
  payload?: object
): Promise<ApiSuccess<T>> {
  try {
    const cfg: AxiosRequestConfig = {
      url: endpoint,
      method,
      data: method !== "GET" ? payload : undefined,
      params: method === "GET" ? pruneParams(payload) : undefined,
      // Note: 304 considered success to allow revalidation flow
      validateStatus: (s) => (s >= 200 && s < 300) || s === 304,
    };

    let res: AxiosResponse<ApiResponse<T> | unknown>;

    if ((cfg.method || "GET").toUpperCase() === "GET") {
      const k = keyFrom(cfg);

      // 1) Micro-cache hit?
      const hit = responseCache.get(k);
      if (hit && Date.now() - hit.t < CACHE_TTL_MS) {
        res = hit.res as AxiosResponse<ApiResponse<T> | unknown>;
      } else {
        // 2) Single-flight: de-dupe identical inflight GETs
        if (!inflight.has(k)) {
          inflight.set(
            k,
            http.request<ApiResponse<T> | unknown>(cfg).finally(() => inflight.delete(k))
          );
        }
        res = await inflight.get(k)!;

        // 304 → try to materialize previous 200, otherwise force a refresh GET
        if (res.status === 304) {
          const cached = responseCache.get(k);
          if (cached) {
            res = cached.res as AxiosResponse<ApiResponse<T> | unknown>;
          } else {
            const refreshKey = `REFRESH ${k}`;
            const ts = Date.now();
            const baseParams =
              cfg.params && typeof cfg.params === "object"
                ? (cfg.params as Record<string, unknown>)
                : {};

            const forceCfg: AxiosRequestConfig = {
              ...cfg,
              params: { ...baseParams, _r: ts }, // bust cache upstream
            };

            if (!inflight.has(refreshKey)) {
              inflight.set(
                refreshKey,
                http.request<ApiResponse<T> | unknown>(forceCfg).finally(() =>
                  inflight.delete(refreshKey)
                )
              );
            }
            const fresh = await inflight.get(refreshKey)!;
            if (fresh.status >= 200 && fresh.status < 300) {
              res = fresh;
            } else {
              throw new Error(
                `Revalidation returned ${fresh.status} — could not materialize a valid response.`
              );
            }
          }
        }

        // Store the last 2xx response
        if (res.status >= 200 && res.status < 300) {
          responseCache.set(k, { t: Date.now(), res });
        }
      }
    } else {
      // Non-GET → direct request (no client cache)
      res = await http.request<ApiResponse<T> | unknown>(cfg);
    }

    const body = res.data;

    // 204 or empty body → normalize to empty object
    if (
      res.status === 204 ||
      body == null ||
      (typeof body === "string" && body.trim() === "")
    ) {
      return {} as ApiSuccess<T>;
    }

    // Standardized backend error envelope
    if (hasErrorKey(body)) {
      throw body.error;
    }

    // Success
    return body as ApiSuccess<T>;
  } catch (e) {
    const err = e as AxiosError<unknown>;

    if (axios.isAxiosError(err)) {
      const body = err.response?.data;

      // Standardized backend error
      if (hasErrorKey(body)) {
        throw body.error;
      }

      // Readable fallback
      const msg = err.response
        ? `${err.response.status} ${err.response.statusText || "Request error"}`
        : err.message;
      throw new Error(msg);
    }

    // Non-Axios errors: propagate
    throw e;
  }
}
