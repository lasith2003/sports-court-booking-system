// ================================================================
// CourtHub — Token Storage Helpers
// Manages JWT access/refresh tokens and user data in localStorage
// ================================================================

const ACCESS_TOKEN_KEY = 'courthub_access_token';
const REFRESH_TOKEN_KEY = 'courthub_refresh_token';
const USER_KEY = 'courthub_user';

// ── Token Getters / Setters ─────────────────────────────────────

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// ── User Data ───────────────────────────────────────────────────

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export function setStoredUser(user: StoredUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

// ── Convenience ─────────────────────────────────────────────────

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}
