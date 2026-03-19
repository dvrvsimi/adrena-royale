import {
  PositionData,
  TradeScore,
  RoundScoreResult,
  ScoringConfig,
  DEFAULT_SCORING_CONFIG
} from '@adrena-royale/shared';
import { getClosedPositionsInTimeRange, getUtilizationBySymbol } from './adrena';

// ─────────────────────────────────────────────────────────────────────
// SIZE MULTIPLIER (from Adrena Competition Service)
// ─────────────────────────────────────────────────────────────────────

interface SizeMultiplierTier {
  minSize: number;
  maxSize: number;
  multiplierMin: number;
  multiplierMax: number;
}

// Official Adrena size multiplier tiers (linear interpolation within each tier)
const SIZE_MULTIPLIER_TIERS: SizeMultiplierTier[] = [
  { minSize: 10, maxSize: 1_000, multiplierMin: 0.00025, multiplierMax: 0.05 },
  { minSize: 1_000, maxSize: 5_000, multiplierMin: 0.05, multiplierMax: 1 },
  { minSize: 5_000, maxSize: 50_000, multiplierMin: 1, multiplierMax: 5 },
  { minSize: 50_000, maxSize: 100_000, multiplierMin: 5, multiplierMax: 9 },
  { minSize: 100_000, maxSize: 250_000, multiplierMin: 9, multiplierMax: 17.5 },
  { minSize: 250_000, maxSize: 500_000, multiplierMin: 17.5, multiplierMax: 25 },
  { minSize: 500_000, maxSize: 1_000_000, multiplierMin: 25, multiplierMax: 30 },
  { minSize: 1_000_000, maxSize: 4_500_000, multiplierMin: 30, multiplierMax: 45 },
];

/**
 * Calculate size multiplier for a given position size
 * Uses linear interpolation within tiers
 * Returns 0 for sizes below $10 or above $4.5M
 */
export function calculateSizeMultiplier(sizeUsd: number): number {
  // Below minimum or above maximum = 0
  if (sizeUsd < 10 || sizeUsd > 4_500_000) {
    return 0;
  }

  // Find the appropriate tier
  const tier = SIZE_MULTIPLIER_TIERS.find(
    t => sizeUsd >= t.minSize && sizeUsd < t.maxSize
  );

  if (!tier) {
    // Edge case: exactly at max boundary
    if (sizeUsd === 4_500_000) {
      return 45;
    }
    return 0;
  }

  // Linear interpolation within tier
  const multiplier = tier.multiplierMin +
    ((sizeUsd - tier.minSize) * (tier.multiplierMax - tier.multiplierMin)) /
    (tier.maxSize - tier.minSize);

  return multiplier;
}

// ─────────────────────────────────────────────────────────────────────
// TRADE SCORE CALCULATION
// ─────────────────────────────────────────────────────────────────────

