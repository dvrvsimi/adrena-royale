'use client';

import { ReactNode } from 'react';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import type { Adapter } from '@solana/wallet-adapter-base';

// Default styles for wallet adapter
import '@solana/wallet-adapter-react-ui/styles.css';

interface Props {
  endpoint: string;
  wallets: Adapter[];
  children: ReactNode;
}

export default function WalletProviderComponent({
  endpoint,
  wallets,
  children,
}: Props) {
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
