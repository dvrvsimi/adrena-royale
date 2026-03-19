import { prisma } from '../db/client';
import { calculateRoundScore } from '../services/scoring';
import { processEliminations } from '../services/elimination';
import { checkAndAwardBadges } from '../services/badges';
import { initializePrizePool, createPayoutRecords, runConsolationRaffle } from '../services/treasury';
import {
  broadcastTournamentStandings,
  broadcastRoundChange,
  broadcastEliminations,
  broadcastTournamentComplete
} from '../services/standings-ws';
import { RoundConfig } from '@adrena-royale/shared';

// ─────────────────────────────────────────────────────────────────────
// ROUND STATE MACHINE
// ─────────────────────────────────────────────────────────────────────

/**
 * Main entry point for round processing
 * Called by cron every 30 seconds
 */
export async function processActiveRounds(): Promise<void> {
  const activeTournaments = await prisma.tournament.findMany({
    where: { status: 'ACTIVE' },
    include: {
      rounds: {
        where: { phase: { not: 'COMPLETE' } },
        orderBy: { roundNumber: 'desc' },
        take: 1
      },
      participants: {
        where: { isEliminated: false }
      }
    }
  });

  for (const tournament of activeTournaments) {
    try {
      await processTournamentRound(tournament);
    } catch (error) {
      console.error(`Error processing tournament ${tournament.id}:`, error);
    }
  }
}

async function processTournamentRound(tournament: any): Promise<void> {
  const currentRound = tournament.rounds[0];
  if (!currentRound) return;

  const now = Date.now();
  const roundEndTime = currentRound.startTime
    ? new Date(currentRound.startTime).getTime() + currentRound.durationMins * 60000
    : null;

  switch (currentRound.phase) {
    case 'PENDING':
      // Should not happen for current round, but handle gracefully
      await startRound(tournament.id, currentRound.roundNumber);
      break;

    case 'ACTIVE':
      // Check if round time has elapsed
      if (roundEndTime && now >= roundEndTime) {
        await transitionToScoring(tournament.id, currentRound.roundNumber);
      }
      break;

    case 'SCORING':
      // Score all participants, then move to elimination
      await scoreAllParticipants(tournament, currentRound);
      await transitionToEliminating(tournament.id, currentRound.roundNumber);
      break;

    case 'ELIMINATING':
      // Process eliminations, then complete round
      await runEliminations(tournament, currentRound);
      await completeRound(tournament, currentRound);
      break;
  }
}

// ─────────────────────────────────────────────────────────────────────
// PHASE TRANSITIONS
// ─────────────────────────────────────────────────────────────────────

async function startRound(tournamentId: string, roundNumber: number): Promise<void> {
  await prisma.round.update({
    where: { tournamentId_roundNumber: { tournamentId, roundNumber } },
    data: {
      phase: 'ACTIVE',
      startTime: new Date()
    }
  });
  console.log(`Round ${roundNumber} started for tournament ${tournamentId}`);
}

async function transitionToScoring(tournamentId: string, roundNumber: number): Promise<void> {
  await prisma.round.update({
    where: { tournamentId_roundNumber: { tournamentId, roundNumber } },
    data: {
      phase: 'SCORING',
      endTime: new Date()
    }
  });
  console.log(`Round ${roundNumber} moved to SCORING for tournament ${tournamentId}`);

  // Broadcast round phase change
  broadcastRoundChange(tournamentId, roundNumber, 'SCORING');
}

async function transitionToEliminating(tournamentId: string, roundNumber: number): Promise<void> {
  await prisma.round.update({
    where: { tournamentId_roundNumber: { tournamentId, roundNumber } },
    data: { phase: 'ELIMINATING' }
  });
}

