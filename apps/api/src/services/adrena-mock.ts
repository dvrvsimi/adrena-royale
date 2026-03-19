import { PositionData } from '@adrena-royale/shared';

// ─────────────────────────────────────────────────────────────────────
// MOCK DATA FOR DEVELOPMENT/TESTING
// ─────────────────────────────────────────────────────────────────────

const SYMBOLS = ['SOL', 'BTC', 'ETH', 'JUP', 'BONK'];
const SIDES: Array<'long' | 'short'> = ['long', 'short'];

// Deterministic random based on wallet address (for consistent results)
function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  return function() {
    hash = (hash * 1103515245 + 12345) & 0x7fffffff;
    return hash / 0x7fffffff;
  };
}

/**
 * Generate mock closed positions for a wallet within a time range
 * Creates realistic trading data for tournament scoring
 */
export function generateMockClosedPositions(
  wallet: string,
  startTime: number,
  endTime: number
): PositionData[] {
  const random = seededRandom(wallet);
  const positions: PositionData[] = [];

  // Generate 3-8 trades per wallet per round
  const numTrades = Math.floor(random() * 6) + 3;
  const duration = endTime - startTime;

  for (let i = 0; i < numTrades; i++) {
    const symbol = SYMBOLS[Math.floor(random() * SYMBOLS.length)];
    const side = SIDES[Math.floor(random() * SIDES.length)];

    // Random entry time within the round
    const entryOffset = random() * duration * 0.7; // Don't enter in last 30%
    const openTime = startTime + entryOffset;

    // Trade duration: 5 mins to 4 hours
    const tradeDuration = (5 + random() * 235) * 60 * 1000;
    const closeTime = Math.min(openTime + tradeDuration, endTime);

    // Position sizing: $100 to $5000
    const size = 100 + random() * 4900;
    const collateral = size / (2 + random() * 8); // 2-10x leverage

    // Entry price (varies by symbol)
    const basePrices: Record<string, number> = {
      SOL: 150,
      BTC: 65000,
      ETH: 3500,
      JUP: 1.2,
      BONK: 0.00002,
    };
    const basePrice = basePrices[symbol] || 100;
    const entryPrice = basePrice * (0.95 + random() * 0.1);

    // PnL: -30% to +50% of collateral (slightly positive bias)
    const pnlPercent = -0.3 + random() * 0.8;
    const pnl = collateral * pnlPercent;

    // Current price based on PnL
    const priceChange = side === 'long'
      ? (pnl / size) * entryPrice
      : -(pnl / size) * entryPrice;
    const currentPrice = entryPrice + priceChange;

    positions.push({
      wallet,
      pool: symbol,
      custody: symbol,
      side,
      size_usd: size,
      collateral_usd: collateral,
      entry_price: entryPrice,
      current_price: currentPrice,
      unrealized_profit_usd: pnl > 0 ? pnl : 0,
      unrealized_loss_usd: pnl < 0 ? Math.abs(pnl) : 0,
      open_time: openTime,
      close_time: closeTime,
      pnl,
    });
  }

  return positions;
}

/**
 * Generate mock open positions for a wallet
 */
export function generateMockOpenPositions(wallet: string): PositionData[] {
  const random = seededRandom(wallet + '_open');
  const positions: PositionData[] = [];

  // 0-3 open positions
  const numPositions = Math.floor(random() * 4);
  const now = Date.now();

  for (let i = 0; i < numPositions; i++) {
    const symbol = SYMBOLS[Math.floor(random() * SYMBOLS.length)];
    const side = SIDES[Math.floor(random() * SIDES.length)];

    const size = 100 + random() * 4900;
    const collateral = size / (2 + random() * 8);

    const basePrices: Record<string, number> = {
      SOL: 150,
      BTC: 65000,
      ETH: 3500,
      JUP: 1.2,
      BONK: 0.00002,
    };
    const basePrice = basePrices[symbol] || 100;
    const entryPrice = basePrice * (0.95 + random() * 0.1);

    // Open positions: unrealized PnL
    const pnlPercent = -0.2 + random() * 0.4;
    const pnl = collateral * pnlPercent;

    const priceChange = side === 'long'
      ? (pnl / size) * entryPrice
      : -(pnl / size) * entryPrice;
    const currentPrice = entryPrice + priceChange;

    // Opened 1-24 hours ago
    const openTime = now - (1 + random() * 23) * 60 * 60 * 1000;

    positions.push({
      wallet,
      pool: symbol,
      custody: symbol,
      side,
      size_usd: size,
      collateral_usd: collateral,
      entry_price: entryPrice,
      current_price: currentPrice,
      unrealized_profit_usd: pnl > 0 ? pnl : 0,
      unrealized_loss_usd: pnl < 0 ? Math.abs(pnl) : 0,
      open_time: openTime,
      pnl,
    });
  }

  return positions;
}

/**
 * Generate mock trading streak data for a wallet
 */
export function generateMockStreak(wallet: string): { days7: number; days30: number } {
  const random = seededRandom(wallet + '_streak');

  return {
    days7: Math.floor(random() * 8),   // 0-7 days
    days30: Math.floor(random() * 31), // 0-30 days
  };
}

/**
 * Generate mock mutagen balance
 */
export function generateMockMutagen(wallet: string): { balance: number; rank: number } {
  const random = seededRandom(wallet + '_mutagen');

  return {
    balance: Math.floor(random() * 10000),
    rank: Math.floor(random() * 1000) + 1,
  };
}
