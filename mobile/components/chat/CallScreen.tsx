import { View, Text, TouchableOpacity, Modal, Animated, Dimensions } from "react-native";
import { useState, useEffect, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Call } from "@xpylon/shared";
import { colors } from "../../lib/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface CallScreenProps {
  call: Call;
  callerName: string;
  isIncoming: boolean;
  isConnected: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onEnd: () => void;
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
  icon,
  label,
  onPress,
  color = "bg-white/15",
  iconColor = "text-white",
  size = 60,
  active = false,
}: {
  icon: string;
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
        <Text style={{ fontSize: size * 0.4 }} className={active ? "text-gray-900" : iconColor}>
          {icon}
        </Text>
      </View>
      <Text className="text-white/70 text-xs mt-2 font-medium">{label}</Text>
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

export function CallScreen({ call, callerName, isIncoming, isConnected, onAccept, onDecline, onEnd }: CallScreenProps) {
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(call.type === "VIDEO");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Slide-to-answer animation
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isConnected) {
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isConnected]);

  // Pulse animation for ringing
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

  const callTypeLabel = call.type === "VIDEO" ? "Video call" : "Voice call";

  return (
    <Modal visible animationType="fade" statusBarTranslucent>
      <View className="flex-1" style={{ backgroundColor: "#1a1a2e" }}>
        <SafeAreaView className="flex-1">
          {/* Top section — call info */}
          <View className="flex-1 items-center justify-center">
            {/* Pulse rings while ringing */}
            {!isConnected && (
              <View className="absolute items-center justify-center">
                <PulseRing delay={0} />
                <PulseRing delay={700} />
                <PulseRing delay={1400} />
              </View>
            )}

            <CallAvatar name={callerName} size={96} />

            <Text className="text-white text-2xl font-bold mt-6">{callerName}</Text>
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

          {/* Video preview placeholder */}
          {isVideoEnabled && isConnected && (
            <View
              className="absolute top-24 right-4 w-28 h-40 rounded-2xl items-center justify-center overflow-hidden"
              style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
            >
              <Text className="text-white/40 text-xs">Camera</Text>
            </View>
          )}

          {/* Bottom controls */}
          <View className="pb-8 px-6">
            {isIncoming && !isConnected ? (
              /* ── Incoming: decline / accept ── */
              <View>
                <View className="flex-row justify-between px-12 mb-6">
                  <CallButton
                    icon="✕"
                    label="Decline"
                    onPress={onDecline}
                    color="bg-red-500"
                    size={64}
                  />
                  <CallButton
                    icon="📞"
                    label="Accept"
                    onPress={onAccept}
                    color="bg-green-500"
                    size={64}
                  />
                </View>
              </View>
            ) : (
              /* ── Active / outgoing controls ── */
              <View>
                <View className="flex-row justify-between px-4 mb-8">
                  <CallButton
                    icon={isMuted ? "🔇" : "🎤"}
                    label={isMuted ? "Unmute" : "Mute"}
                    onPress={() => setIsMuted(!isMuted)}
                    active={isMuted}
                  />
                  <CallButton
                    icon={isSpeaker ? "🔊" : "🔈"}
                    label={isSpeaker ? "Speaker" : "Speaker"}
                    onPress={() => setIsSpeaker(!isSpeaker)}
                    active={isSpeaker}
                  />
                  {call.type === "VIDEO" && (
                    <CallButton
                      icon={isVideoEnabled ? "📹" : "📷"}
                      label={isVideoEnabled ? "Camera on" : "Camera off"}
                      onPress={() => setIsVideoEnabled(!isVideoEnabled)}
                      active={!isVideoEnabled}
                    />
                  )}
                  <CallButton
                    icon="⋯"
                    label="More"
                    onPress={() => {}}
                  />
                </View>

                {/* End call button */}
                <TouchableOpacity
                  onPress={onEnd}
                  className="self-center w-16 h-16 rounded-full bg-red-500 items-center justify-center"
                  activeOpacity={0.7}
                >
                  <Text className="text-white text-2xl">📞</Text>
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
