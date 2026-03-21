import type {
  TournamentListItem,
  TournamentDetail,
  StandingsEntry,
  CreateTournamentRequest,
  LiquidityInfo,
  CustodyInfo,
} from '@adrena-royale/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const IS_DEV = process.env.NODE_ENV === 'development';

interface AuthData {
  wallet: string;
  signature: string;
  message: string;
}

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit & { auth?: AuthData; devWallet?: string }
): Promise<T> {
  const { auth, devWallet, ...fetchOptions } = options || {};

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  // In dev mode, use x-dev-wallet header for easier testing
  if (IS_DEV && devWallet) {
    headers['x-dev-wallet'] = devWallet;
  } else if (auth) {
    headers['x-wallet'] = auth.wallet;
    headers['x-signature'] = auth.signature;
    headers['x-message'] = auth.message;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `API error: ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Tournaments
  getTournaments: async (params?: { status?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.limit) query.set('limit', params.limit.toString());
    const queryString = query.toString();
    return fetchApi<{ tournaments: TournamentListItem[] }>(
      `/tournaments${queryString ? `?${queryString}` : ''}`
    );
  },

  getTournament: async (id: string) => {
    return fetchApi<TournamentDetail>(`/tournaments/${id}`);
  },

  getStandings: async (tournamentId: string) => {
    return fetchApi<{
      tournamentId: string;
      roundNumber: number;
      standings: StandingsEntry[];
    }>(`/tournaments/${tournamentId}/standings`);
  },

  // Participants
  register: async (tournamentId: string, auth: AuthData, txHash?: string) => {
    return fetchApi<{ message: string; participant: any }>('/participants/register', {
      method: 'POST',
      auth,
      body: JSON.stringify({ tournamentId, txHash }),
    });
  },

  getParticipantStatus: async (tournamentId: string, wallet: string) => {
    return fetchApi<{
      id: string;
      wallet: string;
      isEliminated: boolean;
      shields: number;
      finalRank: number | null;
      currentRoundScore: {
        roundNumber: number;
        finalScore: number;
        rank: number | null;
        tradesCount: number;
      } | null;
    }>(`/participants/${tournamentId}/${wallet}`);
  },

  // Profile
  getProfile: async (wallet: string) => {
    return fetchApi<{
      wallet: string;
      badges: any[];
      tournaments: { total: number; wins: number; topTen: number };
      streak: { current: number; longest: number; lastTrade: string | null } | null;
      traderStats: {
        totalVolume: number;
        totalTrades: number;
        winRate: number;
        pnl: number;
      } | null;
    }>(`/profile/${wallet}`);
  },

  // Admin
  createTournament: async (data: CreateTournamentRequest, auth?: AuthData) => {
    return fetchApi<{ tournament: any }>('/admin/tournaments', {
      method: 'POST',
      auth,
      devWallet: auth?.wallet || 'DevAdmin123456789012345678901234567890',
      body: JSON.stringify(data),
    });
  },

  startTournament: async (id: string, auth?: AuthData) => {
    return fetchApi<{ message: string }>(`/admin/tournaments/${id}/start`, {
      method: 'POST',
      auth,
      devWallet: auth?.wallet || 'DevAdmin123456789012345678901234567890',
    });
  },

  openEntries: async (id: string, auth?: AuthData) => {
    return fetchApi<{ message: string }>(`/admin/tournaments/${id}/open-entries`, {
      method: 'POST',
      auth,
      devWallet: auth?.wallet || 'DevAdmin123456789012345678901234567890',
    });
  },

  deleteTournament: async (id: string, auth?: AuthData) => {
    return fetchApi<{ message: string }>(`/admin/tournaments/${id}`, {
      method: 'DELETE',
      auth,
      devWallet: auth?.wallet || 'DevAdmin123456789012345678901234567890',
    });
  },

  // Liquidity
  getLiquidityInfo: async () => {
    return fetchApi<{ data: LiquidityInfo }>('/liquidity');
  },

  getCustodyInfo: async (symbol: string) => {
    return fetchApi<{ data: CustodyInfo }>(`/liquidity/${encodeURIComponent(symbol)}`);
  },
};
