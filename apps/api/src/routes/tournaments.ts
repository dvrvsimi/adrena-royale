import { Router } from 'express';
import { prisma } from '../db/client';

const router = Router();

// ─────────────────────────────────────────────────────────────────────
// GET /api/tournaments - List tournaments
// ─────────────────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const { status, limit = '10', offset = '0' } = req.query;

    const tournaments = await prisma.tournament.findMany({
      where: status ? { status: status as any } : undefined,
      orderBy: { scheduledStart: 'desc' },
      take: Number(limit),
      skip: Number(offset),
      include: {
        _count: { select: { participants: true } }
      }
    });

    res.json({
      tournaments: tournaments.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        status: t.status,
        entryType: t.entryType,
        entryFeeSol: t.entryFeeSol,
        entryFeeMutagen: t.entryFeeMutagen,
        scheduledStart: t.scheduledStart,
        entryDeadline: t.entryDeadline,
        currentRound: t.currentRound,
        minParticipants: t.minParticipants,
        maxParticipants: t.maxParticipants,
        participantCount: t._count.participants
      }))
    });
  } catch (error) {
    console.error('List tournaments error:', error);
    res.status(500).json({ error: 'Failed to fetch tournaments' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// GET /api/tournaments/:id - Tournament details
// ─────────────────────────────────────────────────────────────────────

router.get('/:id', async (req, res) => {
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: req.params.id },
      include: {
        _count: { select: { participants: true } },
        rounds: {
          orderBy: { roundNumber: 'asc' }
        }
      }
    });

    if (!tournament) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }

    res.json({
      ...tournament,
      participantCount: tournament._count.participants
    });
  } catch (error) {
    console.error('Get tournament error:', error);
    res.status(500).json({ error: 'Failed to fetch tournament' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// GET /api/tournaments/:id/standings - Current standings
// ─────────────────────────────────────────────────────────────────────

router.get('/:id/standings', async (req, res) => {
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: req.params.id }
    });

    if (!tournament) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }

    const roundNumber = tournament.currentRound || 1;

    const scores = await prisma.roundScore.findMany({
      where: {
        tournamentId: req.params.id,
        roundNumber
      },
      orderBy: { finalScore: 'desc' },
      include: {
        participant: {
          select: { isEliminated: true, shields: true }
        }
      }
    });

    const standings = scores.map((s, index) => ({
      rank: index + 1,
      wallet: s.wallet,
      finalScore: s.finalScore,
      tradesCount: s.tradesCount,
      totalVolume: s.totalVolume,
      totalPnl: s.totalPnl,
      isEliminated: s.participant.isEliminated,
      usedShield: s.usedShield
    }));

    res.json({
      tournamentId: req.params.id,
      roundNumber,
      standings
    });
  } catch (error) {
    console.error('Get standings error:', error);
    res.status(500).json({ error: 'Failed to fetch standings' });
  }
});

export default router;
