import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { requireApi } from '@/api/client';
import { useAuth } from '@/auth/auth-context';
import { uploadDocument } from '@/lib/upload';
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
} from '@/types';

export function useCustomerDashboard() {
  const { client: apiClient } = useAuth();
  return useQuery({
    queryKey: ['dashboard', 'customer'],
    queryFn: () => requireApi(apiClient.get<CustomerDashboard>('/dashboard')),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

export function useLoanProducts() {
  const { client: apiClient } = useAuth();
  return useQuery({
    queryKey: ['loan-products'],
    queryFn: () => requireApi(apiClient.get<LoanProduct[]>('/loan-products')),
  });
}

export function useLoanProduct(id: string) {
  const { client: apiClient } = useAuth();
  return useQuery({
    queryKey: ['loan-products', id],
    enabled: Boolean(id),
    queryFn: () => requireApi(apiClient.get<LoanProduct>(`/loan-products/${id}`)),
  });
}

export function useMyLoans() {
  const { client: apiClient } = useAuth();
  return useQuery({
    queryKey: ['loans', 'my'],
    queryFn: () => requireApi(apiClient.get<LoanApplication[]>('/loans/applications')),
  });
}

export function useLoan(id: string) {
  const { client: apiClient } = useAuth();
  return useQuery({
    queryKey: ['loans', 'track', id],
    enabled: Boolean(id),
    queryFn: () => requireApi(apiClient.get<CustomerLoan>(`/loans/${id}`)),
  });
}

export function useMyTrackedLoans() {
  const { client: apiClient } = useAuth();
  return useQuery({
    queryKey: ['loans', 'track', 'me'],
    queryFn: () => requireApi(apiClient.get<CustomerLoan[]>('/loans/me')),
  });
}

export function useEvaluateEligibility() {
  const { client: apiClient } = useAuth();
  return useMutation({
    mutationFn: (
      input: string | { loanProductId: string; monthlyIncome?: number; employmentType?: string },
    ) =>
      requireApi(
        apiClient.post<EligibilityResult>(
          '/eligibility/evaluate',
          typeof input === 'string' ? { loanProductId: input } : input,
        ),
      ),
  });
}

export function useSaveLoanDraft() {
  const { client: apiClient } = useAuth();
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
  const { client: apiClient } = useAuth();
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
  const { client: apiClient } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => requireApi(apiClient.post<LoanApplication>(`/loans/applications/${id}/submit`)),
    onSuccess: (loan) => {
      void queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.setQueryData(['loans', loan.id], loan);
    },
  });
}

const KYC_PENDING_STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'PENDING', 'REQUESTED_MORE_INFO'];
const KYC_POLL_MS = 15_000;

export function useMyKyc() {
  const { client: apiClient } = useAuth();
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
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: (query) => {
      const status = query.state.data?.[0]?.status;
      return status && KYC_PENDING_STATUSES.includes(status) ? KYC_POLL_MS : false;
    },
  });
}

export function useKycStatus() {
  const { client: apiClient } = useAuth();
  return useQuery({
    queryKey: ['kyc', 'status'],
    queryFn: () => requireApi(apiClient.get<KycStatus>('/kyc/status')),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && KYC_PENDING_STATUSES.includes(status) ? KYC_POLL_MS : false;
    },
  });
}

export function useCreateKyc() {
  const { client: apiClient } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => requireApi(apiClient.post<KycApplication>('/kyc')),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['kyc'] });
    },
  });
}

export function useUpdateKyc() {
  const { client: apiClient } = useAuth();
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
  const { client: apiClient } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => requireApi(apiClient.post<KycStatus>('/kyc/submit')),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['kyc'] });
    },
  });
}

export function useAddKycDocument() {
  const { client: apiClient } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      localUri: string;
      documentType: string;
      mimeType: string;
      fileSizeBytes?: number;
      onProgress?: (percent: number) => void;
    }) => {
      return uploadDocument(
        apiClient,
        input.localUri,
        input.documentType,
        input.mimeType,
        input.fileSizeBytes,
        (p) => {
          input.onProgress?.(Math.round(p * 100));
        },
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['kyc'] });
    },
  });
}

export function useKycDocumentPreview() {
  const { client: apiClient } = useAuth();
  return useMutation({
    mutationFn: (documentId: string) =>
      requireApi(apiClient.get<{ downloadUrl: string; expiresInSeconds: number }>(`/kyc/documents/${documentId}/url`)),
  });
}

export function useLoanRepaymentSchedule(loanId?: string) {
  const { client: apiClient } = useAuth();
  return useQuery({
    queryKey: ['loans', 'repayment-schedule', loanId],
    enabled: Boolean(loanId),
    queryFn: () => requireApi(apiClient.get<CustomerRepaymentSchedule>(`/loans/${loanId}/repayment-schedule`)),
  });
}

export function useMyPayments() {
  const { client: apiClient } = useAuth();
  return useQuery({
    queryKey: ['payments', 'me'],
    queryFn: async () => {
      const payload = await requireApi(apiClient.get<PaymentRecord[] | { data: PaymentRecord[] }>('/payments/me'));
      return Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
    },
  });
}

export function usePayment(id?: string) {
  const { client: apiClient } = useAuth();
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
  const { client: apiClient } = useAuth();
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

export function useVerifyRepaymentPayment() {
  const { client: apiClient } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      paymentId,
      ...body
    }: {
      paymentId: string;
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    }) => requireApi(apiClient.post<PaymentRecord>(`/payments/${paymentId}/verify`, body)),
    onSuccess: (payment) => {
      queryClient.setQueryData(['payments', payment.id], payment);
      void queryClient.invalidateQueries({ queryKey: ['payments'] });
      void queryClient.invalidateQueries({ queryKey: ['loans'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMyNotifications() {
  const { client: apiClient } = useAuth();
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
  const { client: apiClient } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => requireApi(apiClient.patch(`/notifications/${id}/read`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const { client: apiClient } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => requireApi(apiClient.post<{ updated: number }>('/notifications/read-all')),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMyReferral() {
  const { client: apiClient } = useAuth();
  return useQuery({
    queryKey: ['referrals', 'me'],
    queryFn: () => requireApi(apiClient.get<ReferralMe>('/referrals/me')),
  });
}

export function useCustomerProfile() {
  const { client: apiClient } = useAuth();
  return useQuery({
    queryKey: ['customers', 'me'],
    queryFn: () => requireApi(apiClient.get<CustomerProfile>('/customers/me')),
  });
}

export function useUpdateCustomerProfile() {
  const { client: apiClient } = useAuth();
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

