import { useEffect, useRef, useCallback } from "react";
import { AppState } from "react-native";
import { useAuthStore } from "../store/auth";
import type { WsServerEvent, WsClientEvent } from "@xpylon/shared";

const WS_URL = process.env.EXPO_PUBLIC_WS_URL || "ws://localhost:3000/ws";
const MAX_RECONNECT_DELAY = 30000;

export function useWebSocket(onEvent: (event: WsServerEvent) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelayRef = useRef(1000);
  const { accessToken } = useAuthStore();
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    if (!accessToken) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(`${WS_URL}?token=${accessToken}`);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectDelayRef.current = 1000;
    };

    ws.onmessage = (e) => {
      try {
        const event: WsServerEvent = JSON.parse(e.data);
        onEventRef.current(event);
      } catch {}
    };

    ws.onclose = () => {
      wsRef.current = null;
      // Reconnect with exponential backoff
      const delay = reconnectDelayRef.current;
      reconnectDelayRef.current = Math.min(delay * 2, MAX_RECONNECT_DELAY);
      reconnectTimeoutRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [accessToken]);

  useEffect(() => {
    connect();

    // Reconnect when app comes to foreground
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") connect();
    });

    return () => {
      sub.remove();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((event: WsClientEvent) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(event));
    }
  }, []);

  return { send };
}
