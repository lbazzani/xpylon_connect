import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  cancelAnimation,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../../lib/theme";

const RING_SIZES = [88, 120, 152];

function Ring({
  size,
  index,
  isActive,
}: {
  size: number;
  index: number;
  isActive: boolean;
}) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      // Staggered entrance
      const enterDelay = 400 + index * 200;
      scale.value = withDelay(enterDelay, withSpring(1, { damping: 14 }));
      opacity.value = withDelay(enterDelay, withTiming(0.15, { duration: 400 }));

      // Continuous ripple after entrance
      const rippleDelay = enterDelay + 600;
      const amplitude = 0.12 + index * 0.02;
      const peakOpacity = 0.4 - index * 0.05;

      scale.value = withDelay(
        rippleDelay,
        withRepeat(
          withSequence(
            withTiming(1 + amplitude, { duration: 1500 }),
            withTiming(1, { duration: 1500 })
          ),
          -1,
          true
        )
      );

      opacity.value = withDelay(
        rippleDelay,
        withRepeat(
          withSequence(
            withTiming(peakOpacity, { duration: 1500 }),
            withTiming(0.15, { duration: 1500 })
          ),
          -1,
          true
        )
      );
    } else {
      cancelAnimation(scale);
      cancelAnimation(opacity);
      scale.value = 0;
      opacity.value = 0;
    }

    return () => {
      cancelAnimation(scale);
      cancelAnimation(opacity);
    };
  }, [isActive]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1.5,
          borderColor: colors.gray300,
        },
        style,
      ]}
    />
  );
}

export function HeroCallRings({ isActive }: { isActive: boolean }) {
  const buttonScale = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      // Center button springs in
      buttonScale.value = withSpring(1, { damping: 12 });

      // Subtle pulse after entrance
      buttonScale.value = withDelay(
        600,
        withRepeat(
          withSequence(
            withTiming(1.05, { duration: 750 }),
            withTiming(1, { duration: 750 })
          ),
          -1,
          true
        )
      );
    } else {
      cancelAnimation(buttonScale);
      buttonScale.value = 0;
    }

    return () => {
      cancelAnimation(buttonScale);
    };
  }, [isActive]);

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  return (
    <View style={{ width: 260, height: 260, alignItems: "center", justifyContent: "center" }}>
      {/* Rings */}
      {RING_SIZES.map((size, index) => (
        <Ring key={size} size={size} index={index} isActive={isActive} />
      ))}

      {/* Center call button */}
      <Animated.View
        style={[
          {
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: colors.gray900,
            alignItems: "center",
            justifyContent: "center",
          },
          buttonStyle,
        ]}
      >
        <Ionicons name="call" size={24} color={colors.white} />
      </Animated.View>
    </View>
  );
}
