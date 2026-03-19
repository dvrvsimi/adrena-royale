import { Router } from 'express';
import { prisma } from '../db/client';
import { getWalletBadges } from '../services/badges';
import { getUserStreak } from '../services/streaks';
import { getTraderInfo } from '../services/adrena';

const router = Router();

// ─────────────────────────────────────────────────────────────────────
// GET /api/profile/:wallet - Get user profile
// ─────────────────────────────────────────────────────────────────────

router.get('/:wallet', async (req, res) => {
  try {
    const { wallet } = req.params;

    // Get badges
    const badges = await getWalletBadges(wallet);

    // Get tournament stats
    const totalParticipations = await prisma.participant.count({
      where: { wallet }
    });

    const wins = await prisma.participant.count({
      where: { wallet, finalRank: 1 }
    });

    const topTen = await prisma.participant.count({
      where: {
        wallet,
        finalRank: { lte: 10 }
      }
    });

    // Get streak
    const streak = await getUserStreak(wallet);

    // Get trader info from Adrena
    let traderInfo = null;
    try {
      traderInfo = await getTraderInfo(wallet);
    } catch {
      // Ignore if API fails
    }

    res.json({
      wallet,
      badges: badges.map(b => ({
        id: b.id,
        badgeType: b.badgeType,
        awardedAt: b.awardedAt,
        tournamentId: b.tournamentId,
        name: b.definition?.name,
        description: b.definition?.description,
        rarity: b.definition?.rarity,
        imageUrl: b.definition?.imageUrl
      })),
      tournaments: {
        total: totalParticipations,
        wins,
        topTen
      },
      streak: streak ? {
        current: streak.currentDailyStreak,
        longest: streak.longestDailyStreak,
        lastTrade: streak.lastTradeDate
      } : null,
      traderStats: traderInfo
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// GET /api/profile/:wallet/tournaments - Get user's tournament history
// ─────────────────────────────────────────────────────────────────────

router.get('/:wallet/tournaments', async (req, res) => {
  try {
    const { wallet } = req.params;
    const { limit = '10', offset = '0' } = req.query;

    const participations = await prisma.participant.findMany({
      where: { wallet },
      orderBy: { enteredAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
            status: true,
            scheduledStart: true
          }
        }
      }
    });

    res.json({
      tournaments: participations.map(p => ({
        tournamentId: p.tournament.id,
        tournamentName: p.tournament.name,
        tournamentStatus: p.tournament.status,
        scheduledStart: p.tournament.scheduledStart,
        enteredAt: p.enteredAt,
        isEliminated: p.isEliminated,
        eliminatedAt: p.eliminatedAt,
        finalRank: p.finalRank
      }))
    });
  } catch (error) {
    console.error('Get tournament history error:', error);
    res.status(500).json({ error: 'Failed to fetch tournament history' });
  }
});

export default router;
