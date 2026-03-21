import { Connection, PublicKey } from '@solana/web3.js';
import { PositionData, LiquidityInfo, LiquidityApiResponse, CustodyInfo } from '@adrena-royale/shared';
import { env, isDevelopment } from '../config/env';
import {
  generateMockClosedPositions,
  generateMockOpenPositions,
  generateMockMutagen,
  generateMockStreak,
} from './adrena-mock';

// Use mock data in development when API is unavailable
const USE_MOCK_DATA = isDevelopment;

// ─────────────────────────────────────────────────────────────────────
// SOLANA CONNECTION
// ─────────────────────────────────────────────────────────────────────

let connection: Connection | null = null;

export function getConnection(): Connection {
  if (!connection) {
    connection = new Connection(env.SOLANA_RPC_URL, 'confirmed');
  }
  return connection;
}

// ─────────────────────────────────────────────────────────────────────
// ADRENA PROGRAM IDS (Mainnet)
// ─────────────────────────────────────────────────────────────────────

const ADRENA_PROGRAM_ID = new PublicKey('13gDzEXCdocbj8iAiqrScGo47NiSuYENGsRqi3SEAwet');

// Position account discriminator (first 8 bytes of account data)
const POSITION_DISCRIMINATOR = Buffer.from([170, 188, 143, 228, 122, 64, 247, 208]);

// ─────────────────────────────────────────────────────────────────────
// CACHING (with TTL-based eviction)
// ─────────────────────────────────────────────────────────────────────

const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL_MS = 30000; // 30 seconds for on-chain data
const API_CACHE_TTL_MS = 60000; // 1 minute for API data
const MAX_CACHE_SIZE = 1000; // Prevent unbounded growth

function getCached<T>(key: string, ttl: number = CACHE_TTL_MS): T | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data as T;
  }
  // Remove expired entry
  if (cached) {
    cache.delete(key);
  }
  return null;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// Periodic cache cleanup (every 60 seconds)
function evictExpiredCache(): void {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    const ttl = key.startsWith('api:') ? API_CACHE_TTL_MS : CACHE_TTL_MS;
    if (now - value.timestamp > ttl) {
      cache.delete(key);
    }
  }
  // If still too large, evict oldest entries
  if (cache.size > MAX_CACHE_SIZE) {
    const entries = [...cache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toDelete = entries.slice(0, cache.size - MAX_CACHE_SIZE);
    toDelete.forEach(([key]) => cache.delete(key));
  }
}

// Start eviction interval
setInterval(evictExpiredCache, 60000);

// ─────────────────────────────────────────────────────────────────────
// DATA API (datapi.adrena.xyz) - REST ENDPOINTS
// ─────────────────────────────────────────────────────────────────────

const API_BASE = env.ADRENA_API_BASE_URL;

interface ApiPosition {
  pubkey: string;
  user_wallet: string;
  symbol: string;
  side: string;
  entry_size: number;
  entry_price: number;
  entry_collateral_amount: number;
  exit_price?: number;
  entry_date: string;
  exit_date?: string;
  pnl?: number;
  status: string;
}

