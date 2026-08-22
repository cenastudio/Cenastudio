import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CheckSquare, Circle, ArrowRight, Play, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, type TaskItem } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTimer } from "@/contexts/TimerContext";
import { getRouteForTaskLink } from "@/lib/workflow";
import EmptyState from "@/components/EmptyState";

/**
 * "Minhas Tarefas" — spec team-task-delegation, Fase 3.
 *
 * Lista as tarefas atribuídas ao usuário autenticado, em qualquer projeto,
 * ordenadas por prazo (sem prazo por último). Permite concluir inline sem
 * navegar até o projeto, e oferece um link direto para a ferramenta/etapa
 * do workflow quando a tarefa estiver vinculada a uma.
 */
export default function MyTasksPanel() {
  const { t, locale } = useLanguage();
  const { activeTimer, isStarting, startTimer } = useTimer();
  const [, setLocation] = useLocation();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    api.tasks
      .listMine()
      .then((data) => {
        if (active) setTasks(data);
      })
      .catch(() => {
        if (active) toast.error(t("app.tasks.errorLoad") as string);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [t]);

  const pending = tasks.filter((task) => task.status !== "done");

  const handleComplete = async (task: TaskItem) => {
    setUpdatingId(task.id);
    try {
      await api.tasks.update(task.id, { status: "done" });
      setTasks((prev) => prev.map((item) => (item.id === task.id ? { ...item, status: "done" } : item)));
      toast.success(t("app.tasks.completed") as string);
    } catch {
      toast.error(t("app.tasks.errorUpdate") as string);
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDueDate = (value: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString(locale === "en" ? "en-US" : "pt-BR", { day: "2-digit", month: "2-digit" });
  };

  if (isLoading) {
    return (
      <section className="space-y-3" data-tour="mytasks">
        <h3 className="font-frame-mono text-[0.65rem] tracking-[0.14em] uppercase text-frame-gray-light">
          {t("app.tasks.myTasksTitle") as string}
        </h3>
        <div className="frame-empty-state px-5 py-8 text-center">
          <span className="font-frame-mono text-[0.62rem] text-frame-gray-light">
            {t("app.tasks.loading") as string}
          </span>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3" data-tour="mytasks">
      <div>
        <h3 className="font-frame-mono text-[0.65rem] tracking-[0.14em] uppercase text-frame-gray-light">
          {t("app.tasks.myTasksTitle") as string}
        </h3>
        <p className="text-[0.65rem] text-frame-gray-light mt-1">
          {t("app.tasks.myTasksDesc") as string}
        </p>
      </div>

      {pending.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title={t("app.tasks.emptyTitle") as string}
          description={t("app.tasks.emptyDesc") as string}
        />
      ) : (
        <div className="border border-frame-gray-3/50 divide-y divide-frame-gray-3/30">
          {pending.map((task) => {
            const dueLabel = formatDueDate(task.due_date);
            const hasLink = Boolean(task.stage_id || task.tool_slug);
            return (
              <div key={task.id} className="flex items-start gap-3 p-3">
                <button
                  type="button"
                  onClick={() => handleComplete(task)}
                  disabled={updatingId === task.id}
                  aria-label={t("app.tasks.markDone") as string}
                  className="mt-0.5 shrink-0 text-frame-gray-light hover:text-frame-orange transition disabled:opacity-40"
                >
                  {updatingId === task.id ? (
                    <Circle className="w-4 h-4 animate-pulse" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-frame-white font-medium leading-snug">{task.title}</p>
                  {task.description && (
                    <p className="text-[0.68rem] text-frame-gray-light mt-0.5 leading-relaxed">{task.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {task.project_name && (
                      <span className="font-frame-mono text-[0.55rem] uppercase tracking-wider text-frame-gray-light border border-frame-gray-3/60 px-1.5 py-0.5">
                        {task.project_name}
                      </span>
                    )}
                    {dueLabel && (
                      <span className="font-frame-mono text-[0.55rem] text-frame-orange">
                        {t("app.tasks.due") as string} {dueLabel}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <button
                    type="button"
                    onClick={() => void startTimer({ projectId: task.project_id, description: task.title })}
                    disabled={isStarting || Boolean(activeTimer)}
                    className="flex min-h-9 items-center gap-1 border border-frame-gray-3/60 px-2 font-frame-mono text-[0.58rem] uppercase tracking-wider text-frame-gray-light transition hover:border-frame-orange hover:text-frame-orange disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isStarting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                    {t("app.tasks.startTimer") as string}
                  </button>
                  {hasLink && (
                    <button
                      type="button"
                      onClick={() => setLocation(getRouteForTaskLink(task.project_id, task.stage_id, task.tool_slug))}
                      className="flex items-center gap-1 font-frame-mono text-[0.58rem] uppercase tracking-wider text-frame-orange hover:text-frame-white transition"
                    >
                      {t("app.tasks.open") as string}
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
