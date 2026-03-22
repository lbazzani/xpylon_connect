import { View, Text } from "react-native";
import { useEffect } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../../lib/theme";

const CARDS = [
  { label: "LinkedIn", icon: "logo-linkedin" as const, desc: "Visibility" },
  { label: "Directories", icon: "globe-outline" as const, desc: "Catalogs" },
  { label: "Trade fairs", icon: "calendar-outline" as const, desc: "4 days/year" },
];

export function HeroPlatformFade({ isActive }: { isActive: boolean }) {
  // Card entrance
  const card0Y = useSharedValue(30);
  const card0Opacity = useSharedValue(0);
  const card1Y = useSharedValue(30);
  const card1Opacity = useSharedValue(0);
  const card2Y = useSharedValue(30);
  const card2Opacity = useSharedValue(0);

  // Cards fade out
  const cardsFadeScale = useSharedValue(1);
  const cardsFadeOpacity = useSharedValue(1);

  // Question mark
  const questionOpacity = useSharedValue(0);
  const questionScale = useSharedValue(0.6);
  const questionPulse = useSharedValue(1);

  useEffect(() => {
    if (isActive) {
      // Cards slide in staggered
      card0Opacity.value = withTiming(1, { duration: 400 });
      card0Y.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) });
      card1Opacity.value = withDelay(150, withTiming(1, { duration: 400 }));
      card1Y.value = withDelay(150, withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) }));
      card2Opacity.value = withDelay(300, withTiming(1, { duration: 400 }));
      card2Y.value = withDelay(300, withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) }));

      // After 1.5s: cards fade out and shrink
      cardsFadeOpacity.value = withDelay(1800, withTiming(0.15, { duration: 800 }));
      cardsFadeScale.value = withDelay(1800, withTiming(0.92, { duration: 800 }));

      // Question mark fades in
      questionOpacity.value = withDelay(2200, withTiming(1, { duration: 500 }));
      questionScale.value = withDelay(2200, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }));

      // Pulse
      questionPulse.value = withDelay(2800,
        withRepeat(withSequence(
          withTiming(1.06, { duration: 1500 }),
          withTiming(0.96, { duration: 1500 }),
        ), -1, true)
      );
    } else {
      cancelAnimation(card0Y); cancelAnimation(card0Opacity);
      cancelAnimation(card1Y); cancelAnimation(card1Opacity);
      cancelAnimation(card2Y); cancelAnimation(card2Opacity);
      cancelAnimation(cardsFadeScale); cancelAnimation(cardsFadeOpacity);
      cancelAnimation(questionOpacity); cancelAnimation(questionScale);
      cancelAnimation(questionPulse);

      card0Y.value = 30; card0Opacity.value = 0;
      card1Y.value = 30; card1Opacity.value = 0;
      card2Y.value = 30; card2Opacity.value = 0;
      cardsFadeScale.value = 1; cardsFadeOpacity.value = 1;
      questionOpacity.value = 0; questionScale.value = 0.6;
      questionPulse.value = 1;
    }

    return () => {
      cancelAnimation(questionPulse);
    };
  }, [isActive]);

  const cardContainerStyle = useAnimatedStyle(() => ({
    opacity: cardsFadeOpacity.value,
    transform: [{ scale: cardsFadeScale.value }],
  }));

  const card0Style = useAnimatedStyle(() => ({
    opacity: card0Opacity.value,
    transform: [{ translateY: card0Y.value }],
  }));
  const card1Style = useAnimatedStyle(() => ({
    opacity: card1Opacity.value,
    transform: [{ translateY: card1Y.value }],
  }));
  const card2Style = useAnimatedStyle(() => ({
    opacity: card2Opacity.value,
    transform: [{ translateY: card2Y.value }],
  }));

  const questionStyle = useAnimatedStyle(() => ({
    opacity: questionOpacity.value,
    transform: [{ scale: questionScale.value * questionPulse.value }],
  }));

  const cardStyles = [card0Style, card1Style, card2Style];

  return (
    <View style={{ width: 260, height: 200, alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
      {/* Platform cards */}
      <Animated.View style={[{ position: "absolute", width: 260 }, cardContainerStyle]}>
        {CARDS.map((card, i) => (
          <Animated.View
            key={card.label}
            style={[
              cardStyles[i],
              {
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: colors.gray100,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 12,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: colors.gray200,
              },
            ]}
          >
            <View style={{
              width: 32, height: 32, borderRadius: 8,
              backgroundColor: colors.gray200,
              alignItems: "center", justifyContent: "center", marginRight: 12,
            }}>
              <Ionicons name={card.icon} size={16} color={colors.gray400} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.gray500 }}>{card.label}</Text>
              <Text style={{ fontSize: 11, color: colors.gray400, marginTop: 1 }}>{card.desc}</Text>
            </View>
            <Ionicons name="close-outline" size={16} color={colors.gray300} />
          </Animated.View>
        ))}
      </Animated.View>

      {/* Question mark */}
      <Animated.View style={[questionStyle, { position: "absolute" }]}>
        <View style={{
          width: 64, height: 64, borderRadius: 32,
          backgroundColor: colors.gray100,
          borderWidth: 1.5, borderColor: colors.gray200,
          alignItems: "center", justifyContent: "center",
        }}>
          <Ionicons name="help-outline" size={32} color={colors.gray400} />
        </View>
      </Animated.View>
    </View>
  );
}
