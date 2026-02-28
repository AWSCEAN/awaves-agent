'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { UserV2 } from '@/types';
import { authService, isAccessTokenExpired } from '@/lib/apiServices';
import { apolloClient } from '@/lib/apollo/client';

interface AuthContextType {
  user: UserV2 | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  updateUser: (user: UserV2) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Start with server-safe defaults to avoid hydration mismatch.
  const [user, setUser] = useState<UserV2 | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAuth = useCallback(async () => {
    if (!authService.isLoggedIn()) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    // If the access token is already expired, refresh it proactively before
    // calling /auth/me — avoids a guaranteed 401 showing in the browser console.
    if (isAccessTokenExpired()) {
      const refreshed = await authService.refreshTokens();
      if (!refreshed) {
        setUser(null);
        setIsLoading(false);
        return;
      }
    }

    try {
      const result = await authService.getCurrentUser();
      if (result.success && result.data?.result === 'success' && result.data.data) {
        setUser(result.data.data);
      } else {
        // Don't log out on getCurrentUser failure - token might still be valid
        // The 401 retry logic in apiRequest will handle actual auth failures
        if (result.error !== 'Session expired. Please login again.') {
          // Keep existing user state on non-auth errors
          console.warn('Failed to refresh user data:', result.error);
        } else {
          setUser(null);
        }
      }
    } catch {
      // Keep existing user state on network errors
      console.warn('Failed to refresh user data: network error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // If a token exists, assume authenticated immediately so protected pages
    // render without waiting for the network call. refreshAuth will verify
    // and correct in the background.
    if (authService.isLoggedIn()) {
      setUser({} as UserV2);
      setIsLoading(false);
    }
    refreshAuth();
  }, [refreshAuth]);

  const login = async (username: string, password: string): Promise<boolean> => {
    const result = await authService.login({ username, password });
    if (result.success && result.data?.user) {
      // Clear Apollo cache on login to prevent stale data from previous sessions
      await apolloClient.clearStore();
      setUser(result.data.user);
      return true;
    }
    return false;
  };

  const logout = async () => {
    await authService.logout();
    // Clear Apollo Client cache to prevent data leakage between users
    await apolloClient.clearStore();
    setUser(null);
  };

  const updateUser = (updatedUser: UserV2) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshAuth,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
