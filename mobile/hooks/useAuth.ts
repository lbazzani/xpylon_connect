import { useEffect, useState } from "react";
import { useAuthStore } from "../store/auth";
import { getTokens, saveTokens, clearTokens, saveDemoMode, getDemoMode } from "../lib/storage";
import { api } from "../lib/api";

export function useAuth() {
  const { isAuthenticated, user, isDemo, setTokens, setUser, setDemo, logout: storeLogout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  async function loadStoredAuth() {
    try {
      const tokens = await getTokens();
      const demoMode = await getDemoMode();
      if (tokens.accessToken && tokens.refreshToken) {
        setTokens(tokens.accessToken, tokens.refreshToken);
        if (demoMode) setDemo(true);
        const { user } = await api.get("/users/me");
        setUser(user);
      }
    } catch {
      // tokens invalid
    } finally {
      setIsLoading(false);
    }
  }

  async function login(accessToken: string, refreshToken: string, demoMode?: boolean) {
    await saveTokens(accessToken, refreshToken);
    if (demoMode) {
      await saveDemoMode(true);
      setDemo(true);
    }
    setTokens(accessToken, refreshToken);
    try {
      const { user } = await api.get("/users/me");
      setUser(user);
    } catch {}
  }

  async function logout() {
    await clearTokens();
    storeLogout();
  }

  return { isAuthenticated, user, isDemo, isLoading, login, logout };
}
