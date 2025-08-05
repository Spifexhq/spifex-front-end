// apiError.ts
import type { ApiResponse, ApiError } from '@/models/Api';

export function isApiError<T>(res: ApiResponse<T>): res is ApiError {
  return 'error' in res;
}
