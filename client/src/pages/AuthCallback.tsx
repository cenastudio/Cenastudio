import AuthLayout, { AuthLoadingAnimation } from "@/components/AuthLayout";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const { refresh, setSession } = useAuth();
  const [message, setMessage] = useState("Finalizando login...");

  useEffect(() => {
    let mounted = true;

    async function finishLogin() {
      try {
        if (!isSupabaseConfigured || !supabase) {
          throw new Error("Supabase não está configurado no frontend.");
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        const accessToken = data.session?.access_token;
        if (!accessToken) {
          throw new Error("Sessão do GitHub não encontrada.");
        }

        const session = await api.auth.supabase(accessToken);
        setSession(session.user, session.plan);
        refresh().catch(() => null);
        if (mounted) setLocation("/tools");
      } catch (error) {
        if (mounted) {
          setMessage(error instanceof Error ? error.message : "Falha ao finalizar login.");
          window.setTimeout(() => setLocation("/login"), 2500);
        }
      }
    }

    finishLogin();

    return () => {
      mounted = false;
    };
  }, [refresh, setLocation]);

  return (
    <AuthLayout mode="login" title="Entrando" subtitle={message}>
      <AuthLoadingAnimation message={message} />
    </AuthLayout>
  );
}