export async function calculateTradeScore(
  position: PositionData,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG
): Promise<TradeScore> {
  const size = position.size_usd;
  const collateral = position.collateral_usd;
  const pnl = position.pnl ?? (position.unrealized_profit_usd - position.unrealized_loss_usd);
  const durationMins = position.close_time
    ? (position.close_time - position.open_time) / 60000
    : 0;

  // ─────────────────────────────────────────────────────────────────
  // Step 1: Exclusion Checks
  // ─────────────────────────────────────────────────────────────────

  // Below minimum notional
  if (size < config.minNotionalSize) {
    return {
      positionId: `${position.wallet}-${position.open_time}`,
      pair: position.custody,
      side: position.side,
      size,
      collateral,
      pnl,
      durationMins,
      riskAdjustedReturn: 0,
      durationMultiplier: 0,
      sizeMultiplier: 0,
      finalScore: 0,
      excluded: true,
      exclusionReason: 'below_min_size'
    };
  }

  // Wash trade detection (< 1 min, < 0.1% P&L)
  const pnlPercent = Math.abs(pnl / size);
  if (durationMins < 1 && pnlPercent < 0.001) {
    return {
      positionId: `${position.wallet}-${position.open_time}`,
      pair: position.custody,
      side: position.side,
      size,
      collateral,
      pnl,
      durationMins,
      riskAdjustedReturn: 0,
      durationMultiplier: 0,
      sizeMultiplier: 0,
      finalScore: 0,
      excluded: true,
      exclusionReason: 'wash_trade'
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // Step 2: Risk-Adjusted Return
  // ─────────────────────────────────────────────────────────────────

  // P&L as percentage of position size (not collateral, to normalize leverage)
  const riskAdjustedReturn = pnl / size;

  // ─────────────────────────────────────────────────────────────────
  // Step 3: Duration Multiplier (Anti-Sniping)
  // ─────────────────────────────────────────────────────────────────

  let durationMultiplier: number;

  if (durationMins < config.snipePenaltyMins) {
    // Penalty for scalps
    durationMultiplier = config.snipePenaltyMultiplier;
  } else if (durationMins >= config.convictionThresholdMins) {
    // Max bonus for conviction
    durationMultiplier = config.maxDurationBonus;
  } else {
    // Linear interpolation between 1.0 and max
    const progress = (durationMins - config.snipePenaltyMins) /
                     (config.convictionThresholdMins - config.snipePenaltyMins);
    durationMultiplier = 1.0 + (progress * (config.maxDurationBonus - 1.0));
  }

  // ─────────────────────────────────────────────────────────────────
  // Step 4: Size Multiplier (Adrena Competition)
  // ─────────────────────────────────────────────────────────────────

  const sizeMultiplier = calculateSizeMultiplier(size);

  // ─────────────────────────────────────────────────────────────────
  // Step 5: Utilization Multiplier (Optional)
  // ─────────────────────────────────────────────────────────────────

  let utilizationMultiplier = 1.0;

  if (config.utilizationBonusEnabled) {
    try {
      // position.custody contains the symbol (e.g., "SOL", "BTC")
      const utilization = await getUtilizationBySymbol(position.custody);

      if (utilization !== null && utilization > config.utilizationThreshold) {
        utilizationMultiplier = config.utilizationBonusMultiplier;
      }
    } catch (error) {
      // Gracefully handle API errors - no bonus applied
      console.warn(`Could not fetch utilization for ${position.custody}, no bonus applied`);
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Step 6: Final Score
  // ─────────────────────────────────────────────────────────────────

  // Final score = PnL% × Duration × Size × Utilization
  // Note: sizeMultiplier can be 0 for tiny (<$10) or huge (>$4.5M) positions
  const finalScore = riskAdjustedReturn * durationMultiplier * sizeMultiplier * utilizationMultiplier;

  return {
    positionId: `${position.wallet}-${position.open_time}`,
    pair: position.custody,
    side: position.side,
    size,
    collateral,
    pnl,
    durationMins,
    riskAdjustedReturn,
    durationMultiplier,
    sizeMultiplier,
    utilizationMultiplier: config.utilizationBonusEnabled ? utilizationMultiplier : undefined,
    finalScore,
    excluded: false
  };
}

// ─────────────────────────────────────────────────────────────────────
// ROUND SCORE CALCULATION
// ─────────────────────────────────────────────────────────────────────

export async function calculateRoundScore(
  wallet: string,
  roundStartTime: number,
  roundEndTime: number,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG
): Promise<RoundScoreResult> {
  // Fetch closed positions in round window
  const positions = await getClosedPositionsInTimeRange(
    wallet,
    roundStartTime,
    roundEndTime
  );

  // Score each trade (now async due to utilization lookup)
  const trades = await Promise.all(
    positions.map(p => calculateTradeScore(p, config))
  );

  // Aggregate
  const validTrades = trades.filter(t => !t.excluded);
  const rawScore = validTrades.reduce((sum, t) => sum + t.finalScore, 0);
  const totalVolume = validTrades.reduce((sum, t) => sum + t.size, 0);
  const totalPnl = validTrades.reduce((sum, t) => sum + t.pnl, 0);

  return {
    wallet,
    trades,
    rawScore,
    finalScore: rawScore, // Can add bonuses later
    tradesCount: validTrades.length,
    totalVolume,
    totalPnl
  };
}
