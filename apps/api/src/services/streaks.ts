import { prisma } from '../db/client';
import { getWalletPositions } from './adrena';

// ─────────────────────────────────────────────────────────────────────
// STREAK CALCULATION
// ─────────────────────────────────────────────────────────────────────

export interface StreakResult {
  currentDailyStreak: number;
  longestDailyStreak: number;
  lastTradeDate: Date | null;
}

/**
 * Calculate streaks from position history
 * A streak is maintained by having at least one closed trade each day
 */
export async function calculateStreaks(wallet: string): Promise<StreakResult> {
  // Get all positions to analyze trade dates
  const positions = await getWalletPositions(wallet);

  // Get unique trade dates (using close_time or open_time)
  const tradeDates = new Set<string>();

  for (const pos of positions) {
    const dateMs = pos.close_time || pos.open_time;
    if (dateMs) {
      const date = new Date(dateMs).toISOString().split('T')[0];
      tradeDates.add(date);
    }
  }

  // Sort dates descending
  const sortedDates = Array.from(tradeDates).sort().reverse();

  if (sortedDates.length === 0) {
    return {
      currentDailyStreak: 0,
      longestDailyStreak: 0,
      lastTradeDate: null
    };
  }

  // Calculate current streak (consecutive days from most recent)
  let currentStreak = 0;
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Check if most recent trade is today or yesterday (streak still active)
  const mostRecentDate = sortedDates[0];
  if (mostRecentDate !== today && mostRecentDate !== yesterday) {
    currentStreak = 0;
  } else {
    currentStreak = 1;
    let expectedDate = new Date(mostRecentDate);

    for (let i = 1; i < sortedDates.length; i++) {
      expectedDate.setDate(expectedDate.getDate() - 1);
      const expectedStr = expectedDate.toISOString().split('T')[0];

      if (sortedDates[i] === expectedStr) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  // Calculate longest streak
  let longestStreak = 0;
  let tempStreak = 1;

  // Sort ascending for longest calculation
  const ascDates = Array.from(tradeDates).sort();

  for (let i = 1; i < ascDates.length; i++) {
    const prevDate = new Date(ascDates[i - 1]);
    const currDate = new Date(ascDates[i]);
    const diffDays = (currDate.getTime() - prevDate.getTime()) / 86400000;

    if (diffDays === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  return {
    currentDailyStreak: currentStreak,
    longestDailyStreak: longestStreak,
    lastTradeDate: new Date(mostRecentDate)
  };
}

/**
 * Update streak record in database
 */
export async function updateUserStreak(wallet: string): Promise<StreakResult> {
  const streaks = await calculateStreaks(wallet);

  await prisma.userStreak.upsert({
    where: { wallet },
    create: {
      wallet,
      currentDailyStreak: streaks.currentDailyStreak,
      longestDailyStreak: streaks.longestDailyStreak,
      lastTradeDate: streaks.lastTradeDate
    },
    update: {
      currentDailyStreak: streaks.currentDailyStreak,
      longestDailyStreak: Math.max(
        streaks.longestDailyStreak,
        streaks.currentDailyStreak
      ),
      lastTradeDate: streaks.lastTradeDate
    }
  });

  return streaks;
}

/**
 * Get streak from database (cached)
 */
export async function getUserStreak(wallet: string): Promise<StreakResult | null> {
  const streak = await prisma.userStreak.findUnique({
    where: { wallet }
  });

  if (!streak) return null;

  return {
    currentDailyStreak: streak.currentDailyStreak,
    longestDailyStreak: streak.longestDailyStreak,
    lastTradeDate: streak.lastTradeDate
  };
}
