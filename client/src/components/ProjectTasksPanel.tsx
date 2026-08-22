import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Plus, ListTodo, Loader2, ArrowRight, Trash2, Play } from "lucide-react";
import { toast } from "sonner";
import { api, type TaskItem } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTimer } from "@/contexts/TimerContext";
import { getRouteForTaskLink, WORKFLOW_STAGES } from "@/lib/workflow";
import EmptyState from "@/components/EmptyState";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface ProjectTasksPanelProps {
  projectId: number;
  /** Only owner/producer can create tasks (Requisito 2.1) — resolved by the caller. */
  canManage: boolean;
}

const STATUS_LABELS: Record<TaskItem["status"], string> = {
  pending: "app.tasks.statusPending",
  in_progress: "app.tasks.statusInProgress",
  done: "app.tasks.statusDone",
};

/**
 * "Tarefas do Projeto" — spec team-task-delegation, Fase 4.
 *
 * Shows every task in the project (not just the acting user's own), with
 * assignee, status and due date. Owner/producer get a "Nova Tarefa" dialog
 * to create and assign work to any active team member, optionally linked to
 * a workflow stage/tool.
 */
export default function ProjectTasksPanel({ projectId, canManage }: ProjectTasksPanelProps) {
  const { t, locale } = useLanguage();
  const { activeTimer, isStarting, startTimer } = useTimer();
  const [, setLocation] = useLocation();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [members, setMembers] = useState<Array<{ id: number; name: string; email: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeUserId, setAssigneeUserId] = useState<string>("");
  const [dueDate, setDueDate] = useState("");
  const [linkValue, setLinkValue] = useState(""); // "" | "stage:<id>" | "tool:<slug>"

  const loadTasks = () => {
    setIsLoading(true);
    api.tasks
      .listByProject(projectId)
      .then(setTasks)
      .catch(() => toast.error(t("app.tasks.errorLoad") as string))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const openCreate = () => {
    setTitle("");
    setDescription("");
    setAssigneeUserId("");
    setDueDate("");
    setLinkValue("");
    api.tasks
      .listAssignableMembers(projectId)
      .then(setMembers)
      .catch(() => toast.error(t("app.tasks.errorLoad") as string));
    setIsCreateOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !assigneeUserId) return;

    let stageId: string | null = null;
    let toolSlug: string | null = null;
    if (linkValue.startsWith("stage:")) stageId = linkValue.slice("stage:".length);
    if (linkValue.startsWith("tool:")) toolSlug = linkValue.slice("tool:".length);

    setIsSubmitting(true);
    try {
      const created = await api.tasks.create(projectId, {
        title: title.trim(),
        description: description.trim() || null,
        assigneeUserId: Number(assigneeUserId),
        dueDate: dueDate || null,
        stageId,
        toolSlug,
      });
      setTasks((prev) => [created, ...prev]);
      setIsCreateOpen(false);
      toast.success(t("app.tasks.created") as string);
    } catch {
      toast.error(t("app.tasks.errorCreate") as string);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (task: TaskItem) => {
    if (!confirm(t("app.tasks.confirmDelete") as string)) return;
    setDeletingId(task.id);
    try {
      await api.tasks.remove(task.id);
      setTasks((prev) => prev.filter((item) => item.id !== task.id));
      toast.success(t("app.tasks.deleted") as string);
    } catch {
      toast.error(t("app.tasks.errorDelete") as string);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (value: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString(locale === "en" ? "en-US" : "pt-BR", { day: "2-digit", month: "2-digit" });
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-frame-mono text-[0.65rem] tracking-[0.14em] uppercase text-frame-gray-light">
            {t("app.tasks.projectTasksTitle") as string}
          </h3>
          <p className="text-[0.65rem] text-frame-gray-light mt-1">{t("app.tasks.projectTasksDesc") as string}</p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={openCreate}
            className="frame-btn-primary !py-2 !px-3 !text-xs min-h-11 flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            {t("app.tasks.newTask") as string}
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="frame-empty-state px-5 py-8 text-center">
          <Loader2 className="w-5 h-5 animate-spin text-frame-orange mx-auto" />
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title={t("app.tasks.emptyProjectTitle") as string}
          description={t("app.tasks.emptyProjectDesc") as string}
        />
      ) : (
        <div className="border border-frame-gray-3/50 divide-y divide-frame-gray-3/30">
          {tasks.map((task) => {
            const dueLabel = formatDate(task.due_date);
            const hasLink = Boolean(task.stage_id || task.tool_slug);
            return (
              <div key={task.id} className="flex items-start gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-frame-white font-medium leading-snug">{task.title}</p>
                  {task.description && (
                    <p className="text-[0.68rem] text-frame-gray-light mt-0.5 leading-relaxed">{task.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="font-frame-mono text-[0.55rem] uppercase tracking-wider text-frame-orange border border-frame-orange/30 px-1.5 py-0.5">
                      {task.assignee_name || task.assignee_email}
                    </span>
                    <span className="font-frame-mono text-[0.55rem] uppercase tracking-wider text-frame-gray-light border border-frame-gray-3/60 px-1.5 py-0.5">
                      {t(STATUS_LABELS[task.status]) as string}
                    </span>
                    {dueLabel && (
                      <span className="font-frame-mono text-[0.55rem] text-frame-gray-light">
                        {t("app.tasks.due") as string} {dueLabel}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 max-sm:flex-col max-sm:items-end">
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
                      className="flex items-center gap-1 font-frame-mono text-[0.58rem] uppercase tracking-wider text-frame-orange hover:text-frame-white transition mt-0.5"
                    >
                      {t("app.tasks.open") as string}
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => handleDelete(task)}
                      disabled={deletingId === task.id}
                      aria-label={t("app.tasks.delete") as string}
                      className="text-frame-gray-light hover:text-frame-red transition mt-0.5 disabled:opacity-40"
                    >
                      {deletingId === task.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={(open) => !open && setIsCreateOpen(false)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="frame-title text-xl">{t("app.tasks.newTask") as string}</DialogTitle>
            <DialogDescription className="text-frame-gray-light text-sm">
              {t("app.tasks.projectTasksDesc") as string}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 mt-2">
            <label className="space-y-1.5 block">
              <span className="frame-label text-frame-gray-light">{t("app.tasks.title") as string}</span>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="frame-input w-full"
              />
            </label>

            <label className="space-y-1.5 block">
              <span className="frame-label text-frame-gray-light">{t("app.tasks.description") as string}</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="frame-input w-full resize-none"
              />
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="space-y-1.5">
                <span className="frame-label text-frame-gray-light">{t("app.tasks.assignee") as string}</span>
                <select
                  required
                  value={assigneeUserId}
                  onChange={(e) => setAssigneeUserId(e.target.value)}
                  className="frame-input w-full"
                >
                  <option value="" disabled>
                    —
                  </option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name || member.email}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5">
                <span className="frame-label text-frame-gray-light">{t("app.tasks.dueDate") as string}</span>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="frame-input w-full"
                />
              </label>
            </div>

            <label className="space-y-1.5 block">
              <span className="frame-label text-frame-gray-light">{t("app.tasks.linkToWorkflow") as string}</span>
              <select value={linkValue} onChange={(e) => setLinkValue(e.target.value)} className="frame-input w-full">
                <option value="">{t("app.tasks.noLink") as string}</option>
                {WORKFLOW_STAGES.map((stage) => (
                  <optgroup key={stage.id} label={locale === "en" ? stage.labelEn : stage.label}>
                    <option value={`stage:${stage.id}`}>{locale === "en" ? stage.labelEn : stage.label}</option>
                    {stage.actions
                      .filter((action) => action.toolSlug)
                      .map((action) => (
                        <option key={action.toolSlug} value={`tool:${action.toolSlug}`}>
                          {action.label}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </label>

            <DialogFooter>
              <button
                type="submit"
                disabled={isSubmitting || !title.trim() || !assigneeUserId}
                className="frame-btn-primary flex items-center gap-2 disabled:opacity-40"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {isSubmitting ? (t("app.tasks.creating") as string) : (t("app.tasks.create") as string)}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
