// ═══════════════════════════════════════════════════════════════════════
// TOURNAMENT TYPES
// ═══════════════════════════════════════════════════════════════════════

export type TournamentStatus =
  | 'SCHEDULED'
  | 'ENTRY_OPEN'
  | 'ACTIVE'
  | 'PAUSED'
  | 'COMPLETED'
  | 'CANCELLED';

export type EntryType =
  | 'FREE'
  | 'WHITELIST'
  | 'SOL_STAKE'
  | 'MUTAGEN_COMMIT';

export type RoundPhase =
  | 'PENDING'
  | 'ACTIVE'
  | 'SCORING'
  | 'ELIMINATING'
  | 'COMPLETE';

export type EliminationReason =
  | 'SCORE'
  | 'INACTIVE'
  | 'DISQUALIFIED';

export type PaymentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'REFUNDED'
  | 'FAILED';

// ═══════════════════════════════════════════════════════════════════════
// ROUND CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════

export interface RoundConfig {
  duration: number;           // Duration in minutes
  eliminationPercent: number; // 0.25 = 25% eliminated
}

// ═══════════════════════════════════════════════════════════════════════
// SCORING TYPES
// ═══════════════════════════════════════════════════════════════════════

export interface ScoringConfig {
  minNotionalSize: number;        // Default: 100 USD
  snipePenaltyMins: number;       // Default: 5 minutes
  snipePenaltyMultiplier: number; // Default: 0.5
  maxDurationBonus: number;       // Default: 1.5
  convictionThresholdMins: number; // Default: 120
  // Utilization bonus settings
  utilizationBonusEnabled: boolean;     // Default: false
  utilizationThreshold: number;          // Default: 0.70 (70%)
  utilizationBonusMultiplier: number;    // Default: 1.1
}

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  minNotionalSize: 100,
  snipePenaltyMins: 5,
  snipePenaltyMultiplier: 0.5,
  maxDurationBonus: 1.5,
  convictionThresholdMins: 120,
  // Utilization bonus disabled by default
  utilizationBonusEnabled: false,
  utilizationThreshold: 0.70,
  utilizationBonusMultiplier: 1.1
};

export interface TradeScore {
  positionId: string;
  pair: string;
  side: 'long' | 'short';
  size: number;
  collateral: number;
  pnl: number;
  durationMins: number;
  riskAdjustedReturn: number;
  durationMultiplier: number;
  sizeMultiplier: number;           // Adrena Competition size multiplier (0-45x)
  utilizationMultiplier?: number;   // Optional: only set when utilization bonus enabled
  finalScore: number;
  excluded: boolean;
  exclusionReason?: 'below_min_size' | 'wash_trade';
}

export interface RoundScoreResult {
  wallet: string;
  trades: TradeScore[];
  rawScore: number;
  finalScore: number;
  tradesCount: number;
  totalVolume: number;
  totalPnl: number;
}

// ═══════════════════════════════════════════════════════════════════════
// POSITION DATA (from Adrena SDK)
// ═══════════════════════════════════════════════════════════════════════

export interface PositionData {
  wallet: string;
  pool: string;
  custody: string;
  side: 'long' | 'short';
  size_usd: number;
  collateral_usd: number;
  entry_price: number;
  current_price: number;
  unrealized_profit_usd: number;
  unrealized_loss_usd: number;
  open_time: number;      // Unix timestamp ms
  close_time?: number;    // Unix timestamp ms (if closed)
  pnl?: number;           // Realized P&L (if closed)
}

// ═══════════════════════════════════════════════════════════════════════
// API RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════════════

export interface TournamentListItem {
  id: string;
  name: string;
  description: string | null;
  status: TournamentStatus;
  entryType: EntryType;
  entryFeeSol: number | null;
  entryFeeMutagen: number | null;
  scheduledStart: string;
  entryDeadline: string;
  currentRound: number;
  minParticipants: number;
  maxParticipants: number;
  participantCount: number;
}

export interface TournamentDetail extends TournamentListItem {
  actualStart: string | null;
  actualEnd: string | null;
  roundConfigs: RoundConfig[];
  minNotionalSize: number;
  snipePenaltyMins: number;
}

export interface ParticipantInfo {
  id: string;
  wallet: string;
  enteredAt: string;
  isEliminated: boolean;
  eliminatedAt: number | null;
  eliminationReason: EliminationReason | null;
  finalRank: number | null;
  shields: number;
}

export interface StandingsEntry {
  rank: number;
  wallet: string;
  finalScore: number;
  tradesCount: number;
  totalVolume: number;
  totalPnl: number;
  isEliminated: boolean;
  usedShield: boolean;
}

export interface UserProfile {
  wallet: string;
  badges: BadgeInfo[];
  tournaments: {
    total: number;
    wins: number;
    topTen: number;
  };
  streak: {
    current: number;
    longest: number;
  };
}

export interface BadgeInfo {
  id: string;
  badgeType: string;
  awardedAt: string;
  tournamentId: string | null;
}

// ═══════════════════════════════════════════════════════════════════════
// API REQUEST TYPES
// ═══════════════════════════════════════════════════════════════════════

export interface RegisterRequest {
  tournamentId: string;
  wallet: string;
  signature: string;
  message: string;
  txHash?: string; // For SOL_STAKE entries
}

export interface CreateTournamentRequest {
  name: string;
  description?: string;
  entryType: EntryType;
  entryFeeSol?: number;
  entryFeeMutagen?: number;
  scheduledStart: string;
  entryDeadline: string;
  roundConfigs: RoundConfig[];
  minParticipants?: number;
  maxParticipants?: number;
  minNotionalSize?: number;
  snipePenaltyMins?: number;
}

// ═══════════════════════════════════════════════════════════════════════
// LIQUIDITY INFO TYPES
// ═══════════════════════════════════════════════════════════════════════

export interface CustodyInfo {
  symbol: string;
  mint: string;
  currentRatio: number;      // Current weight as decimal (0-1)
  targetRatio: number;       // Target weight as decimal (0-1)
  utilization: number;       // Utilization as decimal (0-1)
  aumUsd: number;            // Assets under management in USD
  liquidityUsd: number;      // Available liquidity in USD
}

export interface LiquidityInfo {
  totalPoolValueUsd: number;
  custodies: CustodyInfo[];
  fetchedAt: number; // Unix timestamp ms for cache freshness
}

// Raw API response from datapi.adrena.trade/liquidity-info
export interface LiquidityApiResponse {
  success: boolean;
  error: string | null;
  data: {
    aumUsd: string;                    // String in micro-units (divide by 1e6)
    aumUsdFormatted: string;           // Human-readable
    custodies: Array<{
      pubkey: string;
      symbol: string;
      name: string;
      mint: string;
      aumUsd: string;                  // String in micro-units
      aumUsdFormatted: string;
      aumTokenAmount: string;
      currentWeightagePct: string;     // e.g. "12.50"
      targetWeightagePct: string;      // e.g. "20.00"
      utilizationPct: string;          // e.g. "18.35"
      owned: string;
      locked: string;
    }>;
  };
}
