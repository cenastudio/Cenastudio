/**
 * Team Page — /team
 *
 * Studio plan only. Admin creates team member accounts (name, email, password, role).
 * Credentials are sent manually (WhatsApp/email) to the collaborator.
 */

import { useEffect, useState } from "react";
import AppNavBar from "@/components/AppNavBar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { api } from "@/lib/api";
import {
  Plus, Users, Eye, EyeOff, Trash2, Edit2, Shield, Crown, Clapperboard,
  Video, Check, X, Copy, Loader2, Lock, UserPlus, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

type TeamRole = "producer" | "editor" | "viewer";

interface Member {
  id: number;
  userId: number;
  name: string;
  email: string;
  role: TeamRole;
  status: "active" | "inactive";
  createdAt: string;
}

const ROLES: { id: TeamRole; label: string; icon: typeof Shield; descKey: string }[] = [
  { id: "producer", label: "Producer", icon: Crown, descKey: "app.team.roleProducerDesc" },
  { id: "editor", label: "Editor", icon: Video, descKey: "app.team.roleEditorDesc" },
  { id: "viewer", label: "Viewer", icon: Clapperboard, descKey: "app.team.roleViewerDesc" },
];

function roleIcon(role: TeamRole) {
  const r = ROLES.find((r) => r.id === role);
  if (!r) return <Shield className="w-3.5 h-3.5" />;
  const Icon = r.icon;
  return <Icon className="w-3.5 h-3.5" />;
}

function roleColor(role: TeamRole) {
  if (role === "producer") return "#FFB800";
  if (role === "editor") return "#FF6B00";
  return "#a7a7a7";
}

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function TeamContent() {
  const { user, plan } = useAuth();
  const { t, locale } = useLanguage();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Create form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<TeamRole>("editor");
  const [showPassword, setShowPassword] = useState(false);
  const [credentialsCopied, setCredentialsCopied] = useState(false);

  const isStudio = plan?.planId === "studio";
  const MAX_MEMBERS = 5;
  const canAddMore = members.filter((m) => m.status === "active").length < MAX_MEMBERS;

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const data = await api.team.list();
      setMembers(data as Member[]);
    } catch {
      toast.error(t("app.team.errorLoad") as string);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword(generatePassword());
    setRole("editor");
    setCredentialsCopied(false);
  };

  const openCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      toast.error(t("app.team.errorFillFields") as string);
      return;
    }
    setSubmitting(true);
    try {
      const member = await api.team.create({ name: name.trim(), email: email.trim(), password, role });
      setMembers((prev) => [member as Member, ...prev]);
      setIsCreateOpen(false);
      toast.success((t("app.team.successCreated") as string).replace("{name}", name));
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("app.team.errorCreate") as string);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (member: Member) => {
    const newStatus = member.status === "active" ? "inactive" : "active";
    try {
      await api.team.update(member.id, { status: newStatus });
      setMembers((prev) => prev.map((m) => m.id === member.id ? { ...m, status: newStatus } : m));
      toast.success(newStatus === "active" ? t("app.team.successReactivated") as string : t("app.team.successDeactivated") as string);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("app.team.errorUpdate") as string);
    }
  };

  const handleDelete = async () => {
    if (!memberToDelete) return;
    setSubmitting(true);
    try {
      await api.team.remove(memberToDelete.id);
      setMembers((prev) => prev.filter((m) => m.id !== memberToDelete.id));
      setIsDeleteOpen(false);
      setMemberToDelete(null);
      toast.success(t("app.team.successRemoved") as string);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("app.team.errorRemove") as string);
    } finally {
      setSubmitting(false);
    }
  };

  const copyCredentials = () => {
    const text = `${t("app.team.credentialsTemplate")}\nEmail: ${email}\n${t("app.team.labelTempPassword")}: ${password}\nLogin: https://cenastudio.com.br/login`;
    navigator.clipboard.writeText(text);
    setCredentialsCopied(true);
    toast.success(t("app.team.credentialsCopied") as string);
    setTimeout(() => setCredentialsCopied(false), 3000);
  };

  const activeCount = members.filter((m) => m.status === "active").length;

  return (
    <div className="min-h-screen bg-frame-black text-frame-white font-frame-body flex flex-col">
      <AppNavBar />

      <main id="main-content" className="flex-1 max-w-4xl w-full mx-auto px-6 py-12 md:py-16 space-y-10">

        {/* Header */}
        <div className="border-b border-frame-gray-3/60 pb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="frame-label mb-2">{t("app.team.eyebrow") as string}</p>
            <h1 className="frame-title text-[clamp(2rem,4vw,3.2rem)]">
              {locale === "en" ? <>Studio <em className="not-italic text-transparent [-webkit-text-stroke:1px_rgba(245,240,232,0.85)]">Team</em></> : <>Equipe do <em className="not-italic text-transparent [-webkit-text-stroke:1px_rgba(245,240,232,0.85)]">Estúdio</em></>}
            </h1>
            <p className="text-frame-gray-light text-sm mt-2 max-w-xl">
              {t("app.team.description") as string}
            </p>
          </div>

          {isStudio && canAddMore ? (
            <button type="button" onClick={openCreate} className="frame-btn-primary flex items-center gap-2 shrink-0">
              <UserPlus className="w-4 h-4" />
              {t("app.team.newMember") as string}
            </button>
          ) : isStudio && !canAddMore ? (
            <div className="text-xs font-frame-mono text-amber-400 border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5" />
              {(t("app.team.memberLimitReached") as string).replace("{max}", String(MAX_MEMBERS))}
            </div>
          ) : (
            <div className="text-xs font-frame-mono text-frame-gray-light border border-frame-gray-3 px-3 py-2">
              {t("app.team.availableOnStudio") as string}
            </div>
          )}
        </div>

        {/* Plan info + count */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="glow-card p-4">
            <Users className="w-4 h-4 text-frame-orange mb-2" />
            <p className="font-frame-mono text-[0.6rem] uppercase tracking-[0.14em] text-frame-gray-light">{t("app.team.activeMembers") as string}</p>
            <p className="text-xl font-bold mt-1">{activeCount} <span className="text-sm font-normal text-frame-gray-light">/ {MAX_MEMBERS}</span></p>
          </div>
          <div className="glow-card p-4">
            <Shield className="w-4 h-4 text-frame-orange mb-2" />
            <p className="font-frame-mono text-[0.6rem] uppercase tracking-[0.14em] text-frame-gray-light">{t("app.team.plan") as string}</p>
            <p className="text-sm font-semibold mt-1">{isStudio ? t("app.team.planStudioActive") as string : t("app.team.planStudioRequired") as string}</p>
          </div>
          <div className="glow-card p-4 sm:col-span-1 col-span-2">
            <Lock className="w-4 h-4 text-frame-orange mb-2" />
            <p className="font-frame-mono text-[0.6rem] uppercase tracking-[0.14em] text-frame-gray-light">{t("app.team.access") as string}</p>
            <p className="text-xs text-frame-gray-light mt-1 leading-relaxed">{t("app.team.accessDescription") as string}</p>
          </div>
        </div>

        {/* Members list */}
        {loading ? (
          <div className="liquid-glass p-10 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-frame-orange mx-auto" />
          </div>
        ) : members.length === 0 ? (
          <div className="frame-empty-state p-12 text-center space-y-4">
            <div className="w-14 h-14 mx-auto flex items-center justify-center border border-frame-orange/30 bg-frame-orange/[0.08] rounded-full animate-icon-float">
              <Users className="w-6 h-6 text-frame-orange" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-frame-white">{t("app.team.emptyTitle") as string}</h3>
              <p className="text-sm text-frame-gray-light mt-1">{t("app.team.emptyDescription") as string}</p>
            </div>
            <div className="border-t border-frame-orange/20 pt-4 space-y-1.5 text-left max-w-xs mx-auto">
              <p className="font-frame-mono text-[0.55rem] uppercase tracking-wider text-frame-orange mb-2">{t("app.team.howItWorks") as string}</p>
              <p className="text-[0.65rem] text-frame-gray-light">{t("app.team.howStep1") as string}</p>
              <p className="text-[0.65rem] text-frame-gray-light">{t("app.team.howStep2") as string}</p>
              <p className="text-[0.65rem] text-frame-gray-light">{t("app.team.howStep3") as string}</p>
              <p className="text-[0.65rem] text-frame-gray-light">{t("app.team.howStep4") as string}</p>
            </div>
            {isStudio && (
              <button type="button" onClick={openCreate} className="frame-btn-primary inline-flex items-center gap-2">
                <Plus className="w-4 h-4" />
                {t("app.team.createFirstMember") as string}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className={`liquid-glass p-4 flex items-center gap-4 ${member.status === "inactive" ? "opacity-50" : ""}`}
              >
                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ background: `${roleColor(member.role)}20`, border: `1px solid ${roleColor(member.role)}40`, color: roleColor(member.role) }}
                >
                  {(member.name || member.email).charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-frame-white">{member.name}</span>
                    <span
                      className="inline-flex items-center gap-1 font-frame-mono text-[0.58rem] uppercase tracking-[0.1em] px-1.5 py-0.5 border"
                      style={{ color: roleColor(member.role), borderColor: `${roleColor(member.role)}30`, background: `${roleColor(member.role)}08` }}
                    >
                      {roleIcon(member.role)}
                      {ROLES.find((r) => r.id === member.role)?.label || member.role}
                    </span>
                    {member.status === "inactive" && (
                      <span className="font-frame-mono text-[0.56rem] uppercase text-frame-gray-light border border-frame-gray-3 px-1.5 py-0.5">
                        {t("app.team.inactive") as string}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-frame-gray-light mt-0.5">{member.email}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(member)}
                    className={`p-2 transition rounded ${member.status === "active" ? "text-frame-gray-light hover:text-amber-400" : "text-frame-gray-light hover:text-frame-green"}`}
                    title={member.status === "active" ? t("app.team.deactivate") as string : t("app.team.reactivate") as string}
                  >
                    {member.status === "active" ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMemberToDelete(member); setIsDeleteOpen(true); }}
                    className="p-2 text-frame-gray-light hover:text-frame-red transition"
                    title={t("app.team.remove") as string}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* CREATE MODAL */}
      <Dialog open={isCreateOpen} onOpenChange={(open) => !open && setIsCreateOpen(false)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="frame-title text-2xl">{t("app.team.createModalTitle") as string}</DialogTitle>
            <DialogDescription className="text-frame-gray-light text-sm">
              {t("app.team.createModalDescription") as string}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-5 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="space-y-1.5">
                <span className="frame-label text-frame-gray-light">{t("app.team.labelName") as string}</span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="frame-input w-full"
                  placeholder="João Editor"
                />
              </label>
              <label className="space-y-1.5">
                <span className="frame-label text-frame-gray-light">{t("app.team.labelEmail") as string}</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="frame-input w-full"
                  placeholder="joao@email.com"
                />
              </label>
            </div>

            {/* Role selector */}
            <div className="space-y-2">
              <span className="frame-label text-frame-gray-light">{t("app.team.labelRole") as string}</span>
              <div className="grid grid-cols-3 gap-2">
                {ROLES.map((r) => {
                  const Icon = r.icon;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRole(r.id)}
                      className="flex flex-col items-center gap-2 p-3 transition-all border rounded-lg text-center"
                      style={{
                        borderColor: role === r.id ? roleColor(r.id) : "rgba(255,255,255,0.08)",
                        background: role === r.id ? `${roleColor(r.id)}10` : "rgba(255,255,255,0.02)",
                      }}
                    >
                      <Icon className="w-4 h-4" style={{ color: role === r.id ? roleColor(r.id) : "#a7a7a7" }} />
                      <span className="font-frame-mono text-[0.62rem] uppercase" style={{ color: role === r.id ? roleColor(r.id) : "#a7a7a7" }}>
                        {r.label}
                      </span>
                      <span className="text-[0.6rem] text-frame-gray-light leading-tight">{t(r.descKey) as string}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="frame-label text-frame-gray-light">{t("app.team.labelTempPassword") as string}</span>
                <button
                  type="button"
                  onClick={() => setPassword(generatePassword())}
                  className="font-frame-mono text-[0.6rem] text-frame-orange hover:text-frame-white transition"
                >
                  {t("app.team.generateNew") as string}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-frame-gray-light" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="frame-input w-full pl-10 pr-24 font-frame-mono"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="p-1.5 text-frame-gray-light hover:text-frame-white transition">
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button type="button" onClick={copyCredentials} className="p-1.5 text-frame-orange hover:text-frame-white transition">
                    {credentialsCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <p className="text-[0.65rem] text-frame-gray-light font-frame-mono">
                {t("app.team.copyHint") as string}
              </p>
            </div>

            <DialogFooter className="gap-2 pt-2 border-t border-frame-gray-3/40">
              <button type="button" onClick={() => setIsCreateOpen(false)} className="frame-btn-ghost text-xs py-2 px-4">
                {t("app.team.cancel") as string}
              </button>
              <button
                type="submit"
                disabled={submitting || !name.trim() || !email.trim() || !password}
                className="frame-btn-primary flex items-center gap-2 text-xs py-2 px-4"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                {submitting ? t("app.team.creating") as string : t("app.team.createMember") as string}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION */}
      <Dialog open={isDeleteOpen} onOpenChange={(open) => !open && setIsDeleteOpen(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{t("app.team.deleteTitle") as string}</DialogTitle>
            <DialogDescription>
              <strong>{memberToDelete?.name}</strong> {t("app.team.deleteDescription") as string}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-4">
            <button type="button" onClick={() => setIsDeleteOpen(false)} className="frame-btn-ghost text-xs py-2 px-4">
              {t("app.team.cancel") as string}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={submitting}
              className="frame-btn-primary bg-frame-red text-white text-xs py-2 px-4 flex items-center gap-2"
              style={{ background: "#ff3b3b" }}
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              {t("app.team.remove") as string}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Team() {
  return (
    <ProtectedRoute>
      <TeamContent />
    </ProtectedRoute>
  );
}
