import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import AppNavBar from "@/components/AppNavBar";
import ProjectNav from "@/components/ProjectNav";
import ProtectedRoute from "@/components/ProtectedRoute";
import { FeatureUpgradeRequired } from "@/components/FeatureUpgradeRequired";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePlanContext } from "@/contexts/PlanContext";
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
  Copy,
  FileText,
  Upload,
  X,
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
  DragOverlay,
  closestCorners,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  groupShotsByScene,
  moveShotBetweenGroups,
  flattenGroups,
  totalDurationSec,
  formatDuration,
  UNASSIGNED_SCENE,
  type ShotGroup,
} from "@/lib/shotListGrouping";

// Default shot types (fallback if API fails)
const DEFAULT_SHOT_TYPES_PT = ["Wide", "Médio", "Close", "Detalhe", "Plongée", "Contra-plongée"];
const DEFAULT_SHOT_TYPES_EN = ["Wide", "Medium", "Close", "Detail", "High angle", "Low angle"];

// Common camera movements
const CAMERA_MOVEMENTS_PT = [
  "Estático",
  "Pan (horizontal)",
  "Tilt (vertical)",
  "Dolly in",
  "Dolly out",
  "Tracking lateral",
  "Crane up",
  "Crane down",
  "Handheld",
  "Steadicam",
  "Gimbal",
  "Drone",
  "Zoom in",
  "Zoom out",
];

const CAMERA_MOVEMENTS_EN = [
  "Static",
  "Pan (horizontal)",
  "Tilt (vertical)",
  "Dolly in",
  "Dolly out",
  "Tracking shot",
  "Crane up",
  "Crane down",
  "Handheld",
  "Steadicam",
  "Gimbal",
  "Drone",
  "Zoom in",
  "Zoom out",
];

interface ShotFormState {
  scene: string;
  shotType: string;
  description: string;
  camera: string;
  lens: string;
  movement: string;
  durationMinutes: string;
  shotNumber: string;
  productionNotes: string;
  thumbnailPreview: string;
  thumbnailFile: File | null;
}

const emptyForm: ShotFormState = {
  scene: "",
  shotType: "",
  description: "",
  camera: "",
  lens: "",
  movement: "",
  durationMinutes: "",
  shotNumber: "",
  productionNotes: "",
  thumbnailPreview: "",
  thumbnailFile: null,
};

/**
 * Pure visual row — no dnd-kit hooks. Reused by both the sortable row (in
 * the list) and the DragOverlay (the floating copy that follows the
 * pointer/finger while dragging), so the overlay always looks identical to
 * the real row instead of a generic placeholder.
 */
