import React, { useEffect, useMemo } from "react";
import { View, Image } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated";
import { colors } from "../../../lib/theme";

const RAY_COUNT = 8;
const RAY_LENGTH = 20;
const RAY_WIDTH = 1.5;
const DOT_COUNT = 10;

function Ray({ index, isActive }: { index: number; isActive: boolean }) {
  const angleDeg = index * 45;
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      // Burst out then repeat
      const startDelay = 200;
      translateY.value = withDelay(
        startDelay,
        withRepeat(
          withSequence(
            withTiming(-25, { duration: 600 }),
            withTiming(0, { duration: 0 }),
            withTiming(0, { duration: 3500 }) // pause between bursts
          ),
          -1,
          false
        )
      );
      opacity.value = withDelay(
        startDelay,
        withRepeat(
          withSequence(
            withTiming(0, { duration: 600 }),
            withTiming(1, { duration: 0 }),
            withTiming(1, { duration: 3500 })
          ),
          -1,
          false
        )
      );
    } else {
      cancelAnimation(translateY);
      cancelAnimation(opacity);
      translateY.value = 0;
      opacity.value = 0;
    }

    return () => {
      cancelAnimation(translateY);
      cancelAnimation(opacity);
    };
  }, [isActive]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { rotateZ: `${angleDeg}deg` },
      { translateY: -35 + translateY.value }, // start near logo edge
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: RAY_WIDTH,
          height: RAY_LENGTH,
          backgroundColor: colors.gray300,
          borderRadius: RAY_WIDTH / 2,
        },
        style,
      ]}
    />
  );
}

interface DotConfig {
  angle: number;
  radius: number;
  color: string;
  fadeDelay: number;
  targetOpacity: number;
  floatPeriod: number;
  floatAmplitude: number;
}

function FloatingDot({ config, isActive }: { config: DotConfig; isActive: boolean }) {
  const opacity = useSharedValue(0);
  const floatY = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      opacity.value = withDelay(
        config.fadeDelay,
        withTiming(config.targetOpacity, { duration: 500 })
      );
      floatY.value = withDelay(
        config.fadeDelay + 300,
        withRepeat(
          withSequence(
            withTiming(-config.floatAmplitude, { duration: config.floatPeriod / 2 }),
            withTiming(config.floatAmplitude, { duration: config.floatPeriod / 2 })
          ),
          -1,
          true
        )
      );
    } else {
      cancelAnimation(opacity);
      cancelAnimation(floatY);
      opacity.value = 0;
      floatY.value = 0;
    }

    return () => {
      cancelAnimation(opacity);
      cancelAnimation(floatY);
    };
  }, [isActive]);

  const x = Math.cos((config.angle * Math.PI) / 180) * config.radius;
  const y = Math.sin((config.angle * Math.PI) / 180) * config.radius;

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: x }, { translateY: y + floatY.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: 3,
          height: 3,
          borderRadius: 1.5,
          backgroundColor: config.color,
        },
        style,
      ]}
    />
  );
}

// Generate stable dot configs outside render
function generateDotConfigs(): DotConfig[] {
  const dotColors = [
    colors.gray200,
    colors.gray300,
    colors.gray400,
    colors.gray300,
    colors.gray200,
    colors.gray400,
    colors.gray300,
    colors.gray200,
    colors.gray400,
    colors.gray300,
  ];
  const angles = [15, 55, 100, 140, 185, 220, 260, 305, 345, 70];
  const radii = [85, 95, 110, 88, 105, 92, 115, 100, 82, 118];
  const fadeDelays = [200, 350, 500, 280, 620, 450, 700, 320, 550, 400];
  const opacities = [0.4, 0.3, 0.5, 0.35, 0.45, 0.3, 0.5, 0.4, 0.35, 0.45];
  const periods = [2400, 3200, 2800, 3600, 2000, 3400, 2600, 4000, 3000, 2200];
  const amplitudes = [3, 4, 5, 3.5, 4.5, 3, 5, 4, 3.5, 4.5];

  return Array.from({ length: DOT_COUNT }, (_, i) => ({
    angle: angles[i],
    radius: radii[i],
    color: dotColors[i],
    fadeDelay: fadeDelays[i],
    targetOpacity: opacities[i],
    floatPeriod: periods[i],
    floatAmplitude: amplitudes[i],
  }));
}

export function HeroSparkBurst({ isActive }: { isActive: boolean }) {
  const logoScale = useSharedValue(0.6);
  const glowScale = useSharedValue(0.97);
  const glowOpacity = useSharedValue(0);

  const dotConfigs = useMemo(() => generateDotConfigs(), []);

  useEffect(() => {
    if (isActive) {
      // Logo bouncy spring
      logoScale.value = withSpring(1, { damping: 8, stiffness: 80 });

      // Glow ring
      glowOpacity.value = withDelay(300, withTiming(1, { duration: 500 }));
      glowScale.value = withDelay(
        500,
        withRepeat(
          withSequence(
            withTiming(1.03, { duration: 2000 }),
            withTiming(0.97, { duration: 2000 })
          ),
          -1,
          true
        )
      );
    } else {
      cancelAnimation(logoScale);
      cancelAnimation(glowScale);
      cancelAnimation(glowOpacity);
      logoScale.value = 0.6;
      glowScale.value = 0.97;
      glowOpacity.value = 0;
    }

    return () => {
      cancelAnimation(logoScale);
      cancelAnimation(glowScale);
      cancelAnimation(glowOpacity);
    };
  }, [isActive]);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  return (
    <View style={{ width: 260, height: 260, alignItems: "center", justifyContent: "center" }}>
      {/* Glow ring */}
      <Animated.View
        style={[
          {
            position: "absolute",
            width: 160,
            height: 160,
            borderRadius: 80,
            borderWidth: 1.5,
            borderColor: colors.primary,
            opacity: 0.06,
          },
          glowStyle,
        ]}
      />

      {/* Rays */}
      {Array.from({ length: RAY_COUNT }).map((_, i) => (
        <Ray key={`ray-${i}`} index={i} isActive={isActive} />
      ))}

      {/* Floating dots */}
      {dotConfigs.map((config, i) => (
        <FloatingDot key={`dot-${i}`} config={config} isActive={isActive} />
      ))}

      {/* Center logo */}
      <Animated.View style={logoStyle}>
        <Image
          source={require("../../../assets/images/XpylonLogo_V2.png")}
          style={{ width: 130, height: 42 }}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
}
