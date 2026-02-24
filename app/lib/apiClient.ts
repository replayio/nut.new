import { toast } from 'react-toastify';

export interface ApiError extends Error {
  status?: number;
  statusText?: string;
  data?: unknown;
}

export interface ApiCallOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  showErrorToast?: boolean;
  errorMessage?: string;
  accessToken?: string;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  ok: boolean;
}

export async function apiCall<T = unknown>(endpoint: string, options: ApiCallOptions = {}): Promise<ApiResponse<T>> {
  const { body, showErrorToast = false, errorMessage, accessToken, headers: customHeaders, ...fetchOptions } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  if (accessToken) {
    (headers as Record<string, string>).Authorization = `Bearer ${accessToken}`;
  }

  const config: RequestInit = {
    ...fetchOptions,
    headers,
  };

  if (body !== undefined) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(endpoint, config);

    let data: T;

    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = (await response.text()) as unknown as T;
    }

    if (!response.ok) {
      const error: ApiError = new Error(errorMessage || `Request failed with status ${response.status}`);
      error.status = response.status;
      error.statusText = response.statusText;
      error.data = data;

      if (showErrorToast) {
        toast.error(errorMessage || `Request failed: ${response.statusText}`);
      }

      throw error;
    }

    return {
      data,
      status: response.status,
      ok: true,
    };
  } catch (error) {
    if (error instanceof Error && 'status' in error) {
      throw error;
    }

    const apiError: ApiError = new Error(errorMessage || 'Network error occurred');
    apiError.data = error;

    if (showErrorToast) {
      toast.error(errorMessage || 'Network error. Please check your connection.');
    }

    console.error('API call error:', error);
    throw apiError;
  }
}

export const api = {
  get: <T = unknown>(endpoint: string, options?: Omit<ApiCallOptions, 'method'>) =>
    apiCall<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = unknown>(endpoint: string, body?: unknown, options?: Omit<ApiCallOptions, 'method' | 'body'>) =>
    apiCall<T>(endpoint, { ...options, method: 'POST', body }),

  put: <T = unknown>(endpoint: string, body?: unknown, options?: Omit<ApiCallOptions, 'method' | 'body'>) =>
    apiCall<T>(endpoint, { ...options, method: 'PUT', body }),

  patch: <T = unknown>(endpoint: string, body?: unknown, options?: Omit<ApiCallOptions, 'method' | 'body'>) =>
    apiCall<T>(endpoint, { ...options, method: 'PATCH', body }),

  delete: <T = unknown>(endpoint: string, options?: Omit<ApiCallOptions, 'method'>) =>
    apiCall<T>(endpoint, { ...options, method: 'DELETE' }),
};
