import { useRef, useCallback } from "react";
import { Dimensions, ScrollView } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useDerivedValue,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export function useSlideAnimations(totalSlides: number) {
  const scrollX = useSharedValue(0);
  const scrollRef = useRef<Animated.ScrollView>(null);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const activeIndex = useDerivedValue(() => {
    return Math.round(scrollX.value / SCREEN_WIDTH);
  });

  const scrollToIndex = useCallback((index: number) => {
    scrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
  }, []);

  return {
    scrollX,
    scrollRef,
    scrollHandler,
    activeIndex,
    scrollToIndex,
    slideWidth: SCREEN_WIDTH,
  };
}
