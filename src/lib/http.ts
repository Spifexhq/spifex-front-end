// src/lib/http.ts
import axios, {
  type AxiosError,
  type AxiosResponse,
  type Method,
  type AxiosRequestConfig,
} from 'axios';

import {
  type ApiErrorBody,
  type ApiResponse,
  type ApiSuccess,
} from '@/models/Api';

import {
  getAccess,
  getRefresh,
  setTokens,
  clearTokens,
} from '@/lib/tokens';

// garante carregamento do singleton e da declaração global window.NetReport
import '@/lib/netReport';

/* ============================================================================
 * Base URL
 * ==========================================================================*/
const rawBaseURL =
  import.meta.env.VITE_ENVIRONMENT === 'development'
    ? import.meta.env.VITE_SPIFEX_DEVELOPMENT_URL_API
    : import.meta.env.VITE_SPIFEX_URL_API || 'https://spifex-backend.onrender.com/api/v1';

const baseURL = rawBaseURL.endsWith('/') ? rawBaseURL : `${rawBaseURL}/`;

/* ============================================================================
 * Pausa global (anti-stampede) após 429
 * ==========================================================================*/
let pauseUntil = 0; // epoch ms
function setGlobalPause(ms: number) {
  pauseUntil = Math.max(pauseUntil, Date.now() + ms);
}

