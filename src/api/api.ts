import axios, { AxiosError } from 'axios';
import { IApiResponse } from '@/models/Api';
import { handleGetAccessToken } from './auth';

const BASE_URL =
  import.meta.env.VITE_ENVIRONMENT === 'development'
    ? import.meta.env.VITE_SPIFEX_DEVELOPMENT_URL_API
    : import.meta.env.VITE_SPIFEX_URL_API || 'https://spifex-backend.onrender.com/api/v1';

/**
 * Trata erros da API e retorna uma mensagem amigável.
 */
const handleApiError = (error: AxiosError): string => {
  if (error.response) {
    const data = error.response.data as IApiResponse<null>;
    return data.message || 'Erro desconhecido ao processar a requisição.';
  } else if (error.request) {
    return 'Sem resposta do servidor. Verifique sua conexão.';
  } else {
    return 'Erro ao configurar a requisição.';
  }
};

/**
 * Envia uma requisição HTTP à API e retorna a resposta.
 */
export const apiRequest = async <TData>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  data?: object,
  withAuth: boolean = true
): Promise<IApiResponse<TData>> => {
  const access_token = handleGetAccessToken();
  const headers: Record<string, string> = {};

  if (withAuth && access_token) {
    headers['Authorization'] = `Bearer ${access_token}`;
  }

  try {
    const response = await axios({
      url: `${BASE_URL}/${endpoint}`,
      method,
      headers,
      data: method !== 'GET' ? data : undefined,
      params: method === 'GET' ? data : undefined,
    });

    const responseData = response.data as IApiResponse<TData>;

    return responseData;
  } catch (e) {
    const error = e as AxiosError;
    return {
      status: 'error',
      message: handleApiError(error),
      data: undefined,
      errors: error.response?.data || null,
    };
  }
};
