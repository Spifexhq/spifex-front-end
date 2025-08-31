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

export interface ApiErrorBody {
  code: string;
  /** mensagem simples (quando existir) */
  message?: string;
  /** payload bruto do DRF/handler */
  detail?: unknown;
  /** alias opcional para retrocompat (se algum endpoint ainda mandar 'details') */
  details?: unknown;
  /** erros por campo (ValidationError) */
  fields?: Record<string, unknown>;
  /** status HTTP retornado pelo backend (ex.: 429, 401, 400...) */
  status?: number;
  /** request id também pode vir aqui (o handler novo inclui) */
  request_id?: string;
}

export interface ApiError {
  error: ApiErrorBody;
  meta?: Meta;
}

export type Paginated<T> = {
  next: string | null;
  previous: string | null;
  results: T[];
};

/** Discriminated-union – type-safe */
export type ApiResponse<T> = ApiSuccess<T> | ApiError
