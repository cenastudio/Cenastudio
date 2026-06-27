import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export default function ProtectedRoute({ children, adminOnly }: ProtectedRouteProps) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      setLocation("/login");
      return;
    }
    if (adminOnly && !isAdmin) {
      setLocation("/tools");
    }
  }, [isLoading, isAuthenticated, isAdmin, adminOnly, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-3" role="status" aria-live="polite">
        <Loader2 className="h-6 w-6 animate-spin text-frame-orange" />
        <span className="font-frame-mono text-xs uppercase tracking-wider text-frame-gray-light">Carregando área de trabalho</span>
      </div>
    );
  }

  if (!isAuthenticated || (adminOnly && !isAdmin)) {
    return null;
  }

  return <>{children}</>;
}
