import useSWR from 'swr';
import { api } from '@/lib/api';

export function useLiquidity() {
  const { data, error, isLoading, mutate } = useSWR(
    'liquidity',
    () => api.getLiquidityInfo(),
    {
      refreshInterval: 60000, // Refresh every 60 seconds (matches backend cache)
      revalidateOnFocus: false, // Avoid unnecessary refetches
    }
  );

  return {
    liquidity: data?.data,
    isLoading,
    error,
    refresh: mutate,
  };
}

export function useCustody(symbol: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    symbol ? ['custody', symbol] : null,
    () => api.getCustodyInfo(symbol!),
    {
      refreshInterval: 60000,
      revalidateOnFocus: false,
    }
  );

  return {
    custody: data?.data,
    isLoading,
    error,
    refresh: mutate,
  };
}
