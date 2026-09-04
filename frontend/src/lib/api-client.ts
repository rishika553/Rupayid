import type { ApiResponse, AuthTokens } from '@rupayaid/types';
import { clearAuth, readAuth } from '@/lib/auth-storage';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

function errorMessage(payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    return 'An error occurred';
  }
  const data = payload as { message?: unknown; error?: unknown };
  if (Array.isArray(data.message)) {
    return data.message.map(String).join(', ');
  }
  if (typeof data.message === 'string' && data.message) {
    return data.message;
  }
  if (typeof data.error === 'string' && data.error) {
    return data.error;
  }
  return 'An error occurred';
}

interface RequestOptions extends Omit<RequestInit, 'method' | 'body'> {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  params?: Record<string, string>;
  body?: unknown;
}

class ApiClient {
  private baseUrl: string;
  private tokens: AuthTokens | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setTokens(tokens: AuthTokens | null) {
    this.tokens = tokens;
  }

  private resolveTokens(): AuthTokens | null {
    return this.tokens || readAuth();
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const { method = 'GET', params, body, headers: customHeaders, ...rest } = options;

    let url = `${this.baseUrl}${endpoint}`;
    if (params) {
      url += `?${new URLSearchParams(params).toString()}`;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(customHeaders as Record<string, string>),
    };

    const tokens = this.resolveTokens();
    if (tokens?.accessToken) {
      headers.Authorization = `Bearer ${tokens.accessToken}`;
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        ...rest,
      });

      const payload = await response.json().catch(() => ({}));

      if (response.status === 401) {
        clearAuth();
        this.tokens = null;
      }

      if (!response.ok) {
        return { success: false, error: errorMessage(payload) };
      }

      return {
        success: true,
        data: (payload as { data?: T }).data ?? payload,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  async get<T>(endpoint: string, params?: Record<string, string>) {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  async post<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, { method: 'POST', body });
  }

  async patch<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, { method: 'PATCH', body });
  }

  async put<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, { method: 'PUT', body });
  }

  async delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

export async function requireApi<T>(promise: Promise<ApiResponse<T>>): Promise<T> {
  const response = await promise;
  if (!response.success || response.data === undefined) {
    throw new Error(response.error || 'Request failed');
  }
  return response.data;
}
