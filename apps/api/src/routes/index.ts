import { Router } from 'express';
import tournamentsRouter from './tournaments';
import participantsRouter from './participants';
import adminRouter from './admin';
import profileRouter from './profile';
import liquidityRouter from './liquidity';
import { getCompetitionHealth, getSizeMultiplierTable, calculateSizeMultiplier } from '../services/adrena';
import { competitionWS } from '../services/competition-ws';

const router = Router();

// Health check
router.get('/health', async (req, res) => {
  let competitionStatus = 'unknown';
  try {
    await getCompetitionHealth();
    competitionStatus = 'ok';
  } catch {
    competitionStatus = 'error';
  }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      competition: competitionStatus,
      websocket: competitionWS.isConnected() ? 'connected' : 'disconnected',
    },
  });
});

// Mount routes
router.use('/tournaments', tournamentsRouter);
router.use('/participants', participantsRouter);
router.use('/admin', adminRouter);
router.use('/profile', profileRouter);
router.use('/liquidity', liquidityRouter);

// ─────────────────────────────────────────────────────────────────────
// COMPETITION SERVICE ENDPOINTS
// ─────────────────────────────────────────────────────────────────────

// Get size multiplier lookup table
router.get('/size-multiplier', async (req, res) => {
  try {
    const data = await getSizeMultiplierTable();
    res.json({ data });
  } catch (error) {
    console.error('Get size multiplier error:', error);
    res.status(500).json({ error: 'Failed to fetch size multiplier table' });
  }
});

// Calculate size multiplier for a given size
router.get('/size-multiplier/calculate', async (req, res) => {
  try {
    const size = parseFloat(req.query.size as string);
    if (isNaN(size) || size <= 0) {
      res.status(400).json({ error: 'Invalid size parameter' });
      return;
    }

    const result = await calculateSizeMultiplier(size);
    res.json({ data: result });
  } catch (error) {
    console.error('Calculate size multiplier error:', error);
    res.status(500).json({ error: 'Failed to calculate size multiplier' });
  }
});

export default router;
