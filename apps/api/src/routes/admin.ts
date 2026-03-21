import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client';
import { adminAuth } from '../middleware/admin';
import { assignShieldsAtTournamentStart } from '../services/shields';
import { calculatePrizePool, getPayoutStatus, createPayoutRecords, initializePrizePool, runConsolationRaffle } from '../services/treasury';
import { getRefundStatus, calculateRefunds, getRefundCandidates } from '../services/refunds';
import { RoundConfig } from '@adrena-royale/shared';

const router = Router();

// All admin routes require auth
router.use(adminAuth);

// ─────────────────────────────────────────────────────────────────────
// POST /api/admin/tournaments - Create tournament
// ─────────────────────────────────────────────────────────────────────

const createTournamentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  entryType: z.enum(['FREE', 'WHITELIST', 'SOL_STAKE', 'MUTAGEN_COMMIT']),
  entryFeeSol: z.number().positive().optional(),
  entryFeeMutagen: z.number().int().positive().optional(),
  scheduledStart: z.string().datetime(),
  entryDeadline: z.string().datetime(),
  roundConfigs: z.array(z.object({
    duration: z.number().int().positive(),
    eliminationPercent: z.number().min(0).max(1)
  })),
  minParticipants: z.number().int().positive().default(5),
  maxParticipants: z.number().int().positive().default(256),
  minNotionalSize: z.number().positive().default(100),
  snipePenaltyMins: z.number().int().positive().default(5)
});

