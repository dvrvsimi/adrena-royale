import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { prisma } from '../db/client';

// ─────────────────────────────────────────────────────────────────────
// STANDINGS WEBSOCKET SERVER
// ─────────────────────────────────────────────────────────────────────

interface ClientConnection {
  ws: WebSocket;
  tournamentId: string | null;
  isAlive: boolean;
}

let wss: WebSocketServer | null = null;
const clients = new Map<WebSocket, ClientConnection>();

export interface StandingsUpdate {
  type: 'standings_update' | 'round_change' | 'elimination' | 'tournament_complete';
  tournamentId: string;
  roundNumber?: number;
  timestamp: number;
  data: any;
}

/**
 * Initialize WebSocket server for standings updates
 */
export function initStandingsWebSocket(server: Server): void {
  wss = new WebSocketServer({ server, path: '/ws/standings' });

  wss.on('connection', (ws: WebSocket) => {
    const client: ClientConnection = {
      ws,
      tournamentId: null,
      isAlive: true
    };
    clients.set(ws, client);

    console.log(`Standings WS: Client connected (${clients.size} total)`);

    // Handle incoming messages
    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        handleClientMessage(ws, message);
      } catch (error) {
        console.error('Standings WS: Invalid message', error);
      }
    });

    // Handle pong for keep-alive
    ws.on('pong', () => {
      const client = clients.get(ws);
      if (client) client.isAlive = true;
    });

    // Handle close
    ws.on('close', () => {
      clients.delete(ws);
      console.log(`Standings WS: Client disconnected (${clients.size} total)`);
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Connected to Adrena Royale standings feed',
      timestamp: Date.now()
    }));
  });

  // Keep-alive ping every 30 seconds
  const pingInterval = setInterval(() => {
    wss?.clients.forEach((ws) => {
      const client = clients.get(ws);
      if (client && !client.isAlive) {
        clients.delete(ws);
        return ws.terminate();
      }
      if (client) client.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(pingInterval);
  });

  console.log('Standings WebSocket server initialized at /ws/standings');
}

/**
 * Handle incoming client messages
 */
function handleClientMessage(ws: WebSocket, message: any): void {
  const client = clients.get(ws);
  if (!client) return;

  switch (message.type) {
    case 'subscribe':
      // Subscribe to specific tournament
      if (message.tournamentId) {
        client.tournamentId = message.tournamentId;
        console.log(`Standings WS: Client subscribed to tournament ${message.tournamentId}`);

        // Send current standings immediately
        sendCurrentStandings(ws, message.tournamentId);
      }
      break;

    case 'unsubscribe':
      client.tournamentId = null;
      break;

    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      break;
  }
}

/**
 * Send current standings to a specific client
 */
async function sendCurrentStandings(ws: WebSocket, tournamentId: string): Promise<void> {
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { currentRound: true, status: true }
    });

    if (!tournament || tournament.currentRound === 0) {
      ws.send(JSON.stringify({
        type: 'standings_update',
        tournamentId,
        roundNumber: 0,
        timestamp: Date.now(),
        data: { standings: [] }
      }));
      return;
    }

    const scores = await prisma.roundScore.findMany({
      where: {
        tournamentId,
        roundNumber: tournament.currentRound
      },
      orderBy: { finalScore: 'desc' },
      select: {
        wallet: true,
        finalScore: true,
        tradesCount: true,
        totalVolume: true,
        totalPnl: true,
        rank: true,
        isEliminated: true,
        usedShield: true
      }
    });

    const standings = scores.map((s, index) => ({
      rank: s.rank || index + 1,
      wallet: s.wallet,
      finalScore: s.finalScore,
      tradesCount: s.tradesCount,
      totalVolume: s.totalVolume,
      totalPnl: s.totalPnl,
      isEliminated: s.isEliminated,
      usedShield: s.usedShield
    }));

    ws.send(JSON.stringify({
      type: 'standings_update',
      tournamentId,
      roundNumber: tournament.currentRound,
      timestamp: Date.now(),
      data: { standings }
    }));
  } catch (error) {
    console.error('Standings WS: Failed to send standings', error);
  }
}

/**
 * Broadcast standings update to all subscribed clients
 */
export function broadcastStandingsUpdate(update: StandingsUpdate): void {
  if (!wss) return;

  const message = JSON.stringify(update);
  let sentCount = 0;

  clients.forEach((client) => {
    if (
      client.ws.readyState === WebSocket.OPEN &&
      client.tournamentId === update.tournamentId
    ) {
      client.ws.send(message);
      sentCount++;
    }
  });

  if (sentCount > 0) {
    console.log(`Standings WS: Broadcast ${update.type} to ${sentCount} clients`);
  }
}

/**
 * Broadcast standings update for a tournament
 */
export async function broadcastTournamentStandings(tournamentId: string): Promise<void> {
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { currentRound: true, status: true }
    });

    if (!tournament) return;

    const scores = await prisma.roundScore.findMany({
      where: {
        tournamentId,
        roundNumber: tournament.currentRound
      },
      orderBy: { finalScore: 'desc' },
      select: {
        wallet: true,
        finalScore: true,
        tradesCount: true,
        totalVolume: true,
        totalPnl: true,
        rank: true,
        isEliminated: true,
        usedShield: true
      }
    });

    const standings = scores.map((s, index) => ({
      rank: s.rank || index + 1,
      wallet: s.wallet,
      finalScore: s.finalScore,
      tradesCount: s.tradesCount,
      totalVolume: s.totalVolume,
      totalPnl: s.totalPnl,
      isEliminated: s.isEliminated,
      usedShield: s.usedShield
    }));

    broadcastStandingsUpdate({
      type: 'standings_update',
      tournamentId,
      roundNumber: tournament.currentRound,
      timestamp: Date.now(),
      data: { standings }
    });
  } catch (error) {
    console.error('Standings WS: Failed to broadcast standings', error);
  }
}

/**
 * Broadcast round change event
 */
export function broadcastRoundChange(
  tournamentId: string,
  roundNumber: number,
  phase: string
): void {
  broadcastStandingsUpdate({
    type: 'round_change',
    tournamentId,
    roundNumber,
    timestamp: Date.now(),
    data: { phase }
  });
}

/**
 * Broadcast elimination event
 */
export function broadcastEliminations(
  tournamentId: string,
  roundNumber: number,
  eliminated: string[],
  shieldSaves: string[]
): void {
  broadcastStandingsUpdate({
    type: 'elimination',
    tournamentId,
    roundNumber,
    timestamp: Date.now(),
    data: { eliminated, shieldSaves }
  });
}

/**
 * Broadcast tournament completion
 */
export function broadcastTournamentComplete(
  tournamentId: string,
  winner: string | null
): void {
  broadcastStandingsUpdate({
    type: 'tournament_complete',
    tournamentId,
    timestamp: Date.now(),
    data: { winner }
  });
}

/**
 * Get WebSocket server stats
 */
export function getStandingsWSStats(): {
  connected: number;
  subscriptions: Record<string, number>;
} {
  const subscriptions: Record<string, number> = {};

  clients.forEach((client) => {
    if (client.tournamentId) {
      subscriptions[client.tournamentId] = (subscriptions[client.tournamentId] || 0) + 1;
    }
  });

  return {
    connected: clients.size,
    subscriptions
  };
}

/**
 * Shutdown WebSocket server
 */
export function shutdownStandingsWebSocket(): void {
  if (wss) {
    wss.close();
    clients.clear();
    console.log('Standings WebSocket server shut down');
  }
}
