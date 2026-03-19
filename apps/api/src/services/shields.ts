import { prisma } from '../db/client';
import { calculateStreaks } from './streaks';
import { SHIELD_THRESHOLDS } from '@adrena-royale/shared';

// ─────────────────────────────────────────────────────────────────────
// SHIELD ASSIGNMENT
// ─────────────────────────────────────────────────────────────────────

/**
 * Shields are assigned at TOURNAMENT START based on current streak:
 * - 7-day streak = 1 Shield
 * - 30-day streak = 2 Shields (cumulative)
 *
 * Shields are NOT refreshed during the tournament.
 */
export async function assignShieldsAtTournamentStart(tournamentId: string): Promise<{
  total: number;
  assignments: { wallet: string; shields: number }[];
}> {
  const participants = await prisma.participant.findMany({
    where: { tournamentId }
  });

  const assignments: { wallet: string; shields: number }[] = [];
  let total = 0;

  for (const participant of participants) {
    try {
      // Get current streak (calculated from SDK position history)
      const streaks = await calculateStreaks(participant.wallet);

      let shields = 0;
      if (streaks.currentDailyStreak >= SHIELD_THRESHOLDS.STREAK_7_DAYS) {
        shields += 1;
      }
      if (streaks.currentDailyStreak >= SHIELD_THRESHOLDS.STREAK_30_DAYS) {
        shields += 1;
      }

      if (shields > 0) {
        await prisma.participant.update({
          where: { id: participant.id },
          data: { shields }
        });

        assignments.push({ wallet: participant.wallet, shields });
        total += shields;

        console.log(`Assigned ${shields} shields to ${participant.wallet} (streak: ${streaks.currentDailyStreak})`);
      }
    } catch (error) {
      console.error(`Failed to assign shields for ${participant.wallet}:`, error);
      // Continue - they just get 0 shields
    }
  }

  return { total, assignments };
}

/**
 * Calculate how many shields a wallet would earn (without assigning)
 */
export function calculateShieldsFromStreak(currentStreak: number): number {
  let shields = 0;
  if (currentStreak >= SHIELD_THRESHOLDS.STREAK_7_DAYS) shields += 1;
  if (currentStreak >= SHIELD_THRESHOLDS.STREAK_30_DAYS) shields += 1;
  return shields;
}
