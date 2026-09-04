import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, requireApi } from '@/lib/api-client';
import type {
  CustomerProfile,
  KycApplication,
  KycStatus,
  LoanApplication,
  LoanProduct,
  NotificationRecord,
  PaginatedNotifications,
  PaymentRecord,
  ReferralMe,
  RepaymentScheduleItem,
} from '@/lib/types';
import { MOCK_PRODUCTS } from '@/lib/types';
import { putFileWithProgress } from '@/lib/kyc';

async function withFallback<T>(loader: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await loader();
  } catch {
    return fallback;
  }
}

export function useLoanProducts() {
  return useQuery({
    queryKey: ['loan-products'],
    queryFn: () =>
      withFallback(
        () => requireApi(apiClient.get<LoanProduct[]>('/loan-products')),
        MOCK_PRODUCTS,
      ),
  });
}

export function useMyLoans() {
  return useQuery({
    queryKey: ['loans', 'my'],
    queryFn: () =>
      withFallback(() => requireApi(apiClient.get<LoanApplication[]>('/loans/applications/my')), []),
  });
}

export function useLoan(id: string) {
  return useQuery({
    queryKey: ['loans', id],
    enabled: Boolean(id),
    queryFn: () => requireApi(apiClient.get<LoanApplication>(`/loans/applications/${id}`)),
  });
}

export function useApplyLoan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { loanProductId: string; amountRequested: number; tenureMonths: number }) =>
      requireApi(apiClient.post<LoanApplication>('/loans/applications', body)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['loans'] });
    },
  });
}

export function useMyKyc() {
  return useQuery({
    queryKey: ['kyc', 'my'],
    queryFn: async () => {
      try {
        const me = await requireApi(apiClient.get<KycApplication>('/kyc/me'));
        return [me];
      } catch (error) {
        if (error instanceof Error && /not found/i.test(error.message)) {
          return [];
        }
        throw error;
      }
    },
  });
}

export function useKycStatus() {
  return useQuery({
    queryKey: ['kyc', 'status'],
    queryFn: () => requireApi(apiClient.get<KycStatus>('/kyc/status')),
  });
}

export function useCreateKyc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => requireApi(apiClient.post<KycApplication>('/kyc')),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['kyc'] });
    },
  });
}

export function useUpdateKyc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, string | undefined>) =>
      requireApi(apiClient.patch<KycApplication>('/kyc/me', body)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['kyc'] });
    },
  });
}

export function useSubmitKyc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => requireApi(apiClient.post<KycStatus>('/kyc/submit')),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['kyc'] });
    },
  });
}

export function useAddKycDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      documentType: string;
      file: File;
      onProgress?: (percent: number) => void;
    }) => {
      input.onProgress?.(8);
      const upload = await requireApi(
        apiClient.post<{
          objectKey: string;
          uploadUrl: string;
          contentType: string;
        }>('/kyc/documents/upload-url', {
          documentType: input.documentType,
          mimeType: input.file.type,
          fileSizeBytes: input.file.size,
        }),
      );
      input.onProgress?.(18);
      await putFileWithProgress(upload.uploadUrl, input.file, upload.contentType, (percent) => {
        input.onProgress?.(18 + Math.round(percent * 0.72));
      });
      input.onProgress?.(94);
      const document = await requireApi(
        apiClient.post('/kyc/documents', {
          documentType: input.documentType,
          objectKey: upload.objectKey,
          mimeType: input.file.type,
          fileSizeBytes: input.file.size,
        }),
      );
      input.onProgress?.(100);
      return document;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['kyc'] });
    },
  });
}

export function useKycDocumentPreview() {
  return useMutation({
    mutationFn: (documentId: string) =>
      requireApi(apiClient.get<{ downloadUrl: string; expiresInSeconds: number }>(`/kyc/documents/${documentId}/url`)),
  });
}

export function useSchedule(loanId?: string) {
  return useQuery({
    queryKey: ['repayments', 'schedule', loanId],
    enabled: Boolean(loanId),
    queryFn: () =>
      withFallback(
        () => requireApi(apiClient.get<RepaymentScheduleItem[]>(`/repayments/schedule/${loanId}`)),
        [],
      ),
  });
}

export function useMyPayments() {
  return useQuery({
    queryKey: ['payments', 'my'],
    queryFn: () => withFallback(() => requireApi(apiClient.get<PaymentRecord[]>('/payments/my')), []),
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      loanApplicationId?: string;
      method: string;
      type: string;
      direction: string;
      amount: number;
    }) => requireApi(apiClient.post<PaymentRecord>('/payments', body)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}

export function useMyNotifications() {
  return useQuery({
    queryKey: ['notifications', 'my'],
    queryFn: async () => {
      const payload = await withFallback(
        () => requireApi(apiClient.get<PaginatedNotifications | NotificationRecord[]>('/notifications/my')),
        { data: [], total: 0, page: 1, limit: 20, totalPages: 0 } satisfies PaginatedNotifications,
      );
      if (Array.isArray(payload)) {
        return payload;
      }
      return payload.data;
    },
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => requireApi(apiClient.patch(`/notifications/${id}/read`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMyReferral() {
  return useQuery({
    queryKey: ['referrals', 'me'],
    queryFn: () =>
      withFallback(
        () => requireApi(apiClient.get<ReferralMe>('/referrals/me')),
        {
          code: null,
          codeCreatedAt: null,
          referredBy: null,
          referredCount: 0,
          referred: [],
        } satisfies ReferralMe,
      ),
  });
}

export function useValidateReferral() {
  return useMutation({
    mutationFn: (code: string) =>
      requireApi(apiClient.post<{ valid: boolean; reason?: string }>('/referrals/validate', { code })),
  });
}

export function useCustomerProfile() {
  return useQuery({
    queryKey: ['customers', 'me'],
    queryFn: () => requireApi(apiClient.get<CustomerProfile>('/customers/me')),
  });
}

export function useUpdateCustomerProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, string | undefined>) =>
      requireApi(apiClient.patch<CustomerProfile>('/customers/me', body)),
    onSuccess: (data) => {
      queryClient.setQueryData(['customers', 'me'], data);
      void queryClient.invalidateQueries({ queryKey: ['kyc'] });
    },
  });
}
