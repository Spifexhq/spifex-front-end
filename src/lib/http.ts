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

/* ============================================================================
 * Base URL
 * ==========================================================================*/
const rawBaseURL =
  import.meta.env.VITE_ENVIRONMENT === 'development'
    ? import.meta.env.VITE_SPIFEX_DEVELOPMENT_URL_API
    : import.meta.env.VITE_SPIFEX_URL_API || 'https://spifex-backend.onrender.com/api/v1';

const baseURL = rawBaseURL.endsWith('/') ? rawBaseURL : `${rawBaseURL}/`;

/* ============================================================================
 * Axios instance
 * ==========================================================================*/
export const http = axios.create({
  baseURL,
  withCredentials: false,
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
http.interceptors.response.use(
  (r) => {
    const reqId = (r.headers as Record<string, unknown> | undefined)?.['x-request-id'];
    if (typeof reqId === 'string') {
      // deixe como debug para não poluir o console em produção
      console.debug('🔗 request-id', reqId);
    }
    return r;
  },
  async (error: AxiosError) => {
    const original = (error.config || {}) as RetriableConfig;
    const status = error.response?.status;

    // 429: respeita Retry-After e aplica até 3 tentativas
    if (status === 429) {
      original._retried429 = (original._retried429 ?? 0) + 1;
      if (original._retried429 <= 3) {
        const delay = calc429DelayMs(error);
        await new Promise((r) => setTimeout(r, delay));
        return http(original);
      }
    }

    // 401: tenta refresh (uma única vez por request)
    if (status === 401 && !original._retry) {
      original._retry = true;

      if (!refreshingPromise) {
        refreshingPromise = doRefresh()
          .catch((e) => {
            // refresh falhou → limpar tokens para impedir retentativas em loop
            clearTokens();
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
        refreshingPromise.catch(reject);
      });

      // se não temos mais access token, falhe
      if (!getAccess()) return Promise.reject(error);

      // retenta com novo access (o request interceptor injeta)
      return http(original);
    }

    return Promise.reject(error);
  }
);

/* ============================================================================
 * Envelope de request: retorna ApiSuccess<T> ou "vazio" para 204
 * ==========================================================================*/
/**
 * Executa uma requisição e retorna o envelope `ApiSuccess<T>`.
 * - 204 / corpo vazio: retorna um envelope "vazio" (compatível com o tipo).
 * - Se o backend enviar `{ error: ... }`, lança essa estrutura tipada como erro.
 * - Em demais erros HTTP, lança `Error` com mensagem legível.
 */
export async function request<T>(
  endpoint: string,
  method: Method = 'GET',
  payload?: object
): Promise<ApiSuccess<T>> {
  try {
    const res: AxiosResponse<ApiResponse<T> | unknown> = await http.request({
      url: endpoint,
      method,
      data: method !== 'GET' ? payload : undefined,
      params: method === 'GET' ? payload : undefined,
    });

    const body = res.data;

    // 204 ou corpo intencionalmente vazio
    if (
      res.status === 204 ||
      body == null ||
      (typeof body === 'string' && body.trim() === '')
    ) {
      // Mantém compat com o tipo, mesmo que esse endpoint não retorne dados
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
