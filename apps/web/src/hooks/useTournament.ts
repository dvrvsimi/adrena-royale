import useSWR from 'swr';
import { api } from '@/lib/api';

export function useTournament(id: string) {
  const { data, error, isLoading, mutate } = useSWR(
    ['tournament', id],
    () => api.getTournament(id),
    {
      refreshInterval: 30000, // Refresh every 30 seconds
    }
  );

  return {
    tournament: data,
    isLoading,
    error,
    refresh: mutate,
  };
}
