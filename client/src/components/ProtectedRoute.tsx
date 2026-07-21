import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useLocation } from "wouter";
import WorkspaceLoadingShell from "@/components/WorkspaceLoadingShell";
import PlanActivationRequired from "@/components/PlanActivationRequired";
import { isPlanOperational } from "@shared/planEntitlements";

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export default function ProtectedRoute({ children, adminOnly }: ProtectedRouteProps) {
  const { isAuthenticated, isAdmin, isLoading, plan } = useAuth();
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
    return <WorkspaceLoadingShell />;
  }

  if (!isAuthenticated || (adminOnly && !isAdmin)) {
    return null;
  }

  const paidPlans = ["studio", "whitelabel", "enterprise"];
  if (!isAdmin && plan?.planId && paidPlans.includes(plan.planId) && !isPlanOperational(plan.planId, plan.status)) {
    return <PlanActivationRequired />;
  }

  return <>{children}</>;
}
