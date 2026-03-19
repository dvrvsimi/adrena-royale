'use client';

import { useState, useMemo } from 'react';
import { useStandings } from '@/hooks/useStandings';
import Link from 'next/link';
import type { StandingsEntry } from '@adrena-royale/shared';

interface StandingsTableProps {
  tournamentId: string;
}

type SortField = 'rank' | 'finalScore' | 'tradesCount' | 'totalPnl' | 'totalVolume';
type SortDirection = 'asc' | 'desc';

const rankIcons: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
};

function formatNumber(num: number, decimals = 2): string {
  if (Math.abs(num) >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (Math.abs(num) >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toFixed(decimals);
}

export function StandingsTable({ tournamentId }: StandingsTableProps) {
  const {
    standings,
    roundNumber,
    isLoading,
    error,
    wsConnected,
    recentEliminations,
    recentShieldSaves,
    tournamentWinner
  } = useStandings(tournamentId);
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'eliminated'>('all');

  const sortedStandings = useMemo(() => {
    if (!standings) return [];

    let filtered = [...standings];

    // Apply filter
    if (filterActive === 'active') {
      filtered = filtered.filter((e) => !e.isEliminated);
    } else if (filterActive === 'eliminated') {
      filtered = filtered.filter((e) => e.isEliminated);
    }

    // Apply sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'rank':
          comparison = a.rank - b.rank;
          break;
        case 'finalScore':
          comparison = a.finalScore - b.finalScore;
          break;
        case 'tradesCount':
          comparison = a.tradesCount - b.tradesCount;
          break;
        case 'totalPnl':
          comparison = a.totalPnl - b.totalPnl;
          break;
        case 'totalVolume':
          comparison = a.totalVolume - b.totalVolume;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [standings, sortField, sortDirection, filterActive]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'rank' ? 'asc' : 'desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="opacity-30 ml-1">↕</span>;
    return <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  if (isLoading) {
    return (
      <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800">
          <div className="h-5 w-32 bg-gray-800 rounded animate-pulse" />
        </div>
        <div className="p-4 space-y-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-10 w-12 bg-gray-800 rounded animate-pulse" />
              <div className="h-10 flex-1 bg-gray-800 rounded animate-pulse" />
              <div className="h-10 w-20 bg-gray-800 rounded animate-pulse" />
              <div className="h-10 w-16 bg-gray-800 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-800 rounded-xl p-8 text-center">
        <div className="text-red-400 font-medium mb-2">Failed to load standings</div>
        <p className="text-gray-500 text-sm">Please try refreshing the page</p>
      </div>
    );
  }

  if (!standings || standings.length === 0) {
    return (
      <div className="bg-gray-900/30 rounded-xl border border-gray-800 p-12 text-center">
        <div className="text-4xl mb-4">📊</div>
        <div className="text-gray-400 font-medium mb-2">No standings available yet</div>
        <p className="text-gray-500 text-sm">Standings will appear after the first round completes</p>
      </div>
    );
  }

  const activeCount = standings.filter((e) => !e.isEliminated).length;
  const eliminatedCount = standings.filter((e) => e.isEliminated).length;

  return (
    <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
      {/* Tournament Winner Banner */}
      {tournamentWinner && (
        <div className="px-4 py-3 bg-gradient-to-r from-yellow-900/50 to-orange-900/50 border-b border-yellow-700/50">
          <div className="flex items-center justify-center gap-2 text-yellow-400">
            <span className="text-2xl">🏆</span>
            <span className="font-bold">Tournament Complete!</span>
            <span className="font-mono text-sm">
              Winner: {tournamentWinner.slice(0, 4)}...{tournamentWinner.slice(-4)}
            </span>
          </div>
        </div>
      )}

      {/* Live Events Banner */}
      {(recentEliminations.length > 0 || recentShieldSaves.length > 0) && (
        <div className="px-4 py-2 bg-gradient-to-r from-red-900/30 to-purple-900/30 border-b border-gray-800 animate-pulse">
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
            {recentEliminations.length > 0 && (
              <span className="text-red-400">
                💀 {recentEliminations.length} eliminated
              </span>
            )}
            {recentShieldSaves.length > 0 && (
              <span className="text-yellow-400">
                🛡️ {recentShieldSaves.length} saved by shield
              </span>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">Round {roundNumber}</span>
          <div className="flex gap-2 text-xs">
            <span className="text-green-400">{activeCount} active</span>
            <span className="text-gray-500">•</span>
            <span className="text-red-400">{eliminatedCount} eliminated</span>
          </div>
          {/* WebSocket status indicator */}
          <div className="flex items-center gap-1 text-xs">
            <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
            <span className={wsConnected ? 'text-green-400' : 'text-gray-500'}>
              {wsConnected ? 'Live' : 'Polling'}
            </span>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex gap-1 bg-gray-800/50 p-1 rounded-lg">
          {(['all', 'active', 'eliminated'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setFilterActive(filter)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                filterActive === filter
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-800/50 sticky top-0">
            <tr className="text-left text-xs text-gray-400 uppercase tracking-wider">
              <th
                className="px-4 py-3 w-16 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('rank')}
              >
                Rank <SortIcon field="rank" />
              </th>
              <th className="px-4 py-3">Trader</th>
              <th
                className="px-4 py-3 text-right cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('finalScore')}
              >
                Score <SortIcon field="finalScore" />
              </th>
              <th
                className="px-4 py-3 text-right cursor-pointer hover:text-white transition-colors hidden sm:table-cell"
                onClick={() => handleSort('tradesCount')}
              >
                Trades <SortIcon field="tradesCount" />
              </th>
              <th
                className="px-4 py-3 text-right cursor-pointer hover:text-white transition-colors hidden md:table-cell"
                onClick={() => handleSort('totalVolume')}
              >
                Volume <SortIcon field="totalVolume" />
              </th>
              <th
                className="px-4 py-3 text-right cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('totalPnl')}
              >
                P&L <SortIcon field="totalPnl" />
              </th>
              <th className="px-4 py-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {sortedStandings.map((entry) => (
              <tr
                key={entry.wallet}
                className={`hover:bg-gray-800/30 transition-colors ${
                  entry.isEliminated ? 'opacity-50' : ''
                }`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {rankIcons[entry.rank] ? (
                      <span className="text-lg">{rankIcons[entry.rank]}</span>
                    ) : (
                      <span
                        className={`font-bold w-7 text-center ${
                          entry.rank <= 10 ? 'text-primary-400' : 'text-gray-500'
                        }`}
                      >
                        {entry.rank}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/profile/${entry.wallet}`}
                    className="font-mono text-sm hover:text-primary-400 transition-colors flex items-center gap-2"
                  >
                    <span className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-xs font-bold">
                      {entry.wallet.slice(0, 2)}
                    </span>
                    <span className="hidden sm:inline">
                      {entry.wallet.slice(0, 4)}...{entry.wallet.slice(-4)}
                    </span>
                    <span className="sm:hidden">
                      {entry.wallet.slice(0, 3)}..{entry.wallet.slice(-2)}
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-mono text-sm font-medium">
                    {entry.finalScore.toFixed(4)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right hidden sm:table-cell">
                  <span className="text-gray-300">{entry.tradesCount}</span>
                </td>
                <td className="px-4 py-3 text-right hidden md:table-cell">
                  <span className="text-gray-300 font-mono text-sm">
                    ${formatNumber(entry.totalVolume)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={`font-mono text-sm font-medium ${
                      entry.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {entry.totalPnl >= 0 ? '+' : ''}${formatNumber(entry.totalPnl)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {entry.isEliminated ? (
                    <span className="inline-flex items-center gap-1 text-red-400 text-xs bg-red-900/30 px-2 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                      Out
                    </span>
                  ) : entry.usedShield ? (
                    <span className="inline-flex items-center gap-1 text-yellow-400 text-xs bg-yellow-900/30 px-2 py-1 rounded-full">
                      🛡️ Saved
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-green-400 text-xs bg-green-900/30 px-2 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                      Live
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer with count */}
      <div className="px-4 py-3 border-t border-gray-800/50 text-center text-xs text-gray-500">
        Showing {sortedStandings.length} of {standings.length} participants
      </div>
    </div>
  );
}
