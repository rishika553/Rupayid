import { clearAdminAuth, readAdminAuth, writeAdminAuth } from '@/lib/admin-auth-storage';
import type { StoredAdminAuth } from '@/lib/admin-auth-storage';

const CUSTOMER_API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const API_ORIGIN = CUSTOMER_API_BASE.replace(/\/api\/v1\/?$/, '');
const SKIP_BEARER = new Set(['/api/admin/auth/login']);

export interface AdminPublicProfile {
  id: string;
  username: string;
  status: string;
}

export interface AdminLoginResult {
  accessToken: string;
  expiresIn: number;
  admin: AdminPublicProfile;
}

function errorMessage(payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    return 'Unable to sign in. Try again.';
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
  return 'Unable to sign in. Try again.';
}

class AdminApiClient {
  private tokens: StoredAdminAuth | null = null;

  setTokens(tokens: StoredAdminAuth | null) {
    this.tokens = tokens;
  }

  private resolveTokens(): StoredAdminAuth | null {
    return this.tokens || readAdminAuth();
  }

  private async request<T>(
    endpoint: string,
    options: { method?: 'GET' | 'POST'; body?: unknown; params?: Record<string, string> } = {},
  ): Promise<{
    success: boolean;
    data?: T;
    error?: string;
    status: number;
  }> {
    const { method = 'GET', body, params } = options;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const tokens = this.resolveTokens();
    if (tokens?.accessToken && !SKIP_BEARER.has(endpoint)) {
      headers.Authorization = `Bearer ${tokens.accessToken}`;
    }

    let url = `${API_ORIGIN}${endpoint}`;
    if (params) {
      const search = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value) {
          search.set(key, value);
        }
      }
      const qs = search.toString();
      if (qs) {
        url += `?${qs}`;
      }
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      const payload = await response.json().catch(() => ({}));

      if (response.status === 401 && !SKIP_BEARER.has(endpoint)) {
        clearAdminAuth();
        this.tokens = null;
      }

      if (!response.ok) {
        return { success: false, error: errorMessage(payload), status: response.status };
      }

      return {
        success: true,
        data: (payload as { data?: T }).data ?? (payload as T),
        status: response.status,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        status: 0,
      };
    }
  }

  login(username: string, password: string) {
    return this.request<AdminLoginResult>('/api/admin/auth/login', {
      method: 'POST',
      body: { username, password },
    });
  }

  me() {
    return this.request<AdminPublicProfile>('/api/admin/auth/me');
  }

  logout() {
    return this.request<{ success: boolean }>('/api/admin/auth/logout', { method: 'POST' });
  }

  kycStats() {
    return this.request<AdminKycStats>('/api/admin/dashboard/stats');
  }

  kycList(params?: { page?: number; limit?: number; status?: string; search?: string }) {
    const query: Record<string, string> = {};
    if (params?.page) query.page = String(params.page);
    if (params?.limit) query.limit = String(params.limit);
    if (params?.status) query.status = params.status;
    if (params?.search) query.search = params.search;
    return this.request<AdminKycListResult>('/api/admin/kyc', { params: query });
  }

  kycById(id: string) {
    return this.request<AdminKycDetail>(`/api/admin/kyc/${id}`);
  }

  kycApprove(id: string) {
    return this.request<{ id: string; status: string; reviewedAt: string | null; reviewedBy: string | null }>(
      `/api/admin/kyc/${id}/approve`,
      { method: 'POST' },
    );
  }

  kycDecline(id: string, reason: string) {
    return this.request<{
      id: string;
      status: string;
      declineReason: string | null;
      reviewedAt: string | null;
      reviewedBy: string | null;
    }>(`/api/admin/kyc/${id}/decline`, { method: 'POST', body: { reason } });
  }

  kycDocumentUrl(kycId: string, documentId: string) {
    return this.request<{ downloadUrl: string; expiresInSeconds: number }>(
      `/api/admin/kyc/${kycId}/documents/${documentId}/url`,
    );
  }
}

export interface AdminKycStats {
  total: number;
  pendingReview: number;
  approved: number;
  declined: number;
}

export interface AdminKycListItem {
  id: string;
  customerId: string;
  customerName: string;
  mobile: string | null;
  submittedAt: string | null;
  status: string;
}

export interface AdminKycListResult {
  data: AdminKycListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminKycDocument {
  id: string;
  documentType: string;
  fileName: string;
  status: string;
  mimeType: string | null;
  fileSizeBytes: number | null;
  uploadedAt: string;
}

export interface AdminKycDetails {
  dateOfBirth: string | null;
  gender: string | null;
  fatherOrSpouseName: string | null;
  maritalStatus: string | null;
  nationality: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  residenceType: string | null;
  panLastFour: string | null;
  aadhaarLastFour: string | null;
  idDocumentType: string | null;
  accountHolderName: string | null;
  accountLastFour: string | null;
  ifsc: string | null;
  bankName: string | null;
  accountType: string | null;
}

export interface AdminKycDetail {
  id: string;
  status: string;
  referenceCode: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewer: string | null;
  declineReason: string | null;
  customer: {
    id: string;
    name: string;
    firstName: string | null;
    lastName: string | null;
    mobile: string | null;
    phoneVerified: boolean;
    email: string | null;
    address: string | null;
  };
  details: AdminKycDetails | null;
  documents: AdminKycDocument[];
}

export const adminApiClient = new AdminApiClient();

export async function requireAdminApi<T>(
  promise: Promise<{ success: boolean; data?: T; error?: string }>,
): Promise<T> {
  const response = await promise;
  if (!response.success || response.data === undefined) {
    throw new Error(response.error || 'Request failed');
  }
  return response.data;
}

export function persistAdminSession(result: AdminLoginResult) {
  const tokens = { accessToken: result.accessToken };
  writeAdminAuth(tokens);
  adminApiClient.setTokens(tokens);
}
