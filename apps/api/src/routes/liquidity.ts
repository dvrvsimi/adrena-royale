import { Router } from 'express';
import { getLiquidityInfo, getCustodyBySymbol } from '../services/adrena';

const router = Router();

// ─────────────────────────────────────────────────────────────────────
// GET /api/liquidity - Get pool liquidity info
// ─────────────────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const liquidityInfo = await getLiquidityInfo();

    res.json({
      data: liquidityInfo,
    });
  } catch (error: any) {
    console.error('Get liquidity info error:', error);

    // Check if it's an API suspension or unavailability
    const errorMessage = error?.message?.toLowerCase() || '';
    if (errorMessage.includes('suspended') || errorMessage.includes('503') || errorMessage.includes('unavailable')) {
      res.status(503).json({ error: 'Adrena Data API is currently unavailable (service suspended or down)' });
      return;
    }

    res.status(500).json({ error: 'Failed to fetch liquidity info' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// GET /api/liquidity/:symbol - Get custody info by symbol
// ─────────────────────────────────────────────────────────────────────

router.get('/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const custody = await getCustodyBySymbol(symbol);

    if (!custody) {
      res.status(404).json({ error: `Custody not found for symbol: ${symbol}` });
      return;
    }

    res.json({
      data: custody,
    });
  } catch (error) {
    console.error(`Get custody info error for ${req.params.symbol}:`, error);
    res.status(500).json({ error: 'Failed to fetch custody info' });
  }
});

export default router;
