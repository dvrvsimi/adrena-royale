'use client';

import { CountdownTimer } from './CountdownTimer';

interface Tournament {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  entryType: string;
  entryFeeSol?: number | null;
  entryFeeMutagen?: number | null;
  currentRound: number;
  participantCount: number;
  maxParticipants: number;
  scheduledStart: string;
  entryDeadline: string;
  roundConfigs?: { duration: number; eliminationPercent: number }[];
}

interface TournamentHeaderProps {
  tournament: Tournament;
}

const statusConfig: Record<string, { label: string; color: string; bg: string; pulse?: boolean }> = {
  SCHEDULED: { label: 'Scheduled', color: 'text-gray-300', bg: 'bg-gray-600' },
  ENTRY_OPEN: { label: 'Registration Open', color: 'text-green-300', bg: 'bg-green-600', pulse: true },
  ACTIVE: { label: 'In Progress', color: 'text-primary-300', bg: 'bg-primary-600', pulse: true },
  PAUSED: { label: 'Paused', color: 'text-yellow-300', bg: 'bg-yellow-600' },
  COMPLETED: { label: 'Completed', color: 'text-gray-300', bg: 'bg-gray-500' },
  CANCELLED: { label: 'Cancelled', color: 'text-red-300', bg: 'bg-red-600' },
};

export function TournamentHeader({ tournament }: TournamentHeaderProps) {
  const config = statusConfig[tournament.status] || statusConfig.SCHEDULED;
  const fillPercent = Math.min(100, (tournament.participantCount / tournament.maxParticipants) * 100);

  const formatEntryFee = () => {
    if (tournament.entryType === 'FREE') return 'Free Entry';
    if (tournament.entryType === 'WHITELIST') return 'Whitelist Only';
    if (tournament.entryType === 'SOL_STAKE') return `${tournament.entryFeeSol} SOL`;
    if (tournament.entryType === 'MUTAGEN_COMMIT') return `${tournament.entryFeeMutagen} Mutagen`;
    return 'N/A';
  };

  return (
    <div className="bg-gradient-to-br from-gray-900/80 to-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
      {/* Main header content */}
      <div className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          {/* Left side: Title and description */}
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <h1 className="text-2xl sm:text-3xl font-bold">{tournament.name}</h1>
              <span
                className={`${config.bg} ${config.color} text-xs px-3 py-1 rounded-full uppercase font-medium flex items-center gap-1.5`}
              >
                {config.pulse && (
                  <span className="w-1.5 h-1.5 bg-current rounded-full animate-pulse" />
                )}
                {config.label}
              </span>
            </div>
            {tournament.description && (
              <p className="text-gray-400 max-w-2xl">{tournament.description}</p>
            )}

            {/* Round schedule preview */}
            {tournament.roundConfigs && tournament.roundConfigs.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-gray-500">Schedule:</span>
                {tournament.roundConfigs.map((round, i) => (
                  <span
                    key={i}
                    className={`px-2 py-1 rounded ${
                      i + 1 === tournament.currentRound
                        ? 'bg-primary-600 text-primary-100'
                        : i + 1 < tournament.currentRound
                        ? 'bg-gray-700 text-gray-400 line-through'
                        : 'bg-gray-800 text-gray-400'
                    }`}
                  >
                    R{i + 1}: {round.duration}min / {Math.round(round.eliminationPercent * 100)}%
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Right side: Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {/* Participants */}
            <div className="bg-gray-800/50 rounded-lg p-3 min-w-[100px]">
              <div className="text-xs text-gray-500 mb-1">Participants</div>
              <div className="text-xl font-bold">
                {tournament.participantCount}
                <span className="text-gray-500 text-sm font-normal">
                  /{tournament.maxParticipants}
                </span>
              </div>
              <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    fillPercent >= 90 ? 'bg-orange-500' :
                    fillPercent >= 50 ? 'bg-primary-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${fillPercent}%` }}
                />
              </div>
            </div>

            {/* Current Round */}
            {tournament.status === 'ACTIVE' && (
              <div className="bg-gray-800/50 rounded-lg p-3 min-w-[100px]">
                <div className="text-xs text-gray-500 mb-1">Current Round</div>
                <div className="text-xl font-bold text-primary-400">
                  {tournament.currentRound}
                  <span className="text-gray-500 text-sm font-normal">
                    /{tournament.roundConfigs?.length || '?'}
                  </span>
                </div>
              </div>
            )}

            {/* Entry fee */}
            <div className="bg-gray-800/50 rounded-lg p-3 min-w-[100px]">
              <div className="text-xs text-gray-500 mb-1">Entry Fee</div>
              <div className="text-xl font-bold">{formatEntryFee()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Time/countdown banner */}
      <div className="px-6 py-4 bg-gray-800/30 border-t border-gray-800/50 flex flex-wrap gap-6 items-center">
        {tournament.status === 'ENTRY_OPEN' && (
          <>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 uppercase">Entries Close</span>
              <CountdownTimer targetDate={tournament.entryDeadline} compact />
            </div>
            <div className="w-px h-6 bg-gray-700 hidden sm:block" />
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 uppercase">Tournament Starts</span>
              <CountdownTimer targetDate={tournament.scheduledStart} compact />
            </div>
          </>
        )}

        {tournament.status === 'SCHEDULED' && (
          <>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 uppercase">Starts In</span>
              <CountdownTimer targetDate={tournament.scheduledStart} compact />
            </div>
            <div className="w-px h-6 bg-gray-700 hidden sm:block" />
            <div className="text-sm text-gray-400">
              <span className="text-gray-500">Entry opens:</span>{' '}
              {new Date(tournament.entryDeadline).toLocaleString()}
            </div>
          </>
        )}

        {tournament.status === 'ACTIVE' && (
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
            <span className="text-sm text-primary-400 font-medium">
              Round {tournament.currentRound} in progress
            </span>
          </div>
        )}

        {tournament.status === 'COMPLETED' && (
          <div className="text-sm text-gray-400">
            <span className="text-gray-500">Completed:</span>{' '}
            {new Date(tournament.scheduledStart).toLocaleDateString()}
          </div>
        )}

        {tournament.status === 'PAUSED' && (
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 bg-yellow-500 rounded-full" />
            <span className="text-sm text-yellow-400 font-medium">
              Tournament paused at Round {tournament.currentRound}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
