// ================================================================
// CourtHub — Auth Context
// Global auth state: user, tokens, login(), logout(), register()
// ================================================================

'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { authApi, usersApi } from '@/lib/api';
import {
  getAccessToken,
  setTokens,
  clearTokens,
  getStoredUser,
  setStoredUser,
  type StoredUser,
} from '@/lib/auth';
import type { LoginPayload, RegisterPayload, Role } from '@/types';

// ── Types ─────────────────────────────────────────────────────────

interface AuthContextValue {
  user: StoredUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  /** Re-fetch user data from the server */
  refreshUser: () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: restore user from localStorage
  useEffect(() => {
    const stored = getStoredUser();
    const token = getAccessToken();

    if (stored && token) {
      setUser(stored);
    }
    setIsLoading(false);
  }, []);

  // ── Login ─────────────────────────────────────────────────────

  const login = useCallback(
    async (payload: LoginPayload) => {
      const { data } = await authApi.login(payload);

      // Save tokens
      setTokens(data.accessToken, data.refreshToken);

      // Save user data
      const userData: StoredUser = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
      };
      setStoredUser(userData);
      setUser(userData);

      // Redirect based on role
      redirectByRole(userData.role as Role);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // ── Register ──────────────────────────────────────────────────

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const { data } = await authApi.register(payload);

      // Save tokens
      setTokens(data.accessToken, data.refreshToken);

      // Save user data
      const userData: StoredUser = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
      };
      setStoredUser(userData);
      setUser(userData);

      // Redirect based on role
      redirectByRole(userData.role as Role);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // ── Logout ────────────────────────────────────────────────────

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Even if server logout fails, clear local state
    }
    clearTokens();
    setUser(null);
    router.push('/login');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Refresh User ──────────────────────────────────────────────

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await usersApi.getMe();
      const userData: StoredUser = {
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
      };
      setStoredUser(userData);
      setUser(userData);
    } catch {
      // If refresh fails, logout
      clearTokens();
      setUser(null);
    }
  }, []);

  // ── Role-based redirect ───────────────────────────────────────

  function redirectByRole(role: string) {
    switch (role) {
      case 'ADMIN':
        router.push('/admin/dashboard');
        break;
      case 'VENUE_OWNER':
        router.push('/dashboard');
        break;
      case 'CUSTOMER':
      default:
        router.push('/search');
        break;
    }
  }

  // ── Value ─────────────────────────────────────────────────────

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