async function fetchDataApi<T>(
  endpoint: string,
  params?: Record<string, string>
): Promise<T> {
  const url = new URL(endpoint, API_BASE);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Data API error: ${response.status} ${response.statusText}`);
  }

  // Check content-type to detect HTML error pages
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    const text = await response.text();
    if (text.toLowerCase().includes('suspended')) {
      throw new Error('Adrena Data API service has been suspended');
    }
    throw new Error('Adrena Data API returned unexpected HTML response');
  }

  return response.json() as Promise<T>;
}

// ─────────────────────────────────────────────────────────────────────
// POSITION DATA - HYBRID APPROACH
// ─────────────────────────────────────────────────────────────────────

/**
 * Get positions from Adrena Data API (historical + closed positions)
 * This is the primary method for tournament scoring
 */
export async function getWalletPositionsFromApi(wallet: string): Promise<PositionData[]> {
  const cacheKey = `api:positions:${wallet}`;
  const cached = getCached<PositionData[]>(cacheKey, API_CACHE_TTL_MS);
  if (cached) return cached;

  try {
    const response = await fetchDataApi<{ data: ApiPosition[] }>('/positions', {
      user_wallet: wallet,
    });

    const positions = (response.data || []).map(mapApiPosition);
    setCache(cacheKey, positions);
    return positions;
  } catch (error) {
    console.error(`Failed to fetch positions from API for ${wallet}:`, error);
    throw error;
  }
}

/**
 * Get OPEN positions directly from Solana (real-time)
 */
export async function getOpenPositionsOnChain(wallet: string): Promise<PositionData[]> {
  const cacheKey = `onchain:positions:${wallet}`;
  const cached = getCached<PositionData[]>(cacheKey);
  if (cached) return cached;

  try {
    const conn = getConnection();
    const walletPubkey = new PublicKey(wallet);

    // Find all position accounts owned by this wallet
    const accounts = await conn.getProgramAccounts(ADRENA_PROGRAM_ID, {
      filters: [
        { memcmp: { offset: 0, bytes: POSITION_DISCRIMINATOR.toString('base64') } },
        { memcmp: { offset: 8, bytes: walletPubkey.toBase58() } },
      ],
    });

    const positions: PositionData[] = [];

    for (const { pubkey, account } of accounts) {
      try {
        const position = parsePositionAccount(account.data, wallet);
        if (position) {
          positions.push(position);
        }
      } catch (e) {
        console.warn(`Failed to parse position ${pubkey.toBase58()}:`, e);
      }
    }

    setCache(cacheKey, positions);
    return positions;
  } catch (error) {
    console.error(`Failed to fetch on-chain positions for ${wallet}:`, error);
    throw error;
  }
}

/**
 * Get closed positions within a time range (for round scoring)
 * Uses Data API for historical data, or mock data in development
 */
export async function getClosedPositionsInTimeRange(
  wallet: string,
  startTime: number,
  endTime: number
): Promise<PositionData[]> {
  // Use mock data in development
  if (USE_MOCK_DATA) {
    console.log(`[MOCK] Generating closed positions for ${wallet}`);
    return generateMockClosedPositions(wallet, startTime, endTime);
  }

  try {
    const response = await fetchDataApi<{ data: ApiPosition[] }>('/positions', {
      user_wallet: wallet,
      status: 'CLOSED,LIQUIDATED',
    });

    const positions = (response.data || []).map(mapApiPosition);

    // Filter to those closing within our time window
    return positions.filter(
      (p) => p.close_time && p.close_time >= startTime && p.close_time <= endTime
    );
  } catch (error) {
    console.error(`Failed to fetch closed positions for ${wallet}:`, error);
    // Fallback to mock in case of API failure
    if (isDevelopment) {
      console.log(`[MOCK FALLBACK] Generating closed positions for ${wallet}`);
      return generateMockClosedPositions(wallet, startTime, endTime);
    }
    return [];
  }
}

/**
 * Combined: get all positions (API + on-chain fallback)
 */
export async function getWalletPositions(wallet: string): Promise<PositionData[]> {
  // Use mock data in development
  if (USE_MOCK_DATA) {
    console.log(`[MOCK] Generating positions for ${wallet}`);
    return generateMockOpenPositions(wallet);
  }

  try {
    // Try API first (includes historical data)
    return await getWalletPositionsFromApi(wallet);
  } catch {
    // Fall back to on-chain (only open positions)
    console.warn(`Falling back to on-chain data for ${wallet}`);
    return await getOpenPositionsOnChain(wallet);
  }
}

// ─────────────────────────────────────────────────────────────────────
// POSITION PARSING
// ─────────────────────────────────────────────────────────────────────

function mapApiPosition(p: ApiPosition): PositionData {
  return {
    wallet: p.user_wallet || p.pubkey,
    pool: p.symbol,
    custody: p.symbol,
    side: p.side.toLowerCase() as 'long' | 'short',
    size_usd: p.entry_size * p.entry_price,
    collateral_usd: p.entry_collateral_amount,
    entry_price: p.entry_price,
    current_price: p.exit_price || p.entry_price,
    unrealized_profit_usd: p.pnl && p.pnl > 0 ? p.pnl : 0,
    unrealized_loss_usd: p.pnl && p.pnl < 0 ? Math.abs(p.pnl) : 0,
    open_time: new Date(p.entry_date).getTime(),
    close_time: p.exit_date ? new Date(p.exit_date).getTime() : undefined,
    pnl: p.pnl,
  };
}

/**
 * Parse position account data from Solana
 * Based on Adrena position account structure
 */
function parsePositionAccount(data: Buffer, wallet: string): PositionData | null {
  if (data.length < 200) return null;

  try {
    // Skip discriminator (8 bytes)
    let offset = 8;

    // Owner pubkey (32 bytes) - already filtered
    offset += 32;

    // Pool pubkey (32 bytes)
    const pool = new PublicKey(data.slice(offset, offset + 32)).toBase58();
    offset += 32;

    // Custody pubkey (32 bytes)
    const custody = new PublicKey(data.slice(offset, offset + 32)).toBase58();
    offset += 32;

    // Side (1 byte): 0 = long, 1 = short
    const sideNum = data.readUInt8(offset);
    const side = sideNum === 0 ? 'long' : 'short';
    offset += 1;

    // Size (u64, 8 bytes) - in native units
    const sizeRaw = data.readBigUInt64LE(offset);
    offset += 8;

    // Collateral (u64, 8 bytes)
    const collateralRaw = data.readBigUInt64LE(offset);
    offset += 8;

    // Entry price (u64, 8 bytes) - scaled by 10^6
    const entryPriceRaw = data.readBigUInt64LE(offset);
    offset += 8;

    // Open time (i64, 8 bytes) - Unix timestamp
    const openTime = Number(data.readBigInt64LE(offset)) * 1000;
    offset += 8;

    // Unrealized PnL (i64, 8 bytes)
    const pnlRaw = data.readBigInt64LE(offset);

    // Convert from raw values (assuming 6 decimal places)
    const size_usd = Number(sizeRaw) / 1e6;
    const collateral_usd = Number(collateralRaw) / 1e6;
    const entry_price = Number(entryPriceRaw) / 1e6;
    const pnl = Number(pnlRaw) / 1e6;

    return {
      wallet,
      pool,
      custody,
      side: side as 'long' | 'short',
      size_usd,
      collateral_usd,
      entry_price,
      current_price: entry_price, // Would need oracle for current
      unrealized_profit_usd: pnl > 0 ? pnl : 0,
      unrealized_loss_usd: pnl < 0 ? Math.abs(pnl) : 0,
      open_time: openTime,
      pnl,
    };
  } catch (e) {
    console.error('Failed to parse position account:', e);
    return null;
  }
}

/**
 * Check if position is eligible for round scoring
 */
export function isPositionEligibleForRound(
  position: PositionData,
  roundStartMs: number,
  roundEndMs: number
): boolean {
  if (!position.close_time) return false;
  return position.close_time >= roundStartMs && position.close_time <= roundEndMs;
}

// ─────────────────────────────────────────────────────────────────────
// MUTAGEN DATA (from Data API)
// ─────────────────────────────────────────────────────────────────────

export interface MutagenData {
  wallet: string;
  balance: number;
  rank?: number;
}

export async function getWalletMutagen(wallet: string): Promise<MutagenData> {
  // Use mock data in development
  if (USE_MOCK_DATA) {
    const mock = generateMockMutagen(wallet);
    return { wallet, balance: mock.balance, rank: mock.rank };
  }

  const cacheKey = `mutagen:${wallet}`;
  const cached = getCached<MutagenData>(cacheKey, API_CACHE_TTL_MS);
  if (cached) return cached;

  try {
    const response = await fetchDataApi<{ mutagen: number; rank?: number }>('/mutagen', {
      wallet,
    });

    const data: MutagenData = {
      wallet,
      balance: response.mutagen || 0,
      rank: response.rank,
    };

    setCache(cacheKey, data);
    return data;
  } catch (error) {
    console.error(`Failed to fetch mutagen for ${wallet}:`, error);
    return { wallet, balance: 0 };
  }
}

// ─────────────────────────────────────────────────────────────────────
// TRADER INFO (from Data API)
// ─────────────────────────────────────────────────────────────────────

export interface TraderInfo {
  wallet: string;
  totalVolume: number;
  totalTrades: number;
  winRate: number;
  pnl: number;
}

export async function getTraderInfo(wallet: string): Promise<TraderInfo> {
  const cacheKey = `trader:${wallet}`;
  const cached = getCached<TraderInfo>(cacheKey, API_CACHE_TTL_MS);
  if (cached) return cached;

  try {
    const response = await fetchDataApi<{
      volume?: number;
      trades?: number;
      win_rate?: number;
      pnl?: number;
    }>('/trader', { wallet });

    const data: TraderInfo = {
      wallet,
      totalVolume: response.volume || 0,
      totalTrades: response.trades || 0,
      winRate: response.win_rate || 0,
      pnl: response.pnl || 0,
    };

    setCache(cacheKey, data);
    return data;
  } catch (error) {
    console.error(`Failed to fetch trader info for ${wallet}:`, error);
    return { wallet, totalVolume: 0, totalTrades: 0, winRate: 0, pnl: 0 };
  }
}

// ─────────────────────────────────────────────────────────────────────
// LIQUIDITY INFO (from Data API)
// ─────────────────────────────────────────────────────────────────────

// Separate cache for liquidity data (global, not per-wallet)
let liquidityCache: { data: LiquidityInfo; timestamp: number } | null = null;
const LIQUIDITY_CACHE_TTL_MS = 60000; // 60 seconds as per API spec

/**
 * Fetch liquidity info from Adrena API
 * Returns pool-level liquidity metrics including per-custody utilization
 * Uses 60-second TTL caching
 */
export async function getLiquidityInfo(): Promise<LiquidityInfo> {
  // Check cache first
  if (liquidityCache && Date.now() - liquidityCache.timestamp < LIQUIDITY_CACHE_TTL_MS) {
    return liquidityCache.data;
  }

  try {
    const response = await fetchDataApi<LiquidityApiResponse>('/liquidity-info');

    if (!response.success) {
      throw new Error('Liquidity API returned success: false');
    }

    // Map raw API response to our internal types
    const totalPoolValueUsd = parseFloat(response.data.aumUsd) / 1_000_000;

    const custodies: CustodyInfo[] = response.data.custodies.map((c) => {
      const aumUsd = parseFloat(c.aumUsd) / 1_000_000;
      const owned = parseFloat(c.owned) / 1_000_000;
      const locked = parseFloat(c.locked) / 1_000_000;

      return {
        symbol: c.symbol,
        mint: c.mint,
        currentRatio: parseFloat(c.currentWeightagePct) / 100,   // "12.50" -> 0.125
        targetRatio: parseFloat(c.targetWeightagePct) / 100,     // "20.00" -> 0.2
        utilization: parseFloat(c.utilizationPct) / 100,         // "18.35" -> 0.1835
        aumUsd,
        liquidityUsd: owned - locked, // Available = owned - locked
      };
    });

    const liquidityInfo: LiquidityInfo = {
      totalPoolValueUsd,
      custodies,
      fetchedAt: Date.now(),
    };

    // Update cache
    liquidityCache = {
      data: liquidityInfo,
      timestamp: Date.now(),
    };

    return liquidityInfo;
  } catch (error) {
    console.error('Failed to fetch liquidity info:', error);

    // Return stale cache if available (graceful degradation)
    if (liquidityCache) {
      console.warn('Returning stale liquidity cache due to API error');
      return liquidityCache.data;
    }

    throw error;
  }
}

/**
 * Get utilization rate for a specific custody symbol
 * Returns null if symbol not found or API unavailable
 */
export async function getUtilizationBySymbol(symbol: string): Promise<number | null> {
  try {
    const liquidityInfo = await getLiquidityInfo();

    // Case-insensitive symbol matching
    const custody = liquidityInfo.custodies.find(
      (c) => c.symbol.toUpperCase() === symbol.toUpperCase()
    );

    return custody?.utilization ?? null;
  } catch (error) {
    console.error(`Failed to get utilization for ${symbol}:`, error);
    return null;
  }
}

/**
 * Get custody info by symbol
 * Useful for detailed liquidity display
 */
export async function getCustodyBySymbol(symbol: string): Promise<CustodyInfo | null> {
  try {
    const liquidityInfo = await getLiquidityInfo();

    return (
      liquidityInfo.custodies.find(
        (c) => c.symbol.toUpperCase() === symbol.toUpperCase()
      ) ?? null
    );
  } catch (error) {
    console.error(`Failed to get custody info for ${symbol}:`, error);
    return null;
  }
}

/**
 * Clear liquidity cache (for testing or manual refresh)
 */
export function clearLiquidityCache(): void {
  liquidityCache = null;
}

// ─────────────────────────────────────────────────────────────────────
// COMPETITION SERVICE API
// ─────────────────────────────────────────────────────────────────────

const COMPETITION_API_BASE = env.ADRENA_COMPETITION_API_URL;
const COMPETITION_API_KEY = env.ADRENA_COMPETITION_API_KEY;

/**
 * Fetch from Competition Service API (uses API key in URL path)
 */
async function fetchCompetitionApi<T>(endpoint: string): Promise<T> {
  const url = `${COMPETITION_API_BASE}/${COMPETITION_API_KEY}${endpoint}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Competition API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Health check for Competition Service
 */
export async function getCompetitionHealth(): Promise<{ status: string }> {
  return fetchCompetitionApi('/health');
}

/**
 * Get size multiplier lookup table
 */
export async function getSizeMultiplierTable(): Promise<unknown> {
  const cacheKey = 'competition:size-multiplier';
  const cached = getCached<unknown>(cacheKey, API_CACHE_TTL_MS);
  if (cached) return cached;

  const data = await fetchCompetitionApi('/size-multiplier');
  setCache(cacheKey, data);
  return data;
}

/**
 * Calculate size multiplier for a given position size
 */
export async function calculateSizeMultiplier(sizeUsd: number): Promise<{ multiplier: number }> {
  return fetchCompetitionApi(`/size-multiplier/calculate?size=${sizeUsd}`);
}

/**
 * Get position schema documentation
 */
export async function getPositionSchema(): Promise<unknown> {
  return fetchCompetitionApi('/position-schema');
}

// ─────────────────────────────────────────────────────────────────────
// COMPETITION SERVICE WEBSOCKET TYPES
// ─────────────────────────────────────────────────────────────────────

// Account update message (position created/modified/closed)
export interface AccountUpdateMessage {
  type: 'account';
  filter: 'positions';
  timestamp: number;
  data: {
    pubkey: string;        // Base58 position PDA
    owner: string;         // Adrena program ID
    lamports: string;
    dataLength: number;    // 472 for positions
    data: string;          // Hex-encoded account data
    slot: string;
    isStartup: boolean;
  };
}

// Transaction update message (instruction executed)
export interface TransactionUpdateMessage {
  type: 'transaction';
  filter: 'adrena';
  timestamp: number;
  data: {
    signature: string;     // Base64 tx signature
    slot: string;
    logs: string[];        // Contains ClosePositionEvent data
    err: null | string;
  };
}

// Close position event (decoded by competition service)
export interface ClosePositionEvent {
  type: 'close_position';
  filter: 'close_position';
  timestamp: number;
  raw: {
    signature: string;
    slot: string;
    logs: string[];
    err: null | string;
  };
  decoded: {
    owner: string;
    position: string;
    custodyMint: string;
    side: 'Long' | 'Short';
    sizeUsd: string;      // e.g., "$164.535338"
    price: string;        // e.g., "$0.0607"
    collateralAmountUsd: string;
    profitUsd: string;
    lossUsd: string;
    netPnl: string;
    borrowFeeUsd: string;
    exitFeeUsd: string;
    positionId: string;
    percentageClosed: string;
  };
}

// Union type for all WebSocket messages
export type CompetitionWSMessage =
  | AccountUpdateMessage
  | TransactionUpdateMessage
  | ClosePositionEvent;

/**
 * Parse USD string from WebSocket event (e.g., "$164.535338" -> 164.535338)
 */
export function parseUsdString(usdString: string): number {
  return parseFloat(usdString.replace(/[$,]/g, '')) || 0;
}

/**
 * Convert ClosePositionEvent to PositionData format
 */
export function mapClosePositionEvent(event: ClosePositionEvent): PositionData {
  const decoded = event.decoded;
  const sizeUsd = parseUsdString(decoded.sizeUsd);
  const collateralUsd = parseUsdString(decoded.collateralAmountUsd);
  const price = parseUsdString(decoded.price);
  const profitUsd = parseUsdString(decoded.profitUsd);
  const lossUsd = parseUsdString(decoded.lossUsd);
  const netPnl = parseUsdString(decoded.netPnl);

  return {
    wallet: decoded.owner,
    pool: decoded.custodyMint,
    custody: decoded.custodyMint,
    side: decoded.side.toLowerCase() as 'long' | 'short',
    size_usd: sizeUsd,
    collateral_usd: collateralUsd,
    entry_price: price, // Note: this is exit price, entry not provided
    current_price: price,
    unrealized_profit_usd: profitUsd,
    unrealized_loss_usd: lossUsd,
    open_time: 0, // Not provided in close event
    close_time: event.timestamp,
    pnl: netPnl,
  };
}

/**
 * Get WebSocket URL for Competition Service
 */
export function getCompetitionWebSocketUrl(): string {
  return `wss://adrena-competition-service.onrender.com/${COMPETITION_API_KEY}`;
}

// ─────────────────────────────────────────────────────────────────────
// POSITION ACCOUNT DECODER (from hex-encoded WebSocket data)
// ─────────────────────────────────────────────────────────────────────

/**
 * Position account layout (472 bytes total):
 * - Bytes 0-7: Anchor discriminator
 * - Byte 8: bump
 * - Byte 9: side (0=None, 1=Long, 2=Short)
 * - Bytes 16-47: owner (Pubkey)
 * - Bytes 48-79: pool (Pubkey)
 * - Bytes 80-111: custody (Pubkey)
 * - Bytes 144-151: open_time (i64, seconds)
 * - Bytes 160-167: entry_price (u64, 6 decimals)
 * - Bytes 168-175: size_usd (u64, 6 decimals)
 * - Bytes 184-191: collateral_usd (u64, 6 decimals)
 * - Bytes 248-255: position_id (u64)
 * - Bytes 256-263: take_profit_price (u64, 6 decimals)
 * - Bytes 272-279: stop_loss_price (u64, 6 decimals)
 */
export interface DecodedPosition {
  side: 'long' | 'short' | 'none';
  owner: string;         // Base58 pubkey
  pool: string;          // Base58 pubkey
  custody: string;       // Base58 pubkey
  openTime: number;      // Unix timestamp (seconds)
  entryPrice: number;    // USD
  sizeUsd: number;       // USD
  collateralUsd: number; // USD
  positionId: number;
  takeProfitPrice: number; // USD (0 = not set)
  stopLossPrice: number;   // USD (0 = not set)
}

/**
 * Decode a position account from hex-encoded data (from WebSocket)
 * @param hexData - Hex string of the 472-byte position account
 */
export function decodePositionFromHex(hexData: string): DecodedPosition | null {
  try {
    const buf = Buffer.from(hexData, 'hex');

    if (buf.length < 280) {
      console.warn('Position data too short:', buf.length);
      return null;
    }

    // Side: byte 9 (0=None, 1=Long, 2=Short)
    const sideNum = buf.readUInt8(9);
    const side = sideNum === 1 ? 'long' : sideNum === 2 ? 'short' : 'none';

    // Owner: bytes 16-47 (32 bytes pubkey)
    const ownerBytes = buf.slice(16, 48);
    const owner = new PublicKey(ownerBytes).toBase58();

    // Pool: bytes 48-79
    const poolBytes = buf.slice(48, 80);
    const pool = new PublicKey(poolBytes).toBase58();

    // Custody: bytes 80-111
    const custodyBytes = buf.slice(80, 112);
    const custody = new PublicKey(custodyBytes).toBase58();

    // Open time: bytes 144-151 (i64, seconds)
    const openTime = Number(buf.readBigInt64LE(144));

    // Entry price: bytes 160-167 (u64, 6 decimals)
    const entryPrice = Number(buf.readBigUInt64LE(160)) / 1_000_000;

    // Size USD: bytes 168-175 (u64, 6 decimals)
    const sizeUsd = Number(buf.readBigUInt64LE(168)) / 1_000_000;

    // Collateral USD: bytes 184-191 (u64, 6 decimals)
    const collateralUsd = Number(buf.readBigUInt64LE(184)) / 1_000_000;

    // Position ID: bytes 248-255 (u64)
    const positionId = Number(buf.readBigUInt64LE(248));

    // Take profit price: bytes 256-263 (u64, 6 decimals)
    const takeProfitPrice = Number(buf.readBigUInt64LE(256)) / 1_000_000;

    // Stop loss price: bytes 272-279 (u64, 6 decimals)
    const stopLossPrice = Number(buf.readBigUInt64LE(272)) / 1_000_000;

    return {
      side,
      owner,
      pool,
      custody,
      openTime,
      entryPrice,
      sizeUsd,
      collateralUsd,
      positionId,
      takeProfitPrice,
      stopLossPrice,
    };
  } catch (error) {
    console.error('Failed to decode position from hex:', error);
    return null;
  }
}

/**
 * Convert decoded position to PositionData format
 */
export function mapDecodedPosition(decoded: DecodedPosition): PositionData | null {
  if (decoded.side === 'none') {
    return null;
  }

  return {
    wallet: decoded.owner,
    pool: decoded.pool,
    custody: decoded.custody,
    side: decoded.side as 'long' | 'short',
    size_usd: decoded.sizeUsd,
    collateral_usd: decoded.collateralUsd,
    entry_price: decoded.entryPrice,
    current_price: decoded.entryPrice, // Would need oracle for current
    unrealized_profit_usd: 0,
    unrealized_loss_usd: 0,
    open_time: decoded.openTime * 1000, // Convert to ms
  };
}
