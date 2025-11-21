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

import { getAccess, setTokens, clearTokens } from "@/lib/tokens";
import "@/lib/netReport";
import { store } from "@/redux/store";

const rawBaseURL = import.meta.env.DEV
  ? import.meta.env.VITE_SPIFEX_DEVELOPMENT_URL_API
  : import.meta.env.VITE_SPIFEX_URL_API || "https://spifex-backend.onrender.com/api/v1";

export const baseURL = rawBaseURL.endsWith("/") ? rawBaseURL : `${rawBaseURL}/`;

let pauseUntil = 0;

function setGlobalPause(ms: number) {
  pauseUntil = Math.max(pauseUntil, Date.now() + ms);
}

const scopeMinGapMs: Record<string, number> = {
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
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  lastByScope.set(scope, Date.now());
}

const SENSITIVE_PARAMS = [
  "token",
  "password",
  "old_password",
  "new_password",
  "refresh",
  "access",
  "uidb64",
];

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
    return fullUrl.split("?")[0] || fullUrl;
  }
}

export const http = axios.create({
  baseURL,
  withCredentials: true,
});

const startAt = new WeakMap<AxiosRequestConfig, number>();

http.interceptors.request.use(async (cfg) => {
  const method = (cfg.method || "GET").toUpperCase() as Method;
  const url = cfg.url || "";

  await scheduleByScope(method, url);

  if (pauseUntil > Date.now()) {
    await new Promise((resolve) => setTimeout(resolve, pauseUntil - Date.now()));
  }

  startAt.set(cfg, performance.now());

  const fullUrl = cfg.baseURL ? cfg.baseURL + (cfg.url || "") : cfg.url || "";
  const safeUrl = sanitizeUrl(fullUrl);

  (window).NetReport?.push({
    t: Date.now(),
    method,
    url,
    fullUrl: safeUrl,
    reqId: (cfg.headers as Record<string, unknown> | undefined)?.[
      "X-Request-Id"
    ] as string | undefined,
  });

  return cfg;
});

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

  const token = getAccess();
  if (token) {
    (cfg.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }

  const orgExt = readOrgExternalId();
  if (orgExt) {
    (cfg.headers as Record<string, string>)["X-Org-External-Id"] = orgExt;
  }

  return cfg;
});

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

type Tokens = { access: string; refresh?: string };

const hasAccessToken = (v: unknown): v is Tokens => {
  if (!isObject(v)) return false;
  if (typeof v.access !== "string") return false;
  return true;
};

const hasErrorKey = (v: unknown): v is { error: ApiErrorBody } =>
  isObject(v) && "error" in v;

function unwrapTokens(payload: unknown): Tokens | null {
  if (hasAccessToken(payload)) {
    return payload;
  }

  if (isObject(payload) && "data" in payload) {
    const inner = payload.data;
    if (hasAccessToken(inner)) {
      return inner;
    }
  }

  return null;
}

let refreshingPromise: Promise<void> | null = null;
const subscribers: Array<() => void> = [];

function notifySubscribers() {
  subscribers.splice(0).forEach((fn) => fn());
}

async function doRefresh(): Promise<void> {
  const res = await axios.post(
    `${baseURL}auth/refresh/`,
    {},
    {
      validateStatus: (s) => s < 500,
      withCredentials: true,
    },
  );

  const { data, status } = res as AxiosResponse<unknown>;
  const tokens = unwrapTokens(data);

  if (status !== 200 || !tokens) {
    throw new Error("refresh-failed");
  }

  setTokens(tokens.access);
}

function parseRetryAfter(headerValue: unknown): number {
  if (typeof headerValue === "string") {
    const secs = Number(headerValue);
    if (Number.isFinite(secs)) return Math.max(0, secs) * 1000;

    const dateMs = Date.parse(headerValue);
    if (!Number.isNaN(dateMs)) {
      return Math.max(0, dateMs - Date.now());
    }
  }
  return 1000;
}

function calc429DelayMs(err: AxiosError): number {
  const ra = err.response?.headers?.["retry-after"];
  const base = parseRetryAfter(ra);
  const jitter = Math.random() * 250;
  return base + jitter;
}

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
    url: cfg.url || "",
    fullUrl: safeUrl,
    status,
    ms,
    reqId,
    ...extra,
  });
}

type RetriableConfig = AxiosRequestConfig & {
  _retry?: boolean;
  _retried429?: number;
};

http.interceptors.response.use(
  (r) => {
    finishLog(r.config, r);

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
            throw e;
          })
          .finally(() => {
            notifySubscribers();
            refreshingPromise = null;
          });
      }

      await new Promise<void>((resolve, reject) => {
        if (!refreshingPromise) return resolve();
        subscribers.push(resolve);
        refreshingPromise!.catch(reject);
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

export function clearHttpCaches() {
  inflight.clear();
  responseCache.clear();
  lastByScope.clear();
  pauseUntil = 0;
}

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

      const hit = responseCache.get(k);
      if (hit && Date.now() - hit.t < CACHE_TTL_MS) {
        res = hit.res as AxiosResponse<ApiResponse<T> | unknown>;
      } else {
        if (!inflight.has(k)) {
          inflight.set(
            k,
            http
              .request<ApiResponse<T> | unknown>(cfg)
              .finally(() => inflight.delete(k)),
          );
        }
        res = await inflight.get(k)!;

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
      res = await http.request<ApiResponse<T> | unknown>(cfg);
    }

    const body = res.data;

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
