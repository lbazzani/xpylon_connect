import "../global.css";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { View, ActivityIndicator } from "react-native";
import { registerForPushNotifications, setupNotificationResponseHandler } from "../lib/notifications";
import { useOnboarding } from "../hooks/useOnboarding";
import { ProductTour } from "../components/onboarding/ProductTour";

export default function RootLayout() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { hasSeenTour, markTourSeen } = useOnboarding();
  const [tourDismissed, setTourDismissed] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || hasSeenTour === null) return;

    // Don't route while tour is showing
    if (!hasSeenTour && !tourDismissed) return;

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
  }, [isAuthenticated, isLoading, segments, hasSeenTour, tourDismissed]);

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

  // Show product tour if not permanently dismissed
  if (!hasSeenTour && !tourDismissed) {
    return (
      <>
        <StatusBar style="dark" />
        <ProductTour
          mode="first-launch"
          onDismiss={() => setTourDismissed(true)}
          onDismissForever={() => {
            markTourSeen();
            setTourDismissed(true);
          }}
        />
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
