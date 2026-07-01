import { useEffect, useState } from "react";
import { useParams } from "wouter";
import AppNavBar from "@/components/AppNavBar";
import ProjectNav from "@/components/ProjectNav";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  Plus,
  Users,
  Mail,
  Phone,
  DollarSign,
  Edit,
  Trash2,
  Shield,
  User,
  MoreVertical,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  SlidersHorizontal,
  Sparkles,
  Search,
  AlertCircle,
} from "lucide-react";
import EmptyState from "@/components/EmptyState";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

interface Collaborator {
  id: number;
  user_id: number;
  name: string;
  email: string;
  role: string;
  phone: string;
  skills: string;
  hourly_rate?: number;
  daily_rate?: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface CollaboratorStats {
  totalCollaborators: number;
  activeCollaborators: number;
  byRole: Array<{ role: string; count: number }>;
  totalProjects: number;
}

const ROLES = [
  { id: "admin", labelKey: "app.collaborators.admin" },
  { id: "editor", labelKey: "app.collaborators.editor" },
  { id: "camera", labelKey: "app.collaborators.camera" },
  { id: "director", labelKey: "app.collaborators.director" },
  { id: "producer", labelKey: "app.collaborators.producer" },
  { id: "member", labelKey: "app.collaborators.member" },
];

const STATUS = [
  { id: "active", labelKey: "app.collaborators.active" },
  { id: "inactive", labelKey: "app.collaborators.inactive" },
  { id: "pending", labelKey: "app.collaborators.pending" },
];

function CollaboratorsContent() {
  const { t } = useLanguage();
  const { projectId } = useParams<{ projectId?: string }>();
  const projectIdNumber = projectId ? parseInt(projectId) : null;
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [stats, setStats] = useState<CollaboratorStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedCollaborator, setSelectedCollaborator] = useState<Collaborator | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [phone, setPhone] = useState("");
  const [skills, setSkills] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [status, setStatus] = useState("active");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter states
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterQuery, setFilterQuery] = useState("");

  useEffect(() => {
    loadCollaborators();
    loadStats();
  }, []);

  const loadCollaborators = async () => {
    setIsLoading(true);
    setLoadError(false);
    try {
      const response = await fetch("/api/collaborators", { credentials: "include" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Failed to load collaborators");
      setCollaborators(data.data);
    } catch (error) {
      console.error("Error loading collaborators:", error);
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch("/api/collaborators/stats", { credentials: "include" });
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/collaborators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          role,
          phone: phone.trim(),
          skills: skills.trim(),
          daily_rate: hourlyRate ? parseInt(hourlyRate) : undefined,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(t("app.collaborators.collaboratorCreated"));
        setIsCreateOpen(false);
        resetForm();
        loadCollaborators();
        loadStats();
      } else {
        toast.error(data.error || t("app.errors.addCollaborator"));
      }
    } catch (error) {
      toast.error(t("app.errors.addCollaborator"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCollaborator || !name.trim() || !email.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/collaborators/${selectedCollaborator.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          role,
          phone: phone.trim(),
          skills: skills.trim(),
          daily_rate: hourlyRate ? parseInt(hourlyRate) : undefined,
          status,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(t("app.collaborators.collaboratorUpdated"));
        setIsEditOpen(false);
        resetForm();
        loadCollaborators();
        loadStats();
      } else {
        toast.error(data.error || t("app.errors.updateCollaborator"));
      }
    } catch (error) {
      toast.error(t("app.errors.updateCollaborator"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCollaborator) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/collaborators/${selectedCollaborator.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json();
      if (data.success) {
        toast.success(t("app.collaborators.collaboratorDeleted"));
        setIsDeleteOpen(false);
        setSelectedCollaborator(null);
        loadCollaborators();
        loadStats();
      } else {
        toast.error(data.error || t("app.errors.deleteCollaborator"));
      }
    } catch (error) {
      toast.error(t("app.errors.deleteCollaborator"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (collaborator: Collaborator) => {
    setSelectedCollaborator(collaborator);
    setName(collaborator.name);
    setEmail(collaborator.email);
    setRole(collaborator.role);
    setPhone(collaborator.phone);
    setSkills(collaborator.skills);
    setHourlyRate((collaborator.daily_rate ?? collaborator.hourly_rate)?.toString() || "");
    setStatus(collaborator.status);
    setIsEditOpen(true);
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setRole("member");
    setPhone("");
    setSkills("");
    setHourlyRate("");
    setStatus("active");
    setSelectedCollaborator(null);
  };

  const getFilteredCollaborators = () => {
    return collaborators.filter((collaborator) => {
      const query = filterQuery.trim().toLocaleLowerCase();
      if (query) {
        const searchable = [collaborator.name, collaborator.email, collaborator.phone, collaborator.skills]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase();
        if (!searchable.includes(query)) return false;
      }
      if (filterRole && collaborator.role !== filterRole) return false;
      if (filterStatus && collaborator.status !== filterStatus) return false;
      return true;
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const filteredCollaborators = getFilteredCollaborators();
  const hasActiveFilters = Boolean(filterQuery.trim() || filterRole || filterStatus);
  const primaryRole = stats?.byRole?.[0];
  const roleLabel = (roleId: string) => t(ROLES.find((r) => r.id === roleId)?.labelKey || "app.collaborators.member") as string;
  const statusLabel = (statusId: string) => t(STATUS.find((s) => s.id === statusId)?.labelKey || "app.collaborators.pending") as string;

  return (
    <div className="min-h-screen bg-frame-black text-frame-white font-frame-body flex flex-col">
      <AppNavBar />
      {projectIdNumber && <ProjectNav projectId={projectIdNumber} />}

      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 space-y-8">
        <section className="relative overflow-hidden border border-frame-gray-3 bg-frame-gray-1/35 p-6 md:p-8">
          <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(232,80,2,0.14),transparent_52%)] pointer-events-none" />
          <div className="relative grid gap-7 lg:grid-cols-[1fr_420px] lg:items-end">
            <div>
              <p className="frame-label mb-3">// {t("app.collaborators.teamOps") as string}</p>
              <h1 className="frame-title text-[clamp(2.25rem,5vw,4.6rem)] leading-none">
                {t("app.collaborators.title") as string}
              </h1>
              <p className="mt-4 max-w-2xl text-base text-frame-gray-light">
                {t("app.collaborators.subtitle") as string}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 border border-frame-gray-3 bg-frame-black/20 px-3 py-2 font-frame-mono text-[0.58rem] uppercase tracking-[0.16em] text-frame-gray-light">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                  {stats?.activeCollaborators ?? 0} {t("app.collaborators.active") as string}
                </span>
                <span className="inline-flex items-center gap-2 border border-frame-gray-3 bg-frame-black/20 px-3 py-2 font-frame-mono text-[0.58rem] uppercase tracking-[0.16em] text-frame-gray-light">
                  <Briefcase className="h-3.5 w-3.5 text-frame-orange" />
                  {stats?.totalProjects ?? 0} {t("app.collaborators.projectsCovered") as string}
                </span>
                <span className="inline-flex items-center gap-2 border border-frame-gray-3 bg-frame-black/20 px-3 py-2 font-frame-mono text-[0.58rem] uppercase tracking-[0.16em] text-frame-gray-light">
                  <Sparkles className="h-3.5 w-3.5 text-frame-orange" />
                  {primaryRole ? roleLabel(primaryRole.role) : t("app.collaborators.noRoleYet") as string}
                </span>
              </div>
            </div>

            <div className="border border-frame-gray-3 bg-frame-black/25 p-4">
              <p className="font-frame-mono text-[0.6rem] uppercase tracking-[0.18em] text-frame-orange">
                {t("app.collaborators.quickPanel") as string}
              </p>
              <p className="mt-2 text-sm text-frame-gray-light">
                {t("app.collaborators.quickPanelDesc") as string}
              </p>
              <button
                onClick={() => {
                  resetForm();
                  setIsCreateOpen(true);
                }}
                className="frame-btn-primary mt-5 flex w-full items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {t("app.collaborators.newCollaborator") as string}
              </button>
            </div>
          </div>
        </section>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-frame-gray-3 bg-frame-gray-1/30 p-5"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 bg-frame-orange/10">
                  <Users className="w-5 h-5 text-frame-orange" />
                </div>
                <div>
                  <p className="text-[0.65rem] text-frame-gray-light font-frame-mono uppercase tracking-wider">
                    {t("app.collaborators.totalCollaborators") as string}
                  </p>
                  <p className="text-2xl font-bold">{stats.totalCollaborators}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="border border-frame-gray-3 bg-frame-gray-1/30 p-5"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-500/10">
                  <User className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-[0.65rem] text-frame-gray-light font-frame-mono uppercase tracking-wider">
                    {t("app.collaborators.activeCollaborators") as string}
                  </p>
                  <p className="text-2xl font-bold">{stats.activeCollaborators}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="border border-frame-gray-3 bg-frame-gray-1/30 p-5"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/10">
                  <Shield className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-[0.65rem] text-frame-gray-light font-frame-mono uppercase tracking-wider">
                    {t("app.collaborators.projects") as string}
                  </p>
                  <p className="text-2xl font-bold">{stats.totalProjects}</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Filters */}
        <div className="grid gap-3 border border-frame-gray-3 bg-frame-gray-1/10 p-4 lg:grid-cols-[minmax(220px,1fr)_auto_auto_auto] lg:items-center">
          <label className="relative min-w-0">
            <span className="sr-only">{t("app.collaborators.search") as string}</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-frame-gray-light" />
            <input
              type="search"
              value={filterQuery}
              onChange={(event) => setFilterQuery(event.target.value)}
              placeholder={t("app.collaborators.searchPlaceholder") as string}
              className="frame-input h-10 w-full pl-10"
            />
          </label>

          <div className="flex items-center gap-2 lg:hidden">
            <SlidersHorizontal className="w-4 h-4 text-frame-orange" />
            <span className="font-frame-mono text-xs uppercase tracking-wider">{t("app.collaborators.filters") as string}</span>
            <span className="text-xs text-frame-gray-light">
              {filteredCollaborators.length}/{collaborators.length}
            </span>
          </div>

          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            aria-label={t("app.collaborators.allRoles") as string}
            className="h-10 bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-sm outline-none focus:border-frame-orange rounded-none"
          >
            <option value="">{t("app.collaborators.allRoles") as string}</option>
            {ROLES.map((role) => (
              <option key={role.id} value={role.id}>
                {t(role.labelKey) as string}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            aria-label={t("app.collaborators.allStatus") as string}
            className="h-10 bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-sm outline-none focus:border-frame-orange rounded-none"
          >
            <option value="">{t("app.collaborators.allStatus") as string}</option>
            {STATUS.map((status) => (
              <option key={status.id} value={status.id}>
                {t(status.labelKey) as string}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setFilterRole("");
              setFilterStatus("");
              setFilterQuery("");
            }}
            disabled={!hasActiveFilters}
            className="frame-btn-ghost h-10 text-xs disabled:cursor-not-allowed disabled:opacity-35"
          >
            {t("app.collaborators.clearFilters") as string}
          </button>
        </div>

        {/* Collaborators List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-frame-orange" />
          </div>
        ) : loadError ? (
          <EmptyState
            icon={AlertCircle}
            title={t("app.collaborators.loadError") as string}
            description={t("app.collaborators.loadErrorDescription") as string}
            action={{ label: t("app.common.tryAgain") as string, onClick: loadCollaborators }}
          />
        ) : filteredCollaborators.length === 0 ? (
          <EmptyState
            icon={hasActiveFilters ? Search : Users}
            title={t(hasActiveFilters ? "app.collaborators.noResults" : "app.collaborators.noCollaborators") as string}
            description={t(hasActiveFilters ? "app.collaborators.noResultsDescription" : "app.collaborators.noCollaboratorsDesc") as string}
            action={hasActiveFilters
              ? {
                  label: t("app.collaborators.clearFilters") as string,
                  onClick: () => {
                    setFilterQuery("");
                    setFilterRole("");
                    setFilterStatus("");
                  },
                }
              : {
                  label: t("app.collaborators.newCollaborator") as string,
                  onClick: () => setIsCreateOpen(true),
                }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCollaborators.map((collaborator) => (
              (() => {
                const dayRate = collaborator.daily_rate ?? collaborator.hourly_rate ?? 0;
                return (
              <motion.div
                key={collaborator.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-frame-gray-3 bg-frame-gray-1/10 p-5 hover:-translate-y-0.5 hover:border-frame-orange/50 hover:bg-frame-gray-1/20 transition group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center border border-frame-gray-3 bg-frame-gray-2 text-frame-orange">
                      <User className="w-6 h-6 text-frame-orange" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-frame-white">
                        {collaborator.name}
                      </h3>
                      <p className="font-frame-mono text-[0.62rem] uppercase tracking-[0.12em] text-frame-gray-light">
                        {roleLabel(collaborator.role)}
                      </p>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label={`${t("app.collaborators.actionsFor") as string} ${collaborator.name}`}
                        className="p-1 hover:bg-frame-gray-3 transition rounded-none opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 focus-visible:opacity-100"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-frame-black border-frame-gray-3">
                      <DropdownMenuItem
                        onClick={() => openEditModal(collaborator)}
                        className="cursor-pointer"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        {t("app.common.edit") as string}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedCollaborator(collaborator);
                          setIsDeleteOpen(true);
                        }}
                        className="cursor-pointer text-frame-red"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {t("app.common.delete") as string}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-2 text-xs">
                  {collaborator.email && (
                    <div className="flex items-center gap-2 text-frame-gray-light">
                      <Mail className="w-3 h-3" />
                      <span className="truncate">{collaborator.email}</span>
                    </div>
                  )}

                  {collaborator.phone && (
                    <div className="flex items-center gap-2 text-frame-gray-light">
                      <Phone className="w-3 h-3" />
                      <span>{collaborator.phone}</span>
                    </div>
                  )}

                  {dayRate > 0 && (
                    <div className="flex items-center gap-2 text-frame-orange">
                      <DollarSign className="w-3 h-3" />
                      <span>{formatCurrency(dayRate)} / {t("app.collaborators.dailyRate") as string}</span>
                    </div>
                  )}

                  {collaborator.skills && (
                    <div className="text-frame-gray-light mt-2">
                      <span className="font-frame-mono uppercase tracking-wider text-[0.6rem]">
                        {t("app.collaborators.skills") as string}
                      </span>
                      <p className="truncate">{collaborator.skills}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-frame-gray-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[0.6rem] font-frame-mono uppercase tracking-wider ${
                        collaborator.status === "active"
                          ? "bg-green-500/10 text-green-400"
                          : collaborator.status === "inactive"
                          ? "bg-red-500/10 text-red-400"
                          : "bg-yellow-500/10 text-yellow-400"
                      }`}
                    >
                      {statusLabel(collaborator.status)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-frame-gray-light">
                      <CalendarDays className="h-3 w-3" />
                      {formatDate(collaborator.created_at)}
                    </span>
                  </div>
                </div>
              </motion.div>
                );
              })()
            ))}
          </div>
        )}
      </main>

      {/* Create Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-frame-black border-frame-gray-3 text-frame-white max-w-md rounded-none p-6">
          <DialogHeader>
            <DialogTitle className="frame-title text-2xl">{t("app.collaborators.newCollaborator") as string}</DialogTitle>
            <DialogDescription className="text-frame-gray-light text-sm">
              {t("app.collaborators.createDescription") as string}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="block font-frame-mono text-xs text-frame-orange uppercase">
                {t("app.collaborators.name") as string} *
              </label>
              <input
                type="text"
                required
                disabled={isSubmitting}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-sm outline-none focus:border-frame-orange rounded-none"
                placeholder={t("app.collaborators.namePlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <label className="block font-frame-mono text-xs text-frame-orange uppercase">
                {t("app.collaborators.email") as string} *
              </label>
              <input
                type="email"
                required
                disabled={isSubmitting}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-sm outline-none focus:border-frame-orange rounded-none"
                placeholder={t("app.collaborators.emailPlaceholder")}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block font-frame-mono text-xs text-frame-orange uppercase">
                  {t("app.collaborators.function") as string}
                </label>
                <select
                  disabled={isSubmitting}
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-sm outline-none focus:border-frame-orange rounded-none"
                >
                  {ROLES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {t(r.labelKey) as string}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block font-frame-mono text-xs text-frame-orange uppercase">
                  {t("app.collaborators.dailyRate") as string}
                </label>
                <input
                  type="number"
                  disabled={isSubmitting}
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  className="w-full bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-sm outline-none focus:border-frame-orange rounded-none"
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block font-frame-mono text-xs text-frame-orange uppercase">
                {t("app.collaborators.phone") as string}
              </label>
              <input
                type="tel"
                disabled={isSubmitting}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-sm outline-none focus:border-frame-orange rounded-none"
                placeholder="(00) 00000-0000"
              />
            </div>

            <div className="space-y-2">
              <label className="block font-frame-mono text-xs text-frame-orange uppercase">
                {t("app.collaborators.skills") as string}
              </label>
              <input
                type="text"
                disabled={isSubmitting}
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                className="w-full bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-sm outline-none focus:border-frame-orange rounded-none"
                placeholder={t("app.collaborators.skillsPlaceholder")}
              />
            </div>

            <DialogFooter className="gap-2 pt-4 border-t border-frame-gray-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsCreateOpen(false)}
                className="frame-btn-ghost"
              >
                {t("app.common.cancel") as string}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !name.trim() || !email.trim()}
                className="frame-btn-primary"
              >
                {isSubmitting ? t("app.collaborators.adding") : t("app.collaborators.addCollaborator")}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-frame-black border-frame-gray-3 text-frame-white max-w-md rounded-none p-6">
          <DialogHeader>
            <DialogTitle className="frame-title text-2xl">{t("app.collaborators.editCollaborator") as string}</DialogTitle>
            <DialogDescription className="text-frame-gray-light text-sm">
              {t("app.collaborators.editDescription") as string}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdate} className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="block font-frame-mono text-xs text-frame-orange uppercase">
                {t("app.collaborators.name") as string} *
              </label>
              <input
                type="text"
                required
                disabled={isSubmitting}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-sm outline-none focus:border-frame-orange rounded-none"
              />
            </div>

            <div className="space-y-2">
              <label className="block font-frame-mono text-xs text-frame-orange uppercase">
                {t("app.collaborators.email") as string} *
              </label>
              <input
                type="email"
                required
                disabled={isSubmitting}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-sm outline-none focus:border-frame-orange rounded-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block font-frame-mono text-xs text-frame-orange uppercase">
                  {t("app.collaborators.function") as string}
                </label>
                <select
                  disabled={isSubmitting}
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-sm outline-none focus:border-frame-orange rounded-none"
                >
                  {ROLES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {t(r.labelKey) as string}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block font-frame-mono text-xs text-frame-orange uppercase">
                  {t("app.collaborators.status") as string}
                </label>
                <select
                  disabled={isSubmitting}
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-sm outline-none focus:border-frame-orange rounded-none"
                >
                  {STATUS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {t(s.labelKey) as string}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block font-frame-mono text-xs text-frame-orange uppercase">
                  {t("app.collaborators.dailyRate") as string}
                </label>
                <input
                  type="number"
                  disabled={isSubmitting}
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  className="w-full bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-sm outline-none focus:border-frame-orange rounded-none"
                />
              </div>

              <div className="space-y-2">
                <label className="block font-frame-mono text-xs text-frame-orange uppercase">
                  {t("app.collaborators.phone") as string}
                </label>
                <input
                  type="tel"
                  disabled={isSubmitting}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-sm outline-none focus:border-frame-orange rounded-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block font-frame-mono text-xs text-frame-orange uppercase">
                {t("app.collaborators.skills") as string}
              </label>
              <input
                type="text"
                disabled={isSubmitting}
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                className="w-full bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-sm outline-none focus:border-frame-orange rounded-none"
              />
            </div>

            <DialogFooter className="gap-2 pt-4 border-t border-frame-gray-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsEditOpen(false)}
                className="frame-btn-ghost"
              >
                {t("app.common.cancel") as string}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !name.trim() || !email.trim()}
                className="frame-btn-primary"
              >
                {isSubmitting ? t("app.collaborators.updating") : t("app.collaborators.updateCollaborator")}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="bg-frame-black border-frame-gray-3 text-frame-white max-w-sm rounded-none p-6">
          <DialogHeader>
            <DialogTitle className="frame-title text-2xl text-frame-red">
              {t("app.collaborators.deleteTitle") as string}
            </DialogTitle>
            <DialogDescription className="text-frame-gray-light text-sm">
              {t("app.collaborators.deleteDescription") as string}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 pt-4 border-t border-frame-gray-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsDeleteOpen(false)}
              className="frame-btn-ghost"
            >
              {t("app.common.cancel") as string}
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleDelete}
              className="bg-frame-red hover:bg-red-600 text-white px-4 py-2 text-sm font-frame-mono uppercase tracking-wider transition rounded-none"
            >
              {isSubmitting ? t("app.collaborators.deleting") : t("app.common.delete")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Collaborators() {
  return (
    <ProtectedRoute>
      <CollaboratorsContent />
    </ProtectedRoute>
  );
}
