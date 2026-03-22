import { View } from "react-native";
import { useEffect } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { colors } from "../../lib/theme";

interface TourProgressBarProps {
  total: number;
  active: number;
}

function Segment({ index, active }: { index: number; active: number }) {
  const fillWidth = useSharedValue(index < active ? 1 : 0);

  useEffect(() => {
    if (index < active) {
      // Already passed — fill instantly
      fillWidth.value = withTiming(1, { duration: 100 });
    } else if (index === active) {
      // Currently active — animate fill
      fillWidth.value = 0;
      fillWidth.value = withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      // Upcoming — empty
      fillWidth.value = withTiming(0, { duration: 150 });
    }
  }, [active, index]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fillWidth.value * 100}%` as any,
  }));

  return (
    <View
      style={{
        flex: 1,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: colors.gray100,
        marginHorizontal: 1.5,
        overflow: "hidden",
      }}
    >
      <Animated.View
        style={[
          {
            height: 3,
            borderRadius: 1.5,
            backgroundColor: colors.gray900,
          },
          fillStyle,
        ]}
      />
    </View>
  );
}

export function TourProgressBar({ total, active }: TourProgressBarProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        paddingHorizontal: 32,
        paddingVertical: 16,
      }}
    >
      {Array.from({ length: total }).map((_, i) => (
        <Segment key={i} index={i} active={active} />
      ))}
    </View>
  );
}

// Keep old export name for backward compatibility
export const TourProgressSimple = TourProgressBar;
