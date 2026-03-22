import React, { useEffect } from "react";
import { View, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  cancelAnimation,
  withSpring,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../../lib/theme";

function TypingDot({ index, isActive }: { index: number; isActive: boolean }) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      translateY.value = withDelay(
        index * 100,
        withRepeat(
          withSequence(
            withTiming(-4, { duration: 350, easing: Easing.inOut(Easing.ease) }),
            withTiming(0, { duration: 350, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          true
        )
      );
    } else {
      cancelAnimation(translateY);
      translateY.value = 0;
    }

    return () => {
      cancelAnimation(translateY);
    };
  }, [isActive]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          width: 5,
          height: 5,
          borderRadius: 2.5,
          backgroundColor: colors.gray400,
          marginHorizontal: 1.5,
        },
        style,
      ]}
    />
  );
}

export function HeroChatMockup({ isActive }: { isActive: boolean }) {
  const containerOpacity = useSharedValue(0);
  const containerScale = useSharedValue(0.95);
  const msg1Y = useSharedValue(10);
  const msg1Opacity = useSharedValue(0);
  const msg2Y = useSharedValue(10);
  const msg2Opacity = useSharedValue(0);
  const msg3Y = useSharedValue(10);
  const msg3Opacity = useSharedValue(0);
  const checkColor = useSharedValue(0); // 0 = gray, 1 = blue
  const shadowPulse = useSharedValue(0.05);

  useEffect(() => {
    if (isActive) {
      // Container enter
      containerOpacity.value = withTiming(1, { duration: 400 });
      containerScale.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) });

      // Staggered messages
      msg1Opacity.value = withDelay(200, withTiming(1, { duration: 300 }));
      msg1Y.value = withDelay(200, withTiming(0, { duration: 300 }));

      msg2Opacity.value = withDelay(400, withTiming(1, { duration: 300 }));
      msg2Y.value = withDelay(400, withTiming(0, { duration: 300 }));

      msg3Opacity.value = withDelay(600, withTiming(1, { duration: 300 }));
      msg3Y.value = withDelay(600, withTiming(0, { duration: 300 }));

      // Checkmark turns blue
      checkColor.value = withDelay(1200, withTiming(1, { duration: 400 }));

      // Shadow pulse
      shadowPulse.value = withRepeat(
        withSequence(
          withTiming(0.1, { duration: 1500 }),
          withTiming(0.05, { duration: 1500 })
        ),
        -1,
        true
      );
    } else {
      cancelAnimation(shadowPulse);
      containerOpacity.value = 0;
      containerScale.value = 0.95;
      msg1Y.value = 10;
      msg1Opacity.value = 0;
      msg2Y.value = 10;
      msg2Opacity.value = 0;
      msg3Y.value = 10;
      msg3Opacity.value = 0;
      checkColor.value = 0;
      shadowPulse.value = 0.05;
    }

    return () => {
      cancelAnimation(containerOpacity);
      cancelAnimation(containerScale);
      cancelAnimation(msg1Y);
      cancelAnimation(msg1Opacity);
      cancelAnimation(msg2Y);
      cancelAnimation(msg2Opacity);
      cancelAnimation(msg3Y);
      cancelAnimation(msg3Opacity);
      cancelAnimation(checkColor);
      cancelAnimation(shadowPulse);
    };
  }, [isActive]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
    transform: [{ scale: containerScale.value }],
    shadowOpacity: shadowPulse.value,
  }));

  const msg1Style = useAnimatedStyle(() => ({
    opacity: msg1Opacity.value,
    transform: [{ translateY: msg1Y.value }],
  }));

  const msg2Style = useAnimatedStyle(() => ({
    opacity: msg2Opacity.value,
    transform: [{ translateY: msg2Y.value }],
  }));

  const msg3Style = useAnimatedStyle(() => ({
    opacity: msg3Opacity.value,
    transform: [{ translateY: msg3Y.value }],
  }));

  const checkStyle = useAnimatedStyle(() => {
    const r = Math.round(156 + (59 - 156) * checkColor.value);
    const g = Math.round(163 + (130 - 163) * checkColor.value);
    const b = Math.round(175 + (246 - 175) * checkColor.value);
    return {
      color: `rgb(${r}, ${g}, ${b})`,
    };
  });

  return (
    <View style={{ width: 260, height: 260, alignItems: "center", justifyContent: "center" }}>
      <Animated.View
        style={[
          {
            width: 240,
            height: 220,
            backgroundColor: colors.gray50,
            borderRadius: 16,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: colors.gray200,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowRadius: 8,
            elevation: 3,
          },
          containerStyle,
        ]}
      >
        {/* Mock header */}
        <View
          style={{
            height: 28,
            backgroundColor: colors.gray800,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 8,
          }}
        >
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: colors.white,
              opacity: 0.5,
              marginRight: 6,
            }}
          />
          <Text style={{ color: colors.white, fontSize: 10, opacity: 0.7 }}>Chat</Text>
        </View>

        {/* Message body */}
        <View style={{ paddingHorizontal: 12, paddingVertical: 8, flex: 1 }}>
          {/* Left message 1 */}
          <Animated.View
            style={[
              {
                backgroundColor: colors.gray200,
                borderRadius: 12,
                width: 130,
                height: 24,
                justifyContent: "center",
                paddingHorizontal: 8,
                marginBottom: 6,
              },
              msg1Style,
            ]}
          >
            <Text style={{ fontSize: 10, color: colors.gray500 }}>Hi, I saw your listing</Text>
          </Animated.View>

          {/* Right message 2 */}
          <Animated.View
            style={[
              {
                alignSelf: "flex-end",
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 6,
              },
              msg2Style,
            ]}
          >
            <View
              style={{
                backgroundColor: colors.gray800,
                borderRadius: 12,
                width: 140,
                height: 24,
                justifyContent: "center",
                paddingHorizontal: 8,
              }}
            >
              <Text style={{ fontSize: 10, color: colors.white }}>Sounds interesting!</Text>
            </View>
            <Animated.Text style={[{ marginLeft: 2 }, checkStyle]}>
              <Ionicons name="checkmark-done" size={10} />
            </Animated.Text>
          </Animated.View>

          {/* Left message 3 */}
          <Animated.View
            style={[
              {
                backgroundColor: colors.gray200,
                borderRadius: 12,
                width: 120,
                height: 24,
                justifyContent: "center",
                paddingHorizontal: 8,
                marginBottom: 6,
              },
              msg3Style,
            ]}
          >
            <Text style={{ fontSize: 10, color: colors.gray500 }}>When can we talk?</Text>
          </Animated.View>

          {/* Typing indicator */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.gray200,
              borderRadius: 10,
              paddingHorizontal: 8,
              paddingVertical: 5,
              alignSelf: "flex-start",
              width: 36,
            }}
          >
            <TypingDot index={0} isActive={isActive} />
            <TypingDot index={1} isActive={isActive} />
            <TypingDot index={2} isActive={isActive} />
          </View>
        </View>
      </Animated.View>
    </View>
  );
}
