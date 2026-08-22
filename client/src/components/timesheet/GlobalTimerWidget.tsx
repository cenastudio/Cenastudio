import { Clock, Square, Timer } from "lucide-react";
import { useLocation } from "wouter";
import { useTimer } from "@/contexts/TimerContext";

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function GlobalTimerWidget() {
  const [, setLocation] = useLocation();
  const { activeTimer, elapsed, isStopping, stopTimer } = useTimer();

  if (!activeTimer) return null;

  return (
    <aside
      aria-label="Timer ativo"
      className="fixed bottom-4 left-4 right-4 z-40 border border-frame-orange/40 bg-frame-black/95 p-3 shadow-2xl backdrop-blur md:left-auto md:right-5 md:w-[360px]"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-frame-orange/40 bg-frame-orange/10 text-frame-orange">
          <Timer className="h-5 w-5" />
        </div>
        <button type="button" onClick={() => setLocation("/timesheet")} className="min-w-0 flex-1 text-left">
          <p className="font-frame-mono text-[0.58rem] uppercase tracking-wider text-frame-orange">Timer em andamento</p>
          <p className="truncate text-sm font-medium text-frame-white">{activeTimer.description || "Sem descrição"}</p>
          <p className="mt-0.5 flex items-center gap-1.5 font-mono text-xs text-frame-gray-light">
            <Clock className="h-3.5 w-3.5" />
            {formatDuration(elapsed)}
          </p>
        </button>
        <button
          type="button"
          onClick={() => void stopTimer(null)}
          disabled={isStopping}
          aria-label="Parar timer"
          className="flex h-11 w-11 shrink-0 items-center justify-center border border-red-500/50 text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Square className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
