import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { api, type TimeEntryItem } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface StartTimerInput {
  projectId?: number | null;
  description?: string;
}

interface TimerContextValue {
  activeTimer: TimeEntryItem | null;
  elapsed: number;
  isLoading: boolean;
  isStarting: boolean;
  isStopping: boolean;
  refreshTimer: () => Promise<void>;
  startTimer: (input: StartTimerInput) => Promise<TimeEntryItem | null>;
  stopTimer: (hourlyRate?: number | null) => Promise<TimeEntryItem | null>;
}

const TimerContext = createContext<TimerContextValue | undefined>(undefined);

function secondsSince(value: string): number {
  const startedAt = new Date(value).getTime();
  if (Number.isNaN(startedAt)) return 0;
  return Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
}

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [activeTimer, setActiveTimer] = useState<TimeEntryItem | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const tickRef = useRef<number | null>(null);

  const refreshTimer = useCallback(async () => {
    if (!isAuthenticated) {
      setActiveTimer(null);
      return;
    }
    setIsLoading(true);
    try {
      setActiveTimer(await api.timesheets.getRunning());
    } catch {
      setActiveTimer(null);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (authLoading) return;
    void refreshTimer();
  }, [authLoading, refreshTimer]);

  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    const interval = window.setInterval(() => {
      void refreshTimer();
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [authLoading, isAuthenticated, refreshTimer]);

  useEffect(() => {
    if (tickRef.current) window.clearInterval(tickRef.current);
    if (!activeTimer) {
      setElapsed(0);
      return;
    }
    const tick = () => setElapsed(secondsSince(activeTimer.started_at));
    tick();
    tickRef.current = window.setInterval(tick, 1000);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [activeTimer]);

  const startTimer = useCallback(async (input: StartTimerInput) => {
    setIsStarting(true);
    try {
      const created = await api.timesheets.start({
        projectId: input.projectId ?? null,
        description: input.description?.trim() ?? "",
      });
      setActiveTimer(created);
      toast.success("Timer iniciado");
      return created;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao iniciar timer");
      return null;
    } finally {
      setIsStarting(false);
    }
  }, []);

  const stopTimer = useCallback(async (hourlyRate?: number | null) => {
    if (!activeTimer) return null;
    setIsStopping(true);
    try {
      const stopped = await api.timesheets.stop(activeTimer.id, hourlyRate ?? null);
      setActiveTimer(null);
      toast.success("Timer parado");
      return stopped;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao parar timer");
      return null;
    } finally {
      setIsStopping(false);
    }
  }, [activeTimer]);

  const value = useMemo<TimerContextValue>(() => ({
    activeTimer,
    elapsed,
    isLoading,
    isStarting,
    isStopping,
    refreshTimer,
    startTimer,
    stopTimer,
  }), [activeTimer, elapsed, isLoading, isStarting, isStopping, refreshTimer, startTimer, stopTimer]);

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export function useTimer() {
  const context = useContext(TimerContext);
  if (!context) throw new Error("useTimer must be used within TimerProvider");
  return context;
}
