import { useState, useRef, useCallback, useEffect } from "react";
import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
  MediaStream,
} from "react-native-webrtc";
import InCallManager from "react-native-incall-manager";
import type { CallType, WsClientEvent } from "@xpylon/shared";

const ICE_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

interface UseWebRTCOptions {
  callId: string | null;
  callType: CallType;
  isInitiator: boolean;
  send: (event: WsClientEvent) => void;
}

export function useWebRTC({ callId, callType, isInitiator, send }: UseWebRTCOptions) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [connectionState, setConnectionState] = useState<string>("new");

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidate[]>([]);
  const remoteDescSetRef = useRef(false);

  const acquireMedia = useCallback(async () => {
    const constraints: any = {
      audio: true,
      video: callType === "VIDEO" ? { facingMode: "user", width: 640, height: 480 } : false,
    };
    const stream = await mediaDevices.getUserMedia(constraints);
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, [callType]);

  const createPeerConnection = useCallback(
    (stream: MediaStream) => {
      const pc = new RTCPeerConnection(ICE_CONFIG);
      pcRef.current = pc;

      // Add local tracks
      stream.getTracks().forEach((track: any) => {
        pc.addTrack(track, stream);
      });

      // Handle remote tracks
      pc.addEventListener("track", (event: any) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      });

      // Send ICE candidates
      pc.addEventListener("icecandidate", (event: any) => {
        if (event.candidate && callId) {
          send({
            type: "webrtc_ice_candidate",
            callId,
            candidate: JSON.stringify(event.candidate),
          });
        }
      });

      // Track connection state
      pc.addEventListener("iceconnectionstatechange", () => {
        setConnectionState(pc.iceConnectionState || "unknown");
        if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
          // Connection lost
        }
      });

      return pc;
    },
    [callId, send]
  );

  const drainCandidates = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) return;
    for (const candidate of pendingCandidatesRef.current) {
      try {
        await pc.addIceCandidate(candidate);
      } catch (err) {
        console.warn("Failed to add buffered ICE candidate:", err);
      }
    }
    pendingCandidatesRef.current = [];
  }, []);

  // Caller: create offer and send it
  const startConnection = useCallback(async () => {
    try {
      const stream = await acquireMedia();
      const pc = createPeerConnection(stream);

      // Start InCallManager
      InCallManager.start({ media: callType === "VIDEO" ? "video" : "audio" });
      if (callType === "VOICE") {
        InCallManager.setSpeakerphoneOn(false);
      } else {
        InCallManager.setSpeakerphoneOn(true);
        setIsSpeakerOn(true);
      }

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === "VIDEO",
      });
      await pc.setLocalDescription(offer);

      if (callId) {
        send({
          type: "webrtc_offer",
          callId,
          sdp: JSON.stringify(offer),
        });
      }
    } catch (err) {
      console.error("startConnection error:", err);
    }
  }, [acquireMedia, createPeerConnection, callId, callType, send]);

  // Callee: handle incoming offer, create answer
  const handleRemoteOffer = useCallback(
    async (sdp: string) => {
      try {
        const stream = localStreamRef.current || (await acquireMedia());
        const pc = pcRef.current || createPeerConnection(stream);

        // Start InCallManager
        InCallManager.start({ media: callType === "VIDEO" ? "video" : "audio" });
        if (callType === "VOICE") {
          InCallManager.setSpeakerphoneOn(false);
        } else {
          InCallManager.setSpeakerphoneOn(true);
          setIsSpeakerOn(true);
        }

        const offer = new RTCSessionDescription(JSON.parse(sdp));
        await pc.setRemoteDescription(offer);
        remoteDescSetRef.current = true;
        await drainCandidates();

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        if (callId) {
          send({
            type: "webrtc_answer",
            callId,
            sdp: JSON.stringify(answer),
          });
        }
      } catch (err) {
        console.error("handleRemoteOffer error:", err);
      }
    },
    [acquireMedia, createPeerConnection, callId, callType, send, drainCandidates]
  );

  // Caller: handle answer from callee
  const handleRemoteAnswer = useCallback(
    async (sdp: string) => {
      try {
        const pc = pcRef.current;
        if (!pc) return;
        const answer = new RTCSessionDescription(JSON.parse(sdp));
        await pc.setRemoteDescription(answer);
        remoteDescSetRef.current = true;
        await drainCandidates();
      } catch (err) {
        console.error("handleRemoteAnswer error:", err);
      }
    },
    [drainCandidates]
  );

  // Both: handle ICE candidates from remote
  const handleRemoteIceCandidate = useCallback(
    async (candidateStr: string) => {
      try {
        const candidate = new RTCIceCandidate(JSON.parse(candidateStr));
        if (remoteDescSetRef.current && pcRef.current) {
          await pcRef.current.addIceCandidate(candidate);
        } else {
          pendingCandidatesRef.current.push(candidate);
        }
      } catch (err) {
        console.warn("handleRemoteIceCandidate error:", err);
      }
    },
    []
  );

  // Controls
  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  }, []);

  const toggleSpeaker = useCallback(() => {
    setIsSpeakerOn((prev) => {
      InCallManager.setSpeakerphoneOn(!prev);
      return !prev;
    });
  }, []);

  const toggleVideo = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoEnabled(videoTrack.enabled);
    }
  }, []);

  const switchCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0] as any;
    if (videoTrack?._switchCamera) {
      videoTrack._switchCamera();
    }
  }, []);

  // Cleanup
  const closeConnection = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track: any) => track.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    pendingCandidatesRef.current = [];
    remoteDescSetRef.current = false;
    setLocalStream(null);
    setRemoteStream(null);
    setIsMuted(false);
    setIsSpeakerOn(false);
    setIsVideoEnabled(true);
    setConnectionState("new");
    InCallManager.stop();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      closeConnection();
    };
  }, []);

  return {
    localStream,
    remoteStream,
    isMuted,
    isSpeakerOn,
    isVideoEnabled,
    connectionState,
    toggleMute,
    toggleSpeaker,
    toggleVideo,
    switchCamera,
    startConnection,
    handleRemoteOffer,
    handleRemoteAnswer,
    handleRemoteIceCandidate,
    closeConnection,
  };
}
