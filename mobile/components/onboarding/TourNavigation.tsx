import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../lib/theme";
import type { TourMode } from "./types";

interface TourNavigationProps {
  activeIndex: number;
  totalSlides: number;
  mode: TourMode;
  onNext: () => void;
  onDismiss: () => void;
  onDismissForever: () => void;
}

export function TourNavigation({ activeIndex, totalSlides, mode, onNext, onDismiss, onDismissForever }: TourNavigationProps) {
  const isLast = activeIndex === totalSlides - 1;

  if (mode === "menu") {
    return (
      <View className="px-8 pb-8">
        {isLast ? (
          <TouchableOpacity
            onPress={onDismiss}
            className="py-4 rounded-2xl items-center"
            style={{ backgroundColor: colors.gray900 }}
            activeOpacity={0.7}
          >
            <Text className="text-white font-semibold text-base">Got it</Text>
          </TouchableOpacity>
        ) : (
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={onDismiss} className="py-3 px-4" activeOpacity={0.6}>
              <Text className="text-sm text-gray-400 font-medium">Close</Text>
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

  // First-launch mode
  return (
    <View className="px-8 pb-8">
      {isLast ? (
        <View>
          <TouchableOpacity
            onPress={onDismiss}
            className="py-4 rounded-2xl items-center mb-3"
            style={{ backgroundColor: colors.primary }}
            activeOpacity={0.7}
          >
            <Text className="text-white font-semibold text-base">Get Started</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDismissForever} className="py-2 items-center" activeOpacity={0.6}>
            <Text className="text-xs text-gray-400">Don't show this again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={onDismiss} className="py-3 px-4" activeOpacity={0.6}>
            <Text className="text-sm text-gray-400 font-medium">Skip</Text>
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
