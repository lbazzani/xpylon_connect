import { View, Modal } from "react-native";
import { useState, useCallback, useRef } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { TourSlide } from "./TourSlide";
import { TourProgressBar } from "./TourProgress";
import { TourNavigation } from "./TourNavigation";
import type { AnimationConfig, TourMode } from "./types";
import animationData from "../../../storyboard/animation.json";

const data = animationData as AnimationConfig;

interface ProductTourProps {
  mode: TourMode;
  onDismiss: () => void;
  onDismissForever?: () => void;
  visible?: boolean;
}

export function ProductTour({ mode, onDismiss, onDismissForever, visible = true }: ProductTourProps) {
  const slides = data.slides;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  // Slide transition animation
  const slideOpacity = useSharedValue(1);
  const slideScale = useSharedValue(1);
  const slideTranslateY = useSharedValue(0);

  const exitDuration = data.defaults.exitDuration || 250;
  const enterDuration = data.defaults.transitionDuration || 400;
  const enterDelay = data.defaults.enterDelay || 150;

  const swapIndex = useCallback((newIndex: number) => {
    setCurrentIndex(newIndex);
    setTransitioning(false);

    // Enter animation
    slideOpacity.value = 0;
    slideScale.value = 0.97;
    slideTranslateY.value = -12;

    slideOpacity.value = withDelay(
      enterDelay,
      withTiming(1, { duration: enterDuration, easing: Easing.out(Easing.cubic) })
    );
    slideScale.value = withDelay(
      enterDelay,
      withTiming(1, { duration: enterDuration, easing: Easing.out(Easing.cubic) })
    );
    slideTranslateY.value = withDelay(
      enterDelay,
      withTiming(0, { duration: enterDuration, easing: Easing.out(Easing.cubic) })
    );
  }, [enterDelay, enterDuration]);

  const handleNext = useCallback(() => {
    if (transitioning || currentIndex >= slides.length - 1) return;
    const nextIdx = currentIndex + 1;
    setTransitioning(true);

    // Exit animation
    slideOpacity.value = withTiming(0, {
      duration: exitDuration,
      easing: Easing.in(Easing.cubic),
    }, () => {
      runOnJS(swapIndex)(nextIdx);
    });
    slideScale.value = withTiming(0.97, {
      duration: exitDuration,
      easing: Easing.in(Easing.cubic),
    });
    slideTranslateY.value = withTiming(12, {
      duration: exitDuration,
      easing: Easing.in(Easing.cubic),
    });
  }, [currentIndex, slides.length, transitioning, exitDuration, swapIndex]);

  const slideAnimStyle = useAnimatedStyle(() => ({
    opacity: slideOpacity.value,
    transform: [
      { scale: slideScale.value },
      { translateY: slideTranslateY.value },
    ],
  }));

  const content = (
    <SafeAreaView className="flex-1 bg-white">
      {/* Slide content */}
      <Animated.View style={[{ flex: 1 }, slideAnimStyle]}>
        <TourSlide
          key={slides[currentIndex].id}
          slide={slides[currentIndex]}
          index={currentIndex}
          isActive={!transitioning}
        />
      </Animated.View>

      {/* Progress bar */}
      <TourProgressBar total={slides.length} active={currentIndex} />

      {/* Navigation */}
      <TourNavigation
        activeIndex={currentIndex}
        totalSlides={slides.length}
        mode={mode}
        onNext={handleNext}
        onDismiss={onDismiss}
        onDismissForever={onDismissForever || onDismiss}
        disabled={transitioning}
      />
    </SafeAreaView>
  );

  if (mode === "menu") {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        {content}
      </Modal>
    );
  }

  return content;
}
