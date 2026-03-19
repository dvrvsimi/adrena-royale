import { prisma } from '../db/client';
import { BADGES, BadgeDefinition } from '@adrena-royale/shared';

// ─────────────────────────────────────────────────────────────────────
// BADGE AWARDING
// ─────────────────────────────────────────────────────────────────────

export interface TournamentResult {
  tournamentId: string;
  wallet: string;
  finalRank: number | null;
  participationCount: number;
  usedShield: boolean;
  hadComebackMoment: boolean;
}

export async function checkAndAwardBadges(result: TournamentResult): Promise<string[]> {
  const awarded: string[] = [];

  // Get existing badges for this wallet
  const existingBadges = await prisma.badge.findMany({
    where: { wallet: result.wallet },
    select: { badgeType: true }
  });
  const existingTypes = new Set(existingBadges.map(b => b.badgeType));

  // Get user stats
  const stats = await getUserStats(result.wallet);

  for (const badge of BADGES) {
    // Skip if already has this badge
    if (existingTypes.has(badge.id)) continue;

    // Check criteria
    if (meetsCriteria(badge, result, stats)) {
      await prisma.badge.create({
        data: {
          badgeType: badge.id,
          wallet: result.wallet,
          tournamentId: result.tournamentId
        }
      });
      awarded.push(badge.id);
      console.log(`Awarded badge ${badge.id} to ${result.wallet}`);
    }
  }

  return awarded;
}

interface UserStats {
  totalParticipations: number;
  totalWins: number;
  currentStreak: number;
  longestStreak: number;
}

async function getUserStats(wallet: string): Promise<UserStats> {
  const participations = await prisma.participant.count({
    where: { wallet }
  });

  const wins = await prisma.participant.count({
    where: { wallet, finalRank: 1 }
  });

  const streak = await prisma.userStreak.findUnique({
    where: { wallet }
  });

  return {
    totalParticipations: participations,
    totalWins: wins,
    currentStreak: streak?.currentDailyStreak || 0,
    longestStreak: streak?.longestDailyStreak || 0
  };
}

function meetsCriteria(
  badge: BadgeDefinition,
  result: TournamentResult,
  stats: UserStats
): boolean {
  const { criteria } = badge;

  switch (criteria.type) {
    case 'placement':
      return result.finalRank !== null && result.finalRank <= criteria.value;

    case 'participation_count':
      return stats.totalParticipations >= criteria.value;

    case 'wins':
      return stats.totalWins >= criteria.value;

    case 'streak':
      return stats.longestStreak >= criteria.value;

    case 'clutch':
      if (criteria.description.includes('shield')) {
        return result.usedShield;
      }
      if (criteria.description.includes('comeback')) {
        return result.hadComebackMoment;
      }
      return false;

    default:
      return false;
  }
}

// ─────────────────────────────────────────────────────────────────────
// BADGE QUERIES
// ─────────────────────────────────────────────────────────────────────

export async function getWalletBadges(wallet: string) {
  const badges = await prisma.badge.findMany({
    where: { wallet },
    orderBy: { awardedAt: 'desc' }
  });

  return badges.map(b => {
    const definition = BADGES.find(def => def.id === b.badgeType);
    return {
      ...b,
      definition
    };
  });
}
