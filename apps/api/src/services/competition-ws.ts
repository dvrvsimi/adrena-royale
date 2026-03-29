import WebSocket from 'ws';
import { EventEmitter } from 'events';
import {
  getCompetitionWebSocketUrl,
  ClosePositionEvent,
  AccountUpdateMessage,
  TransactionUpdateMessage,
  CompetitionWSMessage,
  mapClosePositionEvent,
  decodePositionFromHex,
  mapDecodedPosition,
  DecodedPosition,
  parseUsdString,
} from './adrena';
import { PositionData } from '@adrena-royale/shared';
import { prisma } from '../db/client';

// ─────────────────────────────────────────────────────────────────────
// COMPETITION SERVICE WEBSOCKET CLIENT
// ─────────────────────────────────────────────────────────────────────

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

interface CompetitionWSEvents {
  connected: () => void;
  disconnected: (code: number, reason: string) => void;
  error: (error: Error) => void;
  closePosition: (event: ClosePositionEvent, position: PositionData) => void;
  accountUpdate: (event: AccountUpdateMessage, decoded: DecodedPosition | null) => void;
  transaction: (event: TransactionUpdateMessage) => void;
  message: (data: CompetitionWSMessage) => void;
}

class CompetitionWebSocket extends EventEmitter {
  private ws: WebSocket | null = null;
  private state: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 30000; // Max 30 seconds
  private pingInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor() {
    super();
  }

  /**
   * Connect to the Competition Service WebSocket
   */
  connect(): void {
    if (this.state === 'connected' || this.state === 'connecting') {
      console.log('[CompetitionWS] Already connected or connecting');
      return;
    }

    this.state = 'connecting';
    const url = getCompetitionWebSocketUrl();
    console.log('[CompetitionWS] Connecting to:', url.replace(/\/[^/]+$/, '/***'));

    try {
      this.ws = new WebSocket(url);

      this.ws.on('open', () => {
        this.state = 'connected';
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        console.log('[CompetitionWS] Connected');
        this.emit('connected');
        this.startPing();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          console.error('[CompetitionWS] Failed to parse message:', error);
        }
      });

      this.ws.on('close', (code: number, reason: Buffer) => {
        this.state = 'disconnected';
        this.stopPing();
        const reasonStr = reason.toString() || 'Unknown';
        console.log(`[CompetitionWS] Disconnected: ${code} - ${reasonStr}`);
        this.emit('disconnected', code, reasonStr);
        this.scheduleReconnect();
      });

      this.ws.on('error', (error: Error) => {
        console.error('[CompetitionWS] Error:', error.message);
        this.emit('error', error);
      });
    } catch (error) {
      console.error('[CompetitionWS] Connection failed:', error);
      this.state = 'disconnected';
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from the WebSocket
   */
  disconnect(): void {
    this.state = 'disconnected';
    this.stopPing();

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    console.log('[CompetitionWS] Disconnected by client');
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: unknown): void {
    if (typeof message !== 'object' || message === null || !('type' in message)) {
      return;
    }

    const msg = message as CompetitionWSMessage;
    this.emit('message', msg);

    switch (msg.type) {
      case 'close_position': {
        const position = mapClosePositionEvent(msg);
        this.emit('closePosition', msg, position);
        break;
      }

      case 'account': {
        // Position account update
        const decoded = decodePositionFromHex(msg.data.data);
        this.emit('accountUpdate', msg, decoded);
        break;
      }

      case 'transaction': {
        // Transaction with logs (may contain close events)
        this.emit('transaction', msg);
        break;
      }
    }
  }

  /**
   * Schedule a reconnection attempt with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[CompetitionWS] Max reconnect attempts reached');
      return;
    }

    this.state = 'reconnecting';
    this.reconnectAttempts++;

    // Exponential backoff with jitter
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1) + Math.random() * 1000,
      this.maxReconnectDelay
    );

    console.log(
      `[CompetitionWS] Reconnecting in ${Math.round(delay / 1000)}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Start ping interval to keep connection alive
   */
  private startPing(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws && this.state === 'connected') {
        this.ws.ping();
      }
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Stop ping interval
   */
  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state === 'connected';
  }

  // Type-safe event emitter methods
  on<K extends keyof CompetitionWSEvents>(
    event: K,
    listener: CompetitionWSEvents[K]
  ): this {
    return super.on(event, listener);
  }

