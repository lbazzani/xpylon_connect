import { View, Text, TouchableOpacity, Modal } from "react-native";
import { useState, useEffect, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Call } from "@xpylon/shared";

interface CallScreenProps {
  call: Call;
  callerName: string;
  isIncoming: boolean;
  isConnected: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onEnd: () => void;
}

export function CallScreen({ call, callerName, isIncoming, isConnected, onAccept, onDecline, onEnd }: CallScreenProps) {
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(call.type === "VIDEO");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isConnected) {
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isConnected]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const statusText = isIncoming && !isConnected
    ? "Incoming call..."
    : !isConnected
    ? "Calling..."
    : formatDuration(duration);

  const callTypeLabel = call.type === "VIDEO" ? "Video call" : "Voice call";

  return (
    <Modal visible animationType="slide" statusBarTranslucent>
      <View className="flex-1 bg-gray-900">
        <SafeAreaView className="flex-1">
          {/* Call info */}
          <View className="flex-1 items-center justify-center">
            {/* Avatar */}
            <View className="w-24 h-24 rounded-full bg-primary items-center justify-center mb-6">
              <Text className="text-white text-3xl font-bold">
                {callerName.split(" ").map((n) => n.charAt(0)).join("").slice(0, 2)}
              </Text>
            </View>
            <Text className="text-white text-2xl font-bold mb-1">{callerName}</Text>
            <Text className="text-gray-400 text-base mb-1">{callTypeLabel}</Text>
            <Text className="text-gray-300 text-lg">{statusText}</Text>
          </View>

          {/* Video placeholder */}
          {isVideoEnabled && isConnected && (
            <View className="absolute top-20 right-4 w-32 h-44 bg-gray-800 rounded-2xl items-center justify-center border-2 border-gray-700">
              <Text className="text-gray-500 text-xs">Camera preview</Text>
            </View>
          )}

          {/* Controls */}
          <View className="pb-12">
            {isIncoming && !isConnected ? (
              /* Incoming: accept / decline */
              <View className="flex-row justify-center gap-16">
                <TouchableOpacity
                  onPress={onDecline}
                  className="w-16 h-16 rounded-full bg-red-500 items-center justify-center"
                >
                  <Text className="text-white text-2xl">✕</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onAccept}
                  className="w-16 h-16 rounded-full bg-green-500 items-center justify-center"
                >
                  <Text className="text-white text-2xl">📞</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Active / outgoing call controls */
              <View className="items-center">
                <View className="flex-row justify-center gap-8 mb-8">
                  <TouchableOpacity
                    onPress={() => setIsMuted(!isMuted)}
                    className={`w-14 h-14 rounded-full items-center justify-center ${isMuted ? "bg-white" : "bg-gray-700"}`}
                  >
                    <Text className={`text-xl ${isMuted ? "text-gray-900" : "text-white"}`}>
                      {isMuted ? "🔇" : "🎤"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setIsSpeaker(!isSpeaker)}
                    className={`w-14 h-14 rounded-full items-center justify-center ${isSpeaker ? "bg-white" : "bg-gray-700"}`}
                  >
                    <Text className={`text-xl ${isSpeaker ? "text-gray-900" : "text-white"}`}>
                      {isSpeaker ? "🔊" : "🔈"}
                    </Text>
                  </TouchableOpacity>
                  {call.type === "VIDEO" && (
                    <TouchableOpacity
                      onPress={() => setIsVideoEnabled(!isVideoEnabled)}
                      className={`w-14 h-14 rounded-full items-center justify-center ${!isVideoEnabled ? "bg-white" : "bg-gray-700"}`}
                    >
                      <Text className={`text-xl ${!isVideoEnabled ? "text-gray-900" : "text-white"}`}>
                        {isVideoEnabled ? "📹" : "📷"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity
                  onPress={onEnd}
                  className="w-16 h-16 rounded-full bg-red-500 items-center justify-center"
                >
                  <Text className="text-white text-2xl">📞</Text>
                </TouchableOpacity>
                <Text className="text-gray-400 text-sm mt-2">End call</Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
