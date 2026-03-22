import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const KEYS = {
  ACCESS_TOKEN: "access_token",
  REFRESH_TOKEN: "refresh_token",
  DEMO_MODE: "demo_mode",
} as const;

// expo-secure-store doesn't work on web — fall back to localStorage
const isWeb = Platform.OS === "web";

async function setItem(key: string, value: string) {
  if (isWeb) {
    localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function getItem(key: string): Promise<string | null> {
  if (isWeb) {
    return localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function deleteItem(key: string) {
  if (isWeb) {
    localStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

export async function saveTokens(accessToken: string, refreshToken: string) {
  await setItem(KEYS.ACCESS_TOKEN, accessToken);
  await setItem(KEYS.REFRESH_TOKEN, refreshToken);
}

export async function getTokens() {
  const accessToken = await getItem(KEYS.ACCESS_TOKEN);
  const refreshToken = await getItem(KEYS.REFRESH_TOKEN);
  return { accessToken, refreshToken };
}

export async function saveDemoMode(isDemo: boolean) {
  if (isDemo) {
    await setItem(KEYS.DEMO_MODE, "true");
  } else {
    await deleteItem(KEYS.DEMO_MODE);
  }
}

export async function getDemoMode(): Promise<boolean> {
  const value = await getItem(KEYS.DEMO_MODE);
  return value === "true";
}

export async function clearTokens() {
  await deleteItem(KEYS.ACCESS_TOKEN);
  await deleteItem(KEYS.REFRESH_TOKEN);
  await deleteItem(KEYS.DEMO_MODE);
}
