'use client';

import { useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';

export interface AuthData {
  wallet: string;
  signature: string;
  message: string;
}

export function useSignMessage() {
  const { publicKey, signMessage } = useWallet();

  const signAuthMessage = useCallback(async (): Promise<AuthData | null> => {
    if (!publicKey || !signMessage) {
      return null;
    }

    const timestamp = Date.now();
    const message = `Sign in to Adrena Royale: ${timestamp}`;
    const messageBytes = new TextEncoder().encode(message);

    try {
      const signatureBytes = await signMessage(messageBytes);
      const signature = bs58.encode(signatureBytes);

      return {
        wallet: publicKey.toBase58(),
        signature,
        message,
      };
    } catch (error) {
      console.error('Failed to sign message:', error);
      return null;
    }
  }, [publicKey, signMessage]);

  return { signAuthMessage };
}
