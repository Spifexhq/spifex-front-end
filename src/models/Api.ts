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

export type Paginated<T> = {
  next: string | null;
  previous: string | null;
  results: T[];
};

/** Discriminated-union – type-safe */
export type ApiResponse<T> = ApiSuccess<T> | ApiError
