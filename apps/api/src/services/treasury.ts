import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import { prisma } from '../db/client';
import { env } from '../config/env';

// ─────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────

// Platform fee (5%)
const PLATFORM_FEE_PERCENT = 0.05;

// Prize distribution percentages (of net pool after platform fee)
const PRIZE_DISTRIBUTION = {
  first: 0.30,       // 30% to 1st place
  second: 0.18,      // 18% to 2nd place
  third: 0.12,       // 12% to 3rd place
  finalist: 0.02,    // 2% each for places 4-16
  raffle: 0.10       // 10% to consolation raffle
} as const;

const connection = new Connection(env.SOLANA_RPC_URL);

// ─────────────────────────────────────────────────────────────────────
// PRIZE POOL CALCULATION
// ─────────────────────────────────────────────────────────────────────

export interface PrizePoolBreakdown {
  totalCollected: number;
  platformFee: number;
  netPrizePool: number;
  distribution: {
    placement: number;
    wallet: string;
    amount: number;
    percent: number;
  }[];
  rafflePool: number;
}

export async function calculatePrizePool(tournamentId: string): Promise<PrizePoolBreakdown> {
  // Get all confirmed entry payments
  const payments = await prisma.entryPayment.findMany({
    where: {
      tournamentId,
      status: 'CONFIRMED'
    }
  });

  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
  const platformFee = totalCollected * PLATFORM_FEE_PERCENT;
  const netPrizePool = totalCollected - platformFee;

  // Get final rankings
  const finalRankings = await prisma.participant.findMany({
    where: {
      tournamentId,
      finalRank: { not: null }
    },
    orderBy: { finalRank: 'asc' },
    select: { wallet: true, finalRank: true }
  });

  const distribution: PrizePoolBreakdown['distribution'] = [];

  for (const participant of finalRankings) {
    const rank = participant.finalRank!;
    let percent = 0;

    if (rank === 1) {
      percent = PRIZE_DISTRIBUTION.first;
    } else if (rank === 2) {
      percent = PRIZE_DISTRIBUTION.second;
    } else if (rank === 3) {
      percent = PRIZE_DISTRIBUTION.third;
    } else if (rank >= 4 && rank <= 16) {
      percent = PRIZE_DISTRIBUTION.finalist;
    }

    if (percent > 0) {
      distribution.push({
        placement: rank,
        wallet: participant.wallet,
        amount: netPrizePool * percent,
        percent
      });
    }
  }

  const rafflePool = netPrizePool * PRIZE_DISTRIBUTION.raffle;

  return {
    totalCollected,
    platformFee,
    netPrizePool,
    distribution,
    rafflePool
  };
}

// ─────────────────────────────────────────────────────────────────────
// CREATE PRIZE POOL RECORD
// ─────────────────────────────────────────────────────────────────────

export async function initializePrizePool(tournamentId: string): Promise<void> {
  const breakdown = await calculatePrizePool(tournamentId);

  await prisma.tournamentPrizePool.upsert({
    where: { tournamentId },
    create: {
      tournamentId,
      totalSolCollected: breakdown.totalCollected,
      totalPrizePool: breakdown.netPrizePool,
      platformFeeSol: breakdown.platformFee
    },
    update: {
      totalSolCollected: breakdown.totalCollected,
      totalPrizePool: breakdown.netPrizePool,
      platformFeeSol: breakdown.platformFee
    }
  });
}

// ─────────────────────────────────────────────────────────────────────
// CREATE PAYOUT RECORDS
// ─────────────────────────────────────────────────────────────────────

export async function createPayoutRecords(tournamentId: string): Promise<{
  created: number;
  totalAmount: number;
}> {
  const breakdown = await calculatePrizePool(tournamentId);

  // Create payout records for all winners
  const payouts = breakdown.distribution.map(d => ({
    tournamentId,
    wallet: d.wallet,
    placement: d.placement,
    prizeType: 'PLACEMENT' as const,
    amountSol: d.amount,
    percentOfPool: d.percent,
    status: 'PENDING' as const
  }));

  // Batch create
  await prisma.prizePayout.createMany({
    data: payouts,
    skipDuplicates: true
  });

  // Update prize pool record
  await prisma.tournamentPrizePool.update({
    where: { tournamentId },
    data: {
      isFinalized: true,
      finalizedAt: new Date()
    }
  });

  return {
    created: payouts.length,
    totalAmount: breakdown.distribution.reduce((sum, d) => sum + d.amount, 0)
  };
}

// ─────────────────────────────────────────────────────────────────────
// CONSOLATION RAFFLE
// ─────────────────────────────────────────────────────────────────────

