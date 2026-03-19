import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client';
import { verifyWalletSignature } from '../middleware/auth';
import { validateEntry } from '../services/entry';

const router = Router();

// ─────────────────────────────────────────────────────────────────────
// POST /api/participants/register - Register for tournament
// ─────────────────────────────────────────────────────────────────────

const registerSchema = z.object({
  tournamentId: z.string(),
  txHash: z.string().optional() // Required for SOL_STAKE
});

router.post('/register', verifyWalletSignature, async (req, res) => {
  try {
    const wallet = req.wallet!;
    const body = registerSchema.parse(req.body);

    // Validate entry
    const validation = await validateEntry(body.tournamentId, wallet, body.txHash);

    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    // Create participant
    const participant = await prisma.participant.create({
      data: {
        tournamentId: body.tournamentId,
        wallet,
        entryTxHash: body.txHash
      }
    });

    res.status(201).json({
      message: 'Successfully registered',
      participant: {
        id: participant.id,
        wallet: participant.wallet,
        enteredAt: participant.enteredAt
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request', details: error.errors });
      return;
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// GET /api/participants/:tournamentId/:wallet - Get participant status
// ─────────────────────────────────────────────────────────────────────

router.get('/:tournamentId/:wallet', async (req, res) => {
  try {
    const { tournamentId, wallet } = req.params;

    const participant = await prisma.participant.findUnique({
      where: { tournamentId_wallet: { tournamentId, wallet } },
      include: {
        roundScores: {
          orderBy: { roundNumber: 'desc' },
          take: 1
        }
      }
    });

    if (!participant) {
      res.status(404).json({ error: 'Participant not found' });
      return;
    }

    const latestScore = participant.roundScores[0];

    res.json({
      id: participant.id,
      wallet: participant.wallet,
      enteredAt: participant.enteredAt,
      isEliminated: participant.isEliminated,
      eliminatedAt: participant.eliminatedAt,
      eliminationReason: participant.eliminationReason,
      finalRank: participant.finalRank,
      shields: participant.shields,
      currentRoundScore: latestScore ? {
        roundNumber: latestScore.roundNumber,
        finalScore: latestScore.finalScore,
        rank: latestScore.rank,
        tradesCount: latestScore.tradesCount
      } : null
    });
  } catch (error) {
    console.error('Get participant error:', error);
    res.status(500).json({ error: 'Failed to fetch participant' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// GET /api/participants/:tournamentId - List all participants
// ─────────────────────────────────────────────────────────────────────

router.get('/:tournamentId', async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { eliminated } = req.query;

    const participants = await prisma.participant.findMany({
      where: {
        tournamentId,
        ...(eliminated !== undefined && {
          isEliminated: eliminated === 'true'
        })
      },
      orderBy: { enteredAt: 'asc' }
    });

    res.json({ participants });
  } catch (error) {
    console.error('List participants error:', error);
    res.status(500).json({ error: 'Failed to fetch participants' });
  }
});

export default router;