  emit<K extends keyof CompetitionWSEvents>(
    event: K,
    ...args: Parameters<CompetitionWSEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }
}

// Singleton instance
export const competitionWS = new CompetitionWebSocket();

// ─────────────────────────────────────────────────────────────────────
// POSITION EVENT TRACKING
// ─────────────────────────────────────────────────────────────────────

// Track recent close events for deduplication
const recentCloseEvents = new Map<string, number>();
const CLOSE_EVENT_TTL_MS = 60000; // Keep for 1 minute

/**
 * Persist a close position event to the database
 * Uses upsert to handle duplicates gracefully
 */
async function persistCloseEvent(event: ClosePositionEvent): Promise<void> {
  const decoded = event.decoded;
  const signature = event.raw.signature;

  // Skip if already processed recently (in-memory dedup)
  if (recentCloseEvents.has(signature)) {
    return;
  }
  recentCloseEvents.set(signature, Date.now());

  try {
    await prisma.trade.upsert({
      where: { signature },
      create: {
        positionId: decoded.positionId,
        wallet: decoded.owner,
        signature,
        custody: decoded.custodyMint.slice(0, 8), // Short symbol, will map later
        custodyMint: decoded.custodyMint,
        side: decoded.side.toLowerCase(),
        sizeUsd: parseUsdString(decoded.sizeUsd),
        collateralUsd: parseUsdString(decoded.collateralAmountUsd),
        entryPrice: parseUsdString(decoded.price),
        profitUsd: parseUsdString(decoded.profitUsd),
        lossUsd: parseUsdString(decoded.lossUsd),
        netPnl: parseUsdString(decoded.netPnl),
        borrowFeeUsd: parseUsdString(decoded.borrowFeeUsd),
        exitFeeUsd: parseUsdString(decoded.exitFeeUsd),
        closeTime: new Date(event.timestamp),
        percentClosed: parseFloat(decoded.percentageClosed) || 100,
        slot: event.raw.slot,
        rawEvent: JSON.parse(JSON.stringify(event)),
      },
      update: {}, // No update needed, just skip duplicates
    });

    console.log(
      `[CompetitionWS] Persisted trade: ${decoded.owner.slice(0, 8)}... ` +
        `${decoded.side} ${decoded.sizeUsd} PnL: ${decoded.netPnl}`
    );
  } catch (error) {
    console.error('[CompetitionWS] Failed to persist trade:', error);
  }
}

/**
 * Register a callback for position close events
 * Returns an unsubscribe function
 */
export function onPositionClose(
  callback: (event: ClosePositionEvent, position: PositionData) => void
): () => void {
  competitionWS.on('closePosition', callback);

  return () => {
    competitionWS.removeListener('closePosition', callback);
  };
}

/**
 * Register a callback for position close events filtered by wallet
 * Returns an unsubscribe function
 */
export function onWalletPositionClose(
  wallet: string,
  callback: (event: ClosePositionEvent, position: PositionData) => void
): () => void {
  const filteredCallback = (event: ClosePositionEvent, position: PositionData) => {
    if (event.decoded.owner === wallet) {
      callback(event, position);
    }
  };

  competitionWS.on('closePosition', filteredCallback);

  return () => {
    competitionWS.removeListener('closePosition', filteredCallback);
  };
}

/**
 * Initialize WebSocket connection (call on server startup)
 */
export function initCompetitionWebSocket(): void {
  console.log('[CompetitionWS] Initializing...');
  competitionWS.connect();

  // Log connection events
  competitionWS.on('connected', () => {
    console.log('[CompetitionWS] Ready to receive position events');
  });

  // Persist all close events to database
  competitionWS.on('closePosition', (event) => {
    persistCloseEvent(event).catch((err) => {
      console.error('[CompetitionWS] Error in persistCloseEvent:', err);
    });
  });

  // Cleanup stale events periodically
  setInterval(() => {
    const now = Date.now();
    for (const [key, timestamp] of recentCloseEvents) {
      if (now - timestamp > CLOSE_EVENT_TTL_MS) {
        recentCloseEvents.delete(key);
      }
    }
  }, 30000);
}

/**
 * Shutdown WebSocket connection (call on server shutdown)
 */
export function shutdownCompetitionWebSocket(): void {
  console.log('[CompetitionWS] Shutting down...');
  competitionWS.disconnect();
}
