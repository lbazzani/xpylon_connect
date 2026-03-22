import { useState, useEffect } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const KEY = "xpylon_tour_dismissed_v3";
const isWeb = Platform.OS === "web";

async function getItem(key: string): Promise<string | null> {
  if (isWeb) return localStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) { localStorage.setItem(key, value); return; }
  await SecureStore.setItemAsync(key, value);
}

export function useOnboarding() {
  const [hasSeenTour, setHasSeenTour] = useState<boolean | null>(null);

  useEffect(() => {
    getItem(KEY).then((val) => setHasSeenTour(val === "true"));
  }, []);

  async function markTourSeen() {
    await setItem(KEY, "true");
    setHasSeenTour(true);
  }

  async function resetTour() {
    if (isWeb) localStorage.removeItem(KEY);
    else await SecureStore.deleteItemAsync(KEY);
    setHasSeenTour(false);
  }

  return { hasSeenTour, markTourSeen, resetTour };
}
