import useSWR from 'swr';
import { api } from '@/lib/api';

export function useProfile(wallet: string) {
  const { data, error, isLoading, mutate } = useSWR(
    ['profile', wallet],
    () => api.getProfile(wallet)
  );

  return {
    profile: data,
    isLoading,
    error,
    refresh: mutate,
  };
}
