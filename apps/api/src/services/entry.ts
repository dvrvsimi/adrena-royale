import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { prisma } from '../db/client';
import { env } from '../config/env';
import { getWalletMutagen } from './adrena';

// ─────────────────────────────────────────────────────────────────────
// SOL STAKE ENTRY VALIDATION
// ─────────────────────────────────────────────────────────────────────

const connection = new Connection(env.SOLANA_RPC_URL);

export async function validateSolStakeEntry(
  tournamentId: string,
  wallet: string,
  txHash: string,
  expectedAmount: number
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Get the transaction
    const tx = await connection.getTransaction(txHash, {
      maxSupportedTransactionVersion: 0
    });

    if (!tx) {
      return { valid: false, error: 'Transaction not found' };
    }

    if (tx.meta?.err) {
      return { valid: false, error: 'Transaction failed' };
    }

    // Check if already used
    const existingPayment = await prisma.entryPayment.findUnique({
      where: { txHash }
    });

    if (existingPayment) {
      return { valid: false, error: 'Transaction already used' };
    }

    // Verify sender is the wallet
    const accountKeys = tx.transaction.message.staticAccountKeys;
    const senderKey = accountKeys[0]?.toBase58();

    if (senderKey !== wallet) {
      return { valid: false, error: 'Transaction sender does not match wallet' };
    }

    // Verify treasury received the correct amount
    if (!env.TREASURY_WALLET) {
      return { valid: false, error: 'Treasury wallet not configured' };
    }

    const treasuryIndex = accountKeys.findIndex(
      k => k.toBase58() === env.TREASURY_WALLET
    );

    if (treasuryIndex === -1) {
      return { valid: false, error: 'Treasury not found in transaction' };
    }

    // Check balance change
    const preBalance = tx.meta?.preBalances[treasuryIndex] || 0;
    const postBalance = tx.meta?.postBalances[treasuryIndex] || 0;
    const received = (postBalance - preBalance) / LAMPORTS_PER_SOL;

    if (received < expectedAmount * 0.99) { // 1% tolerance for fees
      return { valid: false, error: `Insufficient amount: expected ${expectedAmount} SOL, got ${received}` };
    }

    // Record the payment
    await prisma.entryPayment.create({
      data: {
        tournamentId,
        wallet,
        txHash,
        amount: received,
        status: 'CONFIRMED',
        processedAt: new Date()
      }
    });

    return { valid: true };
  } catch (error) {
    console.error('SOL stake validation error:', error);
    return { valid: false, error: 'Failed to validate transaction' };
  }
}

// ─────────────────────────────────────────────────────────────────────
// MUTAGEN BALANCE ENTRY VALIDATION
// ─────────────────────────────────────────────────────────────────────

export async function validateMutagenEntry(
  wallet: string,
  requiredBalance: number
): Promise<{ valid: boolean; balance: number; error?: string }> {
  try {
    const mutagenData = await getWalletMutagen(wallet);

    if (mutagenData.balance < requiredBalance) {
      return {
        valid: false,
        balance: mutagenData.balance,
        error: `Insufficient Mutagen: required ${requiredBalance}, have ${mutagenData.balance}`
      };
    }

    return { valid: true, balance: mutagenData.balance };
  } catch (error) {
    console.error('Mutagen validation error:', error);
    return { valid: false, balance: 0, error: 'Failed to fetch Mutagen balance' };
  }
}

// ─────────────────────────────────────────────────────────────────────
// GENERAL ENTRY VALIDATION
// ─────────────────────────────────────────────────────────────────────

export async function validateEntry(
  tournamentId: string,
  wallet: string,
  txHash?: string
): Promise<{ valid: boolean; error?: string }> {
  // Get tournament
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId }
  });

  if (!tournament) {
    return { valid: false, error: 'Tournament not found' };
  }

  // Check tournament status
  if (tournament.status !== 'ENTRY_OPEN') {
    return { valid: false, error: 'Tournament is not accepting entries' };
  }

  // Check deadline
  if (new Date() > tournament.entryDeadline) {
    return { valid: false, error: 'Entry deadline has passed' };
  }

  // Check max participants
  const currentCount = await prisma.participant.count({
    where: { tournamentId }
  });

  if (currentCount >= tournament.maxParticipants) {
    return { valid: false, error: 'Tournament is full' };
  }

  // Check if already registered
  const existing = await prisma.participant.findUnique({
    where: { tournamentId_wallet: { tournamentId, wallet } }
  });

  if (existing) {
    return { valid: false, error: 'Already registered for this tournament' };
  }

  // Entry type specific validation
  switch (tournament.entryType) {
    case 'FREE':
      return { valid: true };

    case 'SOL_STAKE':
      if (!txHash) {
        return { valid: false, error: 'Transaction hash required for SOL stake entry' };
      }
      if (!tournament.entryFeeSol) {
        return { valid: false, error: 'Entry fee not configured' };
      }
      return validateSolStakeEntry(tournamentId, wallet, txHash, tournament.entryFeeSol);

    case 'MUTAGEN_COMMIT':
      if (!tournament.entryFeeMutagen) {
        return { valid: false, error: 'Mutagen requirement not configured' };
      }
      const mutagenResult = await validateMutagenEntry(wallet, tournament.entryFeeMutagen);
      return { valid: mutagenResult.valid, error: mutagenResult.error };

    case 'WHITELIST': {
      const whitelistEntry = await prisma.whitelist.findUnique({
        where: { tournamentId_wallet: { tournamentId, wallet } }
      });
      if (!whitelistEntry) {
        return { valid: false, error: 'Wallet not whitelisted for this tournament' };
      }
      return { valid: true };
    }

    default:
      return { valid: false, error: 'Unknown entry type' };
  }
}
