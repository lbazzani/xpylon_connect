import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../lib/theme";
import type { TourMode } from "./types";

interface TourNavigationProps {
  activeIndex: number;
  totalSlides: number;
  mode: TourMode;
  onNext: () => void;
  onSkip: () => void;
  onComplete: () => void;
}

export function TourNavigation({ activeIndex, totalSlides, mode, onNext, onSkip, onComplete }: TourNavigationProps) {
  const isLast = activeIndex === totalSlides - 1;

  return (
    <View className="px-8 pb-8">
      {isLast ? (
        <TouchableOpacity
          onPress={onComplete}
          className="py-4 rounded-2xl items-center"
          style={{ backgroundColor: colors.primary }}
          activeOpacity={0.7}
        >
          <Text className="text-white font-semibold text-base">
            {mode === "menu" ? "Got it" : "Get Started"}
          </Text>
        </TouchableOpacity>
      ) : (
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={onSkip} className="py-3 px-4" activeOpacity={0.6}>
            <Text className="text-sm text-gray-400 font-medium">
              {mode === "menu" ? "Close" : "Skip"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onNext}
            className="flex-row items-center py-3 px-6 rounded-full"
            style={{ backgroundColor: colors.gray900 }}
            activeOpacity={0.7}
          >
            <Text className="text-white font-medium text-sm mr-1.5">Next</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.white} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
