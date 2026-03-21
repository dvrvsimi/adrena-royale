'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTournament } from '@/hooks/useTournament';
import { useWallet } from '@solana/wallet-adapter-react';
import { useSignMessage } from '@/hooks/useSignMessage';
import { TournamentHeader } from '@/components/TournamentHeader';
import { StandingsTable } from '@/components/StandingsTable';
import { RegistrationForm } from '@/components/RegistrationForm';
import { ParticipantStatus } from '@/components/ParticipantStatus';
import { LiquidityWidget } from '@/components/LiquidityWidget';
import { api } from '@/lib/api';

export default function TournamentPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { tournament, isLoading, error, refresh } = useTournament(params.id);
  const { publicKey } = useWallet();
  const { signAuthMessage } = useSignMessage();
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminMessage, setAdminMessage] = useState<string | null>(null);

  const handleAdminAction = async (action: 'open' | 'start' | 'delete') => {
    if (!publicKey) return;

    if (action === 'delete' && !confirm('Are you sure you want to delete this tournament?')) {
      return;
    }

    setAdminLoading(true);
    setAdminMessage(null);
    try {
      const auth = await signAuthMessage();
      if (!auth) throw new Error('Failed to sign');

      if (action === 'open') {
        await api.openEntries(params.id, auth);
        setAdminMessage('Entries opened!');
      } else if (action === 'start') {
        await api.startTournament(params.id, auth);
        setAdminMessage('Tournament started!');
      } else if (action === 'delete') {
        await api.deleteTournament(params.id, auth);
        router.push('/');
        return;
      }
      refresh();
    } catch (err: any) {
      setAdminMessage(`Error: ${err.message}`);
    } finally {
      setAdminLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-red-400">
          Tournament not found
        </h2>
        <p className="text-gray-400 mt-2">
          The tournament you're looking for doesn't exist or has been removed.
        </p>
      </div>
    );
  }

  const walletAddress = publicKey?.toBase58();

  return (
    <div className="space-y-8">
      <TournamentHeader tournament={tournament} />

      {/* Admin Controls */}
      {publicKey && (tournament.status === 'SCHEDULED' || tournament.status === 'ENTRY_OPEN') && (
        <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
          <h3 className="text-yellow-400 font-semibold mb-3">Admin Controls</h3>
          <div className="flex gap-3 flex-wrap">
            {tournament.status === 'SCHEDULED' && (
              <button
                onClick={() => handleAdminAction('open')}
                disabled={adminLoading}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm"
              >
                {adminLoading ? 'Loading...' : 'Open Entries'}
              </button>
            )}
            {tournament.status === 'ENTRY_OPEN' && (
              <button
                onClick={() => handleAdminAction('start')}
                disabled={adminLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm"
              >
                {adminLoading ? 'Loading...' : 'Start Tournament'}
              </button>
            )}
            <button
              onClick={() => handleAdminAction('delete')}
              disabled={adminLoading}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm"
            >
              {adminLoading ? 'Loading...' : 'Delete Tournament'}
            </button>
          </div>
          {adminMessage && (
            <p className={`mt-2 text-sm ${adminMessage.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>
              {adminMessage}
            </p>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Standings</h2>
          <StandingsTable tournamentId={params.id} />
        </div>

        <div className="space-y-6">
          {walletAddress && (
            <ParticipantStatus
              tournamentId={params.id}
              wallet={walletAddress}
            />
          )}

          {tournament.status === 'ENTRY_OPEN' && (
            <RegistrationForm tournament={tournament} />
          )}

          {/* Pool Liquidity Info */}
          <LiquidityWidget compact />
        </div>
      </div>
    </div>
  );
}