async function scoreAllParticipants(tournament: any, round: any): Promise<void> {
  const roundStart = new Date(round.startTime).getTime();
  const roundEnd = new Date(round.endTime).getTime();

  console.log(`Scoring ${tournament.participants.length} participants for round ${round.roundNumber}`);

  // Get previous round ranks for comeback tracking
  const previousRanks = new Map<string, number>();
  if (round.roundNumber > 1) {
    const prevScores = await prisma.roundScore.findMany({
      where: {
        tournamentId: tournament.id,
        roundNumber: round.roundNumber - 1
      },
      select: { wallet: true, rank: true }
    });
    prevScores.forEach(s => {
      if (s.rank) previousRanks.set(s.wallet, s.rank);
    });
  }

  // Score participants in batches (parallel with concurrency limit)
  const BATCH_SIZE = 10;
  const allScores: Array<{
    wallet: string;
    participantId: string;
    rawScore: number;
    finalScore: number;
    tradesCount: number;
    totalVolume: number;
    totalPnl: number;
    trades: unknown[];
    previousRank: number | null;
  }> = [];

  for (let i = 0; i < tournament.participants.length; i += BATCH_SIZE) {
    const batch = tournament.participants.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (participant: { id: string; wallet: string }) => {
        try {
          const scoreResult = await calculateRoundScore(
            participant.wallet,
            roundStart,
            roundEnd
          );
          return {
            wallet: participant.wallet,
            participantId: participant.id,
            rawScore: scoreResult.rawScore,
            finalScore: scoreResult.finalScore,
            tradesCount: scoreResult.tradesCount,
            totalVolume: scoreResult.totalVolume,
            totalPnl: scoreResult.totalPnl,
            trades: scoreResult.trades,
            previousRank: previousRanks.get(participant.wallet) || null
          };
        } catch (error) {
          console.error(`Failed to score ${participant.wallet}:`, error);
          return {
            wallet: participant.wallet,
            participantId: participant.id,
            rawScore: 0,
            finalScore: 0,
            tradesCount: 0,
            totalVolume: 0,
            totalPnl: 0,
            trades: [],
            previousRank: previousRanks.get(participant.wallet) || null
          };
        }
      })
    );
    allScores.push(...batchResults);
  }

  // Batch upsert all scores in a single transaction
  await prisma.$transaction(
    allScores.map(s => prisma.roundScore.upsert({
      where: {
        tournamentId_roundNumber_wallet: {
          tournamentId: tournament.id,
          roundNumber: round.roundNumber,
          wallet: s.wallet
        }
      },
      create: {
        tournamentId: tournament.id,
        roundNumber: round.roundNumber,
        participantId: s.participantId,
        wallet: s.wallet,
        rawScore: s.rawScore,
        finalScore: s.finalScore,
        tradesCount: s.tradesCount,
        totalVolume: s.totalVolume,
        totalPnl: s.totalPnl,
        trades: s.trades as any,
        previousRank: s.previousRank
      },
      update: {
        rawScore: s.rawScore,
        finalScore: s.finalScore,
        tradesCount: s.tradesCount,
        totalVolume: s.totalVolume,
        totalPnl: s.totalPnl,
        trades: s.trades as any,
        previousRank: s.previousRank
      }
    }))
  );

  console.log(`Scored ${allScores.length} participants in batches`);

  // Broadcast updated standings to connected clients
  await broadcastTournamentStandings(tournament.id);
}

async function runEliminations(tournament: any, round: any): Promise<void> {
  const roundConfigs = tournament.roundConfigs as RoundConfig[];
  const roundConfig = roundConfigs[round.roundNumber - 1];
  const eliminationPercent = roundConfig?.eliminationPercent || 0.25;

  // Final round has no eliminations
  if (eliminationPercent === 0) return;

  const { eliminated, shieldSaves } = await processEliminations(
    tournament.id,
    round.roundNumber,
    eliminationPercent
  );

  // Broadcast eliminations to connected clients
  if (eliminated.length > 0 || shieldSaves.length > 0) {
    broadcastEliminations(tournament.id, round.roundNumber, eliminated, shieldSaves);

    // Also broadcast updated standings after eliminations
    await broadcastTournamentStandings(tournament.id);
  }
}

