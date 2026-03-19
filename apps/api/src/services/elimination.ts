import { prisma } from '../db/client';

// ─────────────────────────────────────────────────────────────────────
// ELIMINATION PROCESSOR
// ─────────────────────────────────────────────────────────────────────

export async function processEliminations(
  tournamentId: string,
  roundNumber: number,
  eliminationPercent: number
): Promise<{ eliminated: string[]; shieldSaves: string[] }> {
  // Get all scores for this round, sorted by finalScore descending
  const scores = await prisma.roundScore.findMany({
    where: {
      tournamentId,
      roundNumber,
      participant: { isEliminated: false }
    },
    orderBy: { finalScore: 'desc' },
    include: { participant: true }
  });

  if (scores.length === 0) {
    return { eliminated: [], shieldSaves: [] };
  }

  // Calculate cutoff
  const eliminateCount = Math.floor(scores.length * eliminationPercent);
  const cutoffIndex = scores.length - eliminateCount;

  // Assign ranks
  for (let i = 0; i < scores.length; i++) {
    await prisma.roundScore.update({
      where: { id: scores[i].id },
      data: { rank: i + 1 }
    });
  }

  // Get bottom performers
  const bottomPerformers = scores.slice(cutoffIndex);

  const eliminated: string[] = [];
  const shieldSaves: string[] = [];

  for (const score of bottomPerformers) {
    const participant = score.participant;

    // Check for shield
    if (participant.shields > 0) {
      // Use shield to survive
      await prisma.$transaction([
        prisma.participant.update({
          where: { id: participant.id },
          data: { shields: participant.shields - 1 }
        }),
        prisma.roundScore.update({
          where: { id: score.id },
          data: { usedShield: true }
        })
      ]);
      shieldSaves.push(participant.wallet);
      console.log(`Shield saved ${participant.wallet}`);
    } else {
      // Eliminate
      await prisma.$transaction([
        prisma.participant.update({
          where: { id: participant.id },
          data: {
            isEliminated: true,
            eliminatedAt: roundNumber,
            eliminationReason: score.tradesCount === 0 ? 'INACTIVE' : 'SCORE'
          }
        }),
        prisma.roundScore.update({
          where: { id: score.id },
          data: { isEliminated: true }
        })
      ]);
      eliminated.push(participant.wallet);
    }
  }

  // Update round stats
  await prisma.round.update({
    where: {
      tournamentId_roundNumber: { tournamentId, roundNumber }
    },
    data: {
      eliminationTarget: eliminateCount,
      actualEliminations: eliminated.length
    }
  });

  console.log(`Round ${roundNumber}: ${eliminated.length} eliminated, ${shieldSaves.length} shield saves`);

  return { eliminated, shieldSaves };
}

// ─────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────

export async function getActiveParticipantCount(tournamentId: string): Promise<number> {
  return prisma.participant.count({
    where: { tournamentId, isEliminated: false }
  });
}

export async function getRoundStandings(
  tournamentId: string,
  roundNumber: number
): Promise<{
  wallet: string;
  rank: number;
  finalScore: number;
  isEliminated: boolean;
  usedShield: boolean;
}[]> {
  const scores = await prisma.roundScore.findMany({
    where: { tournamentId, roundNumber },
    orderBy: { rank: 'asc' },
    select: {
      wallet: true,
      rank: true,
      finalScore: true,
      isEliminated: true,
      usedShield: true
    }
  });

  return scores.map(s => ({
    wallet: s.wallet,
    rank: s.rank || 0,
    finalScore: s.finalScore,
    isEliminated: s.isEliminated,
    usedShield: s.usedShield
  }));
}
