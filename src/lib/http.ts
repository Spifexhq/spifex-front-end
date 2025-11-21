// src/lib/http.ts
// =============================================================================
// Axios HTTP layer with:
// - Base URL resolution
// - Auth + Org headers
// - Telemetry hooks (sanitized)
// - 429 backoff and global pause
// - 401 refresh (single-flight via HttpOnly Cookie)
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

import { getAccess, setTokens, clearTokens } from "@/lib/tokens";

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

export const baseURL = rawBaseURL.endsWith("/") ? rawBaseURL : `${rawBaseURL}/`;

// =============================================================================
// Throttling & anti-stampede (per-scope pacing + global pause)
// =============================================================================

let pauseUntil = 0; // epoch ms until which requests wait

function setGlobalPause(ms: number) {
  pauseUntil = Math.max(pauseUntil, Date.now() + ms);
}

const scopeMinGapMs: Record<string, number> = {
  read: 300, // ~3.3 req/s
  auth: 500, // auth endpoints are more sensitive
  write: 0, // POST/PUT/PATCH/DELETE are not paced
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
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  lastByScope.set(scope, Date.now());
}

// =============================================================================
// Security helper: sanitize URL (sensitive data in logs)
// =============================================================================

const SENSITIVE_PARAMS = [
  "token",
  "password",
  "old_password",
  "new_password",
  "refresh",
  "access",
  "uidb64", // Base64 encoded user ID
];

/**
 * Removes sensitive query parameters from a URL string before logging/telemetry.
 */
function sanitizeUrl(fullUrl: string): string {
  try {
    const hasProtocol = fullUrl.startsWith("http");
    const urlObj = new URL(
      fullUrl,
      hasProtocol ? undefined : "http://dummy.com",
    );

    let changed = false;
    SENSITIVE_PARAMS.forEach((param) => {
      if (urlObj.searchParams.has(param)) {
        urlObj.searchParams.set(param, "[REDACTED]");
        changed = true;
      }
    });

    if (!changed) return fullUrl;

    return hasProtocol
      ? urlObj.toString()
      : urlObj.pathname + urlObj.search;
  } catch {
    // Fallback: strip everything after '?'
    return fullUrl.split("?")[0] || fullUrl;
  }
}

// =============================================================================
// Axios instance
// =============================================================================

export const http = axios.create({
  baseURL,
  withCredentials: true,
});

// =============================================================================
// Telemetry: start/end timing of requests
// =============================================================================

const startAt = new WeakMap<AxiosRequestConfig, number>();

http.interceptors.request.use(async (cfg) => {
  const method = (cfg.method || "GET").toUpperCase() as Method;
  const url = cfg.url || "";

  // Local pacing & global pause
  await scheduleByScope(method, url);

  if (pauseUntil > Date.now()) {
    await new Promise((resolve) => setTimeout(resolve, pauseUntil - Date.now()));
  }

  // Start timer
  startAt.set(cfg, performance.now());

  const fullUrl = cfg.baseURL ? cfg.baseURL + (cfg.url || "") : cfg.url || "";
  const safeUrl = sanitizeUrl(fullUrl);

  (window).NetReport?.push({
    t: Date.now(),
    method,
    url, // keep relative
    fullUrl: safeUrl, // sanitized
    reqId: (cfg.headers as Record<string, unknown> | undefined)?.[
      "X-Request-Id"
    ] as string | undefined,
  });

  return cfg;
});

// =============================================================================
// Request interceptor: Authorization + Org scope header
// =============================================================================

function readOrgExternalId(): string | undefined {
  const s = store.getState() as unknown as {
    auth?: {
      orgExternalId?: string;
      organization?: { organization?: { external_id?: string } };
    };
  };

  return (
    s.auth?.orgExternalId || s.auth?.organization?.organization?.external_id
  );
}

http.interceptors.request.use((cfg) => {
  cfg.headers = cfg.headers ?? {};

  // Authorization header from in-memory access token
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
  if (typeof (v).access !== "string") return false;
  return true;
};

const hasErrorKey = (v: unknown): v is { error: ApiErrorBody } =>
  isObject(v) && "error" in v;

/**
 * Unwraps tokens from either a flat payload or an envelope: { data: { access, refresh? } }.
 */
function unwrapTokens(payload: unknown): Tokens | null {
  // Flat: { access, refresh? }
  if (hasAccessToken(payload)) {
    return payload;
  }

  // Envelope: { data: { access, refresh? } }
  if (isObject(payload) && "data" in payload) {
    const inner = (payload).data;
    if (hasAccessToken(inner)) {
      return inner;
    }
  }

  return null;
}

// =============================================================================
// Refresh (single-flight)
// =============================================================================

let refreshingPromise: Promise<void> | null = null;
const subscribers: Array<() => void> = [];

function notifySubscribers() {
  subscribers.splice(0).forEach((fn) => fn());
}

async function doRefresh(): Promise<void> {
  // We do NOT read 'refresh' from local storage anymore.
  // We assume the refresh token is in an HttpOnly cookie.
  // The backend /auth/refresh/ endpoint reads the cookie.
  const res = await axios.post(
    `${baseURL}auth/refresh/`,
    {}, // no body needed, cookie-only
    {
      validateStatus: (s) => s < 500,
      withCredentials: true, // critical: sends HttpOnly cookie
    },
  );

  const { data, status } = res as AxiosResponse<unknown>;

  const tokens = unwrapTokens(data);

  if (status !== 200 || !tokens) {
    throw new Error("refresh-failed");
  }

  // Access token is stored in memory only.
  // If a new refresh token is issued, it comes via Set-Cookie.
  setTokens(tokens.access);
}

// =============================================================================
// 429 handlers: parse Retry-After + jitter + global pause
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
  extra?: TelemetryExtra,
) {
  const t0 = startAt.get(cfg) ?? performance.now();
  const ms = performance.now() - t0;
  const status = res?.status ?? err?.response?.status;

  const reqId =
    (res?.headers?.["x-request-id"] as string | undefined) ||
    (err?.response?.headers?.["x-request-id"] as string | undefined);

  const fullUrl = cfg.baseURL ? cfg.baseURL + (cfg.url || "") : cfg.url || "";
  const safeUrl = sanitizeUrl(fullUrl);

  (window).NetReport?.push({
    t: Date.now(),
    method: (cfg.method || "GET").toUpperCase() as Method,
    url: cfg.url || "", // keep relative
    fullUrl: safeUrl, // sanitized
    status,
    ms,
    reqId,
    ...extra,
  });
}

