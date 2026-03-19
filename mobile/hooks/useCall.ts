import { useState, useCallback, useRef } from "react";
import { useWebSocket } from "./useWebSocket";
import { useAuthStore } from "../store/auth";
import type { Call, CallType, WsServerEvent } from "@xpylon/shared";

interface CallState {
  activeCall: Call | null;
  callerName: string;
  isIncoming: boolean;
  isConnected: boolean;
}

export function useCall() {
  const [callState, setCallState] = useState<CallState>({
    activeCall: null,
    callerName: "",
    isIncoming: false,
    isConnected: false,
  });
  const user = useAuthStore((s) => s.user);

  const handleCallEvent = useCallback((event: WsServerEvent) => {
    if (event.type === "call_incoming") {
      const isIncoming = event.call.callerId !== user?.id;
      setCallState({
        activeCall: event.call,
        callerName: event.callerName,
        isIncoming,
        isConnected: false,
      });
    }
    if (event.type === "call_accepted") {
      setCallState((prev) => ({ ...prev, isConnected: true }));
    }
    if (event.type === "call_ended" || event.type === "call_declined") {
      setCallState({ activeCall: null, callerName: "", isIncoming: false, isConnected: false });
    }
  }, [user?.id]);

  function startCall(conversationId: string, callType: CallType) {
    return { type: "call_start" as const, conversationId, callType };
  }

  function acceptCall(callId: string) {
    return { type: "call_accept" as const, callId };
  }

  function declineCall(callId: string) {
    return { type: "call_decline" as const, callId };
  }

  function endCall(callId: string) {
    setCallState({ activeCall: null, callerName: "", isIncoming: false, isConnected: false });
    return { type: "call_end" as const, callId };
  }

  return { callState, handleCallEvent, startCall, acceptCall, declineCall, endCall };
}
