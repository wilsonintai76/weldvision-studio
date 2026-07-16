import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface AuthUser {
  user_id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('weldvision_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('weldvision_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json() as { error: string };
      throw new Error(err.error || 'Login failed');
    }

    const data = await res.json() as AuthUser;
    localStorage.setItem('weldvision_user', JSON.stringify(data));
    setUser(data);
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });

    if (!res.ok) {
      const err = await res.json() as { error: string };
      throw new Error(err.error || 'Registration failed');
    }

    const data = await res.json() as AuthUser;
    localStorage.setItem('weldvision_user', JSON.stringify(data));
    setUser(data);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('weldvision_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
