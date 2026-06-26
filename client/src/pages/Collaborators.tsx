import { useEffect, useState } from "react";
import AppNavBar from "@/components/AppNavBar";
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
  Filter,
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
  { id: "admin", label: "Administrador" },
  { id: "editor", label: "Editor" },
  { id: "camera", label: "Cinegrafista" },
  { id: "director", label: "Diretor" },
  { id: "producer", label: "Produtor" },
  { id: "member", label: "Membro" },
];

const STATUS = [
  { id: "active", label: "Ativo" },
  { id: "inactive", label: "Inativo" },
  { id: "pending", label: "Pendente" },
];

function CollaboratorsContent() {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [stats, setStats] = useState<CollaboratorStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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

  useEffect(() => {
    loadCollaborators();
    loadStats();
  }, []);

  const loadCollaborators = async () => {
    try {
      const response = await fetch("/api/collaborators", { credentials: "include" });
      const data = await response.json();
      if (data.success) {
        setCollaborators(data.data);
      }
    } catch (error) {
      console.error("Error loading collaborators:", error);
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
        toast.success("Colaborador adicionado com sucesso!");
        setIsCreateOpen(false);
        resetForm();
        loadCollaborators();
        loadStats();
      } else {
        toast.error(data.error || "Erro ao adicionar colaborador");
      }
    } catch (error) {
      toast.error("Erro ao adicionar colaborador");
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
        toast.success("Colaborador atualizado com sucesso!");
        setIsEditOpen(false);
        resetForm();
        loadCollaborators();
        loadStats();
      } else {
        toast.error(data.error || "Erro ao atualizar colaborador");
      }
    } catch (error) {
      toast.error("Erro ao atualizar colaborador");
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
        toast.success("Colaborador excluído com sucesso!");
        setIsDeleteOpen(false);
        setSelectedCollaborator(null);
        loadCollaborators();
        loadStats();
      } else {
        toast.error(data.error || "Erro ao excluir colaborador");
      }
    } catch (error) {
      toast.error("Erro ao excluir colaborador");
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

  return (
    <div className="min-h-screen bg-frame-black text-frame-white font-frame-body flex flex-col">
      <AppNavBar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p className="frame-label mb-2">// EQUIPE</p>
            <h1 className="frame-title text-[clamp(2.1rem,4vw,3.5rem)]">
              COLABORADORES
            </h1>
            <p className="text-frame-gray-light text-sm mt-2">
              Gerencie sua equipe de profissionais
            </p>
          </div>

          <button
            onClick={() => {
              resetForm();
              setIsCreateOpen(true);
            }}
            className="frame-btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo Colaborador
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-frame-gray-3 bg-frame-gray-1/30 p-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-frame-orange/10 rounded-lg">
                  <Users className="w-5 h-5 text-frame-orange" />
                </div>
                <div>
                  <p className="text-[0.65rem] text-frame-gray-light font-frame-mono uppercase tracking-wider">
                    Total Colaboradores
                  </p>
                  <p className="text-2xl font-bold">{stats.totalCollaborators}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="border border-frame-gray-3 bg-frame-gray-1/30 p-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <User className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-[0.65rem] text-frame-gray-light font-frame-mono uppercase tracking-wider">
                    Ativos
                  </p>
                  <p className="text-2xl font-bold">{stats.activeCollaborators}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="border border-frame-gray-3 bg-frame-gray-1/30 p-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Shield className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-[0.65rem] text-frame-gray-light font-frame-mono uppercase tracking-wider">
                    Projetos
                  </p>
                  <p className="text-2xl font-bold">{stats.totalProjects}</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-4 border border-frame-gray-3 bg-frame-gray-1/10 p-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-frame-orange" />
            <span className="font-frame-mono text-xs uppercase tracking-wider">Filtros:</span>
          </div>

          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-sm outline-none focus:border-frame-orange rounded-none"
          >
            <option value="">Todos os cargos</option>
            {ROLES.map((role) => (
              <option key={role.id} value={role.id}>
                {role.label}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-sm outline-none focus:border-frame-orange rounded-none"
          >
            <option value="">Todos os status</option>
            {STATUS.map((status) => (
              <option key={status.id} value={status.id}>
                {status.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setFilterRole("");
              setFilterStatus("");
            }}
            className="frame-btn-ghost text-xs"
          >
            Limpar Filtros
          </button>
        </div>

        {/* Collaborators List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-frame-orange" />
          </div>
        ) : getFilteredCollaborators().length === 0 ? (
          <EmptyState icon={Users} title="Nenhum colaborador encontrado" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getFilteredCollaborators().map((collaborator) => (
              (() => {
                const dayRate = collaborator.daily_rate ?? collaborator.hourly_rate ?? 0;
                return (
              <motion.div
                key={collaborator.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-frame-gray-3 bg-frame-gray-1/10 p-4 hover:border-frame-orange/50 transition group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-frame-gray-2 rounded-lg">
                      <User className="w-6 h-6 text-frame-orange" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-frame-white">
                        {collaborator.name}
                      </h3>
                      <p className="text-xs text-frame-gray-light">
                        {ROLES.find((r) => r.id === collaborator.role)?.label}
                      </p>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1 hover:bg-frame-gray-3 transition rounded-none opacity-0 group-hover:opacity-100">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-frame-black border-frame-gray-3">
                      <DropdownMenuItem
                        onClick={() => openEditModal(collaborator)}
                        className="cursor-pointer"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedCollaborator(collaborator);
                          setIsDeleteOpen(true);
                        }}
                        className="cursor-pointer text-frame-red"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir
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
                      <span>{formatCurrency(dayRate)}/diária</span>
                    </div>
                  )}

                  {collaborator.skills && (
                    <div className="text-frame-gray-light mt-2">
                      <span className="font-frame-mono uppercase tracking-wider text-[0.6rem]">
                        Skills:
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
                      {STATUS.find((s) => s.id === collaborator.status)?.label}
                    </span>
                    <span className="text-frame-gray-light">
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
            <DialogTitle className="frame-title text-2xl">NOVO COLABORADOR</DialogTitle>
            <DialogDescription className="text-frame-gray-light text-sm">
              Adicione um novo membro à equipe
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="block font-frame-mono text-xs text-frame-orange uppercase">
                Nome *
              </label>
              <input
                type="text"
                required
                disabled={isSubmitting}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-sm outline-none focus:border-frame-orange rounded-none"
                placeholder="Nome completo"
              />
            </div>

            <div className="space-y-2">
              <label className="block font-frame-mono text-xs text-frame-orange uppercase">
                Email *
              </label>
              <input
                type="email"
                required
                disabled={isSubmitting}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-sm outline-none focus:border-frame-orange rounded-none"
                placeholder="email@exemplo.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block font-frame-mono text-xs text-frame-orange uppercase">
                  Cargo
                </label>
                <select
                  disabled={isSubmitting}
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-sm outline-none focus:border-frame-orange rounded-none"
                >
                  {ROLES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block font-frame-mono text-xs text-frame-orange uppercase">
                  Taxa Hora
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
                Telefone
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
                Skills
              </label>
              <input
                type="text"
                disabled={isSubmitting}
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                className="w-full bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-sm outline-none focus:border-frame-orange rounded-none"
                placeholder="Edição, Câmera, Design, etc."
              />
            </div>

            <DialogFooter className="gap-2 pt-4 border-t border-frame-gray-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsCreateOpen(false)}
                className="frame-btn-ghost"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !name.trim() || !email.trim()}
                className="frame-btn-primary"
              >
                {isSubmitting ? "Adicionando..." : "Adicionar Colaborador"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-frame-black border-frame-gray-3 text-frame-white max-w-md rounded-none p-6">
          <DialogHeader>
            <DialogTitle className="frame-title text-2xl">EDITAR COLABORADOR</DialogTitle>
            <DialogDescription className="text-frame-gray-light text-sm">
              Atualize as informações do colaborador
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdate} className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="block font-frame-mono text-xs text-frame-orange uppercase">
                Nome *
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
                Email *
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
                  Cargo
                </label>
                <select
                  disabled={isSubmitting}
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-sm outline-none focus:border-frame-orange rounded-none"
                >
                  {ROLES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block font-frame-mono text-xs text-frame-orange uppercase">
                  Status
                </label>
                <select
                  disabled={isSubmitting}
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-sm outline-none focus:border-frame-orange rounded-none"
                >
                  {STATUS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block font-frame-mono text-xs text-frame-orange uppercase">
                  Taxa Hora
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
                  Telefone
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
                Skills
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
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !name.trim() || !email.trim()}
                className="frame-btn-primary"
              >
                {isSubmitting ? "Atualizando..." : "Atualizar Colaborador"}
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
              EXCLUIR COLABORADOR?
            </DialogTitle>
            <DialogDescription className="text-frame-gray-light text-sm">
              Esta ação é permanente e removerá o colaborador de todos os projetos.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 pt-4 border-t border-frame-gray-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsDeleteOpen(false)}
              className="frame-btn-ghost"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleDelete}
              className="bg-frame-red hover:bg-red-600 text-white px-4 py-2 text-sm font-frame-mono uppercase tracking-wider transition rounded-none"
            >
              {isSubmitting ? "Excluindo..." : "Excluir"}
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
