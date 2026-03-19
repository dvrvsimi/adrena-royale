'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';

interface WebSocketState {
  connected: boolean;
  reconnecting: boolean;
  error: string | null;
}

interface UseWebSocketOptions {
  onMessage?: (data: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxRetries?: number;
}

export function useWebSocket(
  path: string,
  options: UseWebSocketOptions = {}
) {
  const {
    onMessage,
    onConnect,
    onDisconnect,
    autoReconnect = true,
    reconnectInterval = 3000,
    maxRetries = 5
  } = options;

  const [state, setState] = useState<WebSocketState>({
    connected: false,
    reconnecting: false,
    error: null
  });

  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const url = `${WS_BASE}${path}`;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setState({ connected: true, reconnecting: false, error: null });
        retriesRef.current = 0;
        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage?.(data);
        } catch (e) {
          console.error('WebSocket message parse error:', e);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setState(prev => ({ ...prev, error: 'Connection error' }));
      };

      ws.onclose = () => {
        setState(prev => ({ ...prev, connected: false }));
        onDisconnect?.();

        // Attempt reconnect
        if (autoReconnect && retriesRef.current < maxRetries) {
          setState(prev => ({ ...prev, reconnecting: true }));
          reconnectTimeoutRef.current = setTimeout(() => {
            retriesRef.current++;
            connect();
          }, reconnectInterval);
        } else if (retriesRef.current >= maxRetries) {
          setState(prev => ({
            ...prev,
            reconnecting: false,
            error: 'Max reconnection attempts reached'
          }));
        }
      };
    } catch (error) {
      setState(prev => ({
        ...prev,
        connected: false,
        error: 'Failed to connect'
      }));
    }
  }, [path, onMessage, onConnect, onDisconnect, autoReconnect, reconnectInterval, maxRetries]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const send = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  // Connect on mount
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    ...state,
    send,
    connect,
    disconnect
  };
}
