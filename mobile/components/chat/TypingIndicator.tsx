import { View, Text } from "react-native";
import { useEffect, useRef } from "react";
import { Animated } from "react-native";

interface TypingIndicatorProps {
  names: string[];
}

export function TypingIndicator({ names }: TypingIndicatorProps) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600 - delay),
        ])
      );
    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 200);
    const a3 = animate(dot3, 400);
    a1.start();
    a2.start();
    a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  if (names.length === 0) return null;

  const label =
    names.length === 1
      ? `${names[0]} is typing`
      : `${names.join(", ")} are typing`;

  const dotStyle = (dot: Animated.Value) => ({
    opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
    transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }],
  });

  return (
    <View className="flex-row items-center px-4 py-1.5 self-start">
      <View className="bg-white border border-gray-100 rounded-2xl rounded-bl-[4px] px-4 py-2.5 flex-row items-center">
        <Text className="text-xs text-gray-500 mr-2">{label}</Text>
        <View className="flex-row items-center gap-1">
          <Animated.View style={dotStyle(dot1)} className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
          <Animated.View style={dotStyle(dot2)} className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
          <Animated.View style={dotStyle(dot3)} className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
        </View>
      </View>
    </View>
  );
}
