// src/lib/http.ts
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

// Ensure the NetReport singleton and window.NetReport are loaded
import "@/lib/netReport";

// We need the org to send in the header
import { store } from "@/redux/store";

/* ============================================================================
 * Base URL
 * ==========================================================================*/
const rawBaseURL =
  import.meta.env.VITE_ENVIRONMENT === "development"
    ? import.meta.env.VITE_SPIFEX_DEVELOPMENT_URL_API
    : import.meta.env.VITE_SPIFEX_URL_API ||
      "https://spifex-backend.onrender.com/api/v1";

const baseURL = rawBaseURL.endsWith("/") ? rawBaseURL : `${rawBaseURL}/`;

/* ============================================================================
 * Global pause (anti-stampede) after 429
 * ==========================================================================*/
let pauseUntil = 0; // epoch ms
function setGlobalPause(ms: number) {
  pauseUntil = Math.max(pauseUntil, Date.now() + ms);
}

const scopeMinGapMs: Record<string, number> = {
  read: 300, // ~3.3 req/s per user
  auth: 500, // auth is more sensitive
  write: 0,  // POST/PUT/PATCH/DELETE bypass throttled gap
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

/* ============================================================================
 * Axios instance
 * ==========================================================================*/
export const http = axios.create({
  baseURL,
  withCredentials: false,
});

/* ============================================================================
 * Telemetry: start/end of each request
 * ==========================================================================*/
const startAt = new WeakMap<AxiosRequestConfig, number>();

http.interceptors.request.use(async (cfg) => {
  // Pre-empt: schedule by scope to avoid bursts
  const method = (cfg.method || "GET").toUpperCase() as Method;
  const url = cfg.url || "";
  await scheduleByScope(method, url);

  // Respect global pause (post-429)
  if (pauseUntil > Date.now()) {
    const wait = pauseUntil - Date.now();
    await new Promise((resolve) => setTimeout(resolve, wait));
  }

  // Begin timing and push telemetry
  startAt.set(cfg, performance.now());
  window.NetReport?.push({
    t: Date.now(),
    method,
    url,
    fullUrl: cfg.baseURL ? cfg.baseURL + (cfg.url || "") : cfg.url || "",
  });

  return cfg;
});

/* ============================================================================
 * Request interceptor: inject Authorization and X-Org-External-Id
 * ==========================================================================*/
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

  // JWT token
  const token = getAccess();
  if (token) {
    cfg.headers.Authorization = `Bearer ${token}`;
  }

  // Organization scope via header (removes org from URL path)
  const orgExt = readOrgExternalId();
  if (orgExt) {
    (cfg.headers as Record<string, string>)["X-Org-External-Id"] = orgExt;
  }

  return cfg;
});

/* ============================================================================
 * Config flags for retry/refresh
 * ==========================================================================*/
type RetriableConfig = AxiosRequestConfig & {
  _retry?: boolean;      // already tried refresh?
  _retried429?: number;  // 429 retry counter
};

/* ============================================================================
 * Type-narrowing helpers (no any)
 * ==========================================================================*/
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

/* ============================================================================
 * Refresh single-flight
 * ==========================================================================*/
let refreshingPromise: Promise<void> | null = null;
const subscribers: Array<() => void> = [];

function notifySubscribers() {
  subscribers.splice(0).forEach((fn) => fn());
}

async function doRefresh(): Promise<void> {
  const refresh = getRefresh();
  if (!refresh) throw new Error("no-refresh-token");

  // Use raw axios to avoid hitting interceptors (prevents loops)
  const res = await axios.post(
    `${baseURL}auth/refresh/`,
    { refresh },
    { validateStatus: (s) => s < 500 }
  );

  const { data, status } = res as AxiosResponse<unknown>;
  if (status !== 200 || !hasAccessToken(data)) {
    throw new Error("refresh-failed");
  }

  // If backend returns a new refresh token, use it; otherwise keep the current one
  setTokens(data.access, data.refresh ?? refresh);
}

/* ============================================================================
 * 429 backoff with Retry-After + jitter
 * ==========================================================================*/
function parseRetryAfter(headerValue: unknown): number {
  // Return delay in ms
  if (typeof headerValue === "string") {
    // Either seconds (e.g., "120") or an HTTP date (e.g., Wed, 21 Oct 2015 07:28:00 GMT)
    const secs = Number(headerValue);
    if (Number.isFinite(secs)) return Math.max(0, secs) * 1000;

    const dateMs = Date.parse(headerValue);
    if (!Number.isNaN(dateMs)) {
      const delta = dateMs - Date.now();
      return Math.max(0, delta);
    }
  }
  return 1000; // default: 1s
}

