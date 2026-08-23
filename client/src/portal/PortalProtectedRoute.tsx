import { useEffect } from "react";
import { useLocation } from "wouter";
import { usePortalAuth } from "./PortalAuthContext";

export default function PortalProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = usePortalAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) setLocation("/portal/login");
  }, [isLoading, isAuthenticated, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-frame-black flex items-center justify-center">
        <p className="text-frame-gray-light">Carregando…</p>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return <>{children}</>;
}
