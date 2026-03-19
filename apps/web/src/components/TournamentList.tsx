'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { api } from '@/lib/api';
import { TournamentCard } from './TournamentCard';
import type { TournamentListItem, TournamentStatus, EntryType } from '@adrena-royale/shared';

interface TournamentListProps {
  initialStatus?: string;
  limit?: number;
  showFilters?: boolean;
}

const statusOptions: { value: TournamentStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Tournaments' },
  { value: 'ENTRY_OPEN', label: 'Registration Open' },
  { value: 'ACTIVE', label: 'In Progress' },
  { value: 'SCHEDULED', label: 'Upcoming' },
  { value: 'COMPLETED', label: 'Completed' },
];

const entryTypeLabels: Record<EntryType, string> = {
  FREE: 'Free',
  WHITELIST: 'Whitelist',
  SOL_STAKE: 'SOL',
  MUTAGEN_COMMIT: 'Mutagen',
};

const sortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'participants', label: 'Most Participants' },
  { value: 'filling', label: 'Filling Up Fast' },
];

export function TournamentList({ initialStatus, limit, showFilters = true }: TournamentListProps) {
  const [statusFilter, setStatusFilter] = useState<TournamentStatus | 'ALL'>(
    (initialStatus as TournamentStatus) || 'ALL'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [entryTypeFilter, setEntryTypeFilter] = useState<EntryType | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<string>('newest');

  const { data, error, isLoading } = useSWR(
    ['tournaments', limit],
    () => api.getTournaments({ limit })
  );

  const filteredTournaments = useMemo(() => {
    let tournaments = data?.tournaments || [];

    // Apply status filter
    if (statusFilter !== 'ALL') {
      tournaments = tournaments.filter((t: TournamentListItem) => t.status === statusFilter);
    }

    // Apply entry type filter
    if (entryTypeFilter !== 'ALL') {
      tournaments = tournaments.filter((t: TournamentListItem) => t.entryType === entryTypeFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      tournaments = tournaments.filter(
        (t: TournamentListItem) =>
          t.name.toLowerCase().includes(query) ||
          (t.description && t.description.toLowerCase().includes(query))
      );
    }

    // Apply sorting
    tournaments = [...tournaments].sort((a: TournamentListItem, b: TournamentListItem) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime();
        case 'participants':
          return b.participantCount - a.participantCount;
        case 'filling':
          const aPercent = a.participantCount / a.maxParticipants;
          const bPercent = b.participantCount / b.maxParticipants;
          return bPercent - aPercent;
        case 'newest':
        default:
          return new Date(b.scheduledStart).getTime() - new Date(a.scheduledStart).getTime();
      }
    });

    return tournaments;
  }, [data, statusFilter, entryTypeFilter, searchQuery, sortBy]);

  const statusCounts = useMemo(() => {
    const tournaments = data?.tournaments || [];
    return {
      ALL: tournaments.length,
      ENTRY_OPEN: tournaments.filter((t: TournamentListItem) => t.status === 'ENTRY_OPEN').length,
      ACTIVE: tournaments.filter((t: TournamentListItem) => t.status === 'ACTIVE').length,
      SCHEDULED: tournaments.filter((t: TournamentListItem) => t.status === 'SCHEDULED').length,
      COMPLETED: tournaments.filter((t: TournamentListItem) => t.status === 'COMPLETED').length,
    };
  }, [data]);

  return (
    <div>
      {/* Filters */}
      {showFilters && (
        <div className="mb-6 space-y-4">
          {/* Search and sort row */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search input */}
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search tournaments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Entry type filter */}
            <select
              value={entryTypeFilter}
              onChange={(e) => setEntryTypeFilter(e.target.value as EntryType | 'ALL')}
              className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-primary-500"
            >
              <option value="ALL">All Entry Types</option>
              {(Object.entries(entryTypeLabels) as [EntryType, string][]).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            {/* Sort dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-primary-500"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status tabs */}
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((option) => {
              const count = statusCounts[option.value as keyof typeof statusCounts] || 0;
              return (
                <button
                  key={option.value}
                  onClick={() => setStatusFilter(option.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    statusFilter === option.value
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  {option.label}
                  <span
                    className={`px-1.5 py-0.5 rounded text-xs ${
                      statusFilter === option.value
                        ? 'bg-primary-500'
                        : 'bg-gray-700'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse bg-gray-800 rounded-xl h-64"
            />
          ))}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-8 text-center">
          <div className="text-4xl mb-4">😵</div>
          <div className="text-red-400 font-medium mb-2">Failed to load tournaments</div>
          <p className="text-gray-500 text-sm">Please check your connection and try again</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && filteredTournaments.length === 0 && (
        <div className="bg-gray-900/30 rounded-xl border border-gray-800 p-12 text-center">
          <div className="text-4xl mb-4">
            {searchQuery ? '🔍' : '🏆'}
          </div>
          <div className="text-gray-400 font-medium mb-2">
            {searchQuery
              ? 'No tournaments match your search'
              : 'No tournaments found'}
          </div>
          <p className="text-gray-500 text-sm">
            {searchQuery
              ? 'Try adjusting your search or filters'
              : 'Check back later for upcoming tournaments'}
          </p>
          {(searchQuery || statusFilter !== 'ALL' || entryTypeFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
                setEntryTypeFilter('ALL');
              }}
              className="mt-4 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Tournament grid */}
      {!isLoading && !error && filteredTournaments.length > 0 && (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTournaments.map((tournament: TournamentListItem) => (
              <Link key={tournament.id} href={`/tournament/${tournament.id}`}>
                <TournamentCard tournament={tournament} />
              </Link>
            ))}
          </div>

          {/* Results count */}
          <div className="mt-4 text-center text-sm text-gray-500">
            Showing {filteredTournaments.length} tournament{filteredTournaments.length !== 1 ? 's' : ''}
            {(searchQuery || statusFilter !== 'ALL' || entryTypeFilter !== 'ALL') && (
              <span> (filtered from {data?.tournaments?.length || 0} total)</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
