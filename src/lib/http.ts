import axios, { AxiosError, AxiosResponse, Method } from 'axios'
import { ApiError, ApiResponse, ApiSuccess } from '@/models/Api'
import { handleGetAccessToken } from '@/api/auth'

const rawBaseURL =
  import.meta.env.VITE_ENVIRONMENT === 'development'
    ? import.meta.env.VITE_SPIFEX_DEVELOPMENT_URL_API
    : import.meta.env.VITE_SPIFEX_URL_API || 'https://spifex-backend.onrender.com/api/v1'

// garante barra final
const baseURL = rawBaseURL.endsWith('/') ? rawBaseURL : `${rawBaseURL}/`

const http = axios.create({
  baseURL,
  withCredentials: false,
})

/* opcional: log do request-id */
http.interceptors.response.use(r => {
  const reqId = r.headers['x-request-id']
  if (reqId) console.debug('🔗 request-id', reqId)
  return r
})

http.interceptors.request.use(cfg => {
  const token = handleGetAccessToken()
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

export async function request<T>(
  endpoint: string,
  method: Method = 'GET',
  payload?: object,
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
    if ((e as AxiosError).isAxiosError) {
      const err = e as AxiosError<ApiError>;
      if (err.response?.data?.error) throw err.response.data.error;
    }
    throw e;
  }
}
