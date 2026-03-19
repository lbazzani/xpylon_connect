import { useAuthStore } from "../store/auth";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
const USE_MOCK = false;

async function fetchWithAuth(path: string, options: RequestInit = {}): Promise<Response> {
  const { accessToken } = useAuthStore.getState();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers.Authorization = `Bearer ${useAuthStore.getState().accessToken}`;
      return fetch(`${API_URL}${path}`, { ...options, headers });
    }
    useAuthStore.getState().logout();
  }

  return response;
}

async function refreshAccessToken(): Promise<boolean> {
  const { refreshToken, setTokens } = useAuthStore.getState();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    setTokens(data.accessToken, refreshToken);
    return true;
  } catch {
    return false;
  }
}

async function handleResponse(response: Response) {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  return response.json();
}

export const api = {
  get: (path: string) => fetchWithAuth(path).then(handleResponse),
  post: (path: string, body?: unknown) =>
    fetchWithAuth(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }).then(handleResponse),
  patch: (path: string, body?: unknown) =>
    fetchWithAuth(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }).then(handleResponse),
  delete: (path: string, body?: unknown) =>
    fetchWithAuth(path, { method: "DELETE", body: body ? JSON.stringify(body) : undefined }).then(handleResponse),
};
