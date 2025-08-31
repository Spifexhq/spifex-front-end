import axios from 'axios';
import type { AxiosError, AxiosResponse, Method, AxiosRequestConfig } from 'axios';
import { ApiError, ApiResponse, ApiSuccess } from '@/models/Api';
import { getAccess, getRefresh, setTokens, clearTokens } from '@/lib/tokens';

const rawBaseURL =
  import.meta.env.VITE_ENVIRONMENT === 'development'
    ? import.meta.env.VITE_SPIFEX_DEVELOPMENT_URL_API
    : import.meta.env.VITE_SPIFEX_URL_API || 'https://spifex-backend.onrender.com/api/v1';

const baseURL = rawBaseURL.endsWith('/') ? rawBaseURL : `${rawBaseURL}/`;

export const http = axios.create({
  baseURL,
  withCredentials: false,
});

// ---- Request ----
http.interceptors.request.use((cfg) => {
  const token = getAccess();
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// ---- Types auxiliares para flags de retry ----
type RetriableConfig = AxiosRequestConfig & {
  _retry?: boolean;
  _retried429?: number;
};

// ---- Refresh machinery ----
let refreshingPromise: Promise<void> | null = null;
const subscribers: Array<() => void> = [];

function notifySubscribers() {
  subscribers.splice(0).forEach((fn) => fn());
}

async function doRefresh() {
  const refresh = getRefresh();
  if (!refresh) throw new Error('no-refresh-token');

  // Usa axios "puro" para não passar pelos interceptors (evita loop)
  const { data, status } = await axios.post(
    `${baseURL}auth/refresh/`,
    { refresh },
    { validateStatus: (s) => s < 500 }
  );

  if (status !== 200 || !data?.access) throw new Error('refresh-failed');
  // Se backend retornar novo refresh, use; senão, mantém o atual
  setTokens(data.access, data.refresh || refresh);
}

http.interceptors.response.use(
  (r) => {
    // axios v1 expõe headers como AxiosResponseHeaders (tem get), mas manter simples:
    const reqId = (r.headers as Record<string, unknown> | undefined)?.['x-request-id'];
    if (typeof reqId === 'string') console.debug('🔗 request-id', reqId);
    return r;
  },
  async (error: AxiosError<ApiError>) => {
    const original: RetriableConfig = (error.config || {}) as RetriableConfig;
    const status = error.response?.status;

    // 429 → respeita Retry-After + jitter; tenta até 3 vezes
    if (status === 429) {
      original._retried429 = (original._retried429 || 0) + 1;
      if (original._retried429 <= 3) {
        const retryAfter =
          Number(error.response?.headers?.['retry-after']) || 1;
        await new Promise((r) =>
          setTimeout(r, retryAfter * 1000 + Math.random() * 250)
        );
        return http(original);
      }
    }

    // 401 → tenta refresh (apenas 1 vez por request)
    if (status === 401 && !original._retry) {
      original._retry = true;

      if (!refreshingPromise) {
        refreshingPromise = doRefresh()
          .catch((e) => {
            // Refresh falhou → limpa tokens
            clearTokens();
            throw e;
          })
          .finally(() => {
            notifySubscribers();
            refreshingPromise = null;
          });
      }

      // Espera o refresh terminar (sucesso ou falha)
      await new Promise<void>((resolve, reject) => {
        if (!refreshingPromise) return resolve();
        subscribers.push(resolve);
        refreshingPromise?.catch(reject);
      });

      // Se tokens foram limpos, não retenta
      if (!getAccess()) return Promise.reject(error);

      // Retenta com novo access (o request interceptor injeta)
      return http(original);
    }

    return Promise.reject(error);
  }
);

// ---- Helper request envelope ----
export async function request<T>(
  endpoint: string,
  method: Method = 'GET',
  payload?: object
): Promise<ApiSuccess<T>> {
  try {
    const res: AxiosResponse<ApiResponse<T>> = await http.request({
      url: endpoint,
      method,
      data: method !== 'GET' ? payload : undefined,
      params: method === 'GET' ? payload : undefined,
    });

    if ('error' in res.data) throw res.data.error;
    return res.data;
  } catch (e) {
    const err = e as AxiosError<ApiError>;
    if (err.isAxiosError && err.response?.data?.error) {
      throw err.response.data.error;
    }
    throw e;
  }
}