function calc429DelayMs(err: AxiosError): number {
  const ra = err.response?.headers?.["retry-after"];
  const base = parseRetryAfter(ra);
  const jitter = Math.random() * 250;
  return base + jitter;
}

/* ============================================================================
 * Response interceptor: log req-id, handle 429/401
 * ==========================================================================*/
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
  const reqId = (res?.headers?.["x-request-id"] ||
    err?.response?.headers?.["x-request-id"]) as string | undefined;

  window.NetReport?.push({
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

http.interceptors.response.use(
  (r) => {
    // Success telemetry
    finishLog(r.config, r);

    // Optional: surface request-id
    const reqId = (r.headers as Record<string, unknown> | undefined)?.[
      "x-request-id"
    ];
    if (typeof reqId === "string") {
      console.debug("🔗 request-id", reqId);
    }
    return r;
  },
  async (error: AxiosError) => {
    const original = (error.config || {}) as RetriableConfig;
    const status = error.response?.status;

    // 429: honor Retry-After, apply global pause, retry up to 3 times
    if (status === 429) {
      original._retried429 = (original._retried429 ?? 0) + 1;

      const delay = calc429DelayMs(error);
      // Telemetry for 429 (before waiting/retry)
      finishLog(original, undefined, error, {
        retried429: original._retried429,
        retryAfterMs: delay,
      });

      setGlobalPause(delay * 1.1); // small margin

      if (original._retried429 <= 3) {
        await new Promise((r) => setTimeout(r, delay));
        return http(original);
      }
      // exceeded retries → fall through to error handling
    }

    // 401: try refresh (only once per request)
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

      // wait for the refresh to complete (success or failure)
      await new Promise<void>((resolve, reject) => {
        if (!refreshingPromise) return resolve();
        subscribers.push(resolve);
        refreshingPromise!.catch(reject);
      });

      if (!getAccess()) {
        // still no token → log and propagate error
        finishLog(original, undefined, error);
        return Promise.reject(error);
      }

      // retry with the new access token
      return http(original);
    }

    // Other errors → telemetry + propagate
    finishLog(original, undefined, error);
    return Promise.reject(error);
  }
);

/* ============================================================================
 * Single-flight for identical GETs + light cache (0.5s)
 * ==========================================================================*/
const inflight = new Map<string, Promise<AxiosResponse>>();
const responseCache = new Map<string, { t: number; res: AxiosResponse }>();
const CACHE_TTL_MS = 500;

function keyFrom(cfg: AxiosRequestConfig) {
  const u = (cfg.baseURL || "") + (cfg.url || "");
  const p = cfg.params
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

/* ============================================================================
 * Request envelope: returns ApiSuccess<T> or empty object for 204
 * ==========================================================================*/
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
      // 304 should not be treated as failure
      validateStatus: (s) => (s >= 200 && s < 300) || s === 304,
    };

    let res: AxiosResponse<ApiResponse<T> | unknown>;

    if ((cfg.method || "GET").toUpperCase() === "GET") {
      const k = keyFrom(cfg);

      // 1) Light cache
      const hit = responseCache.get(k);
      if (hit && Date.now() - hit.t < CACHE_TTL_MS) {
        res = hit.res as AxiosResponse<ApiResponse<T> | unknown>;
      } else {
        // 2) Single-flight
        if (!inflight.has(k)) {
          inflight.set(
            k,
            http.request<ApiResponse<T> | unknown>(cfg).finally(() =>
              inflight.delete(k)
            )
          );
        }
        res = await inflight.get(k)!;

        // 304 → materialize previous 200 or force a refresh
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
                  .finally(() => inflight.delete(refreshKey))
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

        // store the last 2xx response
        if (res.status >= 200 && res.status < 300) {
          responseCache.set(k, { t: Date.now(), res });
        }
      }
    } else {
      res = await http.request<ApiResponse<T> | unknown>(cfg);
    }

    const body = res.data;

    // 204 or intentionally empty body
    if (
      res.status === 204 ||
      body == null ||
      (typeof body === "string" && body.trim() === "")
    ) {
      return {} as ApiSuccess<T>;
    }

    // standardized error envelope from backend
    if (hasErrorKey(body)) {
      throw body.error;
    }

    // success
    return body as ApiSuccess<T>;
  } catch (e) {
    const err = e as AxiosError<unknown>;

    if (axios.isAxiosError(err)) {
      // 304 should never land here because of validateStatus above.
      const body = err.response?.data;

      // standardized backend error
      if (hasErrorKey(body)) {
        throw body.error;
      }

      // readable fallback
      const msg = err.response
        ? `${err.response.status} ${err.response.statusText || "Request error"}`
        : err.message;
      throw new Error(msg);
    }

    // non-Axios errors: propagate
    throw e;
  }
}
