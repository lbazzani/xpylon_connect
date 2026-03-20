import { View, Text, Dimensions } from "react-native";
import { useEffect } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { SlideIcons } from "./SlideIcons";
import { colors } from "../../lib/theme";
import type { Slide } from "./types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface TourSlideProps {
  slide: Slide;
  index: number;
  scrollX: Animated.SharedValue<number>;
  isActive: boolean;
}

export function TourSlide({ slide, index, scrollX, isActive }: TourSlideProps) {
  const stagger = slide.animation?.staggerDelay || 100;

  // Element entrance animations
  const taglineOpacity = useSharedValue(0);
  const taglineY = useSharedValue(20);
  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(20);
  const subtitleOpacity = useSharedValue(0);
  const subtitleY = useSharedValue(20);
  const featuresOpacity = useSharedValue(0);
  const featuresY = useSharedValue(20);

  useEffect(() => {
    if (isActive) {
      const dur = 500;
      taglineOpacity.value = withDelay(stagger * 0, withTiming(1, { duration: dur }));
      taglineY.value = withDelay(stagger * 0, withTiming(0, { duration: dur }));
      titleOpacity.value = withDelay(stagger * 1, withTiming(1, { duration: dur }));
      titleY.value = withDelay(stagger * 1, withTiming(0, { duration: dur }));
      subtitleOpacity.value = withDelay(stagger * 2, withTiming(1, { duration: dur }));
      subtitleY.value = withDelay(stagger * 2, withTiming(0, { duration: dur }));
      featuresOpacity.value = withDelay(stagger * 3, withTiming(1, { duration: dur }));
      featuresY.value = withDelay(stagger * 3, withTiming(0, { duration: dur }));
    } else {
      taglineOpacity.value = 0; taglineY.value = 20;
      titleOpacity.value = 0; titleY.value = 20;
      subtitleOpacity.value = 0; subtitleY.value = 20;
      featuresOpacity.value = 0; featuresY.value = 20;
    }
  }, [isActive]);

  // Scroll-driven parallax
  const containerStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH];
    const opacity = interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolation.CLAMP);
    const scale = interpolate(scrollX.value, inputRange, [0.9, 1, 0.9], Extrapolation.CLAMP);
    return { opacity, transform: [{ scale }] };
  });

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    transform: [{ translateY: taglineY.value }],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleY.value }],
  }));

  const featuresStyle = useAnimatedStyle(() => ({
    opacity: featuresOpacity.value,
    transform: [{ translateY: featuresY.value }],
  }));

  return (
    <Animated.View
      style={[containerStyle, { width: SCREEN_WIDTH }]}
      className="flex-1 px-8 justify-center items-center"
    >
      {/* Icon composition */}
      <SlideIcons
        composition={slide.iconComposition}
        useLogoImage={slide.useLogoImage}
        effect={slide.animation?.iconEffect || "float"}
        isActive={isActive}
      />

      {/* Tagline */}
      {slide.tagline && (
        <Animated.Text
          style={taglineStyle}
          className="text-xs text-gray-400 uppercase tracking-[3px] font-semibold mb-3 text-center"
        >
          {slide.tagline}
        </Animated.Text>
      )}

      {/* Title */}
      <Animated.Text
        style={titleStyle}
        className="text-2xl font-bold text-gray-900 text-center mb-3 leading-8"
      >
        {slide.title}
      </Animated.Text>

      {/* Subtitle */}
      <Animated.Text
        style={subtitleStyle}
        className="text-sm text-gray-500 text-center leading-5 mb-8 px-4"
      >
        {slide.subtitle}
      </Animated.Text>

      {/* Features */}
      {slide.features && slide.features.length > 0 && (
        <Animated.View style={featuresStyle} className="w-full">
          {slide.features.map((feature, i) => (
            <View key={i} className="flex-row items-start mb-3 px-2">
              <View className="w-9 h-9 rounded-xl bg-gray-50 items-center justify-center mr-3 mt-0.5">
                <Ionicons name={feature.icon as any} size={18} color={colors.gray500} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-gray-900">{feature.title}</Text>
                <Text className="text-xs text-gray-400 mt-0.5 leading-4">{feature.description}</Text>
              </View>
            </View>
          ))}
        </Animated.View>
      )}
    </Animated.View>
  );
}