function ShotRowContent({
  shot,
  onToggleStatus,
  onEdit,
  onDelete,
  onDuplicate,
  t,
  dragHandleProps,
  isOverlay = false,
}: {
  shot: ShotItem;
  onToggleStatus?: (shot: ShotItem) => void;
  onEdit?: (shot: ShotItem) => void;
  onDelete?: (shot: ShotItem) => void;
  onDuplicate?: (shot: ShotItem) => void;
  t: (key: string) => string;
  dragHandleProps?: { attributes: React.HTMLAttributes<HTMLButtonElement>; listeners: Record<string, unknown> | undefined };
  isOverlay?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 border p-3 transition bg-frame-black relative ${
        shot.status === "shot" ? "border-green-500/30 bg-green-500/5" : "border-frame-gray-3/60 bg-frame-gray-1/10"
      } ${isOverlay ? "shadow-[0_8px_24px_rgba(0,0,0,0.5)] border-frame-orange/50" : ""}`}
    >
      {/* Shot Number Badge */}
      {shot.shot_number && (
        <div className="absolute top-2 right-2 bg-frame-orange text-frame-black px-2 py-0.5 rounded text-[0.65rem] font-bold font-frame-mono">
          {shot.shot_number}
        </div>
      )}

      {dragHandleProps && (
        <button
          type="button"
          {...dragHandleProps.attributes}
          {...(dragHandleProps.listeners as object)}
          className="p-1.5 text-frame-gray-light hover:text-frame-orange cursor-grab active:cursor-grabbing shrink-0 touch-none"
          aria-label={t("app.shotlist.dragToReorder")}
        >
          <GripVertical className="w-4 h-4" />
        </button>
      )}

      <button
        type="button"
        onClick={() => onToggleStatus?.(shot)}
        className="shrink-0"
        title={t("app.shotlist.markShot")}
        disabled={isOverlay}
      >
        {shot.status === "shot" ? (
          <CheckCircle2 className="w-5 h-5 text-green-400" />
        ) : (
          <Circle className="w-5 h-5 text-frame-gray-light" />
        )}
      </button>

      {/* Thumbnail */}
      {shot.thumbnail_url && (
        <div className="shrink-0 w-16 h-12 border border-frame-gray-3/50 overflow-hidden bg-frame-gray-1">
          <img
            src={shot.thumbnail_url}
            alt={shot.description}
            className="w-full h-full object-cover"
          />
        </div>
      )}

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
          {shot.description || t("app.shotlist.noDescription")}
        </p>
        <p className="text-[0.65rem] text-frame-gray-light truncate">
          {[shot.camera, shot.lens, shot.movement].filter(Boolean).join(" · ") || t("app.shotlist.noTechDetails")}
        </p>
        {shot.production_notes && (
          <p className="text-[0.6rem] text-frame-gray-light/70 italic mt-0.5 line-clamp-1">
            {shot.production_notes}
          </p>
        )}
      </div>

      {!isOverlay && (
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onEdit?.(shot)}
            className="p-2 border border-frame-gray-3/50 hover:border-frame-orange hover:text-frame-orange transition"
            title={t("app.shotlist.edit")}
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDuplicate?.(shot)}
            className="p-2 border border-frame-gray-3/50 hover:border-frame-orange hover:text-frame-orange transition"
            title="Duplicar plano"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete?.(shot)}
            className="p-2 border border-frame-gray-3/50 hover:border-red-500 hover:text-red-500 transition"
            title={t("app.shotlist.delete")}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function SortableShotRow({
  shot,
  onToggleStatus,
  onEdit,
  onDelete,
  onDuplicate,
  t,
}: {
  shot: ShotItem;
  onToggleStatus: (shot: ShotItem) => void;
  onEdit: (shot: ShotItem) => void;
  onDelete: (shot: ShotItem) => void;
  onDuplicate: (shot: ShotItem) => void;
  t: (key: string) => string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: shot.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ShotRowContent
        shot={shot}
        onToggleStatus={onToggleStatus}
        onEdit={onEdit}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        t={t}
        dragHandleProps={{ attributes, listeners }}
      />
    </div>
  );
}

/**
 * One scene's drop zone. Wraps its shots in their own SortableContext so
 * items can be reordered within the scene, and in a useDroppable zone
 * (with a stable id prefixed to disambiguate from shot ids) so a shot can
 * be dragged in from a different scene even when this scene is empty.
 */
function SceneGroup({
  group,
  isExpanded,
  onToggleExpand,
  onToggleStatus,
  onEdit,
  onDelete,
  onDuplicate,
  t,
}: {
  group: ShotGroup;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleStatus: (shot: ShotItem) => void;
  onEdit: (shot: ShotItem) => void;
  onDelete: (shot: ShotItem) => void;
  onDuplicate: (shot: ShotItem) => void;
  t: (key: string) => string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `scene:${group.scene}` });
  const sceneLabel = group.scene === UNASSIGNED_SCENE ? t("app.shotlist.unassignedScene") : group.scene;
  const durationLabel = formatDuration(group.totalDurationSec);
  const completedCount = group.shots.filter(s => s.status === "shot").length;

  return (
    <div
      ref={setNodeRef}
      className={`border transition ${isOver ? "border-frame-orange/60 bg-frame-orange/[0.03]" : "border-frame-gray-3/40"}`}
    >
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between gap-3 px-3 py-2 border-b border-frame-gray-3/40 bg-frame-gray-1/20 hover:bg-frame-gray-1/30 transition"
      >
        <div className="flex items-center gap-2">
          <span className="text-frame-orange">
            {isExpanded ? "▼" : "▶"}
          </span>
          <span className="font-frame-mono text-[0.65rem] uppercase tracking-wider text-frame-white">
            {group.scene === UNASSIGNED_SCENE ? sceneLabel : `${t("app.shotlist.scene")} ${sceneLabel}`}
          </span>
        </div>
        <div className="flex items-center gap-4 font-frame-mono text-[0.6rem] text-frame-gray-light shrink-0">
          <span>{group.shots.length} {group.shots.length === 1 ? "shot" : "shots"}</span>
          <span>{durationLabel}</span>
          <span className="text-green-400">{completedCount} filmado{completedCount !== 1 ? "s" : ""}</span>
        </div>
      </button>
      {isExpanded && (
        <SortableContext items={group.shots.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="p-2 space-y-2 min-h-[3rem]">
            {group.shots.length === 0 ? (
              <p className="text-[0.65rem] text-frame-gray-light/60 italic text-center py-2">
                {t("app.shotlist.dropHereToMove")}
              </p>
            ) : (
              group.shots.map((shot) => (
                <SortableShotRow
                  key={shot.id}
                  shot={shot}
                  onToggleStatus={onToggleStatus}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onDuplicate={onDuplicate}
                  t={t}
                />
              ))
            )}
          </div>
        </SortableContext>
      )}
    </div>
  );
}

/** Opens a hidden iframe with the shot list rendered as a simple printable table. */
function printShotList(shots: ShotItem[], projectId: number, t: (key: string) => string) {
  const statusShot = t("app.shotlist.statusShot");
  const statusPending = t("app.shotlist.statusPending");
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
        <td>${s.duration_sec != null ? formatDuration(s.duration_sec) : "—"}</td>
        <td>${s.status === "shot" ? statusShot : statusPending}</td>
      </tr>`,
    )
    .join("");

  const title = `${t("app.shotlist.title")} — ${t("app.shotlist.project")} ${projectId}`;
  const groupCount = groupShotsByScene(shots).length;
  const totalLabel = `${groupCount} ${t("app.shotlist.scenesCount")} · ${t("app.shotlist.totalDuration")}: ${formatDuration(totalDurationSec(shots))}`;

  const html = `
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: sans-serif; padding: 24px; color: #111; }
          h1 { font-size: 18px; margin-bottom: 4px; }
          p.summary { font-size: 12px; color: #555; margin: 0 0 12px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
          th { background: #f3f3f3; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p class="summary">${totalLabel}</p>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>${t("app.shotlist.scene")}</th>
              <th>${t("app.shotlist.shotType")}</th>
              <th>${t("app.shotlist.descriptionLabel")}</th>
              <th>${t("app.shotlist.camera")}</th>
              <th>${t("app.shotlist.lens")}</th>
              <th>${t("app.shotlist.movement")}</th>
              <th>${t("app.shotlist.durationMinutes")}</th>
              <th>${t("app.shotlist.status")}</th>
            </tr>
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
  const { t, locale } = useLanguage();
  const { planMode } = usePlanContext();
  const [, params] = useRoute("/project/:projectId/shotlist");
  const projectId = Number(params?.projectId);
  const DEFAULT_SHOT_TYPES = locale === "en" ? DEFAULT_SHOT_TYPES_EN : DEFAULT_SHOT_TYPES_PT;
  const CAMERA_MOVEMENTS = locale === "en" ? CAMERA_MOVEMENTS_EN : CAMERA_MOVEMENTS_PT;

  const [shots, setShots] = useState<ShotItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Custom shot types
  const [shotTypes, setShotTypes] = useState<Array<{ id: number; name: string; isDefault: boolean }>>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);

  // Load custom shot types
  const loadShotTypes = async () => {
    try {
      setLoadingTypes(true);
      const types = await api.shotTypes.list();
      setShotTypes(types);
    } catch (error) {
      console.error("Failed to load shot types:", error);
      // Fallback to defaults
      setShotTypes(DEFAULT_SHOT_TYPES.map((name, i) => ({ id: i, name, isDefault: true })));
    } finally {
      setLoadingTypes(false);
    }
  };

  useEffect(() => {
    loadShotTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Shot limits by plan
  const SHOT_LIMITS: Record<string, number> = {
    free: 20,
    pro: 100,
    studio: -1, // unlimited
  };
  const shotLimit = SHOT_LIMITS[planMode] ?? 20;
  const shotCount = shots.length;
  const isAtLimit = shotLimit !== -1 && shotCount >= shotLimit;
  const isNearLimit = shotLimit !== -1 && shotCount >= shotLimit * 0.8; // 80% warning

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ShotFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ShotItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Shot types manager
  const [showTypesManager, setShowTypesManager] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [savingType, setSavingType] = useState(false);

  // Mobile-first sensor tuning (spec: shot list improvements, step 2):
  // - PointerSensor needs a small activation distance so a plain tap (e.g.
  //   the status toggle) doesn't get hijacked as a drag start.
  // - TouchSensor needs a short delay + tolerance so the browser has a
  //   chance to treat a vertical finger movement as a page scroll instead
  //   of always starting a drag — without this, dragging on a phone fights
  //   the page's own scroll.
  // - KeyboardSensor makes reordering (within and across scenes) usable
  //   without a pointer at all.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const [activeShotId, setActiveShotId] = useState<number | null>(null);
  const shotGroups = groupShotsByScene(shots);
  const activeShot = activeShotId != null ? shots.find((s) => s.id === activeShotId) ?? null : null;

  // Collapse state per scene (persisted in localStorage)
  const [expandedScenes, setExpandedScenes] = useState<Set<string>>(() => {
    const saved = localStorage.getItem(`shotlist-expanded-${projectId}`);
    return saved ? new Set(JSON.parse(saved)) : new Set(shotGroups.map(g => g.scene));
  });

  // Save to localStorage when expanded scenes change
  useEffect(() => {
    localStorage.setItem(`shotlist-expanded-${projectId}`, JSON.stringify([...expandedScenes]));
  }, [expandedScenes, projectId]);

  // Update expanded scenes when groups change (new scenes added)
  useEffect(() => {
    setExpandedScenes(prev => {
      const newSet = new Set(prev);
      shotGroups.forEach(g => {
        if (!newSet.has(g.scene) && !prev.has(g.scene)) {
          newSet.add(g.scene); // Auto-expand new scenes
        }
      });
      return newSet;
    });
  }, [shotGroups.map(g => g.scene).join(',')]);

  const toggleSceneExpand = (scene: string) => {
    setExpandedScenes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(scene)) {
        newSet.delete(scene);
      } else {
        newSet.add(scene);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setExpandedScenes(new Set(shotGroups.map(g => g.scene)));
  };

  const collapseAll = () => {
    setExpandedScenes(new Set());
  };

  const load = () => {
    if (!projectId) return;
    setLoading(true);
    api.shotlists
      .get(projectId)
      .then(({ shots: loaded }) => setShots(loaded))
      .catch((e) => toast.error(e instanceof Error ? e.message : t("app.shotlist.errorLoad")))
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
      durationMinutes: shot.duration_sec != null ? String(Math.round(shot.duration_sec / 60)) : "",
      shotNumber: shot.shot_number || "",
      productionNotes: shot.production_notes || "",
      thumbnailPreview: shot.thumbnail_url || "",
      thumbnailFile: null,
    });
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim()) {
      toast.error(t("app.shotlist.errorDescribeShot"));
      return;
    }
    const durationSec = form.durationMinutes.trim() ? Number.parseInt(form.durationMinutes, 10) * 60 : null;

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
        shotNumber: form.shotNumber.trim() || null,
        productionNotes: form.productionNotes.trim() || null,
        thumbnailUrl: form.thumbnailPreview || null,
      };

      // Create or update shot first
      let shot: ShotItem;
      if (editingId) {
        shot = await api.shotlists.updateShot(editingId, payload);
        setShots((prev) => prev.map((s) => (s.id === editingId ? shot : s)));
        toast.success(t("app.shotlist.successUpdated"));
      } else {
        shot = await api.shotlists.addShot(projectId, payload);
        setShots((prev) => [...prev, shot]);
        toast.success(t("app.shotlist.successAdded"));
      }

      // Upload thumbnail if new file was selected
      if (form.thumbnailFile) {
        const reader = new FileReader();
        const fileData = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1]); // Get base64 without prefix
          reader.onerror = reject;
          reader.readAsDataURL(form.thumbnailFile!);
        });

        const result = await api.shotlists.uploadThumbnail(shot.id, fileData, form.thumbnailFile.name);

        // Update shot with thumbnail URL
        const updated = await api.shotlists.updateShot(shot.id, { thumbnailUrl: result.thumbnailUrl });
        setShots((prev) => prev.map((s) => (s.id === shot.id ? updated : s)));
      }

      setFormOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("app.shotlist.errorSave"));
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
      toast.error(err instanceof Error ? err.message : t("app.shotlist.errorStatus"));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.shotlists.deleteShot(deleteTarget.id);
      setShots((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      toast.success(t("app.shotlist.successDeleted"));
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("app.shotlist.errorDelete"));
    } finally {
      setDeleting(false);
    }
  };

  const handleDuplicate = async (shot: ShotItem) => {
    try {
      const duplicated = await api.shotlists.duplicateShot(shot.id);
      setShots((prev) => [...prev, duplicated]);
      toast.success("Plano duplicado com sucesso");
    } catch (err) {
      toast.error("Erro ao duplicar plano");
    }
  };

  const handleAddShotType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;

    try {
      setSavingType(true);
      const newType = await api.shotTypes.create(newTypeName.trim());
      setShotTypes((prev) => [...prev, newType]);
      setNewTypeName("");
      toast.success(`Tipo "${newType.name}" adicionado`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao adicionar tipo");
    } finally {
      setSavingType(false);
    }
  };

  const handleDeleteShotType = async (typeId: number) => {
    const type = shotTypes.find((t) => t.id === typeId);
    if (!type) return;

    if (type.isDefault) {
      toast.error("Não é possível deletar tipos padrão");
      return;
    }

    try {
      await api.shotTypes.delete(typeId);
      setShotTypes((prev) => prev.filter((t) => t.id !== typeId));
      toast.success(`Tipo "${type.name}" removido`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover tipo");
    }
  };

  const handleExportPdf = async () => {
    try {
      toast.loading("Gerando PDF...", { id: "pdf" });
      const response = await api.shotlists.exportPdf(projectId);

      if (!response.ok) {
        throw new Error("Falha ao gerar PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `shotlist-projeto-${projectId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("PDF gerado com sucesso", { id: "pdf" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar PDF", { id: "pdf" });
    }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Arquivo deve ser uma imagem");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Imagem não pode exceder 10MB");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({
        ...f,
        thumbnailPreview: reader.result as string,
        thumbnailFile: file,
      }));
    };
    reader.readAsDataURL(file);
  };

  const removeThumbnail = () => {
    setForm((f) => ({
      ...f,
      thumbnailPreview: "",
      thumbnailFile: null,
    }));
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveShotId(Number(event.active.id));
  };

  /**
   * Resolves the target scene + "insert before" shot id from wherever the
   * drag ended: either directly over another shot (same scene as that
   * shot) or over an empty/partial scene's droppable zone (id prefixed
   * "scene:").
   */
  const resolveDropTarget = (overId: string | number, groups: ShotGroup[]): { scene: string; overShotId: number | null } | null => {
    if (typeof overId === "string" && overId.startsWith("scene:")) {
      return { scene: overId.slice("scene:".length), overShotId: null };
    }
    const overShotId = Number(overId);
    const group = groups.find((g) => g.shots.some((s) => s.id === overShotId));
    if (!group) return null;
    return { scene: group.scene, overShotId };
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveShotId(null);
    const { active, over } = event;
    if (!over) return;

    const groups = groupShotsByScene(shots);
    const target = resolveDropTarget(over.id, groups);
    if (!target) return;

    const activeId = Number(active.id);
    const sourceGroup = groups.find((g) => g.shots.some((s) => s.id === activeId));
    if (!sourceGroup) return;
    if (sourceGroup.scene === target.scene && target.overShotId === activeId) return;

    const movedGroups = moveShotBetweenGroups(groups, activeId, target.scene, target.overShotId);
    const reordered = flattenGroups(movedGroups);
    setShots(reordered); // optimistic

    try {
      const persisted = await api.shotlists.reorder(projectId, reordered.map((s) => s.id));
      // The reorder endpoint doesn't take a scene, only order — persist the
      // possibly-changed scene separately when the shot moved groups.
      const movedShot = reordered.find((s) => s.id === activeId)!;
      const original = shots.find((s) => s.id === activeId)!;
      if (movedShot.scene !== original.scene) {
        const updated = await api.shotlists.updateShot(activeId, { scene: movedShot.scene });
        setShots(persisted.map((s) => (s.id === activeId ? updated : s)));
      } else {
        setShots(persisted);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("app.shotlist.errorReorder"));
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
            <p className="frame-label mb-1">{t("app.shotlist.eyebrow")}</p>
            <h1 className="frame-title text-[clamp(1.5rem,3vw,2.2rem)] leading-none">{t("app.shotlist.title")}</h1>
            <p className="text-xs text-frame-gray-light mt-2 max-w-lg leading-relaxed">
              {t("app.shotlist.description")}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-start">
            {shots.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => printShotList(shots, projectId, t)}
                  className="frame-btn-ghost inline-flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  {t("app.shotlist.export")}
                </button>
                <button
                  type="button"
                  onClick={handleExportPdf}
                  className="frame-btn-ghost inline-flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Exportar PDF
                </button>
              </>
            )}
            <button
              type="button"
              onClick={openCreateDialog}
              className="frame-btn-primary inline-flex items-center gap-2"
              disabled={isAtLimit}
              title={isAtLimit ? `Limite de ${shotLimit} shots atingido` : undefined}
            >
              <Plus className="w-4 h-4" />
              {t("app.shotlist.addShot")}
            </button>
          </div>
        </header>

        {/* Shot Limit Banner */}
        {isNearLimit && (
          <div className={`p-4 border rounded-lg ${isAtLimit ? 'border-red-500/50 bg-red-500/10' : 'border-frame-orange/30 bg-frame-orange/10'}`}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm font-semibold text-frame-white">
                  {isAtLimit ? "Limite de shots atingido" : "Você está próximo do limite"}
                </p>
                <p className="text-xs text-frame-gray-light mt-0.5">
                  {shotLimit === -1 ? "Shots ilimitados" : `${shotCount}/${shotLimit} shots usados no plano ${planMode === 'free' ? 'Free' : planMode === 'pro' ? 'Pro' : 'Studio'}`}
                </p>
              </div>
              {isAtLimit && (
                <button
                  onClick={() => window.location.href = '/pricing'}
                  className="frame-btn-primary text-sm whitespace-nowrap"
                >
                  Fazer Upgrade
                </button>
              )}
            </div>
          </div>
        )}

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
                <h2 className="text-2xl font-bold text-frame-white">{t("app.shotlist.emptyTitle")}</h2>
                <p className="text-sm text-frame-gray-light max-w-md mx-auto leading-relaxed">
                  {t("app.shotlist.emptyDesc")}
                </p>
              </div>
              <button
                type="button"
                onClick={openCreateDialog}
                className="frame-btn-primary inline-flex items-center gap-2 !py-3 !px-6"
                disabled={isAtLimit}
              >
                <Plus className="w-4 h-4" />
                {t("app.shotlist.addFirstShot")}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="border border-frame-orange/40 bg-frame-orange/[0.08] p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-0.5 bg-frame-orange" />
                <span className="font-frame-mono text-[0.6rem] text-frame-orange tracking-wider block mb-2">01</span>
                <p className="text-sm font-semibold text-frame-white">{t("app.shotlist.step1Title")}</p>
                <p className="text-[0.65rem] text-frame-gray-light mt-1 leading-relaxed">
                  {t("app.shotlist.step1Desc")}
                </p>
              </div>
              <div className="border border-frame-orange/40 bg-frame-orange/[0.08] p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-0.5 bg-frame-orange" />
                <span className="font-frame-mono text-[0.6rem] text-frame-orange tracking-wider block mb-2">02</span>
                <p className="text-sm font-semibold text-frame-white">{t("app.shotlist.step2Title")}</p>
                <p className="text-[0.65rem] text-frame-gray-light mt-1 leading-relaxed">
                  {t("app.shotlist.step2Desc")}
                </p>
              </div>
              <div className="border border-frame-orange/40 bg-frame-orange/[0.08] p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-0.5 bg-frame-orange" />
                <span className="font-frame-mono text-[0.6rem] text-frame-orange tracking-wider block mb-2">03</span>
                <p className="text-sm font-semibold text-frame-white">{t("app.shotlist.step3Title")}</p>
                <p className="text-[0.65rem] text-frame-gray-light mt-1 leading-relaxed">
                  {t("app.shotlist.step3Desc")}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Grouped by scene, drag within and across groups */}
        {!loading && shots.length > 0 && (
          <>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center font-frame-mono text-[0.6rem] text-frame-gray-light uppercase tracking-wider">
                <span>{shotGroups.length} {t("app.shotlist.scenesCount")}</span>
                <span className="mx-2">·</span>
                <span>{t("app.shotlist.totalDuration")}: {formatDuration(totalDurationSec(shots))}</span>
              </div>
              {shotGroups.length > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={expandAll}
                    className="text-[0.6rem] text-frame-gray-light hover:text-frame-orange uppercase tracking-wider transition"
                  >
                    Expandir Todas
                  </button>
                  <span className="text-frame-gray-3">|</span>
                  <button
                    type="button"
                    onClick={collapseAll}
                    className="text-[0.6rem] text-frame-gray-light hover:text-frame-orange uppercase tracking-wider transition"
                  >
                    Colapsar Todas
                  </button>
                </div>
              )}
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="space-y-3">
                {shotGroups.map((group) => (
                  <SceneGroup
                    key={group.scene}
                    group={group}
                    isExpanded={expandedScenes.has(group.scene)}
                    onToggleExpand={() => toggleSceneExpand(group.scene)}
                    onToggleStatus={handleToggleStatus}
                    onEdit={openEditDialog}
                    onDelete={setDeleteTarget}
                    onDuplicate={handleDuplicate}
                    t={t}
                  />
                ))}
              </div>
              <DragOverlay dropAnimation={{ duration: 150, easing: "ease" }}>
                {activeShot ? <ShotRowContent shot={activeShot} t={t} isOverlay /> : null}
              </DragOverlay>
            </DndContext>
          </>
        )}
      </main>

      {/* Create/edit shot */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="bg-frame-black border-frame-gray-3 text-frame-white max-w-lg rounded-none p-6">
          <DialogHeader>
            <DialogTitle className="frame-title text-2xl">
              {editingId ? t("app.shotlist.editShot") : t("app.shotlist.newShot")}
            </DialogTitle>
            <DialogDescription className="text-frame-gray-light text-sm">
              {t("app.shotlist.formDescription")}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-frame-gray-light mb-1.5">
                  Número do Shot
                </label>
                <input
                  type="text"
                  value={form.shotNumber}
                  onChange={(e) => setForm((f) => ({ ...f, shotNumber: e.target.value }))}
                  placeholder="Ex: 1A, 2B"
                  className="frame-input w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-frame-gray-light mb-1.5">{t("app.shotlist.scene")}</label>
                <input
                  type="text"
                  value={form.scene}
                  onChange={(e) => setForm((f) => ({ ...f, scene: e.target.value }))}
                  placeholder={t("app.shotlist.scenePlaceholder")}
                  className="frame-input w-full"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-frame-gray-light">{t("app.shotlist.shotType")}</label>
                <button
                  type="button"
                  onClick={() => setShowTypesManager(true)}
                  className="text-[0.65rem] text-frame-orange hover:underline"
                >
                  Gerenciar tipos
                </button>
              </div>
              <input
                type="text"
                value={form.shotType}
                onChange={(e) => setForm((f) => ({ ...f, shotType: e.target.value }))}
                placeholder={t("app.shotlist.shotTypePlaceholder")}
                list="shot-types"
                className="frame-input w-full"
              />
              <datalist id="shot-types">
                {shotTypes.map((type) => (
                  <option key={type.id} value={type.name} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-medium text-frame-gray-light mb-1.5">{t("app.shotlist.descriptionLabel")}</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder={t("app.shotlist.descriptionPlaceholder")}
                required
                className="frame-input w-full"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-frame-gray-light mb-1.5">{t("app.shotlist.camera")}</label>
                <input
                  type="text"
                  value={form.camera}
                  onChange={(e) => setForm((f) => ({ ...f, camera: e.target.value }))}
                  className="frame-input w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-frame-gray-light mb-1.5">{t("app.shotlist.lens")}</label>
                <input
                  type="text"
                  value={form.lens}
                  onChange={(e) => setForm((f) => ({ ...f, lens: e.target.value }))}
                  className="frame-input w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-frame-gray-light mb-1.5">{t("app.shotlist.movement")}</label>
                <input
                  type="text"
                  value={form.movement}
                  onChange={(e) => setForm((f) => ({ ...f, movement: e.target.value }))}
                  placeholder="Ex: Dolly in, Pan..."
                  list="camera-movements"
                  className="frame-input w-full"
                />
                <datalist id="camera-movements">
                  {CAMERA_MOVEMENTS.map((movement) => (
                    <option key={movement} value={movement} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="max-w-[10rem]">
              <label className="block text-xs font-medium text-frame-gray-light mb-1.5">{t("app.shotlist.durationMinutes")}</label>
              <input
                type="number"
                min="0"
                step="1"
                value={form.durationMinutes}
                onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))}
                placeholder={t("app.shotlist.durationPlaceholder")}
                className="frame-input w-full"
              />
            </div>

            {/* Thumbnail Upload */}
            <div>
              <label className="block text-xs font-medium text-frame-gray-light mb-1.5">
                Thumbnail (opcional)
              </label>
              {form.thumbnailPreview ? (
                <div className="relative inline-block">
                  <img
                    src={form.thumbnailPreview}
                    alt="Preview"
                    className="w-32 h-24 object-cover border border-frame-gray-3"
                  />
                  <button
                    type="button"
                    onClick={removeThumbnail}
                    className="absolute -top-2 -right-2 p-1 bg-red-600 hover:bg-red-700 rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 border border-dashed border-frame-gray-3/50 hover:border-frame-orange/50 bg-frame-gray-1/10 p-4 cursor-pointer transition">
                  <Upload className="w-4 h-4 text-frame-gray-light" />
                  <span className="text-xs text-frame-gray-light">Clique para selecionar imagem</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Production Notes */}
            <div>
              <label className="block text-xs font-medium text-frame-gray-light mb-1.5">
                Notas de Produção
              </label>
              <textarea
                value={form.productionNotes}
                onChange={(e) => setForm((f) => ({ ...f, productionNotes: e.target.value }))}
                placeholder="Observações de lighting, arte, etc..."
                className="frame-input min-h-[100px] w-full"
                maxLength={500}
              />
              <p className="text-[0.6rem] text-frame-gray-light mt-1">
                {form.productionNotes.length}/500 caracteres
              </p>
            </div>

            <DialogFooter className="gap-2 pt-4 border-t border-frame-gray-3">
              <button type="button" onClick={() => setFormOpen(false)} className="frame-btn-ghost" disabled={saving}>
                {t("app.shotlist.cancel")}
              </button>
              <button type="submit" className="frame-btn-primary inline-flex items-center gap-2" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                {editingId ? t("app.shotlist.saveChanges") : t("app.shotlist.addShot")}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("app.shotlist.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("app.shotlist.deleteConfirmDesc").replace("{description}", deleteTarget?.description || "")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("app.shotlist.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700">
              {deleting ? t("app.shotlist.deleting") : t("app.shotlist.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Shot Types Manager */}
      <Dialog open={showTypesManager} onOpenChange={setShowTypesManager}>
        <DialogContent className="bg-frame-black border-frame-gray-3 text-frame-white max-w-md rounded-none p-6">
          <DialogHeader>
            <DialogTitle className="frame-title text-xl">Gerenciar Tipos de Plano</DialogTitle>
            <DialogDescription className="text-frame-gray-light text-sm">
              Adicione tipos personalizados ou remova os que não usa. Tipos padrão não podem ser removidos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Add new type */}
            <form onSubmit={handleAddShotType} className="flex gap-2">
              <input
                type="text"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                placeholder="Nome do novo tipo..."
                className="frame-input flex-1"
                disabled={savingType}
              />
              <button
                type="submit"
                className="frame-btn-primary"
                disabled={savingType || !newTypeName.trim()}
              >
                {savingType ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </button>
            </form>

            {/* List of types */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {shotTypes.map((type) => (
                <div
                  key={type.id}
                  className="flex items-center justify-between p-2 border border-frame-gray-3/50 bg-frame-gray-1/10"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-frame-white">{type.name}</span>
                    {type.isDefault && (
                      <span className="text-[0.6rem] px-1.5 py-0.5 bg-frame-orange/20 text-frame-orange rounded">
                        Padrão
                      </span>
                    )}
                  </div>
                  {!type.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleDeleteShotType(type.id)}
                      className="p-1 text-frame-gray-light hover:text-red-500 transition"
                      title="Remover"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-frame-gray-3">
            <button
              type="button"
              onClick={() => setShowTypesManager(false)}
              className="frame-btn-primary"
            >
              Fechar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
