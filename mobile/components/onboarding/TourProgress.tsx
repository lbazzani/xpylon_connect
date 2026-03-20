import { View } from "react-native";
import Animated, { useAnimatedStyle, interpolate, Extrapolation } from "react-native-reanimated";
import { colors } from "../../lib/theme";

interface TourProgressProps {
  total: number;
  scrollX: Animated.SharedValue<number>;
  slideWidth: number;
}

function Dot({ index, scrollX, slideWidth }: { index: number; scrollX: Animated.SharedValue<number>; slideWidth: number }) {
  const animStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * slideWidth, index * slideWidth, (index + 1) * slideWidth];
    const width = interpolate(scrollX.value, inputRange, [6, 24, 6], Extrapolation.CLAMP);
    const opacity = interpolate(scrollX.value, inputRange, [0.3, 1, 0.3], Extrapolation.CLAMP);
    return { width, opacity };
  });

  return (
    <Animated.View
      style={[animStyle, { height: 6, borderRadius: 3, backgroundColor: colors.gray900, marginHorizontal: 3 }]}
    />
  );
}

export function TourProgress({ total, scrollX, slideWidth }: TourProgressProps) {
  return (
    <View className="flex-row items-center justify-center py-6">
      {Array.from({ length: total }).map((_, i) => (
        <Dot key={i} index={i} scrollX={scrollX} slideWidth={slideWidth} />
      ))}
    </View>
  );
}
