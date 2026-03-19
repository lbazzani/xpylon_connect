import * as SecureStore from "expo-secure-store";

const KEYS = {
  ACCESS_TOKEN: "access_token",
  REFRESH_TOKEN: "refresh_token",
} as const;

export async function saveTokens(accessToken: string, refreshToken: string) {
  await SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, accessToken);
  await SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, refreshToken);
}

export async function getTokens() {
  const accessToken = await SecureStore.getItemAsync(KEYS.ACCESS_TOKEN);
  const refreshToken = await SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);
  return { accessToken, refreshToken };
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN);
  await SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN);
}
