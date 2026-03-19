'use client';

import { useMemo, ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { clusterApiUrl } from '@solana/web3.js';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';

// Dynamically import wallet adapter to avoid SSR issues
const WalletProviderComponent = dynamic(
  () => import('./WalletProviderComponent'),
  { ssr: false }
);

export function Providers({ children }: { children: ReactNode }) {
  const endpoint = useMemo(() => clusterApiUrl('mainnet-beta'), []);
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <WalletProviderComponent endpoint={endpoint} wallets={wallets}>
      {children}
    </WalletProviderComponent>
  );
}
