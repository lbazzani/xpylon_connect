import { View, Modal } from "react-native";
import { useState, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSharedValue } from "react-native-reanimated";
import { TourSlide } from "./TourSlide";
import { TourProgressSimple } from "./TourProgress";
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
  const scrollX = useSharedValue(0); // kept for type compat

  const handleNext = useCallback(() => {
    if (currentIndex < slides.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, slides.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const content = (
    <SafeAreaView className="flex-1 bg-white">
      {/* Current slide */}
      <View className="flex-1">
        <TourSlide
          key={slides[currentIndex].id}
          slide={slides[currentIndex]}
          index={currentIndex}
          scrollX={scrollX}
          isActive={true}
        />
      </View>

      {/* Progress dots */}
      <TourProgressSimple total={slides.length} active={currentIndex} />

      {/* Navigation */}
      <TourNavigation
        activeIndex={currentIndex}
        totalSlides={slides.length}
        mode={mode}
        onNext={handleNext}
        onDismiss={onDismiss}
        onDismissForever={onDismissForever || onDismiss}
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
