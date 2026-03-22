import { View, Text, TouchableOpacity, Modal, Animated, Dimensions, StyleSheet, Platform } from "react-native";
import { useState, useEffect, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { Call } from "@xpylon/shared";
import { colors } from "../../lib/theme";

// Video view component — renders RTCView in dev builds, placeholder in Expo Go
function VideoView({ streamURL, style, mirror, objectFit }: any) {
  // In Expo Go or web, show placeholder
  if (Platform.OS === "web") {
    return <View style={[style, { backgroundColor: "rgba(0,0,0,0.3)", alignItems: "center", justifyContent: "center" }]}><Text style={{ color: "#fff", fontSize: 10 }}>Video</Text></View>;
  }
  // Placeholder — in dev builds, replace this component with actual RTCView
  return <View style={[style, { backgroundColor: "rgba(0,0,0,0.3)" }]} />;
}
const RTCView: any = null; // Disabled for Expo Go compatibility

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface CallScreenProps {
  call: Call;
  callerName: string;
  isIncoming: boolean;
  isConnected: boolean;
  localStream: any;
  remoteStream: any;
  isMuted: boolean;
  isSpeakerOn: boolean;
  isVideoEnabled: boolean;
  isRecording: boolean;
  recordingRequested: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
  onToggleVideo: () => void;
  onSwitchCamera: () => void;
  onRequestRecording: () => void;
  onStopRecording: () => void;
}

function CallAvatar({ name, size = 96 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((n) => n.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2 }}
      className="items-center justify-center bg-white/20"
    >
      <Text style={{ fontSize: size * 0.35 }} className="text-white font-bold">
        {initials}
      </Text>
    </View>
  );
}

function CallButton({
  iconName,
  label,
  onPress,
  color = "bg-white/15",
  iconColor = colors.white,
  size = 56,
  active = false,
}: {
  iconName: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
  iconColor?: string;
  size?: number;
  active?: boolean;
}) {
  return (
    <TouchableOpacity onPress={onPress} className="items-center" activeOpacity={0.7}>
      <View
        style={{ width: size, height: size, borderRadius: size / 2 }}
        className={`items-center justify-center ${active ? "bg-white" : color}`}
      >
        <Ionicons
          name={iconName}
          size={size * 0.4}
          color={active ? colors.gray900 : iconColor}
        />
      </View>
      <Text className="text-white/70 text-[10px] mt-1.5 font-medium">{label}</Text>
    </TouchableOpacity>
  );
}

function PulseRing({ delay = 0 }: { delay?: number }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scale, { toValue: 2.5, duration: 2000, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 2000, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.6, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={{
        position: "absolute",
        width: 96,
        height: 96,
        borderRadius: 48,
        borderWidth: 2,
        borderColor: "rgba(255,255,255,0.3)",
        transform: [{ scale }],
        opacity,
      }}
    />
  );
}

