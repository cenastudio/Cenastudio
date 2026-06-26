import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { ApiError, api, type AuthUser, type UserPlan } from "@/lib/api";

interface AuthContextType {
  user: AuthUser | null;
  plan: UserPlan | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (name: string, email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setSession: (user: AuthUser, plan: UserPlan | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AUTH_SNAPSHOT_KEY = "frame.auth.snapshot";

interface AuthSnapshot {
  user: AuthUser;
  plan: UserPlan | null;
}

function readAuthSnapshot(): AuthSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSnapshot;
    return parsed?.user?.id ? parsed : null;
  } catch {
    return null;
  }
}

function writeAuthSnapshot(user: AuthUser, plan: UserPlan | null) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_SNAPSHOT_KEY, JSON.stringify({ user, plan }));
}

function clearAuthSnapshot() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_SNAPSHOT_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const snapshot = readAuthSnapshot();
  const [user, setUser] = useState<AuthUser | null>(() => snapshot?.user ?? null);
  const [plan, setPlan] = useState<UserPlan | null>(() => snapshot?.plan ?? null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.auth.me();
      setUser(data.user);
      setPlan(data.plan);
      writeAuthSnapshot(data.user, data.plan);
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 429 || error.status >= 500)) {
        const cached = readAuthSnapshot();
        if (cached) {
          setUser(cached.user);
          setPlan(cached.plan);
          return;
        }
      }
      setUser(null);
      setPlan(null);
      clearAuthSnapshot();
    }
  }, []);

  const setSession = useCallback((nextUser: AuthUser, nextPlan: UserPlan | null) => {
    setUser(nextUser);
    setPlan(nextPlan);
    writeAuthSnapshot(nextUser, nextPlan);
  }, []);

  useEffect(() => {
    refresh().finally(() => setIsLoading(false));
  }, [refresh]);

  useEffect(() => {
    const handleExpiredSession = () => {
      setUser(null);
      setPlan(null);
      clearAuthSnapshot();
    };
    window.addEventListener("frame:auth-expired", handleExpiredSession);
    return () => window.removeEventListener("frame:auth-expired", handleExpiredSession);
  }, []);

  const login = async (email: string, password: string) => {
    const { user: loggedIn } = await api.auth.login(email, password);
    setUser(loggedIn);
    writeAuthSnapshot(loggedIn, plan);
    await refresh();
    return loggedIn;
  };

  const register = async (name: string, email: string, password: string) => {
    const { user: registered } = await api.auth.register(name, email, password);
    setUser(registered);
    writeAuthSnapshot(registered, plan);
    await refresh();
    return registered;
  };

  const logout = async () => {
    await api.auth.logout().catch(() => null);
    setUser(null);
    setPlan(null);
    clearAuthSnapshot();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        plan,
        isAuthenticated: !!user,
        isAdmin: user?.role === "admin",
        isLoading,
        login,
        register,
        logout,
        refresh,
        setSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export type { UserPlan };
