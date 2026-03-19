'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useSignMessage } from '@/hooks/useSignMessage';
import { api } from '@/lib/api';

interface Tournament {
  id: string;
  name: string;
  entryType: string;
  entryFeeSol?: number | null;
  entryFeeMutagen?: number | null;
  entryDeadline: string;
  status: string;
}

interface RegistrationFormProps {
  tournament: Tournament;
}

export function RegistrationForm({ tournament }: RegistrationFormProps) {
  const { publicKey, connected } = useWallet();
  const { signAuthMessage } = useSignMessage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleRegister = async () => {
    if (!publicKey) return;

    setLoading(true);
    setError(null);

    try {
      const auth = await signAuthMessage();
      if (!auth) throw new Error('Failed to sign message');

      await api.register(tournament.id, auth);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-900/20 border border-green-600 rounded-xl p-6 text-center">
        <div className="text-green-400 text-xl mb-2">✓ Registered!</div>
        <p className="text-gray-400 text-sm">
          You're in! Good luck in the tournament.
        </p>
      </div>
    );
  }

  const deadlinePassed = new Date() > new Date(tournament.entryDeadline);

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-4">Register</h3>

      {deadlinePassed ? (
        <p className="text-gray-400 text-sm">Registration has closed.</p>
      ) : !connected ? (
        <div className="space-y-4">
          <p className="text-gray-400 text-sm">
            Connect your wallet to register for this tournament.
          </p>
          <WalletMultiButton className="!w-full !justify-center !bg-primary-600 hover:!bg-primary-700 !rounded-lg" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-gray-400">
            <div className="flex justify-between py-2 border-b border-gray-800">
              <span>Entry Fee</span>
              <span className="text-white">
                {tournament.entryType === 'FREE'
                  ? 'Free'
                  : tournament.entryType === 'SOL_STAKE'
                  ? `${tournament.entryFeeSol} SOL`
                  : `${tournament.entryFeeMutagen} Mutagen`}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-800">
              <span>Deadline</span>
              <span className="text-white">
                {new Date(tournament.entryDeadline).toLocaleString()}
              </span>
            </div>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-600 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {loading ? 'Registering...' : 'Register Now'}
          </button>
        </div>
      )}
    </div>
  );
}
