import { View, Text, TouchableOpacity } from "react-native";
import { useEffect } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from "react-native-reanimated";
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
  disabled?: boolean;
}

function PressableButton({
  onPress,
  children,
  style,
  disabled,
}: {
  onPress: () => void;
  children: React.ReactNode;
  style?: any;
  disabled?: boolean;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.96, { damping: 15 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15 }); }}
        activeOpacity={0.8}
        disabled={disabled}
        style={style}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

export function TourNavigation({
  activeIndex,
  totalSlides,
  mode,
  onNext,
  onDismiss,
  onDismissForever,
  disabled,
}: TourNavigationProps) {
  const isLast = activeIndex === totalSlides - 1;

  // Crossfade between Next and Get Started
  const nextOpacity = useSharedValue(isLast ? 0 : 1);
  const ctaOpacity = useSharedValue(isLast ? 1 : 0);
  const skipOpacity = useSharedValue(isLast ? 0 : 1);

  useEffect(() => {
    const dur = 300;
    const easing = Easing.inOut(Easing.cubic);
    nextOpacity.value = withTiming(isLast ? 0 : 1, { duration: dur, easing });
    ctaOpacity.value = withTiming(isLast ? 1 : 0, { duration: dur, easing });
    skipOpacity.value = withTiming(isLast ? 0 : 1, { duration: dur, easing });
  }, [isLast]);

  const nextStyle = useAnimatedStyle(() => ({
    opacity: nextOpacity.value,
    position: nextOpacity.value === 0 ? ("absolute" as const) : ("relative" as const),
  }));

  const ctaStyle = useAnimatedStyle(() => ({
    opacity: ctaOpacity.value,
    position: ctaOpacity.value === 0 ? ("absolute" as const) : ("relative" as const),
  }));

  const skipStyle = useAnimatedStyle(() => ({
    opacity: skipOpacity.value,
  }));

  if (mode === "menu") {
    return (
      <View className="px-8 pb-8">
        {isLast ? (
          <PressableButton onPress={onDismiss} disabled={disabled}>
            <View className="py-4 rounded-2xl items-center" style={{ backgroundColor: colors.gray900 }}>
              <Text className="text-white font-semibold text-base">Got it</Text>
            </View>
          </PressableButton>
        ) : (
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={onDismiss} className="py-3 px-4" activeOpacity={0.6}>
              <Text className="text-sm text-gray-400 font-medium">Close</Text>
            </TouchableOpacity>
            <PressableButton onPress={onNext} disabled={disabled}>
              <View className="flex-row items-center py-3 px-6 rounded-full" style={{ backgroundColor: colors.gray900 }}>
                <Text className="text-white font-medium text-sm mr-1.5">Next</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.white} />
              </View>
            </PressableButton>
          </View>
        )}
      </View>
    );
  }

  // First-launch mode with crossfade
  return (
    <View className="px-8 pb-8">
      <View style={{ minHeight: 96 }}>
        {/* CTA (last slide) */}
        <Animated.View style={[{ width: "100%" }, ctaStyle]}>
          <PressableButton onPress={onDismiss} disabled={disabled}>
            <View className="py-4 rounded-2xl items-center mb-3" style={{ backgroundColor: colors.primary }}>
              <Text className="text-white font-semibold text-base">Get Started</Text>
            </View>
          </PressableButton>
          <TouchableOpacity onPress={onDismissForever} className="py-2 items-center" activeOpacity={0.6}>
            <Text className="text-xs text-gray-400">Don't show this again</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Next + Skip (non-last slides) */}
        <Animated.View style={[{ width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, nextStyle]}>
          <Animated.View style={skipStyle}>
            <TouchableOpacity onPress={onDismiss} className="py-3 px-4" activeOpacity={0.6}>
              <Text className="text-sm text-gray-400 font-medium">Skip</Text>
            </TouchableOpacity>
          </Animated.View>
          <PressableButton onPress={onNext} disabled={disabled}>
            <View className="flex-row items-center py-3 px-6 rounded-full" style={{ backgroundColor: colors.gray900 }}>
              <Text className="text-white font-medium text-sm mr-1.5">Next</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.white} />
            </View>
          </PressableButton>
        </Animated.View>
      </View>
    </View>
  );
}
