import React, { useEffect } from "react";
import { View, Image } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  cancelAnimation,
} from "react-native-reanimated";
import { colors } from "../../../lib/theme";

const DOT_COUNT = 6;
const DOT_SIZE = 6;
const ORBIT_RADIUS = 75;

export function HeroLogoReveal({ isActive }: { isActive: boolean }) {
  const logoScale = useSharedValue(0.7);
  const dotRadius = useSharedValue(0);
  const angle = useSharedValue(0);
  const glowScale = useSharedValue(0.95);

  useEffect(() => {
    if (isActive) {
      logoScale.value = withSpring(1, { damping: 12 });
      dotRadius.value = withTiming(ORBIT_RADIUS, { duration: 800 });
      angle.value = withRepeat(withTiming(Math.PI * 2, { duration: 10000 }), -1, false);
      glowScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 2000 }),
          withTiming(0.95, { duration: 2000 })
        ),
        -1,
        true
      );
    } else {
      cancelAnimation(angle);
      cancelAnimation(glowScale);
      logoScale.value = 0.7;
      dotRadius.value = 0;
      angle.value = 0;
      glowScale.value = 0.95;
    }

    return () => {
      cancelAnimation(logoScale);
      cancelAnimation(dotRadius);
      cancelAnimation(angle);
      cancelAnimation(glowScale);
    };
  }, [isActive]);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
  }));

  return (
    <View style={{ width: 260, height: 260, alignItems: "center", justifyContent: "center" }}>
      {/* Glow ring */}
      <Animated.View
        style={[
          {
            position: "absolute",
            width: 180,
            height: 180,
            borderRadius: 90,
            borderWidth: 1.5,
            borderColor: colors.gray300,
            opacity: 0.15,
          },
          glowStyle,
        ]}
      />

      {/* Orbiting dots */}
      {Array.from({ length: DOT_COUNT }).map((_, i) => (
        <OrbitDot key={i} index={i} angle={angle} radius={dotRadius} />
      ))}

      {/* Logo */}
      <Animated.View style={logoStyle}>
        <Image
          source={require("../../../assets/images/XpylonLogo_V2.png")}
          style={{ width: 120, height: 38 }}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
}

function OrbitDot({
  index,
  angle,
  radius,
}: {
  index: number;
  angle: import("react-native-reanimated").SharedValue<number>;
  radius: import("react-native-reanimated").SharedValue<number>;
}) {
  const offset = (index * Math.PI * 2) / DOT_COUNT;

  const style = useAnimatedStyle(() => {
    const currentAngle = angle.value + offset;
    const r = radius.value;
    return {
      position: "absolute",
      width: DOT_SIZE,
      height: DOT_SIZE,
      borderRadius: DOT_SIZE / 2,
      backgroundColor: colors.gray300,
      opacity: 0.5,
      transform: [
        { translateX: Math.cos(currentAngle) * r },
        { translateY: Math.sin(currentAngle) * r },
      ],
    };
  });

  return <Animated.View style={style} />;
}
