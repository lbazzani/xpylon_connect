import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../../lib/theme";

const SHIELD_WIDTH = 110;
const SHIELD_HEIGHT = 130;
const SCAN_TRAVEL = 65; // half of usable inner height

export function HeroShieldLock({ isActive }: { isActive: boolean }) {
  const shieldScale = useSharedValue(0.8);
  const lockScale = useSharedValue(0);
  const scanY = useSharedValue(-SCAN_TRAVEL);
  const borderOpacity = useSharedValue(0.6);

  useEffect(() => {
    if (isActive) {
      // Shield springs in
      shieldScale.value = withSpring(1, { damping: 15 });

      // Lock pops in at 300ms
      lockScale.value = withDelay(
        300,
        withSpring(1, { damping: 10, stiffness: 150 })
      );

      // Scan line at 700ms: sweep then repeat with pause
      scanY.value = withDelay(
        700,
        withRepeat(
          withSequence(
            withTiming(SCAN_TRAVEL, {
              duration: 1200,
              easing: Easing.inOut(Easing.cubic),
            }),
            withTiming(-SCAN_TRAVEL, { duration: 0 }),
            withTiming(-SCAN_TRAVEL, { duration: 2500 }) // pause
          ),
          -1,
          false
        )
      );

      // Border opacity pulse
      borderOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1500 }),
          withTiming(0.6, { duration: 1500 })
        ),
        -1,
        true
      );
    } else {
      cancelAnimation(shieldScale);
      cancelAnimation(lockScale);
      cancelAnimation(scanY);
      cancelAnimation(borderOpacity);
      shieldScale.value = 0.8;
      lockScale.value = 0;
      scanY.value = -SCAN_TRAVEL;
      borderOpacity.value = 0.6;
    }

    return () => {
      cancelAnimation(shieldScale);
      cancelAnimation(lockScale);
      cancelAnimation(scanY);
      cancelAnimation(borderOpacity);
    };
  }, [isActive]);

  const shieldStyle = useAnimatedStyle(() => ({
    transform: [{ scale: shieldScale.value }],
  }));

  const borderStyle = useAnimatedStyle(() => ({
    opacity: borderOpacity.value,
  }));

  const lockStyle = useAnimatedStyle(() => ({
    transform: [{ scale: lockScale.value }],
  }));

  const scanStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanY.value }],
  }));

  return (
    <View style={{ width: 260, height: 260, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={shieldStyle}>
        <View
          style={{
            width: SHIELD_WIDTH,
            height: SHIELD_HEIGHT,
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {/* Shield body */}
          <Animated.View
            style={[
              {
                position: "absolute",
                width: SHIELD_WIDTH,
                height: SHIELD_HEIGHT,
                borderRadius: 55,
                backgroundColor: colors.gray50,
                borderWidth: 1.5,
                borderColor: colors.gray200,
              },
              borderStyle,
            ]}
          />

          {/* Lock icon */}
          <Animated.View style={lockStyle}>
            <Ionicons name="lock-closed" size={36} color={colors.gray700} />
          </Animated.View>

          {/* Scan line */}
          <Animated.View
            style={[
              {
                position: "absolute",
                width: SHIELD_WIDTH - 20,
                height: 2,
                backgroundColor: colors.primary,
                opacity: 0.5,
                borderRadius: 1,
              },
              scanStyle,
            ]}
          />
        </View>
      </Animated.View>
    </View>
  );
}
