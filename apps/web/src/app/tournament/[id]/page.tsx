'use client';

import { useTournament } from '@/hooks/useTournament';
import { useWallet } from '@solana/wallet-adapter-react';
import { TournamentHeader } from '@/components/TournamentHeader';
import { StandingsTable } from '@/components/StandingsTable';
import { RegistrationForm } from '@/components/RegistrationForm';
import { ParticipantStatus } from '@/components/ParticipantStatus';
import { LiquidityWidget } from '@/components/LiquidityWidget';

export default function TournamentPage({
  params,
}: {
  params: { id: string };
}) {
  const { tournament, isLoading, error } = useTournament(params.id);
  const { publicKey } = useWallet();

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
