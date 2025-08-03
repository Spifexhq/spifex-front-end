// Deletar depois \/
export interface IApiResponse<T> {
  status: 'success' | 'error';
  message: string;
  data?: T;
  errors?: unknown;
}

export interface Meta {
  request_id: string
  pagination?: {
    next?: string
    previous?: string
    limit: number
  }
}

export interface ApiSuccess<T> {
  data: T
  meta: Meta
}

export interface ApiError {
  error: {
    code: string
    message: string
    details?: unknown
  }
  meta: Meta
}

/** Discriminated-union – type-safe */
export type ApiResponse<T> = ApiSuccess<T> | ApiError