router.post('/tournaments', async (req, res) => {
  try {
    const data = createTournamentSchema.parse(req.body);

    const tournament = await prisma.tournament.create({
      data: {
        name: data.name,
        description: data.description,
        entryType: data.entryType,
        entryFeeSol: data.entryFeeSol,
        entryFeeMutagen: data.entryFeeMutagen,
        scheduledStart: new Date(data.scheduledStart),
        entryDeadline: new Date(data.entryDeadline),
        roundConfigs: data.roundConfigs,
        minParticipants: data.minParticipants,
        maxParticipants: data.maxParticipants,
        minNotionalSize: data.minNotionalSize,
        snipePenaltyMins: data.snipePenaltyMins,
        status: 'SCHEDULED'
      }
    });

    // Log admin action
    await prisma.adminAction.create({
      data: {
        adminWallet: req.wallet!,
        action: 'CREATE_TOURNAMENT',
        targetType: 'tournament',
        targetId: tournament.id,
        details: { name: tournament.name }
      }
    });

    res.status(201).json({ tournament });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request', details: error.errors });
      return;
    }
    console.error('Create tournament error:', error);
    res.status(500).json({ error: 'Failed to create tournament' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// POST /api/admin/tournaments/:id/open-entries - Open entries
// ─────────────────────────────────────────────────────────────────────

router.post('/tournaments/:id/open-entries', async (req, res) => {
  try {
    const tournament = await prisma.tournament.update({
      where: { id: req.params.id },
      data: { status: 'ENTRY_OPEN' }
    });

    await prisma.adminAction.create({
      data: {
        adminWallet: req.wallet!,
        action: 'OPEN_ENTRIES',
        targetType: 'tournament',
        targetId: tournament.id
      }
    });

    res.json({ message: 'Entries opened', tournament });
  } catch (error) {
    console.error('Open entries error:', error);
    res.status(500).json({ error: 'Failed to open entries' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// POST /api/admin/tournaments/:id/start - Start tournament
// ─────────────────────────────────────────────────────────────────────

router.post('/tournaments/:id/start', async (req, res) => {
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { participants: true } } }
    });

    if (!tournament) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }

    if (tournament._count.participants < tournament.minParticipants) {
      res.status(400).json({
        error: `Insufficient participants: ${tournament._count.participants}/${tournament.minParticipants}`
      });
      return;
    }

    // Assign shields based on streaks
    const shieldResult = await assignShieldsAtTournamentStart(tournament.id);

    // Get round configs
    const roundConfigs = tournament.roundConfigs as unknown as RoundConfig[];

    // Create first round
    await prisma.$transaction([
      prisma.tournament.update({
        where: { id: tournament.id },
        data: {
          status: 'ACTIVE',
          actualStart: new Date(),
          currentRound: 1
        }
      }),
      prisma.round.create({
        data: {
          tournamentId: tournament.id,
          roundNumber: 1,
          phase: 'ACTIVE',
          startTime: new Date(),
          durationMins: roundConfigs[0]?.duration || 360,
          participantsAtStart: tournament._count.participants
        }
      })
    ]);

    await prisma.adminAction.create({
      data: {
        adminWallet: req.wallet!,
        action: 'START_TOURNAMENT',
        targetType: 'tournament',
        targetId: tournament.id,
        details: {
          participants: tournament._count.participants,
          shieldsAssigned: shieldResult.total
        }
      }
    });

    res.json({
      message: 'Tournament started',
      participants: tournament._count.participants,
      shields: shieldResult
    });
  } catch (error) {
    console.error('Start tournament error:', error);
    res.status(500).json({ error: 'Failed to start tournament' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// POST /api/admin/tournaments/:id/pause - Pause tournament
// ─────────────────────────────────────────────────────────────────────

router.post('/tournaments/:id/pause', async (req, res) => {
  try {
    const tournament = await prisma.tournament.update({
      where: { id: req.params.id },
      data: { status: 'PAUSED' }
    });

    await prisma.adminAction.create({
      data: {
        adminWallet: req.wallet!,
        action: 'PAUSE_TOURNAMENT',
        targetType: 'tournament',
        targetId: tournament.id
      }
    });

    res.json({ message: 'Tournament paused', tournament });
  } catch (error) {
    console.error('Pause tournament error:', error);
    res.status(500).json({ error: 'Failed to pause tournament' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// POST /api/admin/tournaments/:id/resume - Resume tournament
// ─────────────────────────────────────────────────────────────────────

router.post('/tournaments/:id/resume', async (req, res) => {
  try {
    const tournament = await prisma.tournament.update({
      where: { id: req.params.id },
      data: { status: 'ACTIVE' }
    });

    await prisma.adminAction.create({
      data: {
        adminWallet: req.wallet!,
        action: 'RESUME_TOURNAMENT',
        targetType: 'tournament',
        targetId: tournament.id
      }
    });

    res.json({ message: 'Tournament resumed', tournament });
  } catch (error) {
    console.error('Resume tournament error:', error);
    res.status(500).json({ error: 'Failed to resume tournament' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// POST /api/admin/tournaments/:id/cancel - Cancel tournament
// ─────────────────────────────────────────────────────────────────────

router.post('/tournaments/:id/cancel', async (req, res) => {
  try {
    const tournament = await prisma.tournament.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' }
    });

    await prisma.adminAction.create({
      data: {
        adminWallet: req.wallet!,
        action: 'CANCEL_TOURNAMENT',
        targetType: 'tournament',
        targetId: tournament.id
      }
    });

    res.json({ message: 'Tournament cancelled', tournament });
  } catch (error) {
    console.error('Cancel tournament error:', error);
    res.status(500).json({ error: 'Failed to cancel tournament' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// DELETE /api/admin/tournaments/:id - Delete tournament
// ─────────────────────────────────────────────────────────────────────

router.delete('/tournaments/:id', async (req, res) => {
  try {
    // Delete related records first (cascade)
    await prisma.roundScore.deleteMany({ where: { round: { tournamentId: req.params.id } } });
    await prisma.round.deleteMany({ where: { tournamentId: req.params.id } });
    await prisma.participant.deleteMany({ where: { tournamentId: req.params.id } });
    await prisma.whitelist.deleteMany({ where: { tournamentId: req.params.id } });
    await prisma.prizePayout.deleteMany({ where: { tournamentId: req.params.id } });
    await prisma.tournamentPrizePool.deleteMany({ where: { tournamentId: req.params.id } });
    await prisma.entryPayment.deleteMany({ where: { tournamentId: req.params.id } });

    const tournament = await prisma.tournament.delete({
      where: { id: req.params.id }
    });

    await prisma.adminAction.create({
      data: {
        adminWallet: req.wallet!,
        action: 'DELETE_TOURNAMENT',
        targetType: 'tournament',
        targetId: req.params.id
      }
    });

    res.json({ message: 'Tournament deleted', tournament });
  } catch (error) {
    console.error('Delete tournament error:', error);
    res.status(500).json({ error: 'Failed to delete tournament' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// POST /api/admin/tournaments/:id/disqualify - Disqualify participant
// ─────────────────────────────────────────────────────────────────────

const disqualifySchema = z.object({
  wallet: z.string(),
  reason: z.string().optional()
});

router.post('/tournaments/:id/disqualify', async (req, res) => {
  try {
    const { wallet, reason } = disqualifySchema.parse(req.body);

    const participant = await prisma.participant.update({
      where: {
        tournamentId_wallet: {
          tournamentId: req.params.id,
          wallet
        }
      },
      data: {
        isEliminated: true,
        eliminationReason: 'DISQUALIFIED'
      }
    });

    await prisma.adminAction.create({
      data: {
        adminWallet: req.wallet!,
        action: 'DISQUALIFY',
        targetType: 'participant',
        targetId: participant.id,
        details: { wallet, reason }
      }
    });

    res.json({ message: 'Participant disqualified', participant });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request', details: error.errors });
      return;
    }
    console.error('Disqualify error:', error);
    res.status(500).json({ error: 'Failed to disqualify participant' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// POST /api/admin/tournaments/:id/whitelist - Add wallets to whitelist
// ─────────────────────────────────────────────────────────────────────

const whitelistSchema = z.object({
  wallets: z.array(z.string()).min(1).max(100)
});

router.post('/tournaments/:id/whitelist', async (req, res) => {
  try {
    const { wallets } = whitelistSchema.parse(req.body);

    // Verify tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id: req.params.id }
    });

    if (!tournament) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }

    // Add wallets to whitelist
    const result = await prisma.whitelist.createMany({
      data: wallets.map(wallet => ({
        tournamentId: req.params.id,
        wallet,
        addedBy: req.wallet!
      })),
      skipDuplicates: true
    });

    await prisma.adminAction.create({
      data: {
        adminWallet: req.wallet!,
        action: 'ADD_WHITELIST',
        targetType: 'tournament',
        targetId: tournament.id,
        details: { walletsAdded: result.count, wallets }
      }
    });

    res.json({ added: result.count, total: wallets.length });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request', details: error.errors });
      return;
    }
    console.error('Add whitelist error:', error);
    res.status(500).json({ error: 'Failed to add to whitelist' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// DELETE /api/admin/tournaments/:id/whitelist - Remove wallets from whitelist
// ─────────────────────────────────────────────────────────────────────

router.delete('/tournaments/:id/whitelist', async (req, res) => {
  try {
    const { wallets } = whitelistSchema.parse(req.body);

    const result = await prisma.whitelist.deleteMany({
      where: {
        tournamentId: req.params.id,
        wallet: { in: wallets }
      }
    });

    await prisma.adminAction.create({
      data: {
        adminWallet: req.wallet!,
        action: 'REMOVE_WHITELIST',
        targetType: 'tournament',
        targetId: req.params.id,
        details: { walletsRemoved: result.count, wallets }
      }
    });

    res.json({ removed: result.count });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request', details: error.errors });
      return;
    }
    console.error('Remove whitelist error:', error);
    res.status(500).json({ error: 'Failed to remove from whitelist' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// GET /api/admin/tournaments/:id/whitelist - Get whitelist for tournament
// ─────────────────────────────────────────────────────────────────────

router.get('/tournaments/:id/whitelist', async (req, res) => {
  try {
    const entries = await prisma.whitelist.findMany({
      where: { tournamentId: req.params.id },
      orderBy: { addedAt: 'desc' }
    });

    res.json({ whitelist: entries });
  } catch (error) {
    console.error('Get whitelist error:', error);
    res.status(500).json({ error: 'Failed to get whitelist' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// PRIZE POOL MANAGEMENT
// ─────────────────────────────────────────────────────────────────────

// GET /api/admin/tournaments/:id/prizes - Get prize pool breakdown
router.get('/tournaments/:id/prizes', async (req, res) => {
  try {
    const breakdown = await calculatePrizePool(req.params.id);
    const status = await getPayoutStatus(req.params.id);

    res.json({
      breakdown,
      status: status.pool,
      payouts: status.payouts
    });
  } catch (error) {
    console.error('Get prizes error:', error);
    res.status(500).json({ error: 'Failed to get prize info' });
  }
});

// POST /api/admin/tournaments/:id/prizes/initialize - Initialize prize pool
router.post('/tournaments/:id/prizes/initialize', async (req, res) => {
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: req.params.id }
    });

    if (!tournament) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }

    if (tournament.status !== 'COMPLETED') {
      res.status(400).json({ error: 'Tournament must be completed to initialize prizes' });
      return;
    }

    await initializePrizePool(req.params.id);
    const result = await createPayoutRecords(req.params.id);

    // Run raffle
    const raffle = await runConsolationRaffle(req.params.id);

    await prisma.adminAction.create({
      data: {
        adminWallet: req.wallet!,
        action: 'INITIALIZE_PRIZES',
        targetType: 'tournament',
        targetId: req.params.id,
        details: {
          payoutsCreated: result.created,
          totalAmount: result.totalAmount,
          raffleWinner: raffle.winner
        }
      }
    });

    res.json({
      message: 'Prize pool initialized',
      payoutsCreated: result.created,
      totalAmount: result.totalAmount,
      raffle
    });
  } catch (error) {
    console.error('Initialize prizes error:', error);
    res.status(500).json({ error: 'Failed to initialize prizes' });
  }
});

// POST /api/admin/tournaments/:id/prizes/process - Process payouts
// NOTE: This endpoint is for status checking only.
// Actual payout processing requires treasury keypair and should be done
// via secure backend script or multisig transaction.
router.post('/tournaments/:id/prizes/process', async (req, res) => {
  try {
    const status = await getPayoutStatus(req.params.id);
    const pendingPayouts = status.payouts.filter(p => p.status === 'PENDING');

    if (pendingPayouts.length === 0) {
      res.json({ message: 'No pending payouts' });
      return;
    }

    // In production, this would require treasury keypair
    // For now, return instructions for manual processing
    res.json({
      message: 'Payouts require treasury keypair for processing',
      pendingPayouts,
      instructions: [
        '1. Export pending payouts to CSV',
        '2. Use treasury multisig to sign batch transfer',
        '3. Update payout status via /prizes/confirm endpoint'
      ]
    });
  } catch (error) {
    console.error('Process payouts error:', error);
    res.status(500).json({ error: 'Failed to process payouts' });
  }
});

// POST /api/admin/tournaments/:id/prizes/confirm - Confirm completed payout
const confirmPayoutSchema = z.object({
  wallet: z.string(),
  txHash: z.string()
});

router.post('/tournaments/:id/prizes/confirm', async (req, res) => {
  try {
    const { wallet, txHash } = confirmPayoutSchema.parse(req.body);

    const payout = await prisma.prizePayout.findFirst({
      where: {
        tournamentId: req.params.id,
        wallet,
        status: 'PENDING'
      }
    });

    if (!payout) {
      res.status(404).json({ error: 'Pending payout not found for this wallet' });
      return;
    }

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
      where: { tournamentId: req.params.id },
      data: {
        distributedSol: { increment: payout.amountSol }
      }
    });

    await prisma.adminAction.create({
      data: {
        adminWallet: req.wallet!,
        action: 'CONFIRM_PAYOUT',
        targetType: 'payout',
        targetId: payout.id,
        details: { wallet, txHash, amount: payout.amountSol }
      }
    });

    res.json({ message: 'Payout confirmed', payout: { ...payout, txHash, status: 'COMPLETED' } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request', details: error.errors });
      return;
    }
    console.error('Confirm payout error:', error);
    res.status(500).json({ error: 'Failed to confirm payout' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// REFUND MANAGEMENT
// ─────────────────────────────────────────────────────────────────────

// GET /api/admin/tournaments/:id/refunds - Get refund status
router.get('/tournaments/:id/refunds', async (req, res) => {
  try {
    const status = await getRefundStatus(req.params.id);
    res.json(status);
  } catch (error) {
    console.error('Get refunds error:', error);
    res.status(500).json({ error: 'Failed to get refund status' });
  }
});

// GET /api/admin/tournaments/:id/refunds/candidates - Get refund candidates
router.get('/tournaments/:id/refunds/candidates', async (req, res) => {
  try {
    const candidates = await getRefundCandidates(req.params.id);
    const calculation = await calculateRefunds(req.params.id);

    res.json({
      ...candidates,
      totalRefundAmount: calculation.totalRefundAmount
    });
  } catch (error) {
    console.error('Get refund candidates error:', error);
    res.status(500).json({ error: 'Failed to get refund candidates' });
  }
});

// POST /api/admin/tournaments/:id/refunds/confirm - Confirm completed refund
const confirmRefundSchema = z.object({
  wallet: z.string(),
  txHash: z.string()
});

router.post('/tournaments/:id/refunds/confirm', async (req, res) => {
  try {
    const { wallet, txHash } = confirmRefundSchema.parse(req.body);

    const payment = await prisma.entryPayment.findFirst({
      where: {
        tournamentId: req.params.id,
        wallet,
        status: 'CONFIRMED' // Not yet refunded
      }
    });

    if (!payment) {
      res.status(404).json({ error: 'Confirmed payment not found for this wallet' });
      return;
    }

    await prisma.entryPayment.update({
      where: { id: payment.id },
      data: {
        status: 'REFUNDED',
        processedAt: new Date()
      }
    });

    // Update pool refunded amount
    await prisma.tournamentPrizePool.update({
      where: { tournamentId: req.params.id },
      data: {
        refundedSol: { increment: payment.amount }
      }
    });

    await prisma.adminAction.create({
      data: {
        adminWallet: req.wallet!,
        action: 'CONFIRM_REFUND',
        targetType: 'payment',
        targetId: payment.id,
        details: { wallet, txHash, amount: payment.amount }
      }
    });

    res.json({
      message: 'Refund confirmed',
      payment: { ...payment, status: 'REFUNDED' }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request', details: error.errors });
      return;
    }
    console.error('Confirm refund error:', error);
    res.status(500).json({ error: 'Failed to confirm refund' });
  }
});

export default router;
