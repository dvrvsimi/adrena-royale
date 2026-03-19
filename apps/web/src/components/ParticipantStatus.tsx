'use client';

import useSWR from 'swr';
import { api } from '@/lib/api';

interface ParticipantStatusProps {
  tournamentId: string;
  wallet: string;
}

export function ParticipantStatus({ tournamentId, wallet }: ParticipantStatusProps) {
  const { data: participant, error } = useSWR(
    ['participant', tournamentId, wallet],
    () => api.getParticipantStatus(tournamentId, wallet)
  );

  if (error || !participant) {
    return null;
  }

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-4">Your Status</h3>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Status</span>
          <span
            className={
              participant.isEliminated ? 'text-red-400' : 'text-green-400'
            }
          >
            {participant.isEliminated ? 'Eliminated' : 'Active'}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">Shields</span>
          <span>
            {participant.shields > 0 ? '🛡️'.repeat(participant.shields) : 'None'}
          </span>
        </div>

        {participant.currentRoundScore && (
          <>
            <div className="flex justify-between">
              <span className="text-gray-400">Current Rank</span>
              <span className="text-primary-400">
                #{participant.currentRoundScore.rank || '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Score</span>
              <span className="font-mono">
                {participant.currentRoundScore.finalScore.toFixed(4)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Trades</span>
              <span>{participant.currentRoundScore.tradesCount}</span>
            </div>
          </>
        )}

        {participant.finalRank && (
          <div className="flex justify-between pt-2 border-t border-gray-800">
            <span className="text-gray-400">Final Rank</span>
            <span className="text-xl font-bold text-primary-400">
              #{participant.finalRank}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
