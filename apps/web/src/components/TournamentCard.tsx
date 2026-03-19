'use client';

import type { TournamentListItem } from '@adrena-royale/shared';
import { CountdownTimer } from './CountdownTimer';

interface TournamentCardProps {
  tournament: TournamentListItem;
}

const statusConfig: Record<string, { bg: string; text: string; pulse?: boolean }> = {
  SCHEDULED: { bg: 'bg-gray-600', text: 'text-gray-100' },
  ENTRY_OPEN: { bg: 'bg-green-600', text: 'text-green-100', pulse: true },
  ACTIVE: { bg: 'bg-primary-600', text: 'text-primary-100', pulse: true },
  PAUSED: { bg: 'bg-yellow-600', text: 'text-yellow-100' },
  COMPLETED: { bg: 'bg-gray-500', text: 'text-gray-100' },
  CANCELLED: { bg: 'bg-red-600', text: 'text-red-100' },
};

const entryTypeLabels: Record<string, string> = {
  FREE: 'Free Entry',
  WHITELIST: 'Whitelist Only',
  SOL_STAKE: 'SOL Stake',
  MUTAGEN_COMMIT: 'Mutagen',
};

export function TournamentCard({ tournament }: TournamentCardProps) {
  const config = statusConfig[tournament.status] || statusConfig.SCHEDULED;
  const fillPercent = Math.min(100, (tournament.participantCount / tournament.maxParticipants) * 100);
  const spotsLeft = tournament.maxParticipants - tournament.participantCount;
  const isAlmostFull = spotsLeft <= 10 && spotsLeft > 0;

  const formatEntryFee = () => {
    if (tournament.entryType === 'FREE') return 'Free';
    if (tournament.entryType === 'WHITELIST') return 'Whitelist';
    if (tournament.entryType === 'SOL_STAKE') return `${tournament.entryFeeSol} SOL`;
    if (tournament.entryType === 'MUTAGEN_COMMIT') return `${tournament.entryFeeMutagen} Mutagen`;
    return 'N/A';
  };

  const cardGlow = tournament.status === 'ACTIVE' ? 'glow' :
                   tournament.status === 'ENTRY_OPEN' ? 'glow-green' : '';

  return (
    <div className={`bg-gray-900/80 border border-gray-800 rounded-xl overflow-hidden card-hover cursor-pointer group ${cardGlow}`}>
      {/* Header with status */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="font-semibold text-lg group-hover:text-primary-400 transition-colors line-clamp-1">
            {tournament.name}
          </h3>
          <span
            className={`${config.bg} ${config.text} text-xs px-2.5 py-1 rounded-full uppercase font-medium shrink-0 flex items-center gap-1.5`}
          >
            {config.pulse && (
              <span className="w-1.5 h-1.5 bg-current rounded-full animate-pulse" />
            )}
            {tournament.status.replace('_', ' ')}
          </span>
        </div>

        {tournament.description && (
          <p className="text-gray-400 text-sm line-clamp-2 mb-3">
            {tournament.description}
          </p>
        )}

        {/* Entry type badge */}
        <div className="flex items-center gap-2 text-xs">
          <span className="bg-gray-800 text-gray-300 px-2 py-1 rounded">
            {entryTypeLabels[tournament.entryType] || tournament.entryType}
          </span>
          {tournament.entryType !== 'FREE' && tournament.entryType !== 'WHITELIST' && (
            <span className="text-primary-400 font-medium">
              {formatEntryFee()}
            </span>
          )}
        </div>
      </div>

      {/* Participant progress bar */}
      <div className="px-5 py-3 border-t border-gray-800/50">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-gray-500">Participants</span>
          <span className={`text-xs font-medium ${isAlmostFull ? 'text-orange-400' : 'text-gray-300'}`}>
            {tournament.participantCount}/{tournament.maxParticipants}
            {isAlmostFull && <span className="ml-1">({spotsLeft} left!)</span>}
          </span>
        </div>
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              fillPercent >= 90 ? 'bg-orange-500' :
              fillPercent >= 50 ? 'bg-primary-500' :
              'bg-green-500'
            }`}
            style={{ width: `${fillPercent}%` }}
          />
        </div>
      </div>

      {/* Time info and countdown */}
      <div className="px-5 py-3 bg-gray-800/30 space-y-2">
        {/* Show countdown based on status */}
        {tournament.status === 'ENTRY_OPEN' && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Entry closes in</span>
            <CountdownTimer
              targetDate={tournament.entryDeadline}
              compact
            />
          </div>
        )}

        {(tournament.status === 'SCHEDULED' || tournament.status === 'ENTRY_OPEN') && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Starts in</span>
            <CountdownTimer
              targetDate={tournament.scheduledStart}
              compact
            />
          </div>
        )}

        {tournament.status === 'ACTIVE' && tournament.currentRound > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Current Round</span>
            <span className="text-sm font-medium text-primary-400">
              Round {tournament.currentRound}
            </span>
          </div>
        )}

        {tournament.status === 'COMPLETED' && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Ended</span>
            <span className="text-sm text-gray-400">
              {new Date(tournament.scheduledStart).toLocaleDateString()}
            </span>
          </div>
        )}

        {tournament.status === 'SCHEDULED' && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Entry opens</span>
            <span className="text-sm text-gray-400">
              {new Date(tournament.entryDeadline).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
