import axios, { AxiosError } from 'axios';
import { ApiError } from '@/models/Api';
import { handleGetAccessToken } from './auth';

const BASE_URL = import.meta.env.VITE_ENVIRONMENT === 'development'
    ? import.meta.env.VITE_SPIFEX_DEVELOPMENT_URL_API
    : import.meta.env.VITE_SPIFEX_URL_API || 'https://spifex-backend.onrender.com/api/v1';

const handleApiError = (error: AxiosError<ApiError>): string => {
    if (error.response) {
        const status = error.response.status;

        switch (status) {
            case 400:
                return 'Requisição inválida. Por favor, verifique os dados enviados.';
            case 401:
                return 'Email ou senha incorretos. Por favor, tente novamente.';
            case 403:
                return 'Acesso negado. Você não tem permissão para esta ação.';
            case 404:
                return 'Recurso não encontrado.';
            case 500:
                return 'Erro interno do servidor. Por favor, tente novamente mais tarde.';
            default:
                return error.response.data.detail || 'Ocorreu um erro na solicitação.';
        }
    } else if (error.request) {
        return 'Sem resposta do servidor. Por favor, verifique sua conexão com a internet.';
    } else {
        return 'Erro ao configurar a requisição. Por favor, tente novamente.';
    }
};

export const apiRequest = async <TypeDataResponse>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
    data?: object,
    withAuth: boolean = true
): Promise<{
    data?: TypeDataResponse | null;
    detail: string;
}> => {
  const access_token = handleGetAccessToken();

  const headers: Record<string, string> = {};

  if (withAuth && access_token) {
      headers['Authorization'] = `Bearer ${access_token}`;
  }

  try {
    const request = await axios({
        url: `${BASE_URL}/${endpoint}`,
        method,
        headers,
        data: method !== 'GET' ? data : undefined,
        params: method === 'GET' ? data : undefined
    });

    return {
        data: request.data,
        detail: ''
    };
  } catch (e) {
      const error = e as AxiosError<ApiError>;

      return {
          data: null,
          detail: handleApiError(error),
      };
  }
}
