import { View, Text, TouchableOpacity, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../lib/theme";

interface RecordingConsentModalProps {
  visible: boolean;
  requesterName: string;
  onConsent: () => void;
  onDecline: () => void;
}

export function RecordingConsentModal({
  visible,
  requesterName,
  onConsent,
  onDecline,
}: RecordingConsentModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
        <View className="mx-8 bg-white rounded-2xl overflow-hidden" style={{ maxWidth: 340 }}>
          {/* Header */}
          <View className="px-6 pt-6 pb-4 items-center">
            <View className="w-14 h-14 rounded-full bg-amber-50 items-center justify-center mb-4">
              <Ionicons name="mic-outline" size={28} color="#D97706" />
            </View>
            <Text className="text-lg font-bold text-gray-900 text-center">
              Recording request
            </Text>
          </View>

          {/* Body */}
          <View className="px-6 pb-5">
            <Text className="text-sm text-gray-600 text-center leading-5">
              <Text className="font-semibold">{requesterName}</Text> wants to record this call.
              The recording will be used to generate a professional summary of your conversation.
            </Text>
            <Text className="text-xs text-gray-400 text-center mt-3 leading-4">
              Both participants must consent for the recording to start. You can stop the recording at any time.
            </Text>
          </View>

          {/* Actions */}
          <View className="flex-row border-t border-gray-100">
            <TouchableOpacity
              onPress={onDecline}
              className="flex-1 py-4 items-center border-r border-gray-100"
              activeOpacity={0.7}
            >
              <Text className="text-base font-medium text-gray-500">Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConsent}
              className="flex-1 py-4 items-center"
              activeOpacity={0.7}
            >
              <Text className="text-base font-semibold" style={{ color: colors.green }}>Allow</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
