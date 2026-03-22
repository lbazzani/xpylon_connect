import { View, Text, Dimensions } from "react-native";
import { useEffect } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { SlideHero } from "./heroes/SlideHero";
import { colors } from "../../lib/theme";
import type { Slide } from "./types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const FEATURE_STAGGER = 80;

interface TourSlideProps {
  slide: Slide;
  index: number;
  isActive: boolean;
}

function useStaggerAnimation(isActive: boolean, delay: number) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(16);

  useEffect(() => {
    if (isActive) {
      opacity.value = withDelay(delay, withTiming(1, { duration: 450 }));
      translateY.value = withDelay(delay, withTiming(0, { duration: 450, easing: Easing.out(Easing.cubic) }));
    } else {
      cancelAnimation(opacity);
      cancelAnimation(translateY);
      opacity.value = 0;
      translateY.value = 16;
    }
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(translateY);
    };
  }, [isActive, delay]);

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
}

function FeatureItem({
  icon,
  title,
  description,
  isActive,
  delay,
}: {
  icon: string;
  title: string;
  description: string;
  isActive: boolean;
  delay: number;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);
  const iconScale = useSharedValue(0.7);

  useEffect(() => {
    if (isActive) {
      opacity.value = withDelay(
        delay,
        withTiming(1, { duration: 350, easing: Easing.out(Easing.cubic) })
      );
      translateY.value = withDelay(
        delay,
        withTiming(0, { duration: 350, easing: Easing.bezierFn(0.34, 1.56, 0.64, 1) })
      );
      iconScale.value = withDelay(
        delay + 50,
        withSpring(1, { damping: 10, stiffness: 150 })
      );
    } else {
      cancelAnimation(opacity);
      cancelAnimation(translateY);
      cancelAnimation(iconScale);
      opacity.value = 0;
      translateY.value = 12;
      iconScale.value = 0.7;
    }
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(translateY);
      cancelAnimation(iconScale);
    };
  }, [isActive, delay]);

  const rowStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const iconAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  return (
    <Animated.View style={rowStyle} className="flex-row items-start mb-3 px-2">
      <Animated.View
        style={iconAnimStyle}
        className="w-9 h-9 rounded-xl bg-gray-50 items-center justify-center mr-3 mt-0.5"
      >
        <Ionicons name={icon as any} size={18} color={colors.gray500} />
      </Animated.View>
      <View className="flex-1">
        <Text className="text-sm font-semibold text-gray-900">{title}</Text>
        <Text className="text-xs text-gray-400 mt-0.5 leading-4">{description}</Text>
      </View>
    </Animated.View>
  );
}

export function TourSlide({ slide, index, isActive }: TourSlideProps) {
  const stagger = slide.animation?.staggerDelay || 100;

  const taglineStyle = useStaggerAnimation(isActive, stagger * 1);
  const titleStyle = useStaggerAnimation(isActive, stagger * 2);
  const subtitleStyle = useStaggerAnimation(isActive, stagger * 3);

  const featuresBaseDelay = stagger * 4;

  return (
    <View style={{ width: SCREEN_WIDTH }} className="flex-1 px-8 justify-center items-center">
      {/* Hero visual */}
      <SlideHero heroType={slide.heroType} isActive={isActive} />

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

      {/* Features — individually staggered */}
      {slide.features && slide.features.length > 0 && (
        <View className="w-full" pointerEvents="none">
          {slide.features.map((feature, i) => (
            <FeatureItem
              key={i}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              isActive={isActive}
              delay={featuresBaseDelay + i * FEATURE_STAGGER}
            />
          ))}
        </View>
      )}
    </View>
  );
}
