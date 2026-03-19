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

const connection = new Connection(env.SOLANA_RPC_URL);

// ─────────────────────────────────────────────────────────────────────
// REFUND RESULT TYPES
// ─────────────────────────────────────────────────────────────────────

export interface RefundResult {
  wallet: string;
  amount: number;
  status: 'completed' | 'failed' | 'skipped';
  txHash?: string;
  error?: string;
  reason?: string;
}

// ─────────────────────────────────────────────────────────────────────
// GET REFUND CANDIDATES
// ─────────────────────────────────────────────────────────────────────

/**
 * Get all participants eligible for stake refunds
 * - Tournament must be COMPLETED or CANCELLED
 * - Entry type must be SOL_STAKE
 * - Payment must be CONFIRMED (not already refunded)
 */
export async function getRefundCandidates(tournamentId: string): Promise<{
  eligible: { wallet: string; amount: number; paymentId: string }[];
  prizeWinners: string[];
  alreadyRefunded: string[];
}> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId }
  });

  if (!tournament) {
    throw new Error('Tournament not found');
  }

  if (!['COMPLETED', 'CANCELLED'].includes(tournament.status)) {
    throw new Error('Tournament must be completed or cancelled for refunds');
  }

  // Get all confirmed payments
  const payments = await prisma.entryPayment.findMany({
    where: {
      tournamentId,
      status: 'CONFIRMED'
    }
  });

  // Get prize winners (they don't get refunds - they get prizes)
  const prizePayouts = await prisma.prizePayout.findMany({
    where: { tournamentId },
    select: { wallet: true }
  });
  const prizeWinners = [...new Set(prizePayouts.map(p => p.wallet))];

  // Get already refunded
  const refundedPayments = await prisma.entryPayment.findMany({
    where: {
      tournamentId,
      status: 'REFUNDED'
    }
  });
  const alreadyRefunded = refundedPayments.map(p => p.wallet);

  // Filter eligible
  const eligible = payments
    .filter(p => !prizeWinners.includes(p.wallet))
    .map(p => ({
      wallet: p.wallet,
      amount: p.amount,
      paymentId: p.id
    }));

  return {
    eligible,
    prizeWinners,
    alreadyRefunded
  };
}

// ─────────────────────────────────────────────────────────────────────
// CALCULATE REFUND AMOUNTS
// ─────────────────────────────────────────────────────────────────────

/**
 * For cancelled tournaments: Full refund
 * For completed tournaments: Refund stake (prizes are separate)
 */
export async function calculateRefunds(tournamentId: string): Promise<{
  totalRefundAmount: number;
  refunds: { wallet: string; amount: number; paymentId: string }[];
}> {
  const { eligible } = await getRefundCandidates(tournamentId);

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId }
  });

  if (tournament?.status === 'CANCELLED') {
    // Full refund for cancelled tournaments
    return {
      totalRefundAmount: eligible.reduce((sum, e) => sum + e.amount, 0),
      refunds: eligible
    };
  }

  // For completed tournaments, refund the full stake
  // (prize pool comes from the collective stakes, but individual refunds
  // are handled separately from prize distribution)
  //
  // Design decision: Non-winners get their stake back
  // Prize pool comes from a portion of all stakes
  return {
    totalRefundAmount: eligible.reduce((sum, e) => sum + e.amount, 0),
    refunds: eligible
  };
}

// ─────────────────────────────────────────────────────────────────────
// PROCESS REFUNDS (Requires treasury keypair)
// ─────────────────────────────────────────────────────────────────────

export async function processRefunds(
  tournamentId: string,
  treasuryKeypair: Keypair
): Promise<RefundResult[]> {
  const { refunds } = await calculateRefunds(tournamentId);
  const results: RefundResult[] = [];

  for (const refund of refunds) {
    try {
      // Check if already refunded
      const payment = await prisma.entryPayment.findUnique({
        where: { id: refund.paymentId }
      });

      if (payment?.status === 'REFUNDED') {
        results.push({
          wallet: refund.wallet,
          amount: refund.amount,
          status: 'skipped',
          reason: 'Already refunded'
        });
        continue;
      }

      // Create and send refund transaction
      const recipientPubkey = new PublicKey(refund.wallet);
      const lamports = Math.floor(refund.amount * LAMPORTS_PER_SOL);

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

      // Update payment status
      await prisma.entryPayment.update({
        where: { id: refund.paymentId },
        data: {
          status: 'REFUNDED',
          processedAt: new Date()
        }
      });

      // Update pool refunded amount
      await prisma.tournamentPrizePool.update({
        where: { tournamentId },
        data: {
          refundedSol: { increment: refund.amount }
        }
      });

      results.push({
        wallet: refund.wallet,
        amount: refund.amount,
        status: 'completed',
        txHash
      });

      console.log(`Refund sent: ${refund.amount} SOL to ${refund.wallet} (tx: ${txHash})`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      results.push({
        wallet: refund.wallet,
        amount: refund.amount,
        status: 'failed',
        error: errorMessage
      });

      console.error(`Refund failed for ${refund.wallet}:`, errorMessage);
    }
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────
// REFUND STATUS
// ─────────────────────────────────────────────────────────────────────

export async function getRefundStatus(tournamentId: string): Promise<{
  tournament: {
    status: string;
    entryType: string;
    entryFeeSol: number | null;
  };
  stats: {
    totalEntries: number;
    confirmedPayments: number;
    refundedPayments: number;
    pendingRefunds: number;
    prizeWinners: number;
  };
  pendingRefunds: {
    wallet: string;
    amount: number;
  }[];
  completedRefunds: {
    wallet: string;
    amount: number;
  }[];
}> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId }
  });

  if (!tournament) {
    throw new Error('Tournament not found');
  }

  const [confirmedPayments, refundedPayments, prizePayouts] = await Promise.all([
    prisma.entryPayment.findMany({
      where: { tournamentId, status: 'CONFIRMED' }
    }),
    prisma.entryPayment.findMany({
      where: { tournamentId, status: 'REFUNDED' }
    }),
    prisma.prizePayout.findMany({
      where: { tournamentId },
      select: { wallet: true }
    })
  ]);

  const prizeWinners = [...new Set(prizePayouts.map(p => p.wallet))];
  const pendingWallets = confirmedPayments
    .filter(p => !prizeWinners.includes(p.wallet))
    .map(p => ({ wallet: p.wallet, amount: p.amount }));

  return {
    tournament: {
      status: tournament.status,
      entryType: tournament.entryType,
      entryFeeSol: tournament.entryFeeSol
    },
    stats: {
      totalEntries: confirmedPayments.length + refundedPayments.length,
      confirmedPayments: confirmedPayments.length,
      refundedPayments: refundedPayments.length,
      pendingRefunds: pendingWallets.length,
      prizeWinners: prizeWinners.length
    },
    pendingRefunds: pendingWallets,
    completedRefunds: refundedPayments.map(p => ({
      wallet: p.wallet,
      amount: p.amount
    }))
  };
}
