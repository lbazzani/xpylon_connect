import React, { useEffect, useRef } from "react";
import { View, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import { colors } from "../../../lib/theme";

const BACK_EASING = Easing.out(Easing.back(1.3));

function useBubbleEntry(delay: number, isActive: boolean) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    if (isActive) {
      opacity.value = withDelay(delay, withTiming(1, { duration: 400, easing: BACK_EASING }));
      translateY.value = withDelay(delay, withTiming(0, { duration: 400, easing: BACK_EASING }));
    } else {
      cancelAnimation(opacity);
      cancelAnimation(translateY);
      opacity.value = 0;
      translateY.value = 20;
    }
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(translateY);
    };
  }, [isActive]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return style;
}

function TypingDots({ isActive }: { isActive: boolean }) {
  const dots = [useSharedValue(0), useSharedValue(0), useSharedValue(0)];

  useEffect(() => {
    if (isActive) {
      dots.forEach((dot, i) => {
        dot.value = withDelay(
          i * 130,
          withRepeat(
            withSequence(
              withTiming(-4, { duration: 200 }),
              withTiming(0, { duration: 200 })
            ),
            -1,
            false
          )
        );
      });
    } else {
      dots.forEach((dot) => {
        cancelAnimation(dot);
        dot.value = 0;
      });
    }
    return () => {
      dots.forEach((dot) => cancelAnimation(dot));
    };
  }, [isActive]);

  return (
    <View style={{ flexDirection: "row", gap: 4, paddingHorizontal: 4, paddingVertical: 2 }}>
      {dots.map((dot, i) => {
        const style = useAnimatedStyle(() => ({
          transform: [{ translateY: dot.value }],
        }));
        return (
          <Animated.View
            key={i}
            style={[
              {
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: colors.gray400,
              },
              style,
            ]}
          />
        );
      })}
    </View>
  );
}

export function HeroChatSequence({ isActive }: { isActive: boolean }) {
  const bubble1Style = useBubbleEntry(0, isActive);
  const bubble2Style = useBubbleEntry(600, isActive);
  const bubble3Style = useBubbleEntry(1200, isActive);

  // Typing → text morph for bubble 3
  const typingOpacity = useSharedValue(1);
  const textOpacity = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      // Show typing dots at 1200ms, morph to text at 2200ms
      typingOpacity.value = 1;
      textOpacity.value = 0;
      typingOpacity.value = withDelay(2200, withTiming(0, { duration: 200 }));
      textOpacity.value = withDelay(2400, withTiming(1, { duration: 300 }));
    } else {
      cancelAnimation(typingOpacity);
      cancelAnimation(textOpacity);
      typingOpacity.value = 1;
      textOpacity.value = 0;
    }
    return () => {
      cancelAnimation(typingOpacity);
      cancelAnimation(textOpacity);
    };
  }, [isActive]);

  const typingStyle = useAnimatedStyle(() => ({
    opacity: typingOpacity.value,
    position: "absolute" as const,
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  // Gentle float for entire composition
  const floatY = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      floatY.value = withRepeat(
        withSequence(
          withTiming(-3, { duration: 2500 }),
          withTiming(3, { duration: 2500 })
        ),
        -1,
        true
      );
    } else {
      cancelAnimation(floatY);
      floatY.value = 0;
    }
    return () => {
      cancelAnimation(floatY);
    };
  }, [isActive]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  return (
    <View style={{ width: 260, height: 260, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={[{ width: 260, height: 180, gap: 8 }, floatStyle]}>
        {/* Bubble 1 — left */}
        <Animated.View
          style={[
            {
              alignSelf: "flex-start",
              backgroundColor: colors.gray100,
              borderRadius: 16,
              paddingHorizontal: 16,
              paddingVertical: 10,
              maxWidth: "75%",
            },
            bubble1Style,
          ]}
        >
          <Text style={{ fontSize: 12, color: colors.gray600 }}>Tell me about yourself</Text>
        </Animated.View>

        {/* Bubble 2 — right */}
        <Animated.View
          style={[
            {
              alignSelf: "flex-end",
              backgroundColor: colors.gray800,
              borderRadius: 16,
              paddingHorizontal: 16,
              paddingVertical: 10,
              maxWidth: "75%",
            },
            bubble2Style,
          ]}
        >
          <Text style={{ fontSize: 12, color: colors.white }}>I'm a CEO at Acme...</Text>
        </Animated.View>

        {/* Bubble 3 — left, typing → text */}
        <Animated.View
          style={[
            {
              alignSelf: "flex-start",
              backgroundColor: colors.gray100,
              borderRadius: 16,
              paddingHorizontal: 16,
              paddingVertical: 10,
              maxWidth: "85%",
              minHeight: 34,
              justifyContent: "center",
            },
            bubble3Style,
          ]}
        >
          <Animated.View style={typingStyle}>
            <TypingDots isActive={isActive} />
          </Animated.View>
          <Animated.View style={textStyle}>
            <Text style={{ fontSize: 12, color: colors.gray600 }}>
              Great! Let me find relevant contacts for you.
            </Text>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}
