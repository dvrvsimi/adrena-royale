import { prisma } from '../db/client';
import { updateUserStreak } from '../services/streaks';

// ─────────────────────────────────────────────────────────────────────
// STREAK UPDATER JOB
// ─────────────────────────────────────────────────────────────────────

/**
 * Update streaks for all registered users
 * Should run once daily (e.g., at midnight UTC)
 */
export async function updateAllStreaks(): Promise<{
  updated: number;
  errors: number;
}> {
  // Get all unique wallets that have participated in tournaments
  const wallets = await prisma.participant.findMany({
    select: { wallet: true },
    distinct: ['wallet']
  });

  let updated = 0;
  let errors = 0;

  console.log(`Updating streaks for ${wallets.length} wallets`);

  for (const { wallet } of wallets) {
    try {
      await updateUserStreak(wallet);
      updated++;
    } catch (error) {
      console.error(`Failed to update streak for ${wallet}:`, error);
      errors++;
    }
  }

  console.log(`Streak update complete: ${updated} updated, ${errors} errors`);

  return { updated, errors };
}

/**
 * Update streak for a single wallet
 */
export async function updateSingleStreak(wallet: string): Promise<void> {
  try {
    const result = await updateUserStreak(wallet);
    console.log(`Updated streak for ${wallet}: ${result.currentDailyStreak} days`);
  } catch (error) {
    console.error(`Failed to update streak for ${wallet}:`, error);
    throw error;
  }
}
