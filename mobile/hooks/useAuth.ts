import { useEffect, useState } from "react";
import { useAuthStore } from "../store/auth";
import { getTokens, saveTokens, clearTokens } from "../lib/storage";
import { api } from "../lib/api";

export function useAuth() {
  const { isAuthenticated, user, setTokens, setUser, logout: storeLogout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  async function loadStoredAuth() {
    try {
      const tokens = await getTokens();
      if (tokens.accessToken && tokens.refreshToken) {
        setTokens(tokens.accessToken, tokens.refreshToken);
        const { user } = await api.get("/users/me");
        setUser(user);
      }
    } catch {
      // tokens invalid
    } finally {
      setIsLoading(false);
    }
  }

  async function login(accessToken: string, refreshToken: string) {
    await saveTokens(accessToken, refreshToken);
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

  return { isAuthenticated, user, isLoading, login, logout };
}
