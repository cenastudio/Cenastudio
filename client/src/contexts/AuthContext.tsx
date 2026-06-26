import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, type AuthUser, type UserPlan } from "@/lib/api";

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [plan, setPlan] = useState<UserPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.auth.me();
      setUser(data.user);
      setPlan(data.plan);
    } catch {
      setUser(null);
      setPlan(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setIsLoading(false));
  }, [refresh]);

  useEffect(() => {
    const handleExpiredSession = () => {
      setUser(null);
      setPlan(null);
    };
    window.addEventListener("frame:auth-expired", handleExpiredSession);
    return () => window.removeEventListener("frame:auth-expired", handleExpiredSession);
  }, []);

  const login = async (email: string, password: string) => {
    const { user: loggedIn } = await api.auth.login(email, password);
    setUser(loggedIn);
    await refresh();
    return loggedIn;
  };

  const register = async (name: string, email: string, password: string) => {
    const { user: registered } = await api.auth.register(name, email, password);
    setUser(registered);
    await refresh();
    return registered;
  };

  const logout = async () => {
    await api.auth.logout();
    setUser(null);
    setPlan(null);
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
