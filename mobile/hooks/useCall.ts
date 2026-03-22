import { useState, useCallback, useRef } from "react";
import { PermissionsAndroid, Platform, Alert } from "react-native";
import { useWebRTC } from "./useWebRTC";
import { useRecording } from "./useRecording";
import { useAuthStore } from "../store/auth";
import { CallType } from "@xpylon/shared";
import type { Call, WsServerEvent, WsClientEvent } from "@xpylon/shared";

interface CallState {
  activeCall: Call | null;
  callerName: string;
  isIncoming: boolean;
  isConnected: boolean;
}

interface RecordingState {
  isRecording: boolean;
  recordingRequested: boolean;
  consentModalVisible: boolean;
  consentRequesterName: string;
  isRecordingInitiator: boolean;
}

export function useCall(send: (event: WsClientEvent) => void) {
  const [callState, setCallState] = useState<CallState>({
    activeCall: null,
    callerName: "",
    isIncoming: false,
    isConnected: false,
  });
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    recordingRequested: false,
    consentModalVisible: false,
    consentRequesterName: "",
    isRecordingInitiator: false,
  });
  const user = useAuthStore((s) => s.user);
  const callTypeRef = useRef<CallType>(CallType.VOICE);
  const isInitiatorRef = useRef(false);

  const webrtc = useWebRTC({
    callId: callState.activeCall?.id || null,
    callType: callTypeRef.current,
    isInitiator: isInitiatorRef.current,
    send,
  });

  const recorder = useRecording();

  // Request permissions before starting a call
  async function requestPermissions(callType: CallType): Promise<boolean> {
    if (Platform.OS === "web") return true;

    if (Platform.OS === "android") {
      const perms: any[] = [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];
      if (callType === "VIDEO") {
        perms.push(PermissionsAndroid.PERMISSIONS.CAMERA);
      }
      const results = await PermissionsAndroid.requestMultiple(perms);
      const granted = Object.values(results).every(
        (r) => r === PermissionsAndroid.RESULTS.GRANTED
      );
      if (!granted) {
        Alert.alert(
          "Permissions required",
          `Xpylon Connect needs ${callType === "VIDEO" ? "camera and microphone" : "microphone"} access to make calls.`
        );
      }
      return granted;
    }

    return true;
  }

  // Start a new outgoing call
  const startCall = useCallback(
    async (conversationId: string, callType: CallType) => {
      const granted = await requestPermissions(callType);
      if (!granted) return;

      callTypeRef.current = callType;
      isInitiatorRef.current = true;
      send({ type: "call_start", conversationId, callType });
    },
    [send]
  );

  // Accept an incoming call
  const acceptCall = useCallback(() => {
    if (!callState.activeCall) return;
    send({ type: "call_accept", callId: callState.activeCall.id });
  }, [callState.activeCall, send]);

  // Decline an incoming call
  const declineCall = useCallback(() => {
    if (!callState.activeCall) return;
    send({ type: "call_decline", callId: callState.activeCall.id });
    webrtc.closeConnection();
    setCallState({ activeCall: null, callerName: "", isIncoming: false, isConnected: false });
    resetRecordingState();
  }, [callState.activeCall, send, webrtc]);

  // End an active call
  const endCall = useCallback(async () => {
    if (!callState.activeCall) return;
    const callId = callState.activeCall.id;

    // If recording was active, stop and upload
    if (recordingState.isRecording && recordingState.isRecordingInitiator) {
      const fileUri = await recorder.stopRecording();
      if (fileUri) {
        // Upload async — don't block call end
        recorder.uploadRecording(callId, fileUri).catch(console.error);
      }
    }

    send({ type: "call_end", callId });
    webrtc.closeConnection();
    setCallState({ activeCall: null, callerName: "", isIncoming: false, isConnected: false });
    resetRecordingState();
  }, [callState.activeCall, send, webrtc, recordingState, recorder]);

  function resetRecordingState() {
    setRecordingState({
      isRecording: false,
      recordingRequested: false,
      consentModalVisible: false,
      consentRequesterName: "",
      isRecordingInitiator: false,
    });
  }

  // Recording: request recording
  const requestRecording = useCallback(() => {
    if (!callState.activeCall) return;
    send({ type: "recording_request", callId: callState.activeCall.id });
    setRecordingState((prev) => ({ ...prev, recordingRequested: true, isRecordingInitiator: true }));
  }, [callState.activeCall, send]);

  // Recording: consent to recording
  const consentToRecording = useCallback(() => {
    if (!callState.activeCall) return;
    send({ type: "recording_consent", callId: callState.activeCall.id });
    setRecordingState((prev) => ({ ...prev, consentModalVisible: false }));
  }, [callState.activeCall, send]);

  // Recording: decline recording
  const declineRecording = useCallback(() => {
    if (!callState.activeCall) return;
    send({ type: "recording_declined", callId: callState.activeCall.id });
    setRecordingState((prev) => ({
      ...prev,
      consentModalVisible: false,
      recordingRequested: false,
    }));
  }, [callState.activeCall, send]);

  // Recording: stop recording
  const stopRecording = useCallback(async () => {
    if (!callState.activeCall) return;
    send({ type: "recording_stop", callId: callState.activeCall.id });

    if (recordingState.isRecordingInitiator) {
      const fileUri = await recorder.stopRecording();
      if (fileUri) {
        recorder.uploadRecording(callState.activeCall.id, fileUri).catch(console.error);
      }
    }
    setRecordingState((prev) => ({ ...prev, isRecording: false }));
  }, [callState.activeCall, send, recordingState.isRecordingInitiator, recorder]);

  // Handle all call-related WS events
  const handleCallEvent = useCallback(
    (event: WsServerEvent) => {
      switch (event.type) {
        case "call_incoming": {
          const isIncoming = event.call.callerId !== user?.id;
          callTypeRef.current = event.call.type as CallType;
          isInitiatorRef.current = !isIncoming;
          setCallState({
            activeCall: event.call,
            callerName: event.callerName,
            isIncoming,
            isConnected: false,
          });
          break;
        }

        case "call_accepted": {
          setCallState((prev) => ({ ...prev, isConnected: true }));
          if (isInitiatorRef.current) {
            webrtc.startConnection();
          }
          break;
        }

        case "call_ended":
        case "call_declined": {
          webrtc.closeConnection();
          setCallState({ activeCall: null, callerName: "", isIncoming: false, isConnected: false });
          resetRecordingState();
          break;
        }

        // WebRTC signaling
        case "webrtc_offer":
          webrtc.handleRemoteOffer(event.sdp);
          break;
        case "webrtc_answer":
          webrtc.handleRemoteAnswer(event.sdp);
          break;
        case "webrtc_ice_candidate":
          webrtc.handleRemoteIceCandidate(event.candidate);
          break;

        // Recording events
        case "recording_request":
          setRecordingState((prev) => ({
            ...prev,
            consentModalVisible: true,
            consentRequesterName: (event as any).userName || "The other participant",
          }));
          break;

        case "recording_started":
          setRecordingState((prev) => ({ ...prev, isRecording: true, recordingRequested: false }));
          // Only the initiator actually records
          if (recordingState.isRecordingInitiator) {
            recorder.startRecording().catch(console.error);
          }
          break;

        case "recording_stopped":
          setRecordingState((prev) => ({ ...prev, isRecording: false }));
          break;

        case "recording_declined":
          setRecordingState((prev) => ({
            ...prev,
            recordingRequested: false,
            consentModalVisible: false,
          }));
          Alert.alert("Recording declined", "The other participant declined the recording request.");
          break;
      }
    },
    [user?.id, webrtc, recordingState.isRecordingInitiator, recorder]
  );

  return {
    // Call state
    activeCall: callState.activeCall,
    callerName: callState.callerName,
    isIncoming: callState.isIncoming,
    isConnected: callState.isConnected,

    // Media state
    localStream: webrtc.localStream,
    remoteStream: webrtc.remoteStream,
    isMuted: webrtc.isMuted,
    isSpeakerOn: webrtc.isSpeakerOn,
    isVideoEnabled: webrtc.isVideoEnabled,

    // Recording state
    isRecording: recordingState.isRecording,
    recordingRequested: recordingState.recordingRequested,
    consentModalVisible: recordingState.consentModalVisible,
    consentRequesterName: recordingState.consentRequesterName,

    // Call actions
    startCall,
    acceptCall,
    declineCall,
    endCall,
    handleCallEvent,

    // Media controls
    toggleMute: webrtc.toggleMute,
    toggleSpeaker: webrtc.toggleSpeaker,
    toggleVideo: webrtc.toggleVideo,
    switchCamera: webrtc.switchCamera,

    // Recording actions
    requestRecording,
    consentToRecording,
    declineRecording,
    stopRecording,
  };
}
