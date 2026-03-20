import "../global.css";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { View, ActivityIndicator } from "react-native";
import { registerForPushNotifications, setupNotificationResponseHandler } from "../lib/notifications";
import { useOnboarding } from "../hooks/useOnboarding";
import { ProductTour } from "../components/onboarding/ProductTour";

export default function RootLayout() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { hasSeenTour, markTourSeen } = useOnboarding();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || hasSeenTour === null) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/phone");
    } else if (isAuthenticated && inAuthGroup) {
      const needsOnboarding = user && !user.firstName;
      if (needsOnboarding) {
        router.replace("/(auth)/register");
      } else {
        router.replace("/(app)/messages");
      }
    }
  }, [isAuthenticated, isLoading, segments, hasSeenTour]);

  useEffect(() => {
    if (!isAuthenticated) return;
    registerForPushNotifications();
    const subscription = setupNotificationResponseHandler();
    return () => { subscription.remove(); };
  }, [isAuthenticated]);

  if (isLoading || hasSeenTour === null) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#F15A24" />
      </View>
    );
  }

  // Show product tour on first launch
  if (!hasSeenTour) {
    return (
      <>
        <StatusBar style="dark" />
        <ProductTour mode="first-launch" onComplete={markTourSeen} />
      </>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Slot />
    </>
  );
}
