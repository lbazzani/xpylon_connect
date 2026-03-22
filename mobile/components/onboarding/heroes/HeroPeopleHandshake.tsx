import { View } from "react-native";
import { useEffect } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../../lib/theme";

export function HeroPeopleHandshake({ isActive }: { isActive: boolean }) {
  // Robot/gear fading out
  const gearOpacity = useSharedValue(0);
  const gearScale = useSharedValue(1);

  // Two people moving toward center
  const personLeftX = useSharedValue(-60);
  const personRightX = useSharedValue(60);
  const personsOpacity = useSharedValue(0);

  // Connection spark between them
  const connectionOpacity = useSharedValue(0);
  const connectionScale = useSharedValue(0);

  // Orange line drawing
  const lineWidth = useSharedValue(0);
  const lineOpacity = useSharedValue(0);

  // Floating
  const floatY = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      // 1. Gear/robot appears first (0ms)
      gearOpacity.value = withTiming(0.6, { duration: 400 });
      gearScale.value = withTiming(1, { duration: 400 });

      // 2. Gear fades and shrinks (800ms)
      gearOpacity.value = withDelay(800, withTiming(0, { duration: 600 }));
      gearScale.value = withDelay(800, withTiming(0.5, { duration: 600 }));

      // 3. People appear and move toward center (600ms)
      personsOpacity.value = withDelay(600, withTiming(1, { duration: 400 }));
      personLeftX.value = withDelay(600, withSpring(
        -24, { damping: 14, stiffness: 100 }
      ));
      personRightX.value = withDelay(600, withSpring(
        24, { damping: 14, stiffness: 100 }
      ));

      // 4. Connection spark appears between them (1400ms)
      connectionOpacity.value = withDelay(1400, withTiming(1, { duration: 300 }));
      connectionScale.value = withDelay(1400, withSpring(1, { damping: 10, stiffness: 150 }));

      // 5. Orange line draws (1800ms)
      lineOpacity.value = withDelay(1800, withTiming(1, { duration: 200 }));
      lineWidth.value = withDelay(1800, withTiming(200, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      }));

      // 6. Gentle float
      floatY.value = withDelay(2000,
        withRepeat(withSequence(
          withTiming(-4, { duration: 2500 }),
          withTiming(4, { duration: 2500 }),
        ), -1, true)
      );
    } else {
      cancelAnimation(gearOpacity); cancelAnimation(gearScale);
      cancelAnimation(personLeftX); cancelAnimation(personRightX);
      cancelAnimation(personsOpacity);
      cancelAnimation(connectionOpacity); cancelAnimation(connectionScale);
      cancelAnimation(lineWidth); cancelAnimation(lineOpacity);
      cancelAnimation(floatY);

      gearOpacity.value = 0; gearScale.value = 1;
      personLeftX.value = -60; personRightX.value = 60;
      personsOpacity.value = 0;
      connectionOpacity.value = 0; connectionScale.value = 0;
      lineWidth.value = 0; lineOpacity.value = 0;
      floatY.value = 0;
    }

    return () => { cancelAnimation(floatY); };
  }, [isActive]);

  const gearStyle = useAnimatedStyle(() => ({
    opacity: gearOpacity.value,
    transform: [{ scale: gearScale.value }],
  }));

  const leftPersonStyle = useAnimatedStyle(() => ({
    opacity: personsOpacity.value,
    transform: [{ translateX: personLeftX.value }, { translateY: floatY.value }],
  }));

  const rightPersonStyle = useAnimatedStyle(() => ({
    opacity: personsOpacity.value,
    transform: [{ translateX: personRightX.value }, { translateY: floatY.value }],
  }));

  const connectionStyle = useAnimatedStyle(() => ({
    opacity: connectionOpacity.value,
    transform: [{ scale: connectionScale.value }, { translateY: floatY.value }],
  }));

  const lineStyle = useAnimatedStyle(() => ({
    width: lineWidth.value,
    opacity: lineOpacity.value,
  }));

  const PersonCircle = ({ style }: { style: any }) => (
    <Animated.View style={[{
      width: 48, height: 48, borderRadius: 24,
      backgroundColor: colors.gray100,
      borderWidth: 1.5, borderColor: colors.gray200,
      alignItems: "center", justifyContent: "center",
    }, style]}>
      <Ionicons name="person" size={22} color={colors.gray500} />
    </Animated.View>
  );

  return (
    <View style={{ width: 260, height: 180, alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
      {/* Gear/robot icon — fades away */}
      <Animated.View style={[gearStyle, { position: "absolute" }]}>
        <View style={{
          width: 44, height: 44, borderRadius: 22,
          backgroundColor: colors.gray100,
          alignItems: "center", justifyContent: "center",
        }}>
          <Ionicons name="cog-outline" size={24} color={colors.gray300} />
        </View>
      </Animated.View>

      {/* Two people */}
      <View style={{ flexDirection: "row", alignItems: "center", position: "absolute" }}>
        <PersonCircle style={leftPersonStyle} />
        <PersonCircle style={rightPersonStyle} />
      </View>

      {/* Connection spark between them */}
      <Animated.View style={[connectionStyle, { position: "absolute" }]}>
        <View style={{
          width: 28, height: 28, borderRadius: 14,
          backgroundColor: `${colors.primary}15`,
          borderWidth: 1.5, borderColor: `${colors.primary}40`,
          alignItems: "center", justifyContent: "center",
        }}>
          <Ionicons name="flash" size={14} color={colors.primary} />
        </View>
      </Animated.View>

      {/* Orange line */}
      <Animated.View style={[lineStyle, {
        position: "absolute",
        bottom: 20,
        height: 2.5,
        borderRadius: 1.25,
        backgroundColor: colors.primary,
      }]} />
    </View>
  );
}
