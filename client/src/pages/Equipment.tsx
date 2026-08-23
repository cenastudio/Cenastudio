import { useEffect, useMemo, useState } from "react";
import AppNavBar from "@/components/AppNavBar";
import EmptyState from "@/components/EmptyState";
import ProductionNav from "@/components/ProductionNav";
import ProtectedRoute from "@/components/ProtectedRoute";
import { FeatureUpgradeRequired } from "@/components/FeatureUpgradeRequired";
import { ScreenDesignPass } from "@/components/discovery/ScreenDesignPass";
import { useProject } from "@/contexts/ProjectContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { api, type EquipmentItem, type EquipmentBookingItem } from "@/lib/api";
import {
  Camera,
  Aperture,
  Lightbulb,
  Mic,
  Wrench,
  Plus,
  Trash2,
  Edit,
  Loader2,
  ArrowRight,
  CalendarRange,
  X,
  Search,
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

const CATEGORIES = [
  { id: "camera", label: "Câmera", icon: Camera, className: "border-frame-orange/30 bg-frame-orange/10 text-frame-orange" },
  { id: "lens", label: "Lente", icon: Aperture, className: "border-blue-500/30 bg-blue-500/10 text-blue-400" },
  { id: "light", label: "Iluminação", icon: Lightbulb, className: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400" },
  { id: "audio", label: "Áudio", icon: Mic, className: "border-purple-500/30 bg-purple-500/10 text-purple-400" },
  { id: "accessory", label: "Acessório", icon: Wrench, className: "border-frame-gray-3 bg-frame-gray-2/40 text-frame-gray-light" },
];

const STATUSES: Record<string, { label: string; className: string }> = {
  available: { label: "Disponível", className: "border-green-500/40 text-green-400" },
  in_use: { label: "Em uso", className: "border-frame-orange/40 text-frame-orange" },
  maintenance: { label: "Manutenção", className: "border-yellow-500/40 text-yellow-400" },
  rented: { label: "Alugado", className: "border-blue-500/40 text-blue-400" },
};

function categoryLabel(id: string) {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

function categoryInfo(id: string) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

function EquipmentContent() {
  const { t } = useLanguage();
  const { projects } = useProject();
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0].id);
  const [costPerDayInput, setCostPerDayInput] = useState("");
  const [isOwned, setIsOwned] = useState(true);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<EquipmentItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [bookingsFor, setBookingsFor] = useState<EquipmentItem | null>(null);
  const [bookings, setBookings] = useState<EquipmentBookingItem[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [bookingProjectId, setBookingProjectId] = useState<number | "">("");
  const [bookingStart, setBookingStart] = useState("");
  const [bookingEnd, setBookingEnd] = useState("");
  const [savingBooking, setSavingBooking] = useState(false);

  const load = () => {
    setLoading(true);
    api.equipment
      .list()
      .then(setItems)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Falha ao carregar equipamentos"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (query && !`${item.name} ${categoryLabel(item.category)} ${item.status}`.toLowerCase().includes(query)) return false;
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      return true;
    });
  }, [items, categoryFilter, statusFilter, searchQuery]);

  const inventoryStats = useMemo(() => {
    const available = items.filter((item) => item.status === "available").length;
    const reservedOrUse = items.filter((item) => item.status === "in_use" || item.status === "rented").length;
    const maintenance = items.filter((item) => item.status === "maintenance").length;
    const dailyValue = items.reduce((total, item) => total + (item.cost_per_day || 0), 0);
    return { available, reservedOrUse, maintenance, dailyValue };
  }, [items]);

  const groupedFiltered = useMemo(() => {
    return CATEGORIES.map((categoryItem) => ({
      ...categoryItem,
      items: filtered.filter((item) => item.category === categoryItem.id),
    })).filter((categoryItem) => categoryItem.items.length > 0);
  }, [filtered]);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setCategory(CATEGORIES[0].id);
    setCostPerDayInput("");
    setIsOwned(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEditDialog = (item: EquipmentItem) => {
    setEditingId(item.id);
    setName(item.name);
    setCategory(item.category);
    setCostPerDayInput(item.cost_per_day != null ? (item.cost_per_day / 100).toFixed(2) : "");
    setIsOwned(item.is_owned);
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Informe o nome do equipamento");
      return;
    }
    const costPerDay = costPerDayInput.trim()
      ? Math.round(Number.parseFloat(costPerDayInput.replace(",", ".")) * 100)
      : null;

    setSaving(true);
    try {
      if (editingId) {
        const updated = await api.equipment.update(editingId, { name: name.trim(), category, costPerDay, isOwned });
        setItems((prev) => prev.map((i) => (i.id === editingId ? updated : i)));
        toast.success("Equipamento atualizado");
      } else {
        const created = await api.equipment.create({ name: name.trim(), category, costPerDay, isOwned });
        setItems((prev) => [created, ...prev]);
        toast.success("Equipamento cadastrado");
      }
      setFormOpen(false);
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar equipamento");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.equipment.delete(deleteTarget.id);
      setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      toast.success("Equipamento removido");
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao remover equipamento");
    } finally {
      setDeleting(false);
    }
  };

  const openBookings = (item: EquipmentItem) => {
    setBookingsFor(item);
    setBookingProjectId("");
    setBookingStart("");
    setBookingEnd("");
    setLoadingBookings(true);
    api.equipment
      .listBookings(item.id)
      .then(setBookings)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Falha ao carregar reservas"))
      .finally(() => setLoadingBookings(false));
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingsFor || !bookingProjectId || !bookingStart || !bookingEnd) {
      toast.error("Selecione projeto, data de início e fim");
      return;
    }
    setSavingBooking(true);
    try {
      const created = await api.equipment.createBooking(bookingsFor.id, {
        projectId: Number(bookingProjectId),
        startDate: bookingStart,
        endDate: bookingEnd,
      });
      setBookings((prev) => [...prev, created].sort((a, b) => a.start_date.localeCompare(b.start_date)));
      toast.success("Reserva criada");
      setBookingProjectId("");
      setBookingStart("");
      setBookingEnd("");
    } catch (err) {
      // 409 = overlap conflict — surfaced with a clear message from the backend.
      toast.error(err instanceof Error ? err.message : "Falha ao criar reserva");
    } finally {
      setSavingBooking(false);
    }
  };

  const handleCancelBooking = async (bookingId: number) => {
    try {
      await api.equipment.cancelBooking(bookingId);
      setBookings((prev) => prev.filter((b) => b.id !== bookingId));
      toast.success("Reserva cancelada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao cancelar reserva");
    }
  };

  return (
    <div className="min-h-screen bg-frame-black text-frame-white font-frame-body">
      <AppNavBar />
      <ProductionNav />
      <main id="main-content" className="px-3 sm:px-6 py-5 sm:py-6 max-w-[1200px] mx-auto space-y-6">
        <ScreenDesignPass
          eyebrow="// Almoxarifado de produção"
          title="Equipamento com disponibilidade clara."
          description="Controle câmeras, lentes, áudio, luz e acessórios como estoque vivo da produtora, com reserva por job antes do set."
          icon={Camera}
          currentStage="Produção"
          metrics={[
            { label: "Inventário", value: items.length, detail: "itens" },
            { label: "Disponível", value: inventoryStats.available, detail: "pronto para reserva" },
            { label: "Reservado", value: inventoryStats.reservedOrUse, detail: "uso ou bloqueio" },
            { label: "Valor/dia", value: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(inventoryStats.dailyValue / 100), detail: "estimado" },
          ]}
          actions={[
            { label: "Cadastrar equipamento", detail: "Adicionar item ao estoque", onClick: openCreateDialog },
            { label: "Filtrar disponibilidade", detail: "Encontrar câmera, luz ou áudio", href: "#equipment-filters" },
          ]}
        />

        {!loading && items.length > 0 && (
          <div id="equipment-filters" className="grid gap-3 border border-frame-gray-3 bg-frame-gray-1/10 p-3 lg:grid-cols-[minmax(240px,1fr)_auto_auto]">
            <label className="relative block">
              <span className="sr-only">Buscar equipamento</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-frame-gray-light" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome, categoria ou status"
                className="frame-input w-full pl-9 text-xs"
              />
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="frame-input text-xs lg:w-[190px]"
            >
              <option value="all">Todas categorias</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="frame-input text-xs lg:w-[170px]"
            >
              <option value="all">Todos status</option>
              {Object.entries(STATUSES).map(([id, s]) => (
                <option key={id} value={id}>{s.label}</option>
              ))}
            </select>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-frame-orange" />
          </div>
        )}

        {/* Empty state — orange square + 01/02/03 flow */}
        {!loading && items.length === 0 && (
          <section className="mx-auto max-w-4xl py-10">
            <EmptyState
              icon={Camera}
              eyebrow={t("app.equipment.onboardEyebrow")}
              title={t("app.equipment.onboardTitle")}
              description={t("app.equipment.onboardDesc")}
              action={{ label: t("app.equipment.onboardCta"), onClick: openCreateDialog, icon: Plus }}
              steps={[
                { title: t("app.equipment.onboardStep1"), description: t("app.equipment.onboardStep1Desc") },
                { title: t("app.equipment.onboardStep2"), description: t("app.equipment.onboardStep2Desc") },
                { title: t("app.equipment.onboardStep3"), description: t("app.equipment.onboardStep3Desc") },
              ]}
            />
          </section>
        )}

        {/* Warehouse grouped inventory */}
        {!loading && items.length > 0 && (
          <div className="space-y-5">
            {groupedFiltered.length === 0 ? (
              <div className="border border-frame-gray-3 bg-frame-gray-1/10 p-8 text-center">
                <p className="font-frame-mono text-[0.58rem] uppercase tracking-[0.14em] text-frame-orange">Nenhum item encontrado</p>
                <p className="mt-2 text-sm text-frame-gray-light">Ajuste busca, categoria ou status para ver o armazém.</p>
              </div>
            ) : groupedFiltered.map((group) => {
              const GroupIcon = group.icon;
              return (
                <section key={group.id} className="border border-frame-gray-3 bg-frame-gray-1/10">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-frame-gray-3 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center border ${group.className}`}>
                        <GroupIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-sm font-semibold text-frame-white">{group.label}</h2>
                        <p className="text-[0.65rem] text-frame-gray-light">{group.items.length} itens no armazém</p>
                      </div>
                    </div>
                    <span className="font-frame-mono text-[0.58rem] uppercase tracking-[0.14em] text-frame-gray-light">
                      {group.items.filter((item) => item.status === "available").length} disponíveis
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-2 xl:grid-cols-3">
                    {group.items.map((item) => {
                      const statusInfo = STATUSES[item.status] ?? { label: item.status, className: "border-frame-gray-3/50 text-frame-gray-light" };
                      const catInfo = categoryInfo(item.category);
                      const CategoryIcon = catInfo.icon;
                      return (
                        <div key={item.id} className="border border-frame-gray-3/60 bg-frame-black/20 p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className={`w-10 h-10 shrink-0 border flex items-center justify-center ${catInfo.className}`}>
                                <CategoryIcon className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-frame-white truncate">{item.name}</p>
                                <p className="text-[0.65rem] text-frame-gray-light">{item.is_owned ? "Próprio" : "Locado"} · {categoryLabel(item.category)}</p>
                              </div>
                            </div>
                            <span className={`text-[0.6rem] font-frame-mono uppercase px-1.5 py-0.5 border shrink-0 ${statusInfo.className}`}>
                              {statusInfo.label}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 border-y border-frame-gray-3/40 py-2 text-xs">
                            <div>
                              <span className="block font-frame-mono text-[0.5rem] uppercase tracking-[0.12em] text-frame-gray-light">Custo/dia</span>
                              <span className="mt-1 block text-frame-white">
                                {item.cost_per_day != null
                                  ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.cost_per_day / 100)
                                  : "Sem custo"}
                              </span>
                            </div>
                            <div>
                              <span className="block font-frame-mono text-[0.5rem] uppercase tracking-[0.12em] text-frame-gray-light">Agenda</span>
                              <span className="mt-1 block text-frame-white">{item.status === "available" ? "Livre" : statusInfo.label}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openBookings(item)}
                              className="flex-1 frame-btn-ghost !py-1.5 text-xs inline-flex items-center justify-center gap-1.5"
                            >
                              <CalendarRange className="w-3.5 h-3.5" />
                              Reservas
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditDialog(item)}
                              className="p-2 border border-frame-gray-3/50 hover:border-frame-orange hover:text-frame-orange transition"
                              title="Editar"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(item)}
                              className="p-2 border border-frame-gray-3/50 hover:border-red-500 hover:text-red-500 transition"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>

      {/* Create/edit equipment */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="bg-frame-black border-frame-gray-3 text-frame-white max-w-lg rounded-none p-6">
          <DialogHeader>
            <DialogTitle className="frame-title text-2xl">{editingId ? "Editar equipamento" : "Novo equipamento"}</DialogTitle>
            <DialogDescription className="text-frame-gray-light text-sm">
              Informe os dados do item do seu inventário.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <label className="block text-xs font-medium text-frame-gray-light mb-1.5">Nome</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Sony FX6"
                required
                className="frame-input w-full"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-frame-gray-light mb-1.5">Categoria</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="frame-input w-full">
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-frame-gray-light mb-1.5">Custo/dia (opcional)</label>
                <input
                  type="text"
                  value={costPerDayInput}
                  onChange={(e) => setCostPerDayInput(e.target.value)}
                  placeholder="0,00"
                  className="frame-input w-full font-mono"
                />
              </div>
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={isOwned} onChange={(e) => setIsOwned(e.target.checked)} className="accent-frame-orange" />
              <span className="text-sm text-frame-white">Equipamento próprio (desmarque se for locado/terceirizado)</span>
            </label>

            <DialogFooter className="gap-2 pt-4 border-t border-frame-gray-3">
              <button type="button" onClick={() => setFormOpen(false)} className="frame-btn-ghost" disabled={saving}>
                Cancelar
              </button>
              <button type="submit" className="frame-btn-primary inline-flex items-center gap-2" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                {editingId ? "Salvar alterações" : "Cadastrar"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bookings for a given equipment */}
      <Dialog open={!!bookingsFor} onOpenChange={(open) => !open && setBookingsFor(null)}>
        <DialogContent className="bg-frame-black border-frame-gray-3 text-frame-white max-w-lg rounded-none p-6">
          <DialogHeader>
            <DialogTitle className="frame-title text-2xl">Reservas — {bookingsFor?.name}</DialogTitle>
            <DialogDescription className="text-frame-gray-light text-sm">
              Reservas conflitantes (mesmo período) são bloqueadas automaticamente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateBooking} className="space-y-3 mt-2">
            <div>
              <label className="block text-xs font-medium text-frame-gray-light mb-1.5">Projeto</label>
              <select
                value={bookingProjectId}
                onChange={(e) => setBookingProjectId(e.target.value ? Number(e.target.value) : "")}
                required
                className="frame-input w-full"
              >
                <option value="">Selecione um projeto</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-frame-gray-light mb-1.5">Início</label>
                <input type="date" value={bookingStart} onChange={(e) => setBookingStart(e.target.value)} required className="frame-input w-full" />
              </div>
              <div>
                <label className="block text-xs font-medium text-frame-gray-light mb-1.5">Fim</label>
                <input type="date" value={bookingEnd} onChange={(e) => setBookingEnd(e.target.value)} required className="frame-input w-full" />
              </div>
            </div>
            <button type="submit" className="frame-btn-primary w-full inline-flex items-center justify-center gap-2" disabled={savingBooking}>
              {savingBooking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Reservar
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-frame-gray-3 space-y-2 max-h-64 overflow-y-auto">
            {loadingBookings && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-4 h-4 animate-spin text-frame-orange" />
              </div>
            )}
            {!loadingBookings && bookings.length === 0 && (
              <p className="text-xs text-frame-gray-light text-center py-4">Nenhuma reserva ainda.</p>
            )}
            {!loadingBookings &&
              bookings.map((booking) => {
                const project = projects.find((p) => p.id === booking.project_id);
                return (
                  <div key={booking.id} className="flex items-center justify-between border border-frame-gray-3/50 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-xs text-frame-white truncate">{project?.name ?? `Projeto #${booking.project_id}`}</p>
                      <p className="text-[0.65rem] text-frame-gray-light">
                        {formatDate(booking.start_date)} — {formatDate(booking.end_date)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCancelBooking(booking.id)}
                      className="p-1.5 border border-frame-gray-3/50 hover:border-red-500 hover:text-red-500 transition shrink-0"
                      title="Cancelar reserva"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir equipamento?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.name}" será removido junto com todas as suas reservas.
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

export default function Equipment() {
  return (
    <ProtectedRoute>
      <FeatureUpgradeRequired feature="equipment-inventory" variant="full">
        <EquipmentContent />
      </FeatureUpgradeRequired>
    </ProtectedRoute>
  );
}