export async function runConsolationRaffle(tournamentId: string): Promise<{
  winner: string | null;
  amount: number;
}> {
  // Get all eliminated participants (not winners)
  const eliminated = await prisma.participant.findMany({
    where: {
      tournamentId,
      isEliminated: true,
      finalRank: null
    },
    select: { wallet: true }
  });

  if (eliminated.length === 0) {
    return { winner: null, amount: 0 };
  }

  // Calculate raffle pool
  const breakdown = await calculatePrizePool(tournamentId);

  // Random selection
  const winnerIndex = Math.floor(Math.random() * eliminated.length);
  const winner = eliminated[winnerIndex].wallet;

  // Create raffle payout record
  await prisma.prizePayout.create({
    data: {
      tournamentId,
      wallet: winner,
      placement: 0, // 0 indicates raffle winner
      prizeType: 'RAFFLE',
      amountSol: breakdown.rafflePool,
      percentOfPool: PRIZE_DISTRIBUTION.raffle,
      status: 'PENDING'
    }
  });

  console.log(`Raffle winner: ${winner} wins ${breakdown.rafflePool} SOL`);

  return {
    winner,
    amount: breakdown.rafflePool
  };
}

// ─────────────────────────────────────────────────────────────────────
// PROCESS PAYOUTS (Requires treasury keypair - admin-triggered)
// ─────────────────────────────────────────────────────────────────────

export interface PayoutResult {
  wallet: string;
  amount: number;
  status: 'completed' | 'failed';
  txHash?: string;
  error?: string;
}

/**
 * Process pending payouts for a tournament
 * NOTE: This requires the treasury keypair to be provided
 * In production, this should be triggered by a secure admin process
 */
export async function processPayouts(
  tournamentId: string,
  treasuryKeypair: Keypair
): Promise<PayoutResult[]> {
  const pendingPayouts = await prisma.prizePayout.findMany({
    where: {
      tournamentId,
      status: 'PENDING'
    }
  });

  const results: PayoutResult[] = [];

  for (const payout of pendingPayouts) {
    try {
      // Mark as processing
      await prisma.prizePayout.update({
        where: { id: payout.id },
        data: { status: 'PROCESSING' }
      });

      // Create and send transaction
      const recipientPubkey = new PublicKey(payout.wallet);
      const lamports = Math.floor(payout.amountSol * LAMPORTS_PER_SOL);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: treasuryKeypair.publicKey,
          toPubkey: recipientPubkey,
          lamports
        })
      );

      const txHash = await sendAndConfirmTransaction(
        connection,
        transaction,
        [treasuryKeypair],
        { commitment: 'confirmed' }
      );

      // Update as completed
      await prisma.prizePayout.update({
        where: { id: payout.id },
        data: {
          status: 'COMPLETED',
          txHash,
          processedAt: new Date()
        }
      });

      // Update pool distributed amount
      await prisma.tournamentPrizePool.update({
        where: { tournamentId },
        data: {
          distributedSol: { increment: payout.amountSol }
        }
      });

      results.push({
        wallet: payout.wallet,
        amount: payout.amountSol,
        status: 'completed',
        txHash
      });

      console.log(`Payout sent: ${payout.amountSol} SOL to ${payout.wallet} (tx: ${txHash})`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await prisma.prizePayout.update({
        where: { id: payout.id },
        data: {
          status: 'FAILED',
          errorMessage
        }
      });

      results.push({
        wallet: payout.wallet,
        amount: payout.amountSol,
        status: 'failed',
        error: errorMessage
      });

      console.error(`Payout failed for ${payout.wallet}:`, errorMessage);
    }
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────
// GET PAYOUT STATUS
// ─────────────────────────────────────────────────────────────────────

export async function getPayoutStatus(tournamentId: string): Promise<{
  pool: {
    totalCollected: number;
    platformFee: number;
    prizePool: number;
    distributed: number;
    refunded: number;
    remaining: number;
  };
  payouts: {
    wallet: string;
    placement: number;
    amount: number;
    status: string;
    txHash: string | null;
  }[];
}> {
  const pool = await prisma.tournamentPrizePool.findUnique({
    where: { tournamentId }
  });

  const payouts = await prisma.prizePayout.findMany({
    where: { tournamentId },
    orderBy: { placement: 'asc' }
  });

  return {
    pool: {
      totalCollected: pool?.totalSolCollected || 0,
      platformFee: pool?.platformFeeSol || 0,
      prizePool: pool?.totalPrizePool || 0,
      distributed: pool?.distributedSol || 0,
      refunded: pool?.refundedSol || 0,
      remaining: (pool?.totalPrizePool || 0) - (pool?.distributedSol || 0)
    },
    payouts: payouts.map(p => ({
      wallet: p.wallet,
      placement: p.placement,
      amount: p.amountSol,
      status: p.status,
      txHash: p.txHash
    }))
  };
}
