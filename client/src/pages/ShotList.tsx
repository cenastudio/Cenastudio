import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import AppNavBar from "@/components/AppNavBar";
import ProjectNav from "@/components/ProjectNav";
import ProtectedRoute from "@/components/ProtectedRoute";
import { FeatureUpgradeRequired } from "@/components/FeatureUpgradeRequired";
import { api, type ShotItem } from "@/lib/api";
import {
  Clapperboard,
  Plus,
  Trash2,
  Edit,
  Loader2,
  ArrowRight,
  GripVertical,
  CheckCircle2,
  Circle,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const SHOT_TYPES = ["Wide", "Médio", "Close", "Detalhe", "Plongée", "Contra-plongée"];

interface ShotFormState {
  scene: string;
  shotType: string;
  description: string;
  camera: string;
  lens: string;
  movement: string;
  durationSec: string;
}

const emptyForm: ShotFormState = { scene: "", shotType: "", description: "", camera: "", lens: "", movement: "", durationSec: "" };

function SortableShotRow({
  shot,
  onToggleStatus,
  onEdit,
  onDelete,
}: {
  shot: ShotItem;
  onToggleStatus: (shot: ShotItem) => void;
  onEdit: (shot: ShotItem) => void;
  onDelete: (shot: ShotItem) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: shot.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 border p-3 transition ${
        shot.status === "shot" ? "border-green-500/30 bg-green-500/5" : "border-frame-gray-3/60 bg-frame-gray-1/10"
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="p-1.5 text-frame-gray-light hover:text-frame-orange cursor-grab active:cursor-grabbing shrink-0"
        aria-label="Arrastar para reordenar"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <button type="button" onClick={() => onToggleStatus(shot)} className="shrink-0" title="Marcar como filmado">
        {shot.status === "shot" ? (
          <CheckCircle2 className="w-5 h-5 text-green-400" />
        ) : (
          <Circle className="w-5 h-5 text-frame-gray-light" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-frame-mono text-frame-orange">{shot.scene || "—"}</span>
          {shot.shot_type && (
            <span className="text-[0.6rem] uppercase tracking-wide px-1.5 py-0.5 border border-frame-gray-3/50 text-frame-gray-light">
              {shot.shot_type}
            </span>
          )}
        </div>
        <p className={`text-sm text-frame-white truncate ${shot.status === "shot" ? "line-through opacity-60" : ""}`}>
          {shot.description || "Sem descrição"}
        </p>
        <p className="text-[0.65rem] text-frame-gray-light truncate">
          {[shot.camera, shot.lens, shot.movement].filter(Boolean).join(" · ") || "Sem detalhes técnicos"}
        </p>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => onEdit(shot)}
          className="p-2 border border-frame-gray-3/50 hover:border-frame-orange hover:text-frame-orange transition"
          title="Editar"
        >
          <Edit className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(shot)}
          className="p-2 border border-frame-gray-3/50 hover:border-red-500 hover:text-red-500 transition"
          title="Excluir"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

/** Opens a hidden iframe with the shot list rendered as a simple printable table. */
function printShotList(shots: ShotItem[], projectId: number) {
  const rows = shots
    .map(
      (s, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${s.scene || "—"}</td>
        <td>${s.shot_type || "—"}</td>
        <td>${s.description || "—"}</td>
        <td>${s.camera || "—"}</td>
        <td>${s.lens || "—"}</td>
        <td>${s.movement || "—"}</td>
        <td>${s.status === "shot" ? "Filmado" : "Pendente"}</td>
      </tr>`,
    )
    .join("");

  const html = `
    <html>
      <head>
        <title>Shot List — Projeto ${projectId}</title>
        <style>
          body { font-family: sans-serif; padding: 24px; color: #111; }
          h1 { font-size: 18px; margin-bottom: 12px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
          th { background: #f3f3f3; }
        </style>
      </head>
      <body>
        <h1>Shot List — Projeto ${projectId}</h1>
        <table>
          <thead>
            <tr><th>#</th><th>Cena</th><th>Tipo</th><th>Descrição</th><th>Câmera</th><th>Lente</th><th>Movimento</th><th>Status</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>`;

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
  }
  setTimeout(() => document.body.removeChild(iframe), 1000);
}

function ShotListContent() {
  const [, params] = useRoute("/project/:projectId/shotlist");
  const projectId = Number(params?.projectId);

  const [shots, setShots] = useState<ShotItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ShotFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ShotItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor), useSensor(TouchSensor));

  const load = () => {
    if (!projectId) return;
    setLoading(true);
    api.shotlists
      .get(projectId)
      .then(({ shots: loaded }) => setShots(loaded))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Falha ao carregar shot list"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const openCreateDialog = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEditDialog = (shot: ShotItem) => {
    setEditingId(shot.id);
    setForm({
      scene: shot.scene,
      shotType: shot.shot_type,
      description: shot.description,
      camera: shot.camera,
      lens: shot.lens,
      movement: shot.movement,
      durationSec: shot.duration_sec != null ? String(shot.duration_sec) : "",
    });
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim()) {
      toast.error("Descreva o plano");
      return;
    }
    const durationSec = form.durationSec.trim() ? Number.parseInt(form.durationSec, 10) : null;

    setSaving(true);
    try {
      const payload = {
        scene: form.scene.trim(),
        shotType: form.shotType.trim(),
        description: form.description.trim(),
        camera: form.camera.trim(),
        lens: form.lens.trim(),
        movement: form.movement.trim(),
        durationSec,
      };
      if (editingId) {
        const updated = await api.shotlists.updateShot(editingId, payload);
        setShots((prev) => prev.map((s) => (s.id === editingId ? updated : s)));
        toast.success("Plano atualizado");
      } else {
        const created = await api.shotlists.addShot(projectId, payload);
        setShots((prev) => [...prev, created]);
        toast.success("Plano adicionado");
      }
      setFormOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar plano");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (shot: ShotItem) => {
    const nextStatus = shot.status === "shot" ? "pending" : "shot";
    try {
      const updated = await api.shotlists.updateShot(shot.id, { status: nextStatus });
      setShots((prev) => prev.map((s) => (s.id === shot.id ? updated : s)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao atualizar status");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.shotlists.deleteShot(deleteTarget.id);
      setShots((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      toast.success("Plano removido");
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao remover plano");
    } finally {
      setDeleting(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = shots.findIndex((s) => s.id === active.id);
    const newIndex = shots.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(shots, oldIndex, newIndex);
    setShots(reordered); // optimistic

    try {
      const persisted = await api.shotlists.reorder(projectId, reordered.map((s) => s.id));
      setShots(persisted);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao reordenar — desfazendo");
      load();
    }
  };

  return (
    <div className="min-h-screen bg-frame-black text-frame-white font-frame-body">
      <AppNavBar />
      <ProjectNav projectId={projectId} />
      <main id="main-content" className="px-4 sm:px-6 py-5 sm:py-6 max-w-[1200px] mx-auto space-y-6">
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-frame-gray-3 pb-4">
          <div>
            <p className="frame-label mb-1">// Produção</p>
            <h1 className="frame-title text-[clamp(1.5rem,3vw,2.2rem)] leading-none">Shot List</h1>
            <p className="text-xs text-frame-gray-light mt-2 max-w-lg leading-relaxed">
              Monte a lista de planos do projeto, ordene arrastando e marque cada um como filmado durante o
              set.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-start">
            {shots.length > 0 && (
              <button
                type="button"
                onClick={() => printShotList(shots, projectId)}
                className="frame-btn-ghost inline-flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Exportar
              </button>
            )}
            <button
              type="button"
              onClick={openCreateDialog}
              className="frame-btn-primary inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Adicionar plano
            </button>
          </div>
        </header>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-frame-orange" />
          </div>
        )}

        {/* Empty state — orange square + 01/02/03 flow */}
        {!loading && shots.length === 0 && (
          <section className="max-w-2xl mx-auto py-10 space-y-8">
            <div className="frame-empty-state p-10 sm:p-12 space-y-6 text-center">
              <div className="w-16 h-16 mx-auto border border-frame-orange/30 bg-frame-orange/10 flex items-center justify-center">
                <Clapperboard className="w-8 h-8 text-frame-orange" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-frame-white">Organize os planos do projeto</h2>
                <p className="text-sm text-frame-gray-light max-w-md mx-auto leading-relaxed">
                  Adicione cada plano com cena, tipo, câmera, lente e movimento. Depois arraste para
                  ordenar e exporte para a equipe.
                </p>
              </div>
              <button
                type="button"
                onClick={openCreateDialog}
                className="frame-btn-primary inline-flex items-center gap-2 !py-3 !px-6"
              >
                <Plus className="w-4 h-4" />
                Adicionar primeiro plano
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="border border-frame-orange/40 bg-frame-orange/[0.08] p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-0.5 bg-frame-orange" />
                <span className="font-frame-mono text-[0.6rem] text-frame-orange tracking-wider block mb-2">01</span>
                <p className="text-sm font-semibold text-frame-white">Adicione planos</p>
                <p className="text-[0.65rem] text-frame-gray-light mt-1 leading-relaxed">
                  Cena, tipo, descrição, câmera, lente e movimento de cada plano.
                </p>
              </div>
              <div className="border border-frame-orange/40 bg-frame-orange/[0.08] p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-0.5 bg-frame-orange" />
                <span className="font-frame-mono text-[0.6rem] text-frame-orange tracking-wider block mb-2">02</span>
                <p className="text-sm font-semibold text-frame-white">Ordene arrastando</p>
                <p className="text-[0.65rem] text-frame-gray-light mt-1 leading-relaxed">
                  Arraste os planos para a ordem de filmagem que faz sentido no set.
                </p>
              </div>
              <div className="border border-frame-orange/40 bg-frame-orange/[0.08] p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-0.5 bg-frame-orange" />
                <span className="font-frame-mono text-[0.6rem] text-frame-orange tracking-wider block mb-2">03</span>
                <p className="text-sm font-semibold text-frame-white">Marque filmado/exporte</p>
                <p className="text-[0.65rem] text-frame-gray-light mt-1 leading-relaxed">
                  Confira o que já foi capturado e exporte a lista para a equipe.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Drag-and-drop list */}
        {!loading && shots.length > 0 && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={shots.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {shots.map((shot) => (
                  <SortableShotRow
                    key={shot.id}
                    shot={shot}
                    onToggleStatus={handleToggleStatus}
                    onEdit={openEditDialog}
                    onDelete={setDeleteTarget}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </main>

      {/* Create/edit shot */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="bg-frame-black border-frame-gray-3 text-frame-white max-w-lg rounded-none p-6">
          <DialogHeader>
            <DialogTitle className="frame-title text-2xl">{editingId ? "Editar plano" : "Novo plano"}</DialogTitle>
            <DialogDescription className="text-frame-gray-light text-sm">
              Detalhes técnicos e narrativos do plano.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-frame-gray-light mb-1.5">Cena</label>
                <input
                  type="text"
                  value={form.scene}
                  onChange={(e) => setForm((f) => ({ ...f, scene: e.target.value }))}
                  placeholder="Ex: 1A"
                  className="frame-input w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-frame-gray-light mb-1.5">Tipo de plano</label>
                <input
                  type="text"
                  value={form.shotType}
                  onChange={(e) => setForm((f) => ({ ...f, shotType: e.target.value }))}
                  placeholder="Ex: Wide"
                  list="shot-types"
                  className="frame-input w-full"
                />
                <datalist id="shot-types">
                  {SHOT_TYPES.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-frame-gray-light mb-1.5">Descrição</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Ex: Protagonista entra em cena"
                required
                className="frame-input w-full"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-frame-gray-light mb-1.5">Câmera</label>
                <input
                  type="text"
                  value={form.camera}
                  onChange={(e) => setForm((f) => ({ ...f, camera: e.target.value }))}
                  className="frame-input w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-frame-gray-light mb-1.5">Lente</label>
                <input
                  type="text"
                  value={form.lens}
                  onChange={(e) => setForm((f) => ({ ...f, lens: e.target.value }))}
                  className="frame-input w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-frame-gray-light mb-1.5">Movimento</label>
                <input
                  type="text"
                  value={form.movement}
                  onChange={(e) => setForm((f) => ({ ...f, movement: e.target.value }))}
                  className="frame-input w-full"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 pt-4 border-t border-frame-gray-3">
              <button type="button" onClick={() => setFormOpen(false)} className="frame-btn-ghost" disabled={saving}>
                Cancelar
              </button>
              <button type="submit" className="frame-btn-primary inline-flex items-center gap-2" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                {editingId ? "Salvar alterações" : "Adicionar plano"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir plano?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.description}" será removido da shot list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700">
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function ShotList() {
  return (
    <ProtectedRoute>
      <FeatureUpgradeRequired feature="shot-list" variant="full">
        <ShotListContent />
      </FeatureUpgradeRequired>
    </ProtectedRoute>
  );
}
