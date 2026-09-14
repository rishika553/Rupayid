import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, requireApi } from '@/lib/api-client';
import type {
  CustomerLoan,
  CustomerDashboard,
  CustomerProfile,
  EligibilityResult,
  KycApplication,
  KycStatus,
  LoanApplication,
  LoanProduct,
  NotificationRecord,
  PaginatedNotifications,
  PaymentRecord,
  ReferralMe,
  CustomerRepaymentSchedule,
} from '@/lib/types';
import { putFileWithProgress } from '@/lib/kyc';

export function useCustomerDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'customer'],
    queryFn: () => requireApi(apiClient.get<CustomerDashboard>('/dashboard')),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

export function useLoanProducts() {
  return useQuery({
    queryKey: ['loan-products'],
    queryFn: () => requireApi(apiClient.get<LoanProduct[]>('/loan-products')),
  });
}

export function useLoanProduct(id: string) {
  return useQuery({
    queryKey: ['loan-products', id],
    enabled: Boolean(id),
    queryFn: () => requireApi(apiClient.get<LoanProduct>(`/loan-products/${id}`)),
  });
}

export function useMyLoans() {
  return useQuery({
    queryKey: ['loans', 'my'],
    queryFn: () => requireApi(apiClient.get<LoanApplication[]>('/loans/applications')),
  });
}

export function useLoan(id: string) {
  return useQuery({
    queryKey: ['loans', 'track', id],
    enabled: Boolean(id),
    queryFn: () => requireApi(apiClient.get<CustomerLoan>(`/loans/${id}`)),
  });
}

export function useMyTrackedLoans() {
  return useQuery({
    queryKey: ['loans', 'track', 'me'],
    queryFn: () => requireApi(apiClient.get<CustomerLoan[]>('/loans/me')),
  });
}

export function useEvaluateEligibility() {
  return useMutation({
    mutationFn: (loanProductId: string) =>
      requireApi(apiClient.post<EligibilityResult>('/eligibility/evaluate', { loanProductId })),
  });
}

export function useSaveLoanDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      loanProductId: string;
      amountRequested: number;
      tenureMonths: number;
      purpose?: string;
      employmentType?: string;
      monthlyIncome?: number;
    }) => requireApi(apiClient.post<LoanApplication>('/loans/applications', body)),
    onSuccess: (draft) => {
      void queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.setQueryData(['loans', draft.id], draft);
    },
  });
}

export function useUpdateLoanDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id: string;
      amountRequested: number;
      tenureMonths: number;
      loanProductId?: string;
      purpose?: string;
      employmentType?: string;
      monthlyIncome?: number;
    }) =>
      requireApi(apiClient.patch<LoanApplication>(`/loans/applications/${input.id}`, {
        amountRequested: input.amountRequested,
        tenureMonths: input.tenureMonths,
        loanProductId: input.loanProductId,
        purpose: input.purpose,
        employmentType: input.employmentType,
        monthlyIncome: input.monthlyIncome,
      })),
    onSuccess: (draft) => {
      void queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.setQueryData(['loans', draft.id], draft);
    },
  });
}

export function useSubmitLoanApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => requireApi(apiClient.post<LoanApplication>(`/loans/applications/${id}/submit`)),
    onSuccess: (loan) => {
      void queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.setQueryData(['loans', loan.id], loan);
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

export function useLoanRepaymentSchedule(loanId?: string) {
  return useQuery({
    queryKey: ['loans', 'repayment-schedule', loanId],
    enabled: Boolean(loanId),
    queryFn: () => requireApi(apiClient.get<CustomerRepaymentSchedule>(`/loans/${loanId}/repayment-schedule`)),
  });
}

export function useSchedule(loanId?: string) {
  return useLoanRepaymentSchedule(loanId);
}

export function useMyPayments() {
  return useQuery({
    queryKey: ['payments', 'me'],
    queryFn: async () => {
      const payload = await requireApi(apiClient.get<PaymentRecord[] | { data: PaymentRecord[] }>('/payments/me'));
      return Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
    },
  });
}

export function usePayment(id?: string) {
  return useQuery({
    queryKey: ['payments', id],
    enabled: Boolean(id),
    queryFn: () => requireApi(apiClient.get<PaymentRecord>(`/payments/${id}`)),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && ['INITIATED', 'PENDING', 'PROCESSING', 'AWAITING_CONFIRMATION'].includes(status) ? 2000 : false;
    },
  });
}

export function useCreateRepaymentPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { loanId: string; installmentNumber: number; idempotencyKey?: string }) =>
      requireApi(apiClient.post<PaymentRecord>('/payments/create', body)),
    onSuccess: (payment) => {
      void queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.setQueryData(['payments', payment.id], payment);
    },
  });
}

export function useMyNotifications() {
  return useQuery({
    queryKey: ['notifications', 'me'],
    queryFn: async (): Promise<PaginatedNotifications> => {
      const payload = await requireApi(
        apiClient.get<PaginatedNotifications | NotificationRecord[]>('/notifications'),
      );
      if (Array.isArray(payload)) {
        return {
          data: payload,
          unreadCount: 0,
          total: payload.length,
          page: 1,
          limit: payload.length,
          totalPages: 1,
        };
      }
      const rows = Array.isArray(payload?.data) ? payload.data : [];
      return {
        data: rows,
        unreadCount: Number(payload?.unreadCount) || 0,
        total: Number(payload?.total) || rows.length,
        page: Number(payload?.page) || 1,
        limit: Number(payload?.limit) || rows.length || 20,
        totalPages: Number(payload?.totalPages) || 1,
      };
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

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => requireApi(apiClient.post<{ updated: number }>('/notifications/read-all')),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMyReferral() {
  return useQuery({
    queryKey: ['referrals', 'me'],
    queryFn: () => requireApi(apiClient.get<ReferralMe>('/referrals/me')),
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
