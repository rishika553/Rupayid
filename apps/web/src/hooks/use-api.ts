import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useApiQuery<T>(
  key: string[],
  endpoint: string,
  params?: Record<string, string>,
) {
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const response = await apiClient.get<T>(endpoint, params);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch data');
      }
      return response.data as T;
    },
  });
}

export function useApiMutation<TData, TVariables>(
  endpoint: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'POST',
  invalidateKeys?: string[],
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: TVariables) => {
      let response;
      switch (method) {
        case 'POST':
          response = await apiClient.post<TData>(endpoint, variables);
          break;
        case 'PUT':
          response = await apiClient.put<TData>(endpoint, variables);
          break;
        case 'PATCH':
          response = await apiClient.patch<TData>(endpoint, variables);
          break;
        case 'DELETE':
          response = await apiClient.delete<TData>(endpoint);
          break;
      }
      if (!response!.success) {
        throw new Error(response!.error || 'Operation failed');
      }
      return response!.data as TData;
    },
    onSuccess: () => {
      if (invalidateKeys) {
        invalidateKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: [key] });
        });
      }
    },
  });
}
