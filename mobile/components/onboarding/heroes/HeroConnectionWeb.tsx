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
  cancelAnimation,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../../lib/theme";

const SIZE = 220;
const RADIUS = 70;
const CENTER = SIZE / 2;
const DOT_SIZE = 32;
const CENTER_DOT_SIZE = 38;

// Pentagon points
const points = Array.from({ length: 5 }).map((_, i) => {
  const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
  return {
    x: CENTER + Math.cos(angle) * RADIUS - DOT_SIZE / 2,
    y: CENTER + Math.sin(angle) * RADIUS - DOT_SIZE / 2,
  };
});

// Lines between connected nodes (each connects to center)
const lines = points.map((p) => {
  const dx = p.x + DOT_SIZE / 2 - CENTER;
  const dy = p.y + DOT_SIZE / 2 - CENTER;
  const length = Math.sqrt(dx * dx + dy * dy);
  const rotation = Math.atan2(dy, dx) * (180 / Math.PI);
  return { length, rotation };
});

function DotNode({
  x,
  y,
  index,
  isActive,
}: {
  x: number;
  y: number;
  index: number;
  isActive: boolean;
}) {
  const scale = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      scale.value = withDelay(index * 100, withSpring(1, { damping: 14 }));
    } else {
      cancelAnimation(scale);
      scale.value = 0;
    }
    return () => {
      cancelAnimation(scale);
    };
  }, [isActive]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: x,
          top: y,
          width: DOT_SIZE,
          height: DOT_SIZE,
          borderRadius: DOT_SIZE / 2,
          backgroundColor: colors.gray100,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <Ionicons name="person-outline" size={14} color={colors.gray500} />
    </Animated.View>
  );
}

function ConnectionLine({
  index,
  length,
  rotation,
  isActive,
  isPulsing,
}: {
  index: number;
  length: number;
  rotation: number;
  isActive: boolean;
  isPulsing: boolean;
}) {
  const scaleX = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (isActive) {
      scaleX.value = withDelay(600 + index * 150, withTiming(1, { duration: 400 }));
      if (isPulsing) {
        opacity.value = withDelay(
          1200,
          withRepeat(
            withSequence(
              withTiming(0.8, { duration: 750 }),
              withTiming(0.3, { duration: 750 })
            ),
            -1,
            true
          )
        );
      }
    } else {
      cancelAnimation(scaleX);
      cancelAnimation(opacity);
      scaleX.value = 0;
      opacity.value = 1;
    }
    return () => {
      cancelAnimation(scaleX);
      cancelAnimation(opacity);
    };
  }, [isActive]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation}deg` },
      { scaleX: scaleX.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: CENTER,
          top: CENTER - 0.75,
          width: length,
          height: 1.5,
          backgroundColor: colors.gray200,
          transformOrigin: "left center",
        },
        style,
      ]}
    />
  );
}

export function HeroConnectionWeb({ isActive }: { isActive: boolean }) {
  const centerScale = useSharedValue(0);
  const centerPulse = useSharedValue(1);

  useEffect(() => {
    if (isActive) {
      centerScale.value = withDelay(250, withSpring(1, { damping: 14 }));
      centerPulse.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 1000 }),
          withTiming(1.0, { duration: 1000 })
        ),
        -1,
        true
      );
    } else {
      cancelAnimation(centerScale);
      cancelAnimation(centerPulse);
      centerScale.value = 0;
      centerPulse.value = 1;
    }
    return () => {
      cancelAnimation(centerScale);
      cancelAnimation(centerPulse);
    };
  }, [isActive]);

  const centerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: centerScale.value * centerPulse.value }],
  }));

  // Pick one line to pulse (index 2)
  const pulsingIndex = 2;

  return (
    <View style={{ width: 260, height: 260, alignItems: "center", justifyContent: "center" }}>
      <View style={{ width: SIZE, height: SIZE }}>
        {/* Lines */}
        {lines.map((line, i) => (
          <ConnectionLine
            key={`line-${i}`}
            index={i}
            length={line.length}
            rotation={line.rotation}
            isActive={isActive}
            isPulsing={i === pulsingIndex}
          />
        ))}

        {/* Outer dots */}
        {points.map((p, i) => (
          <DotNode key={`dot-${i}`} x={p.x} y={p.y} index={i} isActive={isActive} />
        ))}

        {/* Center dot */}
        <Animated.View
          style={[
            {
              position: "absolute",
              left: CENTER - CENTER_DOT_SIZE / 2,
              top: CENTER - CENTER_DOT_SIZE / 2,
              width: CENTER_DOT_SIZE,
              height: CENTER_DOT_SIZE,
              borderRadius: CENTER_DOT_SIZE / 2,
              backgroundColor: colors.white,
              borderWidth: 2,
              borderColor: colors.primary,
              alignItems: "center",
              justifyContent: "center",
            },
            centerStyle,
          ]}
        >
          <Ionicons name="person" size={16} color={colors.primary} />
        </Animated.View>
      </View>
    </View>
  );
}