export function CallScreen({
  call,
  callerName,
  isIncoming,
  isConnected,
  localStream,
  remoteStream,
  isMuted,
  isSpeakerOn,
  isVideoEnabled,
  onAccept,
  onDecline,
  onEnd,
  onToggleMute,
  onToggleSpeaker,
  onToggleVideo,
  onSwitchCamera,
  onRequestRecording,
  onStopRecording,
  isRecording,
  recordingRequested,
}: CallScreenProps) {
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const isVideo = call.type === "VIDEO";
  const hasRemoteVideo = isVideo && remoteStream && isConnected && RTCView;
  const hasLocalVideo = isVideo && localStream && isVideoEnabled && RTCView;

  useEffect(() => {
    if (isConnected) {
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isConnected]);

  // Pulse animation for "Calling..."
  useEffect(() => {
    if (!isConnected && !isIncoming) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(slideAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isConnected, isIncoming]);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
  };

  const statusText = isIncoming && !isConnected
    ? "Incoming call..."
    : !isConnected
    ? "Calling..."
    : formatDuration(duration);

  const callTypeLabel = isVideo ? "Video call" : "Voice call";

  return (
    <Modal visible animationType="fade" statusBarTranslucent>
      <View className="flex-1" style={{ backgroundColor: "#1a1a2e" }}>
        {/* Remote video (fullscreen background) */}
        {hasRemoteVideo && (
          <RTCView
            streamURL={remoteStream.toURL()}
            style={StyleSheet.absoluteFill}
            objectFit="cover"
            mirror={false}
          />
        )}

        <SafeAreaView className="flex-1">
          {/* Top gradient overlay for video calls */}
          {hasRemoteVideo && (
            <View style={styles.topGradient} pointerEvents="none" />
          )}

          {/* Recording indicator */}
          {isRecording && (
            <View className="flex-row items-center justify-center py-2" style={{ backgroundColor: "rgba(220,38,38,0.8)" }}>
              <View className="w-2 h-2 rounded-full bg-white mr-2" />
              <Text className="text-white text-xs font-semibold">Recording</Text>
            </View>
          )}

          {/* Top section — call info */}
          <View className={`flex-1 items-center ${hasRemoteVideo ? "pt-6" : "justify-center"}`}>
            {/* Pulse rings while ringing (voice only or no remote video) */}
            {!isConnected && !hasRemoteVideo && (
              <View className="absolute items-center justify-center">
                <PulseRing delay={0} />
                <PulseRing delay={700} />
                <PulseRing delay={1400} />
              </View>
            )}

            {/* Avatar (hide when remote video is showing) */}
            {!hasRemoteVideo && <CallAvatar name={callerName} size={96} />}

            <Text className={`text-white text-2xl font-bold ${hasRemoteVideo ? "" : "mt-6"}`}>
              {callerName}
            </Text>
            <Text className="text-white/50 text-sm mt-1">{callTypeLabel}</Text>

            <Animated.Text
              className="text-white/80 text-lg mt-2 font-light"
              style={
                !isConnected
                  ? { opacity: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }
                  : undefined
              }
            >
              {statusText}
            </Animated.Text>
          </View>

          {/* Local video PIP (top-right) */}
          {hasLocalVideo && isConnected && (
            <View style={styles.localVideo}>
              <RTCView
                streamURL={localStream.toURL()}
                style={{ flex: 1 }}
                objectFit="cover"
                mirror={true}
                zOrder={1}
              />
              {/* Camera switch button */}
              <TouchableOpacity
                onPress={onSwitchCamera}
                style={styles.switchCameraBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="camera-reverse-outline" size={16} color={colors.white} />
              </TouchableOpacity>
            </View>
          )}

          {/* Bottom gradient overlay for video calls */}
          {hasRemoteVideo && (
            <View style={styles.bottomGradient} pointerEvents="none" />
          )}

          {/* Bottom controls */}
          <View className="pb-8 px-6">
            {isIncoming && !isConnected ? (
              /* Incoming: decline / accept */
              <View className="flex-row justify-between px-12 mb-6">
                <CallButton
                  iconName="close"
                  label="Decline"
                  onPress={onDecline}
                  color="bg-red-500"
                  size={64}
                />
                <CallButton
                  iconName="call"
                  label="Accept"
                  onPress={onAccept}
                  color="bg-green-500"
                  size={64}
                />
              </View>
            ) : (
              /* Active / outgoing controls */
              <View>
                <View className="flex-row justify-evenly mb-8">
                  <CallButton
                    iconName={isMuted ? "mic-off" : "mic"}
                    label={isMuted ? "Unmute" : "Mute"}
                    onPress={onToggleMute}
                    active={isMuted}
                  />
                  <CallButton
                    iconName={isSpeakerOn ? "volume-high" : "volume-medium"}
                    label="Speaker"
                    onPress={onToggleSpeaker}
                    active={isSpeakerOn}
                  />
                  {isVideo && (
                    <CallButton
                      iconName={isVideoEnabled ? "videocam" : "videocam-off"}
                      label={isVideoEnabled ? "Camera on" : "Camera off"}
                      onPress={onToggleVideo}
                      active={!isVideoEnabled}
                    />
                  )}
                  {isVideo && (
                    <CallButton
                      iconName="camera-reverse-outline"
                      label="Flip"
                      onPress={onSwitchCamera}
                    />
                  )}
                  {isConnected && (
                    <CallButton
                      iconName={isRecording ? "stop-circle" : "radio-button-on"}
                      label={isRecording ? "Stop" : recordingRequested ? "Waiting..." : "Record"}
                      onPress={isRecording ? onStopRecording : onRequestRecording}
                      active={isRecording}
                      iconColor={isRecording ? "#DC2626" : recordingRequested ? "#D97706" : colors.white}
                    />
                  )}
                </View>

                {/* End call */}
                <TouchableOpacity
                  onPress={onEnd}
                  className="self-center w-16 h-16 rounded-full bg-red-500 items-center justify-center"
                  activeOpacity={0.7}
                >
                  <Ionicons name="call" size={24} color={colors.white} style={{ transform: [{ rotate: "135deg" }] }} />
                </TouchableOpacity>
                <Text className="text-white/40 text-xs text-center mt-2">End call</Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  localVideo: {
    position: "absolute",
    top: 100,
    right: 16,
    width: 120,
    height: 170,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
  },
  switchCameraBtn: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  topGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 150,
    backgroundColor: "transparent",
    // Use a simple semi-transparent overlay since LinearGradient needs an extra package
    opacity: 0.6,
  },
  bottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: "rgba(26, 26, 46, 0.7)",
  },
});