const scopeMinGapMs: Record<string, number> = {
  read: 300,   // ~3.3 req/s por usuário
  auth: 500,   // auth é mais sensível
  write: 0,    // POST/PUT/PATCH/DELETE deixam passar
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
 * Telemetria: início/fim de cada request
 * ==========================================================================*/
const startAt = new WeakMap<AxiosRequestConfig, number>();

http.interceptors.request.use(async (cfg) => {
  // PRE-EMPT: agenda por escopo para evitar burst
  const method = (cfg.method || 'GET').toUpperCase() as Method;
  const url = cfg.url || '';
  await scheduleByScope(method, url);

  // Respeita pausa global (pós-429)
  if (pauseUntil > Date.now()) {
    const wait = pauseUntil - Date.now();
    await new Promise((resolve) => setTimeout(resolve, wait));
  }

  // Agora comece a medir duração e logar a telemetria
  startAt.set(cfg, performance.now());
  window.NetReport?.push({
    t: Date.now(),
    method,
    url,
    fullUrl: cfg.baseURL ? (cfg.baseURL + (cfg.url || '')) : (cfg.url || ''),
  });

  return cfg;
});

/* ============================================================================
 * Request interceptor: injeta Authorization
 * ==========================================================================*/
http.interceptors.request.use((cfg) => {
  const token = getAccess();
  if (token) {
    cfg.headers = cfg.headers ?? {};
    cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});

/* ============================================================================
 * Flags da config para retry/refresh
 * ==========================================================================*/
type RetriableConfig = AxiosRequestConfig & {
  _retry?: boolean;       // já tentou refresh?
  _retried429?: number;   // contador de retries 429
};

/* ============================================================================
 * Helpers de type-narrowing (sem any)
 * ==========================================================================*/
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null;

const hasErrorKey = (v: unknown): v is { error: ApiErrorBody } =>
  isObject(v) && 'error' in v;

const hasAccessToken = (v: unknown): v is { access: string; refresh?: string } =>
  isObject(v) && typeof v.access === 'string';

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
  if (!refresh) throw new Error('no-refresh-token');

  // usar axios "cru" para não passar pelos interceptors (evita loops)
  const res = await axios.post(
    `${baseURL}auth/refresh/`,
    { refresh },
    { validateStatus: (s) => s < 500 }
  );

  const { data, status } = res as AxiosResponse<unknown>;
  if (status !== 200 || !hasAccessToken(data)) {
    throw new Error('refresh-failed');
  }

  // se backend mandar um novo refresh, use; senão mantenha o atual
  setTokens(data.access, data.refresh ?? refresh);
}

/* ============================================================================
 * 429 backoff com Retry-After + jitter
 * ==========================================================================*/
function parseRetryAfter(headerValue: unknown): number {
  // retorna delay em ms
  if (typeof headerValue === 'string') {
    // "120" segundos ou uma data HTTP (ex.: Wed, 21 Oct 2015 07:28:00 GMT)
    const secs = Number(headerValue);
    if (Number.isFinite(secs)) return Math.max(0, secs) * 1000;

    const dateMs = Date.parse(headerValue);
    if (!Number.isNaN(dateMs)) {
      const delta = dateMs - Date.now();
      return Math.max(0, delta);
    }
  }
  return 1000; // padrão: 1s
}

function calc429DelayMs(err: AxiosError): number {
  const ra = err.response?.headers?.['retry-after'];
  const base = parseRetryAfter(ra);
  const jitter = Math.random() * 250;
  return base + jitter;
}

/* ============================================================================
 * Response interceptor: log req-id, lida com 429/401
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
  const reqId = (res?.headers?.['x-request-id'] || err?.response?.headers?.['x-request-id']) as string | undefined;

  window.NetReport?.push({
    t: Date.now(),
    method: (cfg.method || 'GET').toUpperCase() as Method,
    url: cfg.url || '',
    fullUrl: cfg.baseURL ? (cfg.baseURL + (cfg.url || '')) : (cfg.url || ''),
    status, ms, reqId,
    ...extra
  });
}

http.interceptors.response.use(
  (r) => {
    // Telemetria de sucesso
    finishLog(r.config, r);

    // (opcional) debug: request-id
    const reqId = (r.headers as Record<string, unknown> | undefined)?.['x-request-id'];
    if (typeof reqId === 'string') {
      console.debug('🔗 request-id', reqId);
    }
    return r;
  },
  async (error: AxiosError) => {
    const original = (error.config || {}) as RetriableConfig;
    const status = error.response?.status;

    // 429: respeita Retry-After, pausa global e aplica até 3 tentativas
    if (status === 429) {
      original._retried429 = (original._retried429 ?? 0) + 1;

      const delay = calc429DelayMs(error);
      // Telemetria do 429 (antes da espera/novo disparo)
      finishLog(original, undefined, error, {
        retried429: original._retried429,
        retryAfterMs: delay,
      });

      setGlobalPause(delay * 1.1); // pequena margem

      if (original._retried429 <= 3) {
        await new Promise((r) => setTimeout(r, delay));
        return http(original);
      }
      // estourou tentativas → cai para o fluxo de erro
    }

    // 401: tenta refresh (uma única vez por request)
    if (status === 401 && !original._retry) {
      original._retry = true;

      if (!refreshingPromise) {
        refreshingPromise = doRefresh()
          .catch((e) => {
            clearTokens(); // refresh falhou → evitar loops
            throw e;
          })
          .finally(() => {
            notifySubscribers();
            refreshingPromise = null;
          });
      }

      // aguarda o refresh concluir (sucesso ou falha)
      await new Promise<void>((resolve, reject) => {
        if (!refreshingPromise) return resolve();
        subscribers.push(resolve);
        refreshingPromise!.catch(reject);
      });

      if (!getAccess()) {
        // sem token → loga e retorna erro
        finishLog(original, undefined, error);
        return Promise.reject(error);
      }

      // retenta com novo access
      return http(original);
    }

    // Outros erros → telemetria + propaga
    finishLog(original, undefined, error);
    return Promise.reject(error);
  }
);

/* ============================================================================
 * Single-flight para GETs idênticos (deduplicação) + cache leve (5s)
 * ==========================================================================*/
const inflight = new Map<string, Promise<AxiosResponse>>();
const responseCache = new Map<string, { t: number; res: AxiosResponse }>();
const CACHE_TTL_MS = 5000; // 5s: evita repingar /auth/me a cada render/rota

function keyFrom(cfg: AxiosRequestConfig) {
  const u = (cfg.baseURL || '') + (cfg.url || '');
  const p = cfg.params ? JSON.stringify(cfg.params, Object.keys(cfg.params).sort()) : '';
  return `${(cfg.method || 'GET').toUpperCase()} ${u}?${p}`;
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
 * Envelope de request: retorna ApiSuccess<T> ou "vazio" para 204
 * ==========================================================================*/
export async function request<T>(
  endpoint: string,
  method: Method = 'GET',
  payload?: object
): Promise<ApiSuccess<T>> {
  try {
    const cfg: AxiosRequestConfig = {
      url: endpoint,
      method,
      data: method !== 'GET' ? payload : undefined,
      params: method === 'GET' ? pruneParams(payload) : undefined,
      // === [NOVO] 304 não é falha ===
      validateStatus: (s) => (s >= 200 && s < 300) || s === 304,
    };

    let res: AxiosResponse<ApiResponse<T> | unknown>;

    if ((cfg.method || 'GET').toUpperCase() === 'GET') {
      const k = keyFrom(cfg);

      // 1) Cache leve (5s)
      const hit = responseCache.get(k);
      if (hit && (Date.now() - hit.t) < CACHE_TTL_MS) {
        res = hit.res as AxiosResponse<ApiResponse<T> | unknown>;
      } else {
        // 2) Single-flight: evita 2+ GETs iguais em paralelo
        if (!inflight.has(k)) {
          inflight.set(
            k,
            http.request<ApiResponse<T> | unknown>(cfg).finally(() => inflight.delete(k))
          );
        }
        res = await inflight.get(k)!;

        // === [NOVO] 304 → materializar corpo 200 anterior, ou fazer refresh forçado ===
        if (res.status === 304) {
          const cached = responseCache.get(k);
          if (cached) {
            res = cached.res as AxiosResponse<ApiResponse<T> | unknown>;
          } else {
            // Não há 200 materializada ainda → fazer um GET "forçado" (bypass ao cache do navegador)
            const refreshKey = `REFRESH ${k}`;
            // muda levemente a URL (param _r) para garantir ida à origem
            const ts = Date.now();
            const forceCfg: AxiosRequestConfig = {
              ...cfg,
              params: { ...(cfg.params), _r: ts },
            };
            if (!inflight.has(refreshKey)) {
              inflight.set(
                refreshKey,
                http.request<ApiResponse<T> | unknown>(forceCfg).finally(() => inflight.delete(refreshKey))
              );
            }
            const fresh = await inflight.get(refreshKey)!;
            if (fresh.status >= 200 && fresh.status < 300) {
              res = fresh;
            } else {
              throw new Error(`Revalidação retornou ${fresh.status} — não foi possível materializar a resposta.`);
            }
          }
        }

        // guarda a última resposta 2xx para reuso
        if (res.status >= 200 && res.status < 300) {
          responseCache.set(k, { t: Date.now(), res });
        }
      }
    } else {
      res = await http.request<ApiResponse<T> | unknown>(cfg);
    }

    const body = res.data;

    // 204 ou corpo intencionalmente vazio
    if (
      res.status === 204 ||
      body == null ||
      (typeof body === 'string' && body.trim() === '')
    ) {
      return {} as ApiSuccess<T>;
    }

    // envelope de erro padronizado vindo do backend
    if (hasErrorKey(body)) {
      throw body.error;
    }

    // sucesso: retorna como envelope padronizado
    return body as ApiSuccess<T>;
  } catch (e) {
    const err = e as AxiosError<unknown>;

    if (axios.isAxiosError(err)) {
      // 304 nunca deve cair aqui por causa do validateStatus acima.
      const body = err.response?.data;

      // erro padronizado do backend
      if (hasErrorKey(body)) {
        throw body.error;
      }

      // fallback legível
      const msg = err.response
        ? `${err.response.status} ${err.response.statusText || 'Erro na requisição'}`
        : err.message;
      throw new Error(msg);
    }

    // erro não-Axios: propague
    throw e;
  }
}