type RetriableConfig = AxiosRequestConfig & {
  _retry?: boolean; // already tried refresh?
  _retried429?: number; // 429 retry counter
};

http.interceptors.response.use(
  (r) => {
    finishLog(r.config, r);

    const reqId = (r.headers as Record<string, unknown> | undefined)?.[
      "x-request-id"
    ];
    if (typeof reqId === "string") {
      // Keep console noise low but traceable
      console.debug("🔗 request-id", reqId);
    }

    return r;
  },
  async (error: AxiosError) => {
    const original = (error.config || {}) as RetriableConfig;
    const status = error.response?.status;

    // 429: exponential(ish) backoff honoring Retry-After; up to 3 retries
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

    // 401: attempt single-flight refresh (only once per request)
    if (status === 401 && !original._retry) {
      original._retry = true;

      if (!refreshingPromise) {
        refreshingPromise = doRefresh()
          .catch((e) => {
            clearTokens();
            throw e;
          })
          .finally(() => {
            notifySubscribers();
            refreshingPromise = null;
          });
      }

      // Wait for refresh to complete
      await new Promise<void>((resolve, reject) => {
        if (!refreshingPromise) return resolve();
        subscribers.push(resolve);
        refreshingPromise!.catch(reject);
      });

      // If we still have no access token (refresh failed), propagate
      if (!getAccess()) {
        finishLog(original, undefined, error);
        return Promise.reject(error);
      }

      // Retry with fresh access token
      return http(original);
    }

    // Other errors: telemetry + propagate
    finishLog(original, undefined, error);
    return Promise.reject(error);
  },
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
          Object.keys(cfg.params as Record<string, unknown>).sort(),
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
// =============================================================================

export async function request<T>(
  endpoint: string,
  method: Method = "GET",
  payload?: object,
): Promise<ApiSuccess<T>> {
  try {
    const cfg: AxiosRequestConfig = {
      url: endpoint,
      method,
      data: method !== "GET" ? payload : undefined,
      params: method === "GET" ? pruneParams(payload) : undefined,
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
        // 2) Single-flight
        if (!inflight.has(k)) {
          inflight.set(
            k,
            http
              .request<ApiResponse<T> | unknown>(cfg)
              .finally(() => inflight.delete(k)),
          );
        }
        res = await inflight.get(k)!;

        // 304 handling: re-use materialized response or force revalidation
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
              params: { ...baseParams, _r: ts },
            };

            if (!inflight.has(refreshKey)) {
              inflight.set(
                refreshKey,
                http
                  .request<ApiResponse<T> | unknown>(forceCfg)
                  .finally(() => inflight.delete(refreshKey)),
              );
            }

            const fresh = await inflight.get(refreshKey)!;
            if (fresh.status >= 200 && fresh.status < 300) {
              res = fresh;
            } else {
              throw new Error(
                `Revalidation returned ${fresh.status} — could not materialize a valid response.`,
              );
            }
          }
        }

        if (res.status >= 200 && res.status < 300) {
          responseCache.set(k, { t: Date.now(), res });
        }
      }
    } else {
      // Non-GET: no micro-cache, no single-flight
      res = await http.request<ApiResponse<T> | unknown>(cfg);
    }

    const body = res.data;

    // 204 or empty body → return empty success
    if (
      res.status === 204 ||
      body == null ||
      (typeof body === "string" && body.trim() === "")
    ) {
      return {} as ApiSuccess<T>;
    }

    if (hasErrorKey(body)) {
      throw body.error;
    }

    return body as ApiSuccess<T>;
  } catch (e) {
    const err = e as AxiosError<unknown>;

    if (axios.isAxiosError(err)) {
      const body = err.response?.data;
      if (hasErrorKey(body)) {
        throw body.error;
      }
      const msg = err.response
        ? `${err.response.status} ${
            err.response.statusText || "Request error"
          }`
        : err.message;
      throw new Error(msg);
    }

    throw e;
  }
}
