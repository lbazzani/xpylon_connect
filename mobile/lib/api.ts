import { useAuthStore } from "../store/auth";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

// Mutex for token refresh — prevents concurrent refresh calls
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  // If a refresh is already in flight, wait for it
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
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
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

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
  upload: async (path: string, formData: FormData) => {
    const { accessToken } = useAuthStore.getState();
    const headers: Record<string, string> = {};
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    // Don't set Content-Type — fetch sets it automatically with boundary for FormData
    const response = await fetch(`${API_URL}${path}`, { method: "POST", headers, body: formData });
    if (response.status === 401) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        headers.Authorization = `Bearer ${useAuthStore.getState().accessToken}`;
        return fetch(`${API_URL}${path}`, { method: "POST", headers, body: formData }).then(handleResponse);
      }
      useAuthStore.getState().logout();
    }
    return handleResponse(response);
  },
};
