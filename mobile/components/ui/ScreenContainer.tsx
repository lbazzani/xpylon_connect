import { View, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

interface ScreenContainerProps {
  children: React.ReactNode;
  /** Background color (default: white) */
  bg?: string;
  /** StatusBar style: "dark" for dark icons on light bg, "light" for light icons on dark bg */
  statusBarStyle?: "dark" | "light";
  /** Which safe area edges to apply (default: ["top"]) */
  edges?: ("top" | "bottom" | "left" | "right")[];
  /** Whether to apply safe area at all (default: true). Set false for modals/fullscreen. */
  safe?: boolean;
}

/**
 * Shared screen wrapper that handles:
 * - SafeAreaView (respects notch/dynamic island on iOS, status bar on Android)
 * - StatusBar style
 * - Background color
 *
 * Usage:
 *   <ScreenContainer>
 *     <Header />
 *     <Content />
 *   </ScreenContainer>
 *
 * For dark screens (e.g. call UI):
 *   <ScreenContainer bg="#1a1a2e" statusBarStyle="light" safe={false}>
 */
export function ScreenContainer({
  children,
  bg = "#FFFFFF",
  statusBarStyle = "dark",
  edges = ["top"],
  safe = true,
}: ScreenContainerProps) {
  if (!safe) {
    return (
      <View style={{ flex: 1, backgroundColor: bg }}>
        <StatusBar style={statusBarStyle} />
        {children}
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={edges}>
      <StatusBar style={statusBarStyle} />
      {children}
    </SafeAreaView>
  );
}
