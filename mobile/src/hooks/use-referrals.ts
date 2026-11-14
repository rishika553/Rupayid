import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/auth/auth-context';
import { requireApi } from '@/api/client';

export interface ContactReferral {
  id: string;
  referredName: string;
  referredPhone: string;
  status: 'PENDING' | 'CONTACTED' | 'CONVERTED' | 'REJECTED';
  createdAt: string;
}
export interface ReferralPage {
  data: ContactReferral[];
  total: number;
  totalPages: number;
  page: number;
}
export function useReferralHistory(page: number) {
  const { client } = useAuth();
  return useQuery({ queryKey: ['referrals', 'history', page],
    queryFn: () => requireApi(client.get<ReferralPage>('/referrals/history', { page: String(page), limit: '20' })),
  });
}
export function useReferralStatistics() {
  const { client } = useAuth();
  return useQuery({ queryKey: ['referrals', 'statistics'],
    queryFn: () => requireApi(client.get<{ total: number; pending: number; converted: number }>('/referrals/statistics')),
  });
}
export function useSubmitReferral() {
  const { client } = useAuth();
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (input: { referredName: string; referredPhone: string; consentConfirmed: boolean }) =>
      requireApi(client.post<ContactReferral>('/referrals', input)),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: ['referrals'] });
      void cache.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
