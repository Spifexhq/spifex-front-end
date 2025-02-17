/**
 * api.ts
 * 
 * This utility function handles API requests using Axios.
 * 
 * Features:
 * - Automatically sets the base URL based on the environment
 * - Supports multiple HTTP methods (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`)
 * - Handles authentication by adding a Bearer token if `withAuth` is enabled
 * - Returns structured responses with `data` and `detail`
 * - Provides detailed error handling with user-friendly messages
 * 
 * Usage:
 * ```ts
 * const response = await apiRequest<UserData>('users/me', 'GET');
 * if (response.detail) {
 *   console.error(response.detail);
 * } else {
 *   console.log(response.data);
 * }
 * ```
 */

import axios, { AxiosError } from 'axios';
import { ApiError } from '@/models/Api';
import { handleGetAccessToken } from './auth';

// Sets the base API URL based on the environment
const BASE_URL = import.meta.env.VITE_ENVIRONMENT === 'development'
    ? import.meta.env.VITE_SPIFEX_DEVELOPMENT_URL_API
    : import.meta.env.VITE_SPIFEX_URL_API || 'https://spifex-backend.onrender.com/api/v1';

/**
 * Handles API errors and returns user-friendly messages.
 */
const handleApiError = (error: AxiosError<ApiError>): string => {
    if (error.response) {
        const status = error.response.status;

        switch (status) {
            case 400:
                return 'Invalid request. Please check the provided data.';
            case 401:
                return 'Incorrect email or password. Please try again.';
            case 403:
                return 'Access denied. You do not have permission for this action.';
            case 404:
                return 'Resource not found.';
            case 500:
                return 'Internal server error. Please try again later.';
            default:
                return error.response.data.detail || 'An error occurred while processing the request.';
        }
    } else if (error.request) {
        return 'No response from the server. Please check your internet connection.';
    } else {
        return 'Error configuring the request. Please try again.';
    }
};

/**
 * Sends an HTTP request to the API and returns the response.
 * 
 * @param endpoint - The API endpoint (e.g., 'users/me')
 * @param method - The HTTP method ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')
 * @param data - The request payload (optional)
 * @param withAuth - Whether to include authentication (default: true)
 * @returns An object containing `data` (response) and `detail` (error message, if any)
 */
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
};