async function completeRound(tournament: any, round: any): Promise<void> {
  const roundConfigs = tournament.roundConfigs as RoundConfig[];
  const isLastRound = round.roundNumber >= roundConfigs.length;

  if (isLastRound) {
    // Tournament complete - finalize rankings and award badges
    await finalizeTournament(tournament);
  } else {
    // Advance to next round
    const activeParticipants = await prisma.participant.count({
      where: { tournamentId: tournament.id, isEliminated: false }
    });

    await prisma.$transaction([
      prisma.round.update({
        where: {
          tournamentId_roundNumber: {
            tournamentId: tournament.id,
            roundNumber: round.roundNumber
          }
        },
        data: { phase: 'COMPLETE' }
      }),
      prisma.tournament.update({
        where: { id: tournament.id },
        data: { currentRound: round.roundNumber + 1 }
      }),
      prisma.round.create({
        data: {
          tournamentId: tournament.id,
          roundNumber: round.roundNumber + 1,
          phase: 'ACTIVE',
          startTime: new Date(),
          durationMins: roundConfigs[round.roundNumber].duration,
          participantsAtStart: activeParticipants
        }
      })
    ]);

    console.log(`Advanced to round ${round.roundNumber + 1} with ${activeParticipants} participants`);
  }
}

async function finalizeTournament(tournament: any): Promise<void> {
  // Get final standings
  const finalScores = await prisma.roundScore.findMany({
    where: {
      tournamentId: tournament.id,
      roundNumber: tournament.currentRound
    },
    orderBy: { finalScore: 'desc' },
    include: { participant: true }
  });

  const totalParticipants = finalScores.length;

  // Detect comeback moments: was in bottom 10%, now in top 25%
  const comebackWallets = new Set<string>();
  for (const score of finalScores) {
    if (score.previousRank) {
      // Check if they were in bottom 10% (rank > 90th percentile)
      const wasBottom10Pct = score.previousRank > Math.floor(totalParticipants * 0.9);
      // Check current rank (after sorting)
      const currentRank = finalScores.findIndex(s => s.wallet === score.wallet) + 1;
      const nowTop25Pct = currentRank <= Math.ceil(totalParticipants * 0.25);

      if (wasBottom10Pct && nowTop25Pct) {
        comebackWallets.add(score.wallet);
        console.log(`Comeback detected: ${score.wallet} went from rank ${score.previousRank} to ${currentRank}`);
      }
    }
  }

  // Assign final ranks and award badges
  for (let i = 0; i < finalScores.length; i++) {
    const score = finalScores[i];
    const finalRank = i + 1;

    await prisma.participant.update({
      where: { id: score.participantId },
      data: { finalRank }
    });

    // Award badges
    const participationCount = await prisma.participant.count({
      where: { wallet: score.wallet }
    });

    await checkAndAwardBadges({
      tournamentId: tournament.id,
      wallet: score.wallet,
      finalRank,
      participationCount,
      usedShield: score.usedShield,
      hadComebackMoment: comebackWallets.has(score.wallet)
    });
  }

  // Mark tournament complete
  await prisma.tournament.update({
    where: { id: tournament.id },
    data: {
      status: 'COMPLETED',
      actualEnd: new Date()
    }
  });

  console.log(`Tournament ${tournament.id} completed! Winner: ${finalScores[0]?.wallet || 'N/A'}`);
  if (comebackWallets.size > 0) {
    console.log(`Comeback badges awarded to: ${[...comebackWallets].join(', ')}`);
  }

  // Broadcast tournament completion
  broadcastTournamentComplete(tournament.id, finalScores[0]?.wallet || null);

  // Initialize prize pool and create payout records
  try {
    // Only process prizes for SOL_STAKE tournaments
    if (tournament.entryType === 'SOL_STAKE') {
      await initializePrizePool(tournament.id);
      const payoutResult = await createPayoutRecords(tournament.id);
      console.log(`Prize payouts created: ${payoutResult.created} winners, ${payoutResult.totalAmount} SOL total`);

      // Run consolation raffle for eliminated participants
      const raffleResult = await runConsolationRaffle(tournament.id);
      if (raffleResult.winner) {
        console.log(`Raffle winner: ${raffleResult.winner} wins ${raffleResult.amount} SOL`);
      }
    }
  } catch (error) {
    console.error(`Failed to process prizes for tournament ${tournament.id}:`, error);
    // Don't fail the tournament completion if prize processing fails
  }
}
