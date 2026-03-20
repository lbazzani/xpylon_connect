import { View, Dimensions, Modal } from "react-native";
import { useState, useCallback } from "react";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { TourSlide } from "./TourSlide";
import { TourProgress } from "./TourProgress";
import { TourNavigation } from "./TourNavigation";
import { useSlideAnimations } from "./useSlideAnimations";
import type { AnimationConfig, TourMode } from "./types";
import animationData from "../../../storyboard/animation.json";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const data = animationData as AnimationConfig;

interface ProductTourProps {
  mode: TourMode;
  onComplete: () => void;
  visible?: boolean;
}

export function ProductTour({ mode, onComplete, visible = true }: ProductTourProps) {
  const slides = data.slides;
  const { scrollX, scrollRef, scrollHandler, activeIndex, scrollToIndex, slideWidth } =
    useSlideAnimations(slides.length);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = useCallback(() => {
    const next = currentIndex + 1;
    if (next < slides.length) {
      scrollToIndex(next);
      setCurrentIndex(next);
    }
  }, [currentIndex, slides.length, scrollToIndex]);

  const handleScroll = useCallback(() => {
    // Sync state with animated value for TourNavigation
    const idx = Math.round(scrollX.value / SCREEN_WIDTH);
    if (idx !== currentIndex && idx >= 0 && idx < slides.length) {
      setCurrentIndex(idx);
    }
  }, [currentIndex, slides.length]);

  const content = (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1">
        <Animated.ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={scrollHandler}
          onMomentumScrollEnd={handleScroll}
          scrollEventThrottle={16}
        >
          {slides.map((slide, index) => (
            <TourSlide
              key={slide.id}
              slide={slide}
              index={index}
              scrollX={scrollX}
              isActive={currentIndex === index}
            />
          ))}
        </Animated.ScrollView>
      </View>

      <TourProgress total={slides.length} scrollX={scrollX} slideWidth={slideWidth} />

      <TourNavigation
        activeIndex={currentIndex}
        totalSlides={slides.length}
        mode={mode}
        onNext={handleNext}
        onSkip={onComplete}
        onComplete={onComplete}
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
