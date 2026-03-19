'use client';

import { useProfile } from '@/hooks/useProfile';
import { BadgeGrid } from '@/components/BadgeGrid';

export default function ProfilePage({
  params,
}: {
  params: { wallet: string };
}) {
  const { profile, isLoading, error } = useProfile(params.wallet);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-red-400">Profile not found</h2>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-2xl font-bold">
            {params.wallet.slice(0, 2)}
          </div>
          <div>
            <h1 className="text-2xl font-bold font-mono">
              {params.wallet.slice(0, 4)}...{params.wallet.slice(-4)}
            </h1>
            {profile.streak && (
              <p className="text-gray-400">
                🔥 {profile.streak.current} day streak
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Tournaments"
          value={profile.tournaments.total}
        />
        <StatCard
          label="Wins"
          value={profile.tournaments.wins}
          highlight
        />
        <StatCard
          label="Top 10"
          value={profile.tournaments.topTen}
        />
        <StatCard
          label="Longest Streak"
          value={`${profile.streak?.longest || 0} days`}
        />
      </div>

      {/* Badges */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Badges</h2>
        {profile.badges.length > 0 ? (
          <BadgeGrid badges={profile.badges} />
        ) : (
          <div className="text-center py-8 text-gray-500 bg-gray-900/30 rounded-lg border border-gray-800">
            No badges earned yet. Compete in tournaments to earn badges!
          </div>
        )}
      </section>

      {/* Trader Stats */}
      {profile.traderStats && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Trading Stats</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Total Volume"
              value={`$${formatNumber(profile.traderStats.totalVolume)}`}
            />
            <StatCard
              label="Total Trades"
              value={profile.traderStats.totalTrades}
            />
            <StatCard
              label="Win Rate"
              value={`${(profile.traderStats.winRate * 100).toFixed(1)}%`}
            />
            <StatCard
              label="Total P&L"
              value={`$${formatNumber(profile.traderStats.pnl)}`}
              highlight={profile.traderStats.pnl > 0}
            />
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
      <div className="text-sm text-gray-400">{label}</div>
      <div
        className={`text-2xl font-bold ${
          highlight ? 'text-primary-400' : ''
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
  return num.toFixed(2);
}
