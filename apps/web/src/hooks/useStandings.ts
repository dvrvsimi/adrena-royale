'use client';

import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { useWebSocket } from './useWebSocket';
import type { StandingsEntry } from '@adrena-royale/shared';

interface StandingsState {
  standings: StandingsEntry[];
  roundNumber: number;
}

interface WebSocketMessage {
  type: string;
  tournamentId: string;
  roundNumber?: number;
  timestamp: number;
  data?: {
    standings?: StandingsEntry[];
    phase?: string;
    eliminated?: string[];
    shieldSaves?: string[];
    winner?: string | null;
  };
}

export function useStandings(tournamentId: string) {
  const [wsData, setWsData] = useState<StandingsState | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  const [events, setEvents] = useState<{
    eliminations: string[];
    shieldSaves: string[];
    winner: string | null;
  }>({ eliminations: [], shieldSaves: [], winner: null });

  // SWR for initial load and fallback polling
  const { data: swrData, error, isLoading, mutate } = useSWR(
    ['standings', tournamentId],
    () => api.getStandings(tournamentId),
    {
      refreshInterval: wsData ? 60000 : 15000, // Slower polling when WS is active
      revalidateOnFocus: !wsData,
    }
  );

  // Handle WebSocket messages
  const handleMessage = useCallback((message: WebSocketMessage) => {
    if (message.tournamentId !== tournamentId) return;

    switch (message.type) {
      case 'standings_update':
        if (message.data?.standings) {
          setWsData({
            standings: message.data.standings,
            roundNumber: message.roundNumber || 0
          });
          setLastUpdate(message.timestamp);
        }
        break;

      case 'round_change':
        // Trigger SWR revalidation on round change
        mutate();
        break;

      case 'elimination':
        if (message.data) {
          setEvents(prev => ({
            ...prev,
            eliminations: message.data!.eliminated || [],
            shieldSaves: message.data!.shieldSaves || []
          }));
          // Clear elimination events after 5 seconds
          setTimeout(() => {
            setEvents(prev => ({
              ...prev,
              eliminations: [],
              shieldSaves: []
            }));
          }, 5000);
        }
        break;

      case 'tournament_complete':
        if (message.data?.winner !== undefined) {
          setEvents(prev => ({ ...prev, winner: message.data!.winner ?? null }));
        }
        mutate();
        break;
    }
  }, [tournamentId, mutate]);

  // Handle WebSocket connect - subscribe to tournament
  const handleConnect = useCallback(() => {
    ws.send({ type: 'subscribe', tournamentId });
  }, [tournamentId]);

  // WebSocket connection
  const ws = useWebSocket('/ws/standings', {
    onMessage: handleMessage,
    onConnect: handleConnect,
  });

  // Subscribe when tournamentId changes
  useEffect(() => {
    if (ws.connected) {
      ws.send({ type: 'subscribe', tournamentId });
    }
  }, [tournamentId, ws.connected, ws.send]);

  // Use WebSocket data if available and recent, otherwise fall back to SWR
  const standings = wsData?.standings || swrData?.standings || [];
  const roundNumber = wsData?.roundNumber || swrData?.roundNumber || 0;

  return {
    standings,
    roundNumber,
    isLoading,
    error,
    refresh: mutate,
    // WebSocket status
    wsConnected: ws.connected,
    lastUpdate,
    // Live events
    recentEliminations: events.eliminations,
    recentShieldSaves: events.shieldSaves,
    tournamentWinner: events.winner,
  };
}
