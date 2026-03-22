import React, { useEffect } from "react";
import { View } from "react-native";
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

const CARD_WIDTH = 190;
const CARD_HEIGHT = 100;

interface CardProps {
  rotation: number;
  tx: number;
  ty: number;
  baseOpacity: number;
  delay: number;
  isFront?: boolean;
  isActive: boolean;
}

function Card({ rotation, tx, ty, baseOpacity, delay, isFront, isActive }: CardProps) {
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);
  const floatY = useSharedValue(0);
  const liftY = useSharedValue(0);
  const liftRotate = useSharedValue(0);
  const tagScale = useSharedValue(1);

  useEffect(() => {
    if (isActive) {
      // Enter
      scale.value = withDelay(delay, withSpring(1, { damping: 14 }));
      opacity.value = withDelay(delay, withTiming(baseOpacity, { duration: 400 }));

      if (isFront) {
        // Continuous float
        floatY.value = withDelay(
          600,
          withRepeat(
            withSequence(
              withTiming(-4, { duration: 1500 }),
              withTiming(0, { duration: 1500 })
            ),
            -1,
            true
          )
        );

        // Tag pulse
        tagScale.value = withDelay(
          600,
          withRepeat(
            withSequence(
              withTiming(1.08, { duration: 1000 }),
              withTiming(1, { duration: 1000 })
            ),
            -1,
            true
          )
        );

        // Periodic lift every 5s
        liftY.value = withDelay(
          2000,
          withRepeat(
            withSequence(
              withTiming(-12, { duration: 400 }),
              withTiming(0, { duration: 600 }),
              withTiming(0, { duration: 4000 }) // wait
            ),
            -1,
            false
          )
        );
        liftRotate.value = withDelay(
          2000,
          withRepeat(
            withSequence(
              withTiming(1, { duration: 400 }),
              withTiming(0, { duration: 600 }),
              withTiming(0, { duration: 4000 })
            ),
            -1,
            false
          )
        );
      }
    } else {
      cancelAnimation(scale);
      cancelAnimation(opacity);
      cancelAnimation(floatY);
      cancelAnimation(liftY);
      cancelAnimation(liftRotate);
      cancelAnimation(tagScale);
      scale.value = 0.9;
      opacity.value = 0;
      floatY.value = 0;
      liftY.value = 0;
      liftRotate.value = 0;
      tagScale.value = 1;
    }

    return () => {
      cancelAnimation(scale);
      cancelAnimation(opacity);
      cancelAnimation(floatY);
      cancelAnimation(liftY);
      cancelAnimation(liftRotate);
      cancelAnimation(tagScale);
    };
  }, [isActive]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: tx },
      { translateY: ty + floatY.value + liftY.value },
      { rotateZ: `${rotation + liftRotate.value}deg` },
      { scale: scale.value },
    ],
  }));

  const tagAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: tagScale.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          backgroundColor: colors.white,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.gray100,
          padding: 14,
          justifyContent: "center",
        },
        cardStyle,
      ]}
    >
      {/* Title line */}
      <View
        style={{
          width: 120,
          height: 8,
          borderRadius: 4,
          backgroundColor: colors.gray800,
          marginBottom: 8,
        }}
      />
      {/* Description line */}
      <View
        style={{
          width: 160,
          height: 6,
          borderRadius: 3,
          backgroundColor: colors.gray200,
        }}
      />
      {/* Tag on front card */}
      {isFront && (
        <Animated.View
          style={[
            {
              position: "absolute",
              top: 10,
              right: 10,
              width: 24,
              height: 16,
              borderRadius: 6,
              backgroundColor: colors.primary,
            },
            tagAnimStyle,
          ]}
        />
      )}
    </Animated.View>
  );
}

export function HeroCardStack({ isActive }: { isActive: boolean }) {
  return (
    <View style={{ width: 260, height: 260, alignItems: "center", justifyContent: "center" }}>
      {/* Back card */}
      <Card
        rotation={-4}
        tx={-6}
        ty={-4}
        baseOpacity={0.5}
        delay={0}
        isActive={isActive}
      />
      {/* Middle card */}
      <Card
        rotation={-2}
        tx={-3}
        ty={-2}
        baseOpacity={0.75}
        delay={200}
        isActive={isActive}
      />
      {/* Front card */}
      <Card
        rotation={0}
        tx={0}
        ty={0}
        baseOpacity={1}
        delay={400}
        isFront
        isActive={isActive}
      />
    </View>
  );
}
