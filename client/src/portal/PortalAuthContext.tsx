import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { portalApi, type PortalClient } from "./portalApi";

interface PortalAuthContextType {
  client: PortalClient | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<PortalClient>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const PortalAuthContext = createContext<PortalAuthContextType | undefined>(undefined);

export function PortalAuthProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<PortalClient | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await portalApi.auth.me();
      setClient(data);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setClient(null);
        return;
      }
      setClient(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setIsLoading(false));
  }, [refresh]);

  const login = async (email: string, password: string) => {
    await portalApi.auth.login(email, password);
    const data = await portalApi.auth.me();
    setClient(data);
    return data;
  };

  const logout = async () => {
    await portalApi.auth.logout().catch(() => {});
    setClient(null);
  };

  return (
    <PortalAuthContext.Provider
      value={{
        client,
        isAuthenticated: !!client,
        isLoading,
        login,
        logout,
        refresh,
      }}
    >
      {children}
    </PortalAuthContext.Provider>
  );
}

export function usePortalAuth() {
  const context = useContext(PortalAuthContext);
  if (!context) {
    throw new Error("usePortalAuth must be used within PortalAuthProvider");
  }
  return context;
}
