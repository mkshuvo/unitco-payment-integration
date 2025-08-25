'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, getCurrentUser, refreshToken } from '../lib/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAuth = async () => {
    try {
      await refreshToken();
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      setUser(null);
    }
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        // Try to refresh token if getting user fails
        try {
          await refreshAuth();
        } catch (refreshError) {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    loadUser();

    // Set up automatic token refresh
    const interval = setInterval(async () => {
      if (user) {
        try {
          await refreshToken();
        } catch (error) {
          console.warn('Token refresh failed:', error);
          setUser(null);
        }
      }
    }, 14 * 60 * 1000); // Refresh every 14 minutes (tokens expire in 15)

    return () => clearInterval(interval);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, setUser, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
}
