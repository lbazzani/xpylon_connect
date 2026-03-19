import { useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "../store/auth";
import type { WsServerEvent, WsClientEvent } from "@xpylon/shared";

const WS_URL = process.env.EXPO_PUBLIC_WS_URL || "ws://localhost:3000/ws";

export function useWebSocket(onEvent: (event: WsServerEvent) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const { accessToken } = useAuthStore();

  useEffect(() => {
    if (!accessToken) return;

    const ws = new WebSocket(`${WS_URL}?token=${accessToken}`);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      try {
        const event: WsServerEvent = JSON.parse(e.data);
        onEvent(event);
      } catch {}
    };

    ws.onclose = () => {
      // TODO: reconnection logic
    };

    return () => {
      ws.close();
    };
  }, [accessToken]);

  const send = useCallback((event: WsClientEvent) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(event));
    }
  }, []);

  return { send };
}
