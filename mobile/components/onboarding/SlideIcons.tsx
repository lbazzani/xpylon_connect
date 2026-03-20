import { View, Text, Image } from "react-native";
import { useEffect } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import type { SlideIconComposition } from "./types";
import { colors } from "../../lib/theme";

interface SlideIconsProps {
  composition: SlideIconComposition;
  useLogoImage?: boolean;
  effect?: "pulse" | "float" | "none";
  isActive: boolean;
}

export function SlideIcons({ composition, useLogoImage, effect = "float", isActive }: SlideIconsProps) {
  const floatY = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (!isActive) return;
    if (effect === "float") {
      floatY.value = withRepeat(
        withSequence(
          withTiming(-8, { duration: 2000 }),
          withTiming(0, { duration: 2000 })
        ),
        -1,
        true
      );
    } else if (effect === "pulse") {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1500 }),
          withTiming(1, { duration: 1500 })
        ),
        -1,
        true
      );
    }
  }, [isActive, effect]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const animStyle = effect === "float" ? floatStyle : effect === "pulse" ? pulseStyle : {};

  if (useLogoImage) {
    return (
      <Animated.View style={animStyle} className="items-center mb-8">
        <View className="w-40 h-40 rounded-[40px] bg-gray-50 items-center justify-center">
          <Image
            source={require("../../assets/images/XpylonLogo_V2.png")}
            style={{ width: 120, height: 38 }}
            resizeMode="contain"
          />
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={animStyle} className="items-center mb-8">
      <View className="w-36 h-36 rounded-[36px] bg-gray-50 items-center justify-center">
        <Ionicons name={composition.primary as any} size={64} color={colors.gray400} />
        {composition.accent && (
          <View className="absolute -bottom-1 -right-1 w-12 h-12 rounded-2xl bg-white items-center justify-center" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 }}>
            <Ionicons name={composition.accent as any} size={22} color={colors.gray500} />
          </View>
        )}
        {composition.badge && (
          <View className="absolute -top-1 -right-1 px-2.5 py-1 rounded-lg" style={{ backgroundColor: colors.primary }}>
            <Text className="text-white text-xs font-bold">{composition.badge}</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}
