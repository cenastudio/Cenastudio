import AppNavBar from "@/components/AppNavBar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useVisualPreferences } from "@/contexts/VisualPreferencesContext";
import { useBehaviorPreferences } from "@/contexts/BehaviorPreferencesContext";
import { CHECKOUT_MODAL_PLAN, planDisplayLabel } from "@/lib/plans";
import { useApp } from "@/contexts/AppContext";
import { api, openBillingPortal, ApiError, type UserDataStats, type UserUsageMetrics } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { WHATSAPP_NUMBER } from "@/lib/constants";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { SITE_CONFIG } from "@shared/site";
import { hexToRgba } from "@shared/color";
import { WebhooksContent } from "@/pages/Webhooks";
import { FeatureUpgradeRequired } from "@/components/FeatureUpgradeRequired";
import { useEffect, useState, useRef } from "react";
import {
  CalendarClock, Crown, LogOut, ShieldCheck, UserRound, Zap, Settings,
  Users, Save, Building2, Phone, MessageCircle, Bug, Megaphone, ExternalLink,
  Lock, Eye, EyeOff, KeyRound, Check, Globe, Bell, Clock, Camera, Upload,
  FileText, Trash2, Download, Shield, Smartphone, Monitor, MapPin,
  Mail, CreditCard, Receipt, TrendingUp, ChevronRight, AlertTriangle, X,
  Palette, Languages, Sparkles, Key, QrCode, Copy, RefreshCw, Activity,
  AlertCircle, CheckCircle2, Layout, Grid, List, Play, PlayCircle,
  SortAsc, Image, Film, Calendar, Sliders, Database, BarChart3,
  UserCheck, Search, Share2, FileCheck, Webhook
} from "lucide-react";

// Referral types
interface ReferralStats {
  totalReferrals: number;
  convertedReferrals: number;
  pendingReferrals: number;
  totalRewards: number;
  nextRewardProgress: {
    current: number;
    target: number;
    percentage: number;
    rewardType: string;
  };
}

interface ReferralInfo {
  code: string;
  url: string;
  stats: ReferralStats;
}

type ProfileTab = "profile" | "security" | "integrations" | "plan" | "preferences" | "privacy";
type BillingHistory = Awaited<ReturnType<typeof api.checkout.invoices>>;

function formatBillingAmount(amountInCents: number, currency: string, locale: "pt" | "en") {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "pt-BR", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountInCents / 100);
}

function openStripeInvoice(url: string) {
  const parsed = new URL(url);
  const trustedHost = parsed.hostname === "stripe.com" || parsed.hostname.endsWith(".stripe.com");
  if (parsed.protocol !== "https:" || !trustedHost) {
    throw new Error("URL de fatura inválida.");
  }
  window.open(parsed.toString(), "_blank", "noopener,noreferrer");
}

function formatDate(value: string | null | undefined, noDateLabel: string, locale?: "pt" | "en") {
  if (!value) return noDateLabel;
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string | null | undefined, locale?: "pt" | "en") {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

// Tab button component
function TabButton({ active, onClick, icon: Icon, label }: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all rounded-lg min-h-11 shrink-0 whitespace-nowrap ${
        active
          ? "bg-frame-orange/15 text-frame-orange border border-frame-orange/30"
          : "text-frame-gray-light hover:text-frame-white hover:bg-frame-gray-2/50"
      }`}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </button>
  );
}

// Avatar upload component
function AvatarUpload({ currentChar, onUpload, avatarUrl }: {
  currentChar: string;
  onUpload: (file: File) => void;
  avatarUrl?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(avatarUrl || null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      onUpload(file);
    }
  };

  return (
    <div className="relative group">
      <div className="w-20 h-20 rounded-full overflow-hidden bg-frame-orange text-frame-black flex items-center justify-center text-2xl font-bold shadow-lg shadow-frame-orange/20">
        {preview ? (
          <img src={preview} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          currentChar
        )}
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
      >
        <Camera className="w-5 h-5 text-white" />
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}


// Usage progress bar with enhanced visuals
function UsageBar({ used, total, label, warningThreshold = 80 }: {
  used: number;
  total: number;
  label: string;
  warningThreshold?: number;
}) {
  const { t } = useLanguage();
  const percentage = total === -1 ? 100 : Math.min((used / total) * 100, 100);
  const isUnlimited = total === -1;
  const isWarning = percentage >= warningThreshold && !isUnlimited;
  const isCritical = percentage >= 95 && !isUnlimited;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-xs">
        <span className="text-frame-gray-light">{label}</span>
        <div className="flex items-center gap-2">
          <span className={`font-mono font-bold ${
            isCritical ? "text-frame-red" :
            isWarning ? "text-frame-orange" :
            isUnlimited ? "text-frame-green" : "text-frame-white"
          }`}>
            {isUnlimited ? "∞" : `${used}/${total}`}
          </span>
          {isCritical && <AlertTriangle className="w-3 h-3 text-frame-red" />}
          {isWarning && !isCritical && <AlertTriangle className="w-3 h-3 text-frame-orange" />}
        </div>
      </div>
      <div className="h-2.5 bg-frame-gray-2 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 rounded-full ${
            isUnlimited
              ? "bg-gradient-to-r from-frame-green via-frame-green to-frame-green/80 w-full animate-pulse"
              : isCritical
              ? "bg-gradient-to-r from-frame-red to-frame-red/60"
              : isWarning
              ? "bg-gradient-to-r from-frame-orange to-frame-gold"
              : "bg-gradient-to-r from-frame-orange to-frame-orange/80"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {isWarning && !isUnlimited && (
        <p className={`text-[0.65rem] ${isCritical ? "text-frame-red" : "text-frame-orange"} flex items-center gap-1`}>
          {isCritical ? (
            <>⚠️ Limite quase atingido! {total - used} restantes</>
          ) : (
            <>⚡ {Math.round(100 - percentage)}% restante</>
          )}
        </p>
      )}
    </div>
  );
}

// Session card
function SessionCard({ device, ipAddress, lastActive, current, onRevoke, revoking }: {
  device: string;
  ipAddress?: string | null;
  lastActive: string;
  current?: boolean;
  onRevoke?: () => void;
  revoking?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <div className={`glow-card p-4 ${current ? "border-frame-green/40" : ""}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {device.toLowerCase().includes("ios") || device.toLowerCase().includes("android") ? (
            <Smartphone className="w-5 h-5 text-frame-orange" />
          ) : (
            <Monitor className="w-5 h-5 text-frame-orange" />
          )}
          <div>
            <p className="text-sm font-medium text-frame-white">{device}</p>
            {ipAddress && (
              <p className="text-xs text-frame-gray-light flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {ipAddress}
              </p>
            )}
          </div>
        </div>
        {current ? (
          <span className="text-[0.6rem] font-mono uppercase tracking-wider text-frame-green bg-frame-green/10 px-2 py-1 rounded">
            {t("app.profile.currentSession")}
          </span>
        ) : (
          <button
            type="button"
            onClick={onRevoke}
            disabled={revoking}
            className="text-frame-red/70 hover:text-frame-red text-xs disabled:opacity-50"
          >
            {revoking ? "..." : t("app.profile.endSession")}
          </button>
        )}
      </div>
      <p className="text-[0.65rem] text-frame-gray-light mt-2">{t("app.profile.lastAccess")} {lastActive}</p>
    </div>
  );
}


function ProfileContent() {
  const { t, locale, setLocale } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { user, plan, logout, refresh } = useAuth();
  const { openModal, selectPlan } = useApp();
  const [, setLocation] = useLocation();

  // Tab state
  const [activeTab, setActiveTab] = useState<ProfileTab>("profile");

  // Profile form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);

  // Preferences state (básicas - já existiam)
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);

  // FASE 4: Preferências Avançadas
  // 1. Notificações Granulares
  const [notificationPrefs, setNotificationPrefs] = useState({
    newComments: true,
    clientUploads: true,
    projectDeadlines: true,
    weeklyNewsletter: false,
    mentions: true,
    newProjects: false,
    reviewApproved: true,
    paymentSuccess: true,
  });

  // 2. Regionalização
  const [dateFormat, setDateFormat] = useState<"DD/MM/YYYY" | "MM/DD/YYYY">("DD/MM/YYYY");
  const [currency, setCurrency] = useState<"BRL" | "USD" | "EUR">("BRL");

  // Handlers para atualizar preferências regionais automaticamente
  const handleTimezoneChange = async (newTimezone: string) => {
    setTimezone(newTimezone);

    try {
      await api.auth.updateRegionalPreferences({
        locale,
        timezone: newTimezone,
        dateFormat,
        currency,
      });
      toast.success("Fuso horário atualizado");
    } catch (error) {
      toast.error("Erro ao salvar fuso horário");
      setTimezone(timezone); // Reverter
    }
  };

  const handleDateFormatChange = async (newFormat: "DD/MM/YYYY" | "MM/DD/YYYY") => {
    setDateFormat(newFormat);

    try {
      await api.auth.updateRegionalPreferences({
        locale,
        timezone,
        dateFormat: newFormat,
        currency,
      });
      toast.success("Formato de data atualizado");
    } catch (error) {
      toast.error("Erro ao salvar formato");
      setDateFormat(dateFormat); // Reverter
    }
  };

  const handleCurrencyChange = async (newCurrency: "BRL" | "USD" | "EUR") => {
    setCurrency(newCurrency);

    try {
      await api.auth.updateRegionalPreferences({
        locale,
        timezone,
        dateFormat,
        currency: newCurrency,
      });
      toast.success("Moeda atualizada");
    } catch (error) {
      toast.error("Erro ao salvar moeda");
      setCurrency(currency); // Reverter
    }
  };

  // 3. Preferências Visuais
  const { preferences: visualPrefs, updatePreference: updateVisualPref } = useVisualPreferences();

  // 4. Comportamentos Padrão
  const { preferences: behaviorPrefs, updatePreference: updateBehaviorPref } = useBehaviorPreferences();

  // Privacy state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [submittingDeleteRequest, setSubmittingDeleteRequest] = useState(false);
  const deleteConfirmationPhrase = locale === "en" ? "DELETE MY ACCOUNT" : "EXCLUIR MINHA CONTA";

  // Métricas reais, sempre carregadas do backend com escopo no usuário autenticado.
  const [dataStats, setDataStats] = useState<UserDataStats | null>(null);
  const [dataStatsLoading, setDataStatsLoading] = useState(false);
  const [dataStatsError, setDataStatsError] = useState(false);
  const [usageMetrics, setUsageMetrics] = useState<UserUsageMetrics | null>(null);
  const [usageMetricsLoading, setUsageMetricsLoading] = useState(false);
  const [usageMetricsError, setUsageMetricsError] = useState(false);
  const [billingHistory, setBillingHistory] = useState<BillingHistory | null>(null);
  const [billingHistoryLoading, setBillingHistoryLoading] = useState(false);
  const [billingHistoryError, setBillingHistoryError] = useState(false);

  // 2. Controles de Privacidade
  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: "team" as "public" | "team" | "private",
    allowSearchEngineIndexing: true,
    shareAnalyticsWithTeam: true,
  });

  // 3. Solicitações LGPD
  const [showLgpdRequest, setShowLgpdRequest] = useState(false);
  const [lgpdRequestType, setLgpdRequestType] = useState<"copy" | "correct" | "delete" | null>(null);
  const [lgpdRequestHistory, setLgpdRequestHistory] = useState<Array<{
    id: string;
    type: string;
    status: string;
    createdAt: string;
    processedAt: string | null;
  }>>([]);

  // Security Advanced states (FASE 3)
  // 1. 2FA
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [twoFactorSecret, setTwoFactorSecret] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [enabling2FA, setEnabling2FA] = useState(false);

  // 2. API Keys
  const [apiKeys, setApiKeys] = useState<Array<{ id: string; name: string; key: string; createdAt: string; lastUsed: string | null }>>([]);
  const [showNewApiKey, setShowNewApiKey] = useState(false);
  const [newApiKeyName, setNewApiKeyName] = useState("");
  const [creatingApiKey, setCreatingApiKey] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);

  // 3. Activity Log
  const [activityLog, setActivityLog] = useState<Array<{
    id: number;
    action: string;
    ipAddress: string | null;
    location: string | null;
    timestamp: string;
    suspicious: boolean;
  }>>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // 4. Security Alerts
  const [securityAlerts, setSecurityAlerts] = useState({
    emailOnNewLogin: true,
    emailOnPasswordChange: true,
    emailOnNewDevice: true,
  });

  // Referral Program state
  const [referralInfo, setReferralInfo] = useState<ReferralInfo | null>(null);
  const [loadingReferral, setLoadingReferral] = useState(true);
  const [referralList, setReferralList] = useState<Array<{
    id: number;
    status: string;
    conversionDate: string | null;
    referredUser: { email: string; name: string | null; createdAt: string } | null;
  }>>([]);

  useEffect(() => {
    const loadReferralData = async () => {
      try {
        const response = await fetch("/api/referrals/my-code", { credentials: "include" });
        const data = await response.json();
        if (data.success) {
          setReferralInfo(data.data);
        }
      } catch (error) {
        console.error("Failed to load referral data:", error);
      } finally {
        setLoadingReferral(false);
      }
    };

    loadReferralData();

    fetch("/api/referrals/list", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setReferralList(data.data);
      })
      .catch(() => console.error("Failed to load referral list"));
  }, []);

  useEffect(() => {
    setName(user?.name || "");
    setPhone(user?.phone || "");
    setTwoFactorEnabled(user?.twoFactorEnabled || false);
  }, [user]);

  const planLabel = plan
    ? planDisplayLabel(plan.planId, plan.planName, plan.status, plan.trialEndsAt)
    : t("app.errors.planNotLoaded");

  const handlePlanAction = async () => {
    if (!plan || plan.planId === "free" || plan.status === "trial") {
      selectPlan(CHECKOUT_MODAL_PLAN);
      openModal("checkout");
      return;
    }
    try {
      await openBillingPortal();
    } catch (error) {
      const msg = error instanceof ApiError ? error.message : error instanceof Error ? error.message : t("app.errors.openPortal");
      toast.error(msg);
    }
  };

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };


  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await api.auth.updateProfile({ name, phone });
      await refresh();
      toast.success(t("app.profile.profileUpdated"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("app.errors.updateProfile"));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error(t("app.profile.toastPasswordEmpty"));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t("app.profile.toastPasswordMismatch"));
      return;
    }
    if (newPassword.length < 6) {
      toast.error(t("app.profile.toastPasswordMin"));
      return;
    }

    setSavingPassword(true);
    try {
      await api.auth.changePassword(currentPassword, newPassword);
      toast.success(t("app.profile.toastPasswordSuccess"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordChanged(true);
      setTimeout(() => setPasswordChanged(false), 3000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("app.profile.toastPasswordError"));
    } finally {
      setSavingPassword(false);
    }
  };

  const handleAvatarUpload = (file: File) => {
    setAvatarFile(file);
    toast.success(t("app.profile.toastAvatarSelected"));
  };

  const handleExportData = async () => {
    toast.loading(t("app.profile.toastExporting"), { id: "export-data" });
    try {
      const response = await api.auth.exportData();
      if (!response.ok) throw new Error("Erro ao exportar dados");

      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `cenastudio-dados-${new Date().toISOString().slice(0, 10)}.json`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match) filename = match[1];
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(t("app.profile.toastExportSuccess"), { id: "export-data", description: `Arquivo ${filename} baixado.` });
    } catch (error) {
      toast.error(t("app.profile.toastExportError"), { id: "export-data" });
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== deleteConfirmationPhrase) {
      toast.error(t("app.profile.toastDeleteConfirmError"));
      return;
    }
    if (lgpdRequestHistory.some((request) => request.type === "delete" && request.status === "pending")) {
      toast.info(locale === "en" ? "An account deletion request is already pending." : "Já existe uma solicitação de exclusão pendente.");
      setShowDeleteConfirm(false);
      setDeleteConfirmText("");
      return;
    }

    setSubmittingDeleteRequest(true);
    try {
      const result = await api.auth.createLgpdRequest("delete");
      const history = await api.auth.listLgpdRequests();
      setLgpdRequestHistory(history.requests);
      toast.success(
        locale === "en"
          ? `Deletion request submitted. Protocol: ${result.requestId}.`
          : `Solicitação de exclusão enviada. Protocolo: ${result.requestId}.`,
        { duration: 6000 },
      );
      setShowDeleteConfirm(false);
      setDeleteConfirmText("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (locale === "en" ? "Could not submit deletion request." : "Não foi possível enviar a solicitação de exclusão."));
    } finally {
      setSubmittingDeleteRequest(false);
    }
  };

  const avatarChar = (user?.name ?? user?.email ?? "U").charAt(0).toUpperCase();

  // Real sessions, loaded from the API — replaces the previous hardcoded mock.
  const [sessions, setSessions] = useState<
    Array<{ id: number; deviceLabel: string; ipAddress: string | null; lastActiveAt: string; current: boolean }>
  >([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<number | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  const loadSessions = () => {
    setSessionsLoading(true);
    api.sessions
      .list()
      .then(setSessions)
      .catch(() => {
        // Non-critical: profile page still works without the session list.
      })
      .finally(() => setSessionsLoading(false));
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleRevokeSession = async (sessionId: number) => {
    setRevokingId(sessionId);
    try {
      await api.sessions.revoke(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toast.success(t("app.profile.sessionEnded"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("app.profile.sessionEndError"));
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeAllOthers = async () => {
    setRevokingAll(true);
    try {
      await api.sessions.revokeOthers();
      setSessions((prev) => prev.filter((s) => s.current));
      toast.success(t("app.profile.allSessionsEnded"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("app.profile.sessionEndError"));
    } finally {
      setRevokingAll(false);
    }
  };

  // ─── FASE 3: SECURITY ADVANCED HANDLERS ───

  // 2FA Setup
  const handleEnable2FA = async () => {
    setEnabling2FA(true);
    try {
      const result = await api.auth.setup2FA();

      setQrCode(result.qrCode);
      setTwoFactorSecret(result.secret);
      setBackupCodes(result.backupCodes);
      setShow2FASetup(true);
      toast.success("QR Code gerado! Configure no Google Authenticator");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao gerar QR Code");
    } finally {
      setEnabling2FA(false);
    }
  };

  const handleConfirm2FA = async () => {
    if (!twoFactorCode || twoFactorCode.length !== 6) {
      toast.error("Digite o código de 6 dígitos");
      return;
    }
    try {
      await api.auth.verify2FA(twoFactorCode);

      setTwoFactorEnabled(true);
      setShow2FASetup(false);
      setTwoFactorCode("");
      toast.success("2FA ativado com sucesso! ✓");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Código inválido");
    }
  };

  const handleDisable2FA = async () => {
    try {
      await api.auth.disable2FA();

      setTwoFactorEnabled(false);
      setShow2FASetup(false);
      setQrCode(null);
      setBackupCodes([]);
      toast.success("2FA desativado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao desativar 2FA");
    }
  };

  // API Keys
  const handleCreateApiKey = async () => {
    if (!newApiKeyName.trim()) {
      toast.error("Digite um nome para a chave");
      return;
    }
    setCreatingApiKey(true);
    try {
      const result = await api.auth.createApiKey(newApiKeyName.trim());

      setApiKeys((prev) => [...prev, {
        id: result.id,
        name: result.name,
        key: result.key,
        createdAt: result.createdAt,
        lastUsed: null,
      }]);
      setNewlyCreatedKey(result.key);
      setNewApiKeyName("");
      setShowNewApiKey(false);
      toast.success("Chave API criada! Copie agora, não será exibida novamente");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar chave");
    } finally {
      setCreatingApiKey(false);
    }
  };

  const handleRevokeApiKey = async (id: string) => {
    try {
      await api.auth.revokeApiKey(id);

      setApiKeys((prev) => prev.filter((k) => k.id !== id));
      toast.success("Chave revogada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao revogar chave");
    }
  };

  const handleCopyApiKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("Chave copiada!");
  };

  // Activity Log
  const loadActivityLog = async () => {
    setLoadingActivity(true);
    try {
      const result = await api.auth.getActivityLog(50, 30);
      setActivityLog(result.activities);
    } catch (error) {
      toast.error("Erro ao carregar log");
    } finally {
      setLoadingActivity(false);
    }
  };

  useEffect(() => {
    if (activeTab === "security") {
      loadActivityLog();

      // Carregar security alerts automaticamente
      api.auth.getSecurityAlerts().then(setSecurityAlerts).catch(() => {
        console.error("Erro ao carregar security alerts");
      });

      // Carregar API Keys existentes (chaves criadas em sessões anteriores)
      api.auth.listApiKeys().then((res) => {
        setApiKeys(
          res.keys.map((k) => ({
            id: k.id,
            name: k.name,
            key: k.keyPrefix,
            createdAt: k.createdAt,
            lastUsed: k.lastUsed,
          })),
        );
      }).catch(() => {
        console.error("Erro ao carregar API keys");
      });
    }
  }, [activeTab]);

  // Carregar métricas e faturamento reais quando entrar na aba Plano.
  useEffect(() => {
    if (activeTab !== "plan") return;
    let cancelled = false;

    setUsageMetricsLoading(true);
    setUsageMetricsError(false);
    api.auth.getUsageMetrics()
      .then((metrics) => { if (!cancelled) setUsageMetrics(metrics); })
      .catch(() => {
        if (!cancelled) {
          setUsageMetrics(null);
          setUsageMetricsError(true);
          toast.error("Erro ao carregar métricas de uso");
        }
      })
      .finally(() => { if (!cancelled) setUsageMetricsLoading(false); });

    setBillingHistoryLoading(true);
    setBillingHistoryError(false);
    api.checkout.invoices()
      .then((history) => { if (!cancelled) setBillingHistory(history); })
      .catch(() => {
        if (!cancelled) {
          setBillingHistory(null);
          setBillingHistoryError(true);
          toast.error("Erro ao confirmar histórico de cobranças");
        }
      })
      .finally(() => { if (!cancelled) setBillingHistoryLoading(false); });

    return () => { cancelled = true; };
  }, [activeTab]);

  // Carregar dados LGPD quando entrar na aba Privacy
  useEffect(() => {
    if (activeTab === "privacy") {
      setDataStatsLoading(true);
      setDataStatsError(false);
      api.auth.getDataStats()
        .then(setDataStats)
        .catch(() => {
          setDataStats(null);
          setDataStatsError(true);
          toast.error("Erro ao carregar estatísticas de dados");
        })
        .finally(() => setDataStatsLoading(false));

      // Carregar configurações de privacidade
      api.auth.getPrivacySettings().then(setPrivacySettings).catch(() => {
        toast.error("Erro ao carregar configurações de privacidade");
      });

      // Carregar histórico de solicitações LGPD
      api.auth.listLgpdRequests().then((res) => {
        setLgpdRequestHistory(res.requests);
      }).catch(() => {
        console.error("Erro ao carregar histórico LGPD");
      });
    }
  }, [activeTab]);

  // Carregar preferências avançadas quando entrar na aba Preferences
  useEffect(() => {
    if (activeTab === "preferences") {
      // Carregar preferências de notificações
      api.auth.getNotificationPreferences().then(setNotificationPrefs).catch(() => {
        console.error("Erro ao carregar preferências de notificação");
      });

      // Carregar preferências regionais
      api.auth.getRegionalPreferences().then((data) => {
        setTimezone(data.timezone);
        setDateFormat(data.dateFormat);
        setCurrency(data.currency);
      }).catch(() => {
        console.error("Erro ao carregar preferências regionais");
      });

      // Preferências visuais e comportamentais são carregadas pelos contextos globais.
    }
  }, [activeTab]);

  // Security Alerts
  const handleToggleAlert = async (key: keyof typeof securityAlerts) => {
    const newAlerts = { ...securityAlerts, [key]: !securityAlerts[key] };
    setSecurityAlerts(newAlerts);

    try {
      await api.auth.updateSecurityAlerts(newAlerts);
      toast.success("Preferência salva");
    } catch (error) {
      toast.error("Erro ao salvar");
      // Reverter em caso de erro
      setSecurityAlerts(securityAlerts);
    }
  };

  // ─── FASE 4: PREFERENCES ADVANCED HANDLERS ───

  // Notificações Granulares
  const handleToggleNotification = async (key: keyof typeof notificationPrefs) => {
    const newPrefs = { ...notificationPrefs, [key]: !notificationPrefs[key] };
    setNotificationPrefs(newPrefs);

    try {
      await api.auth.updateNotificationPreferences(newPrefs);
      toast.success("Notificação atualizada");
    } catch (error) {
      toast.error("Erro ao salvar");
      // Reverter em caso de erro
      setNotificationPrefs(notificationPrefs);
    }
  };

  // Preferências Visuais - USANDO O CONTEXTO QUE FUNCIONA
  const handleThemeModeChange = async (mode: "dark" | "light" | "auto") => {
    try {
      await updateVisualPref("themeMode", mode);
      toast.success("Tema atualizado");
    } catch (error) {
      toast.error("Erro ao salvar tema");
    }
  };

  const handleDensityChange = async (newDensity: "compact" | "normal" | "spacious") => {
    try {
      await updateVisualPref("density", newDensity);
      toast.success(`Densidade: ${newDensity}`);
    } catch (error) {
      toast.error("Erro ao salvar densidade");
    }
  };

  const handleFontChange = async (font: "inter" | "system" | "mono") => {
    try {
      await updateVisualPref("fontFamily", font);
      toast.success(`Fonte: ${font}`);
    } catch (error) {
      toast.error("Erro ao salvar fonte");
    }
  };

  const handleToggleAnimations = async () => {
    try {
      await updateVisualPref("reduceAnimations", !visualPrefs.reduceAnimations);
      toast.success(visualPrefs.reduceAnimations ? "Animações ativadas" : "Animações reduzidas");
    } catch (error) {
      toast.error("Erro ao salvar");
    }
  };

  // Comportamentos Padrão — auto-save e aplicação global
  const handleDefaultProjectSortChange = async (value: "recent" | "alphabetical" | "deadline") => {
    try {
      await updateBehaviorPref("defaultProjectSort", value);
      toast.success("Ordenação padrão atualizada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar");
    }
  };

  const handleDefaultViewChange = async (value: "grid" | "list") => {
    try {
      await updateBehaviorPref("defaultView", value);
      toast.success("Visualização padrão atualizada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar");
    }
  };

  const handleAutoplayVideosChange = async () => {
    const next = !behaviorPrefs.autoplayVideos;
    try {
      await updateBehaviorPref("autoplayVideos", next);
      toast.success(next ? "Autoplay ativado" : "Autoplay desativado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar");
    }
  };

  // ─── FASE 5: PRIVACY & LGPD HANDLERS ───

  // Controles de Privacidade
  const handleTogglePrivacy = async (key: keyof typeof privacySettings, value?: any) => {
    const newSettings = {
      ...privacySettings,
      [key]: value !== undefined ? value : !privacySettings[key],
    };

    setPrivacySettings(newSettings);

    try {
      await api.auth.updatePrivacySettings(newSettings);
      toast.success("Configuração de privacidade atualizada");
    } catch (error) {
      toast.error("Erro ao salvar configuração");
      // Reverter em caso de erro
      setPrivacySettings(privacySettings);
    }
  };

  // Solicitações LGPD
  const handleLgpdRequest = (type: "copy" | "correct" | "delete") => {
    setLgpdRequestType(type);
    setShowLgpdRequest(true);
  };

  const handleSubmitLgpdRequest = async () => {
    if (!lgpdRequestType) return;

    try {
      const result = await api.auth.createLgpdRequest(lgpdRequestType);

      const messages = {
        copy: `Solicitação de cópia de dados enviada! Protocolo: ${result.requestId}. Você receberá um email em até ${result.estimatedDays} dias.`,
        correct: `Solicitação de correção enviada! Protocolo: ${result.requestId}. Entraremos em contato em até ${result.estimatedDays} dias úteis.`,
        delete: `Solicitação de exclusão enviada! Protocolo: ${result.requestId}. Processaremos em até ${result.estimatedDays} dias úteis.`,
      };

      toast.success(messages[lgpdRequestType], { duration: 6000 });
      setShowLgpdRequest(false);
      setLgpdRequestType(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao enviar solicitação");
    }
  };

  return (
    <div className="min-h-screen bg-frame-black text-frame-white font-frame-body flex flex-col">
      <AppNavBar />

      <main id="main-content" className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 md:py-12">

        {/* ─── HEADER ─── */}
        <div className="border-b border-frame-gray-3/60 pb-6 mb-6">
          <p className="frame-label mb-2">// {t("app.profile.account")}</p>
          <h1 className="frame-title text-[clamp(1.8rem,4vw,2.8rem)]">
            {t("app.profile.myAccount")}
          </h1>
          <p className="text-frame-gray-light text-sm mt-2 max-w-xl">
            {t("app.profile.subtitle")}
          </p>
        </div>

        <div className="mb-8 border-b border-frame-gray-3/30 pb-4">
          <label htmlFor="profile-mobile-tabs" className="sr-only">
            {t("app.profile.myAccount")}
          </label>
          <select
            id="profile-mobile-tabs"
            value={activeTab}
            onChange={(event) => setActiveTab(event.target.value as ProfileTab)}
            className="frame-input min-h-11 w-full md:hidden"
          >
            <option value="profile">{t("app.profile.tabProfile")}</option>
            <option value="security">{t("app.profile.tabSecurity")}</option>
            <option value="integrations">{locale === "en" ? "Integrations" : "Integrações"}</option>
            <option value="plan">{t("app.profile.tabPlan")}</option>
            <option value="preferences">{t("app.profile.tabPreferences")}</option>
            <option value="privacy">{t("app.profile.tabPrivacy")}</option>
          </select>
          <div className="hidden flex-wrap gap-2 md:flex">
            <TabButton
              active={activeTab === "profile"}
              onClick={() => setActiveTab("profile")}
              icon={UserRound}
              label={t("app.profile.tabProfile")}
            />
            <TabButton
              active={activeTab === "security"}
              onClick={() => setActiveTab("security")}
              icon={Shield}
              label={t("app.profile.tabSecurity")}
            />
            <TabButton
              active={activeTab === "integrations"}
              onClick={() => setActiveTab("integrations")}
              icon={Webhook}
              label={locale === "en" ? "Integrations" : "Integrações"}
            />
            <TabButton
              active={activeTab === "plan"}
              onClick={() => setActiveTab("plan")}
              icon={Crown}
              label={t("app.profile.tabPlan")}
            />
            <TabButton
              active={activeTab === "preferences"}
              onClick={() => setActiveTab("preferences")}
              icon={Settings}
              label={t("app.profile.tabPreferences")}
            />
            <TabButton
              active={activeTab === "privacy"}
              onClick={() => setActiveTab("privacy")}
              icon={FileText}
              label={t("app.profile.tabPrivacy")}
            />
          </div>
        </div>


        {/* ═══════════════════════════════════════════════════════════════════
            TAB: PERFIL
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "profile" && (
          <div className="space-y-6 animate-in fade-in duration-300">

            {/* Identidade + Avatar */}
            <div className="liquid-glass p-6">
              <div className="flex flex-col sm:flex-row items-start gap-6">
                <AvatarUpload
                  currentChar={avatarChar}
                  onUpload={handleAvatarUpload}
                  avatarUrl={null}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-frame-mono text-[0.6rem] tracking-[0.18em] text-frame-orange uppercase mb-1">
                    {t("app.profile.activeUser")}
                  </p>
                  <h2 className="text-2xl font-bold text-frame-white truncate">
                    {user?.name || t("app.profile.defaultAccountName")}
                  </h2>
                  <p className="text-frame-gray-light text-sm break-all mt-1">{user?.email}</p>

                  <div className="flex flex-wrap gap-2 mt-4">
                    <span className={`text-[0.6rem] font-mono uppercase tracking-wider px-2 py-1 rounded ${
                      user?.role === "admin"
                        ? "text-frame-gold bg-frame-gold/10 border border-frame-gold/30"
                        : "text-frame-orange bg-frame-orange/10 border border-frame-orange/30"
                    }`}>
                      {user?.role === "admin" ? t("app.profile.roleAdmin") : t("app.profile.roleUser")}
                    </span>
                    <span className="text-[0.6rem] font-mono uppercase tracking-wider px-2 py-1 rounded text-frame-gray-light bg-frame-gray-2 border border-frame-gray-3">
                      {user?.email?.split("@")[0]}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 sm:flex-col">
                  <button type="button" onClick={() => setLocation("/dashboard")} className="frame-btn-primary text-sm py-2">
                    {t("app.profile.goToDashboard")}
                  </button>
                  <button type="button" onClick={handleLogout} className="frame-btn-ghost flex items-center gap-2 text-sm py-2">
                    <LogOut className="w-4 h-4" />
                    {t("app.profile.logout")}
                  </button>
                </div>
              </div>
            </div>


            {/* Dados pessoais */}
            <div className="liquid-glass p-6 space-y-5">
              <div>
                <p className="font-frame-mono text-[0.6rem] tracking-[0.18em] text-frame-orange uppercase">
                  {t("app.profile.personalData")}
                </p>
                <h3 className="text-lg font-bold mt-1">{t("app.profile.userInfo")}</h3>
                <p className="text-frame-gray-light text-xs mt-1">{t("app.profile.userInfoDesc")}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-1.5">
                  <span className="frame-label text-frame-gray-light">{t("app.profile.fullName")}</span>
                  <div className="relative">
                    <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-frame-gray-light" />
                    <input value={name} onChange={(e) => setName(e.target.value)} className="frame-input w-full pl-10" placeholder={t("app.profile.fullNamePlaceholder")} />
                  </div>
                </label>
                <label className="space-y-1.5">
                  <span className="frame-label text-frame-gray-light">{t("app.profile.phoneWhatsapp")}</span>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-frame-gray-light" />
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} className="frame-input w-full pl-10" placeholder="(11) 99999-9999" />
                  </div>
                </label>
              </div>

              <button type="button" onClick={handleSaveProfile} disabled={savingProfile} className="frame-btn-primary flex items-center gap-2">
                <Save className="w-4 h-4" />
                {savingProfile ? t("app.profile.saving") : t("app.profile.saveChanges")}
              </button>
            </div>

            {/* Link para configurações do estúdio */}
            <div className="liquid-glass p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 flex items-center justify-center border border-frame-orange/30 bg-frame-orange/[0.08] rounded-lg shrink-0">
                    <Building2 className="w-5 h-5 text-frame-orange" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{t("app.profile.companySettings")}</h3>
                    <p className="text-frame-gray-light text-xs mt-1">
                      Configure logo, cores, dados fiscais e informações do seu estúdio que aparecem em propostas, contratos e documentos.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setLocation("/company")}
                  className="frame-btn-primary flex items-center gap-2 shrink-0"
                >
                  <Settings className="w-4 h-4" />
                  Configurar
                </button>
              </div>
            </div>


            {/* Admin Panel */}
            {user?.role === "admin" && (
              <div className="liquid-glass p-6" style={{ borderColor: "rgba(255,184,0,0.4)", background: "linear-gradient(135deg, rgba(255,184,0,0.07) 0%, rgba(255,184,0,0.02) 100%)" }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-frame-mono text-[0.6rem] tracking-[0.18em] text-frame-gold uppercase">{t("app.profile.adminSection")}</p>
                    <h3 className="text-lg font-bold mt-1">{t("app.profile.adminPanel")}</h3>
                    <p className="text-frame-gray-light text-xs mt-1">{t("app.profile.adminDesc")}</p>
                  </div>
                  <button type="button" onClick={() => setLocation("/admin/gerenciar")} className="frame-btn-primary flex items-center gap-2 shrink-0">
                    <Users className="w-4 h-4" />
                    {t("app.profile.manage")}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB: SEGURANÇA
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "security" && (
          <div className="space-y-6 animate-in fade-in duration-300">

            {/* 📌 FASE 3: TAB SEGURANÇA EXPANDIDA COM 5 FEATURES */}

            {/* 1. Alterar senha */}
            <div className="liquid-glass p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center border border-frame-orange/30 bg-frame-orange/[0.08] rounded-lg">
                  <KeyRound className="w-5 h-5 text-frame-orange" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">{t("app.profile.changePassword")}</h3>
                  <p className="text-frame-gray-light text-xs">{t("app.profile.passwordHint")}</p>
                </div>
                {passwordChanged && (
                  <span className="ml-auto flex items-center gap-1.5 text-frame-green text-xs font-frame-mono">
                    <Check className="w-3.5 h-3.5" /> Alterada!
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="space-y-1.5">
                  <span className="frame-label text-frame-gray-light">{t("app.profile.currentPassword")}</span>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-frame-gray-light" />
                    <input
                      type={showCurrentPw ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="frame-input w-full pl-10 pr-10"
                      placeholder="••••••••"
                    />
                    <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-frame-gray-light hover:text-frame-white transition">
                      {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </label>
                <label className="space-y-1.5">
                  <span className="frame-label text-frame-gray-light">{t("app.profile.newPassword")}</span>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-frame-gray-light" />
                    <input
                      type={showNewPw ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="frame-input w-full pl-10 pr-10"
                      placeholder="••••••••"
                    />
                    <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-frame-gray-light hover:text-frame-white transition">
                      {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </label>
                <label className="space-y-1.5">
                  <span className="frame-label text-frame-gray-light">{t("app.profile.confirmPassword")}</span>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-frame-gray-light" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`frame-input w-full pl-10 ${confirmPassword && confirmPassword !== newPassword ? "border-frame-red/60" : ""}`}
                      placeholder="••••••••"
                      onKeyDown={(e) => e.key === "Enter" && handleChangePassword()}
                    />
                  </div>
                  {confirmPassword && confirmPassword !== newPassword && (
                    <p className="text-frame-red text-xs font-frame-mono">{t("app.profile.passwordsNoMatch")}</p>
                  )}
                </label>
              </div>

              <button
                type="button"
                onClick={handleChangePassword}
                disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
                className="frame-btn-ghost flex items-center gap-2 disabled:opacity-40"
              >
                {savingPassword ? (
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <KeyRound className="w-4 h-4" />
                )}
                {savingPassword ? t("app.profile.changingPassword") : t("app.profile.changePasswordBtn")}
              </button>
            </div>


            {/* 2. Autenticação de 2 Fatores (2FA) */}
            <div className="liquid-glass p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 flex items-center justify-center border rounded-lg ${
                    twoFactorEnabled
                      ? "border-frame-green/40 bg-frame-green/10"
                      : "border-frame-orange/30 bg-frame-orange/[0.08]"
                  }`}>
                    <Smartphone className={`w-5 h-5 ${twoFactorEnabled ? "text-frame-green" : "text-frame-orange"}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold">Autenticação de 2 Fatores</h3>
                      {twoFactorEnabled && (
                        <CheckCircle2 className="w-4 h-4 text-frame-green" />
                      )}
                    </div>
                    <p className="text-frame-gray-light text-xs">
                      {twoFactorEnabled
                        ? "Sua conta está protegida com 2FA"
                        : "Adicione uma camada extra de segurança"}
                    </p>
                  </div>
                </div>
                {twoFactorEnabled ? (
                  <button
                    type="button"
                    onClick={handleDisable2FA}
                    className="frame-btn-ghost text-xs text-frame-red/70 hover:text-frame-red"
                  >
                    Desativar 2FA
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleEnable2FA}
                    disabled={enabling2FA}
                    className="frame-btn-primary text-sm px-4 py-2"
                  >
                    {enabling2FA ? "Gerando..." : "Ativar 2FA"}
                  </button>
                )}
              </div>

              {/* Setup 2FA */}
              {show2FASetup && !twoFactorEnabled && (
                <div className="p-4 border border-frame-orange/30 rounded-lg bg-frame-orange/5 space-y-4">
                  <div className="flex items-start gap-3">
                    <QrCode className="w-5 h-5 text-frame-orange shrink-0 mt-1" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-frame-white mb-2">
                        Escaneie o QR Code com seu app autenticador
                      </p>
                      <p className="text-xs text-frame-gray-light mb-4">
                        Use Google Authenticator, Authy ou similar
                      </p>

                      {/* QR Code */}
                      {qrCode ? (
                        <div className="bg-white p-4 rounded-lg inline-block mb-4">
                          <img
                            src={qrCode}
                            alt="QR Code 2FA"
                            className="w-40 h-40"
                          />
                        </div>
                      ) : (
                        <div className="bg-white p-4 rounded-lg inline-block mb-4">
                          <div className="w-40 h-40 bg-frame-gray-2 flex items-center justify-center animate-pulse">
                            <QrCode className="w-16 h-16 text-frame-gray-3" />
                          </div>
                        </div>
                      )}

                      {/* Secret manual */}
                      <div className="mb-4">
                        <p className="text-xs text-frame-gray-light mb-1">Ou digite manualmente:</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 px-3 py-2 bg-frame-gray-2 border border-frame-gray-3 rounded text-xs font-mono text-frame-white">
                            {twoFactorSecret}
                          </code>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(twoFactorSecret);
                              toast.success("Secret copiado!");
                            }}
                            className="frame-btn-ghost p-2"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Verificação */}
                      <label className="space-y-1.5">
                        <span className="frame-label text-frame-gray-light">
                          Digite o código de 6 dígitos
                        </span>
                        <input
                          type="text"
                          value={twoFactorCode}
                          onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          className="frame-input w-full text-center text-xl tracking-[0.5em] font-mono"
                          placeholder="000000"
                          maxLength={6}
                        />
                      </label>

                      <button
                        type="button"
                        onClick={handleConfirm2FA}
                        disabled={twoFactorCode.length !== 6}
                        className="w-full frame-btn-primary disabled:opacity-40"
                      >
                        Confirmar e ativar 2FA
                      </button>
                    </div>
                  </div>

                  {/* Códigos de backup */}
                  {backupCodes.length > 0 && (
                    <div className="pt-4 border-t border-frame-gray-3">
                      <p className="text-xs font-medium text-frame-orange mb-2">
                        ⚠️ Códigos de backup (salve em local seguro!)
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {backupCodes.map((code, i) => (
                          <code key={i} className="px-2 py-1 bg-frame-gray-2 border border-frame-gray-3 rounded text-xs font-mono text-frame-white text-center">
                            {code}
                          </code>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {twoFactorEnabled && (
                <div className="p-3 bg-frame-green/10 border border-frame-green/30 rounded-lg">
                  <p className="text-xs text-frame-green flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    2FA ativo. Você precisará do código ao fazer login.
                  </p>
                </div>
              )}
            </div>

            {/* Sessões ativas */}
            <div className="liquid-glass p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 flex items-center justify-center border border-frame-orange/30 bg-frame-orange/[0.08] rounded-lg">
                    <Monitor className="w-5 h-5 text-frame-orange" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{t("app.profile.activeSessions")}</h3>
                    <p className="text-frame-gray-light text-xs">{t("app.profile.activeSessionsDesc")}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRevokeAllOthers}
                  disabled={revokingAll || sessions.filter((s) => !s.current).length === 0}
                  className="frame-btn-ghost text-xs text-frame-red/70 hover:text-frame-red disabled:opacity-40"
                >
                  {revokingAll ? "..." : t("app.profile.endAll")}
                </button>
              </div>

              {sessionsLoading ? (
                <p className="text-xs text-frame-gray-light">{t("app.profile.loadingSessions")}</p>
              ) : sessions.length === 0 ? (
                <p className="text-xs text-frame-gray-light">{t("app.profile.noSessions")}</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {sessions.map((session) => (
                    <SessionCard
                      key={session.id}
                      device={session.deviceLabel}
                      ipAddress={session.ipAddress}
                      lastActive={formatDateTime(session.lastActiveAt, locale)}
                      current={session.current}
                      revoking={revokingId === session.id}
                      onRevoke={() => handleRevokeSession(session.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* 3. Chaves de API */}
            <div className="liquid-glass p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 flex items-center justify-center border border-frame-orange/30 bg-frame-orange/[0.08] rounded-lg">
                    <Key className="w-5 h-5 text-frame-orange" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Chaves de API</h3>
                    <p className="text-frame-gray-light text-xs">Gerencie chaves para integrações e automações</p>
                  </div>
                </div>
                {!showNewApiKey && (
                  <button
                    type="button"
                    onClick={() => setShowNewApiKey(true)}
                    className="frame-btn-primary text-sm px-4 py-2 flex items-center gap-2"
                  >
                    <Key className="w-4 h-4" />
                    Nova Chave
                  </button>
                )}
              </div>

              {/* Criar nova chave */}
              {showNewApiKey && (
                <div className="p-4 border border-frame-orange/30 rounded-lg bg-frame-orange/5 space-y-4">
                  <label className="space-y-1.5">
                    <span className="frame-label text-frame-gray-light">Nome da chave (ex: "Webhook Produção")</span>
                    <input
                      type="text"
                      value={newApiKeyName}
                      onChange={(e) => setNewApiKeyName(e.target.value)}
                      className="frame-input w-full"
                      placeholder="Minha Integração"
                      autoFocus
                    />
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCreateApiKey}
                      disabled={creatingApiKey || !newApiKeyName.trim()}
                      className="frame-btn-primary disabled:opacity-40"
                    >
                      {creatingApiKey ? "Criando..." : "Criar Chave"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowNewApiKey(false); setNewApiKeyName(""); }}
                      className="frame-btn-ghost"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Chave recém-criada (mostrar apenas uma vez) */}
              {newlyCreatedKey && (
                <div className="p-4 bg-frame-green/10 border border-frame-green/30 rounded-lg space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-frame-green shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-frame-green">Chave criada com sucesso!</p>
                      <p className="text-xs text-frame-gray-light mt-1">
                        Copie agora. Por segurança, ela não será exibida novamente.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-frame-gray-2 border border-frame-gray-3 rounded text-xs font-mono text-frame-white break-all">
                      {newlyCreatedKey}
                    </code>
                    <button
                      type="button"
                      onClick={() => handleCopyApiKey(newlyCreatedKey)}
                      className="frame-btn-primary p-2 shrink-0"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewlyCreatedKey(null)}
                    className="text-xs text-frame-gray-light hover:text-frame-white transition"
                  >
                    OK, já copiei
                  </button>
                </div>
              )}

              {/* Lista de chaves */}
              {apiKeys.length === 0 ? (
                <p className="text-xs text-frame-gray-light py-4 text-center">
                  Nenhuma chave de API criada ainda
                </p>
              ) : (
                <div className="space-y-2">
                  {apiKeys.map((key) => (
                    <div key={key.id} className="glow-card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <Key className="w-4 h-4 text-frame-orange shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-frame-white">{key.name}</p>
                            <code className="text-xs font-mono text-frame-gray-light">
                              {key.key}••••••
                            </code>
                            <div className="flex items-center gap-3 mt-2 text-[0.65rem] text-frame-gray-light">
                              <span>Criada: {formatDate(key.createdAt, "—", locale)}</span>
                              {key.lastUsed ? (
                                <span>Último uso: {formatDate(key.lastUsed, "—", locale)}</span>
                              ) : (
                                <span className="text-frame-orange/70">Nunca usada</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRevokeApiKey(key.id)}
                          className="frame-btn-ghost text-xs text-frame-red/70 hover:text-frame-red px-3 py-1.5"
                        >
                          Revogar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Log de Atividades */}
            <div className="liquid-glass p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 flex items-center justify-center border border-frame-orange/30 bg-frame-orange/[0.08] rounded-lg">
                    <Activity className="w-5 h-5 text-frame-orange" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Log de Atividades</h3>
                    <p className="text-frame-gray-light text-xs">Últimas 30 ações na sua conta</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={loadActivityLog}
                  disabled={loadingActivity}
                  className="frame-btn-ghost text-xs px-3 py-1.5 flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingActivity ? "animate-spin" : ""}`} />
                  Atualizar
                </button>
              </div>

              {loadingActivity ? (
                <p className="text-xs text-frame-gray-light py-4">Carregando atividades...</p>
              ) : activityLog.length === 0 ? (
                <p className="text-xs text-frame-gray-light py-4 text-center">
                  Nenhuma atividade recente
                </p>
              ) : (
                <div className="space-y-2">
                  {activityLog.map((log) => (
                    <div
                      key={log.id}
                      className={`glow-card p-3 ${log.suspicious ? "border-frame-orange/40" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                            log.suspicious
                              ? "bg-frame-orange/10 border border-frame-orange/30"
                              : "bg-frame-gray-2 border border-frame-gray-3"
                          }`}>
                            {log.suspicious ? (
                              <AlertTriangle className="w-4 h-4 text-frame-orange" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-frame-green" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-frame-white">{log.action}</p>
                            <div className="flex items-center gap-2 mt-1 text-[0.65rem] text-frame-gray-light">
                              <MapPin className="w-3 h-3" />
                              <span>{log.location}</span>
                              <span>•</span>
                              <span>{log.ipAddress}</span>
                            </div>
                            <p className="text-[0.65rem] text-frame-gray-light mt-1">
                              {formatDateTime(log.timestamp, locale)}
                            </p>
                          </div>
                        </div>
                        {log.suspicious && (
                          <span className="text-[0.6rem] font-mono uppercase tracking-wider px-2 py-0.5 rounded text-frame-orange bg-frame-orange/10 border border-frame-orange/30 shrink-0">
                            Suspeito
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 5. Alertas de Segurança */}
            <div className="liquid-glass p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center border border-frame-orange/30 bg-frame-orange/[0.08] rounded-lg">
                  <Bell className="w-5 h-5 text-frame-orange" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Alertas de Segurança</h3>
                  <p className="text-frame-gray-light text-xs">Receba notificações de atividades suspeitas</p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 rounded-lg border border-frame-gray-3 hover:border-frame-orange/30 transition cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-frame-orange" />
                    <div>
                      <p className="text-sm font-medium text-frame-white">Email em novo login</p>
                      <p className="text-xs text-frame-gray-light">Notificar quando alguém acessar sua conta</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleAlert("emailOnNewLogin")}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      securityAlerts.emailOnNewLogin ? "bg-frame-orange" : "bg-frame-gray-3"
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform shadow-sm ${
                        securityAlerts.emailOnNewLogin
                          ? "translate-x-5 bg-frame-black"
                          : "translate-x-0 bg-white"
                      }`}
                    />
                  </button>
                </label>

                <label className="flex items-center justify-between p-3 rounded-lg border border-frame-gray-3 hover:border-frame-orange/30 transition cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <Lock className="w-4 h-4 text-frame-orange" />
                    <div>
                      <p className="text-sm font-medium text-frame-white">Email ao alterar senha</p>
                      <p className="text-xs text-frame-gray-light">Confirmar mudanças de senha</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleAlert("emailOnPasswordChange")}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      securityAlerts.emailOnPasswordChange ? "bg-frame-orange" : "bg-frame-gray-3"
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform shadow-sm ${
                        securityAlerts.emailOnPasswordChange
                          ? "translate-x-5 bg-frame-black"
                          : "translate-x-0 bg-white"
                      }`}
                    />
                  </button>
                </label>

                <label className="flex items-center justify-between p-3 rounded-lg border border-frame-gray-3 hover:border-frame-orange/30 transition cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-4 h-4 text-frame-orange" />
                    <div>
                      <p className="text-sm font-medium text-frame-white">Email em novo dispositivo</p>
                      <p className="text-xs text-frame-gray-light">Alerta quando detectar acesso de dispositivo desconhecido</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleAlert("emailOnNewDevice")}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      securityAlerts.emailOnNewDevice ? "bg-frame-orange" : "bg-frame-gray-3"
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform shadow-sm ${
                        securityAlerts.emailOnNewDevice
                          ? "translate-x-5 bg-frame-black"
                          : "translate-x-0 bg-white"
                      }`}
                    />
                  </button>
                </label>
              </div>

              <div className="p-3 bg-frame-orange/5 border border-frame-orange/20 rounded-lg">
                <p className="text-xs text-frame-gray-light flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-frame-orange shrink-0" />
                  Alertas são enviados para: <strong className="text-frame-white">{user?.email}</strong>
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "integrations" && (
          <section className="animate-in fade-in duration-300">
            <div className="mb-6 border-b border-frame-gray-3/50 pb-4">
              <p className="frame-label mb-2">// {locale === "en" ? "Integrations" : "Integrações"}</p>
              <h2 className="text-xl font-bold text-frame-white">{locale === "en" ? "Webhooks and automations" : "Webhooks e automações"}</h2>
              <p className="mt-2 max-w-2xl text-sm text-frame-gray-light">
                {locale === "en"
                  ? "Connect Cena Studio to other tools and manage your studio's automated deliveries."
                  : "Conecte o Cena Studio a outras ferramentas e gerencie as entregas automáticas do seu estúdio."}
              </p>
            </div>
            <FeatureUpgradeRequired feature="webhooks" variant="full">
              <WebhooksContent embedded />
            </FeatureUpgradeRequired>
          </section>
        )}


        {/* ═══════════════════════════════════════════════════════════════════
            TAB: PLANO
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "plan" && (
          <div className="space-y-6 animate-in fade-in duration-300">

            {/* ─── HERO DO PLANO ATUAL ─── */}
            <div
              className="plan-card plan-card-studio relative overflow-hidden p-6 md:p-8"
            >
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-15 pointer-events-none" style={{ background: SITE_CONFIG.primaryColor }} />

              <div className="relative flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider"
                      style={{
                        background: `${hexToRgba(SITE_CONFIG.primaryColor, 0.15)}`,
                        color: SITE_CONFIG.primaryColor,
                        border: `1px solid ${hexToRgba(SITE_CONFIG.primaryColor, 0.35)}`,
                      }}>
                      {plan?.planId === "studio" ? <Crown className="w-3.5 h-3.5" /> : plan?.planId === "pro" ? <Zap className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                      {planLabel}
                    </span>
                    {plan?.status === "active" && <span className="text-[0.6rem] font-mono uppercase tracking-wider text-frame-green bg-frame-green/10 px-2 py-1 rounded border border-frame-green/20">{t("app.profile.planActive")}</span>}
                    {plan?.status === "trial" && <span className="text-[0.6rem] font-mono uppercase tracking-wider text-frame-orange bg-frame-orange/10 px-2 py-1 rounded border border-frame-orange/30">{t("app.profile.planTrial")}</span>}
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-frame-white">
                      {plan?.planId === "studio" ? t("app.profile.planFull") : plan?.planId === "pro" ? t("app.profile.planPro") : t("app.profile.planFree")}
                    </h2>
                    <p className="text-frame-gray-light text-sm mt-2 max-w-lg">
                      {plan?.planId === "studio" ? t("app.profile.planFullDesc")
                        : plan?.planId === "pro" ? t("app.profile.planProDesc")
                        : t("app.profile.planFreeDesc")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-4 pt-2">
                    <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-frame-orange" /><span className="text-sm text-frame-white"><strong>{plan?.generationLimit === -1 ? "∞" : plan?.generationLimit}</strong> {t("app.profile.generationsMonth")}</span></div>
                    <div className="flex items-center gap-2"><Users className="w-4 h-4 text-frame-orange" /><span className="text-sm text-frame-white"><strong>{plan?.planId === "studio" ? t("app.profile.planFeat.studioClients") : plan?.planId === "pro" ? t("app.profile.planFeat.proClients") : t("app.profile.planFeat.freeClients")}</strong></span></div>
                    {plan?.status === "trial" && plan?.trialEndsAt && <div className="flex items-center gap-2"><CalendarClock className="w-4 h-4 text-frame-orange" /><span className="text-sm text-frame-orange">Trial até {formatDate(plan.trialEndsAt, "—", locale)}</span></div>}
                  </div>
                </div>
                <div className="flex flex-col gap-3 shrink-0">
                  <button type="button" onClick={handlePlanAction} className="frame-btn-primary px-6 py-3 text-sm">{plan?.planId === "free" || plan?.status === "trial" ? t("app.profile.upgrade") : t("app.profile.managePlan")}</button>
                  {plan?.planId !== "free" && <p className="text-[0.65rem] text-frame-gray-light text-center">{t("app.profile.nextCharge")} {formatDate(plan?.trialEndsAt, "—", locale)}</p>}
                </div>
              </div>
              <div className="relative mt-6 pt-6 border-t border-white/10">
                {usageMetricsLoading ? (
                  <p className="text-xs text-frame-gray-light">Carregando uso real...</p>
                ) : usageMetricsError || !usageMetrics ? (
                  <p className="text-xs text-frame-red">Não foi possível confirmar o consumo agora. Nenhum valor estimado será exibido.</p>
                ) : (
                  <UsageBar used={usageMetrics.generations.used} total={usageMetrics.generations.limit} label={t("app.profile.usageThisMonth")} />
                )}
              </div>
            </div>

            {/* Métricas de uso detalhadas */}
            <div className="liquid-glass p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-frame-mono text-[0.6rem] tracking-[0.18em] uppercase text-frame-orange">{t("app.profile.usageMetrics")}</p>
                  <h3 className="text-lg font-bold mt-1">Seu uso este mês</h3>
                  <p className="text-frame-gray-light text-xs mt-1">Acompanhe seus limites e evite surpresas</p>
                </div>
                <TrendingUp className="w-5 h-5 text-frame-orange" />
              </div>

              {usageMetricsLoading ? (
                <p className="py-6 text-center text-xs text-frame-gray-light">Consultando métricas do usuário...</p>
              ) : usageMetricsError || !usageMetrics ? (
                <div className="border border-frame-red/30 bg-frame-red/5 p-4 text-sm text-frame-red">
                  Métricas indisponíveis. Valores simulados não serão exibidos.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="glow-card p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="w-4 h-4 text-frame-orange" />
                      <span className="text-sm font-medium text-frame-white">Clientes cadastrados</span>
                    </div>
                    <UsageBar
                      used={usageMetrics.clients.used}
                      total={usageMetrics.clients.limit ?? -1}
                      label="Clientes vinculados à sua conta"
                    />
                    {(plan?.planId === "free" || plan?.planId === "pro") && (
                      <button
                        type="button"
                        onClick={handlePlanAction}
                        className="mt-3 w-full text-xs text-frame-orange hover:text-frame-white transition flex items-center justify-center gap-1"
                      >
                        <Zap className="w-3 h-3" />
                        Upgrade para mais clientes
                      </button>
                    )}
                  </div>

                  <div className="glow-card p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="w-4 h-4 text-frame-orange" />
                      <span className="text-sm font-medium text-frame-white">Projetos Este Mês</span>
                    </div>
                    <p className="text-2xl font-bold text-frame-white">{usageMetrics.projectsThisMonth}</p>
                    <p className="mt-1 text-xs text-frame-gray-light">Projetos realmente criados no período {usageMetrics.period}</p>
                  </div>

                  {usageMetrics.teamMembers.limit !== 0 && (
                    <div className="glow-card p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="w-4 h-4 text-frame-orange" />
                        <span className="text-sm font-medium text-frame-white">Membros da Equipe</span>
                      </div>
                      <UsageBar
                        used={usageMetrics.teamMembers.used}
                        total={usageMetrics.teamMembers.limit}
                        label="Membros ativos"
                      />
                      <button
                        type="button"
                        onClick={() => setLocation("/team")}
                        className="mt-3 w-full text-xs text-frame-orange hover:text-frame-white transition flex items-center justify-center gap-1"
                      >
                        <Settings className="w-3 h-3" />
                        Gerenciar equipe
                      </button>
                    </div>
                  )}

                  <div className="glow-card p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-4 h-4 text-frame-orange" />
                      <span className="text-sm font-medium text-frame-white">Armazenamento</span>
                    </div>
                    <p className="text-2xl font-bold text-frame-white">
                      {(usageMetrics.storageBytes / (1024 ** 3)).toLocaleString(locale === "en" ? "en-US" : "pt-BR", { maximumFractionDigits: 2 })} GB
                    </p>
                    <p className="mt-1 text-xs text-frame-gray-light">Soma real dos arquivos vinculados à sua conta</p>
                  </div>
                </div>
              )}

              {/* Call-to-action se próximo do limite */}
              {(plan?.planId === "free" || plan?.planId === "pro") && (
                <div className="mt-6 p-4 rounded-lg border border-frame-orange/30 bg-frame-orange/5">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-frame-orange shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-frame-white">
                        Precisa de mais recursos?
                      </p>
                      <p className="text-xs text-frame-gray-light mt-1">
                        Faça upgrade para {plan?.planId === "free" ? "Pro ou Studio" : "Studio"} e tenha mais clientes, equipe e funcionalidades ilimitadas.
                      </p>
                      <button
                        type="button"
                        onClick={handlePlanAction}
                        className="mt-3 frame-btn-primary text-sm py-2 px-4"
                      >
                        Ver planos superiores
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>


            {/* Features do plano */}
            {plan?.features && plan.features.length > 0 && (
              <div className="liquid-glass p-6">
                <p className="font-frame-mono text-[0.6rem] tracking-[0.18em] uppercase text-frame-orange mb-4">{t("app.profile.includedFeatures")}</p>
                <div className="flex flex-wrap gap-2">
                  {plan.features.map((feature) => (<span key={feature} className="glow-badge">{feature}</span>))}
                </div>
              </div>
            )}

            {/* ─── STEPS: COMO FUNCIONA SEU PLANO ─── */}
            <div className="liquid-glass p-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg bg-frame-orange/10 border border-frame-orange/30 flex items-center justify-center"><Sparkles className="w-4 h-4 text-frame-orange" /></div>
                <div><h3 className="text-lg font-bold text-frame-white">{t("app.profile.howPlanWorks")}</h3><p className="text-xs text-frame-gray-light">{t("app.profile.howPlanWorksDesc")}</p></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative p-4 rounded-xl bg-frame-gray-2/30 border border-frame-gray-3/50">
                  <div className="absolute -top-3 left-4 px-2 py-0.5 bg-frame-orange text-frame-black text-[0.6rem] font-bold uppercase tracking-wider rounded">{t("app.profile.stepCreate")}</div>
                  <p className="text-sm text-frame-white mt-2">{t("app.profile.stepCreateDesc")}</p>
                  <p className="text-xs text-frame-gray-light mt-2">{plan?.planId === "free" ? t("app.profile.planFeat.freeClients") : plan?.planId === "pro" ? t("app.profile.planFeat.proClients") : plan?.planId === "studio" ? t("app.profile.planFeat.studioClients") : t("app.profile.planFeat.unlimitedClients")}</p>
                </div>
                <div className="relative p-4 rounded-xl bg-frame-gray-2/30 border border-frame-gray-3/50">
                  <div className="absolute -top-3 left-4 px-2 py-0.5 bg-frame-orange text-frame-black text-[0.6rem] font-bold uppercase tracking-wider rounded">{t("app.profile.stepGenerate")}</div>
                  <p className="text-sm text-frame-white mt-2">{t("app.profile.stepGenerateDesc")}</p>
                  <p className="text-xs text-frame-gray-light mt-2">{plan?.generationLimit === -1 ? t("app.profile.planFeat.unlimitedGen") : `${plan?.generationLimit} ${locale === "en" ? "generations/month" : "gerações/mês"}`}</p>
                </div>
                <div className="relative p-4 rounded-xl bg-frame-gray-2/30 border border-frame-gray-3/50">
                  <div className="absolute -top-3 left-4 px-2 py-0.5 bg-frame-orange text-frame-black text-[0.6rem] font-bold uppercase tracking-wider rounded">{t("app.profile.stepDeliver")}</div>
                  <p className="text-sm text-frame-white mt-2">{t("app.profile.stepDeliverDesc")}</p>
                  <p className="text-xs text-frame-gray-light mt-2">{plan?.planId === "free" ? t("app.profile.planFeat.freeExport") : t("app.profile.planFeat.proExport")}</p>
                </div>
              </div>
            </div>

            {/* ─── COMPARATIVO DE PLANOS COMPLETO ─── */}
            <div className="liquid-glass p-6 space-y-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-frame-orange" />
                <div>
                  <h3 className="text-lg font-bold">{t("app.profile.comparePlans")}</h3>
                  <p className="plan-muted text-xs">{t("app.profile.comparePlansDesc")}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* FREE */}
                <div className={`plan-card plan-card-free relative p-5 ${plan?.planId === "free" ? "ring-2 ring-frame-orange" : ""}`}>
                  {plan?.planId === "free" && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-frame-orange text-frame-black text-[0.6rem] font-bold uppercase tracking-wider rounded-full">{t("app.profile.yourPlan")}</div>}
                  <div className="text-center pt-2">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center" style={{ background: `${hexToRgba(SITE_CONFIG.primaryColor, 0.15)}`, border: `1px solid ${hexToRgba(SITE_CONFIG.primaryColor, 0.40)}` }}>
                      <Shield className="w-6 h-6 text-frame-orange" />
                    </div>
                    <h4 className="text-xl font-bold">Free</h4>
                    <p className="text-3xl font-bold mt-2">R$ 0</p>
                    <p className="plan-muted text-xs mt-1">{t("app.profile.forever")}</p>
                  </div>
                  <p className="plan-muted text-sm text-center mt-4">{t("app.profile.freeDesc")}</p>
                  <ul className="mt-6 space-y-3">
                    <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-frame-orange shrink-0 opacity-70" />{t("app.profile.planFeat.freeGen")}</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-frame-orange shrink-0 opacity-70" />{t("app.profile.planFeat.freeClients")}</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-frame-orange shrink-0 opacity-70" />{t("app.profile.planFeat.freeProjects")}</li>
                    <li className="plan-struck flex items-center gap-2 text-sm"><X className="w-4 h-4 shrink-0 opacity-40" />{t("app.profile.planFeat.noReviews")}</li>
                    <li className="plan-struck flex items-center gap-2 text-sm"><X className="w-4 h-4 shrink-0 opacity-40" />Sem branding</li>
                  </ul>
                </div>

                {/* PRO */}
                <div className={`plan-card plan-card-pro relative p-5 ${plan?.planId === "pro" ? "ring-2 ring-frame-orange" : ""}`}>
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-frame-orange text-frame-black text-[0.6rem] font-bold uppercase tracking-wider rounded-full">
                    {plan?.planId === "pro" ? t("app.profile.yourPlan") : t("app.profile.popular")}
                  </div>
                  <div className="text-center pt-2">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center" style={{ background: `${hexToRgba(SITE_CONFIG.primaryColor, 0.20)}`, border: `1px solid ${hexToRgba(SITE_CONFIG.primaryColor, 0.55)}` }}>
                      <Zap className="w-6 h-6 text-frame-orange" />
                    </div>
                    <h4 className="text-xl font-bold">Pro</h4>
                    <p className="text-3xl font-bold mt-2">R$ 199<span className="plan-muted text-base font-normal">{t("app.profile.perMonth")}</span></p>
                  </div>
                  <p className="plan-muted text-sm text-center mt-4">{t("app.profile.proDesc")}</p>
                  <ul className="mt-6 space-y-3">
                    <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-frame-orange shrink-0" />{t("app.profile.planFeat.proClients")}</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-frame-orange shrink-0" />{t("app.profile.planFeat.reviews")}</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-frame-orange shrink-0" />{t("app.profile.planFeat.crm")}</li>
                    <li className="plan-struck flex items-center gap-2 text-sm"><X className="w-4 h-4 shrink-0 opacity-40" />{t("app.profile.planFeat.noTeam")}</li>
                    <li className="plan-struck flex items-center gap-2 text-sm"><X className="w-4 h-4 shrink-0 opacity-40" />Sem branding</li>
                  </ul>
                  {plan?.planId === "free" && <button type="button" onClick={handlePlanAction} className="w-full mt-6 frame-btn-primary py-2.5">{t("app.profile.subscribePro")}</button>}
                </div>

                {/* STUDIO */}
                <div className={`plan-card plan-card-studio relative p-5 ${plan?.planId === "studio" ? "ring-2 ring-frame-orange" : ""}`}>
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-frame-orange text-frame-black text-[0.6rem] font-bold uppercase tracking-wider rounded-full">
                    {plan?.planId === "studio" ? t("app.profile.yourPlan") : t("app.profile.complete")}
                  </div>
                  <div className="text-center pt-2">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center" style={{ background: `${hexToRgba(SITE_CONFIG.primaryColor, 0.28)}`, border: `1px solid ${hexToRgba(SITE_CONFIG.primaryColor, 0.70)}` }}>
                      <Crown className="w-6 h-6 text-frame-orange" />
                    </div>
                    <h4 className="text-xl font-bold">Studio</h4>
                    <p className="text-3xl font-bold mt-2">R$ 399<span className="plan-muted text-base font-normal">{t("app.profile.perMonth")}</span></p>
                  </div>
                  <p className="plan-muted text-sm text-center mt-4">{t("app.profile.studioDesc")}</p>
                  <ul className="mt-6 space-y-3">
                    <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-frame-orange shrink-0" />{t("app.profile.planFeat.studioClients")}</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-frame-orange shrink-0" />{t("app.profile.planFeat.studioTeam")}</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-frame-orange shrink-0" />{t("app.profile.planFeat.allPro")}</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-frame-orange shrink-0" />{t("app.profile.planFeat.reports")}</li>
                    <li className="plan-struck flex items-center gap-2 text-sm"><X className="w-4 h-4 shrink-0 opacity-40" />Sem logo próprio</li>
                  </ul>
                  {(plan?.planId === "free" || plan?.planId === "pro") && <button type="button" onClick={() => { selectPlan("produtora"); openModal("checkout"); }} className="w-full mt-6 frame-btn-primary py-2.5">{t("app.profile.subscribeStudio")}</button>}
                </div>

                {/* WHITELABEL */}
                <div className={`plan-card plan-card-studio relative p-5 ${plan?.planId === "whitelabel" ? "ring-2 ring-frame-gold" : ""}`}>
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-frame-gold text-frame-black text-[0.6rem] font-bold uppercase tracking-wider rounded-full">
                    {plan?.planId === "whitelabel" ? t("app.profile.yourPlan") : "Branding"}
                  </div>
                  <div className="text-center pt-2">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center" style={{ background: "rgba(255,184,0,0.15)", border: "1px solid rgba(255,184,0,0.40)" }}>
                      <Palette className="w-6 h-6 text-frame-gold" />
                    </div>
                    <h4 className="text-xl font-bold">Whitelabel</h4>
                    <p className="text-3xl font-bold mt-2">R$ 1.499<span className="plan-muted text-base font-normal">{t("app.profile.perMonth")}</span></p>
                  </div>
                  <p className="plan-muted text-sm text-center mt-4">Marca própria com domínio e cor customizados</p>
                  <ul className="mt-6 space-y-3">
                    <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-frame-gold shrink-0" />Clientes ilimitados</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-frame-gold shrink-0" />Gerações IA ilimitadas</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-frame-gold shrink-0" />Tudo do Studio</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-frame-gold shrink-0" />Domínio customizado</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-frame-gold shrink-0" />10 membros de equipe</li>
                  </ul>
                  {plan?.planId !== "whitelabel" && (
                    <a
                      href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Olá! Tenho interesse no plano Whitelabel do CENA Studio. Pode me passar mais detalhes?")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full mt-6 frame-btn-primary py-2.5 flex items-center justify-center gap-2 no-underline"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Falar com vendas
                    </a>
                  )}
                </div>

                {/* ENTERPRISE */}
                <div className={`plan-card plan-card-studio relative p-5 ${plan?.planId === "enterprise" ? "ring-2 ring-frame-gold" : ""}`}>
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-frame-gold text-frame-black text-[0.6rem] font-bold uppercase tracking-wider rounded-full">
                    {plan?.planId === "enterprise" ? t("app.profile.yourPlan") : "100% White"}
                  </div>
                  <div className="text-center pt-2">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center" style={{ background: "rgba(255,184,0,0.20)", border: "1px solid rgba(255,184,0,0.55)" }}>
                      <Sparkles className="w-6 h-6 text-frame-gold" />
                    </div>
                    <h4 className="text-xl font-bold">Enterprise</h4>
                    <p className="text-3xl font-bold mt-2">Custom</p>
                  </div>
                  <p className="plan-muted text-sm text-center mt-4">White-label completo, zero CENA, a partir de R$ 5.000/mês</p>
                  <ul className="mt-6 space-y-3">
                    <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-frame-gold shrink-0" />Tudo ilimitado</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-frame-gold shrink-0" />Múltiplas marcas</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-frame-gold shrink-0" />API privada</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-frame-gold shrink-0" />SLA 99.9%</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-frame-gold shrink-0" />Account manager dedicado</li>
                  </ul>
                  {plan?.planId !== "enterprise" && (
                    <a
                      href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Olá! Tenho interesse no plano Enterprise do CENA Studio. Pode me passar mais detalhes?")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full mt-6 frame-btn-primary py-2.5 flex items-center justify-center gap-2 no-underline"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Falar com vendas
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* ─── HISTÓRICO DE FATURAS ─── */}
            <div className="liquid-glass p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Receipt className="w-5 h-5 text-frame-orange" />
                  <div>
                    <h3 className="text-lg font-bold">{t("app.profile.invoiceHistory")}</h3>
                    <p className="text-frame-gray-light text-xs">Cobranças confirmadas diretamente pela Stripe</p>
                  </div>
                </div>
                {billingHistory?.canManageBilling && (
                  <button
                    type="button"
                    onClick={handlePlanAction}
                    className="text-sm text-frame-orange hover:text-frame-white transition flex items-center gap-1"
                  >
                    <CreditCard className="w-4 h-4" />
                    Gerenciar pagamentos
                  </button>
                )}
              </div>

              {billingHistoryLoading ? (
                <div className="py-8 text-center text-sm text-frame-gray-light">
                  Confirmando cobranças com a Stripe...
                </div>
              ) : billingHistoryError || !billingHistory ? (
                <div className="border border-frame-red/30 bg-frame-red/5 p-4 text-sm text-frame-red">
                  Não foi possível confirmar o histórico agora. Nenhuma fatura estimada será exibida.
                </div>
              ) : billingHistory.invoices.length === 0 && !billingHistory.upcoming ? (
                <div className="py-8 text-center">
                  <Receipt className="w-10 h-10 mx-auto text-frame-gray-light/30 mb-3" />
                  <p className="text-sm text-frame-gray-light">Nenhuma cobrança confirmada</p>
                  <p className="text-xs text-frame-gray-light/70 mt-1">
                    Seu histórico permanecerá vazio até existir um pagamento real vinculado à sua conta.
                  </p>
                  {(plan?.planId === "free" || plan?.status === "trial") && (
                    <button
                      type="button"
                      onClick={handlePlanAction}
                      className="mt-4 frame-btn-primary text-sm py-2 px-4"
                    >
                      Ver planos pagos
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {billingHistory.upcoming && (
                    <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-frame-orange/5 border border-frame-orange/30">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-frame-orange/20 flex items-center justify-center">
                          <Clock className="w-4 h-4 text-frame-orange" />
                        </div>
                        <div>
                          <span className="text-sm text-frame-white font-medium">
                            Próxima cobrança — {billingHistory.upcoming.description}
                          </span>
                          <p className="text-xs text-frame-gray-light">
                            Prevista para {formatDate(billingHistory.upcoming.dueAt, "—", locale)}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-mono text-frame-white">
                        {formatBillingAmount(billingHistory.upcoming.amountDue, billingHistory.upcoming.currency, locale)}
                      </span>
                    </div>
                  )}

                  {billingHistory.invoices.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-frame-mono uppercase tracking-wider text-frame-gray-light mt-4 mb-2">
                        Histórico de pagamentos confirmados
                      </p>

                      {billingHistory.invoices.map((invoice) => {
                        const documentUrl = invoice.invoicePdf || invoice.hostedInvoiceUrl;
                        return (
                          <div key={invoice.id} className="flex items-center justify-between py-3 px-4 rounded-lg bg-frame-gray-2/30 border border-frame-gray-3/30 hover:border-frame-gray-3 transition">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-frame-green/10 flex items-center justify-center">
                                <Check className="w-4 h-4 text-frame-green" />
                              </div>
                              <div>
                                <span className="text-sm text-frame-white">{invoice.description}</span>
                                <p className="text-xs text-frame-gray-light">
                                  Pago em {formatDate(invoice.paidAt, "—", locale)} · {invoice.id}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-sm font-mono text-frame-white">
                                {formatBillingAmount(invoice.amountPaid, invoice.currency, locale)}
                              </span>
                              {documentUrl && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    try {
                                      openStripeInvoice(documentUrl);
                                    } catch {
                                      toast.error("Não foi possível abrir a fatura da Stripe");
                                    }
                                  }}
                                  className="text-frame-orange hover:text-frame-white text-xs flex items-center gap-1 transition font-medium"
                                >
                                  <Download className="w-3 h-3" /> PDF
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {Object.keys(billingHistory.totalsByCurrency).length > 0 && (
                    <div className="mt-4 p-4 rounded-lg border border-frame-gray-3 bg-frame-gray-1/20">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-xs text-frame-gray-light">Total pago no histórico confirmado</p>
                          <p className="text-sm text-frame-gray-muted mt-1">Soma das faturas retornadas pela Stripe</p>
                        </div>
                        <div className="text-right space-y-1">
                          {Object.entries(billingHistory.totalsByCurrency).map(([invoiceCurrency, amount]) => (
                            <p key={invoiceCurrency} className="text-2xl font-bold text-frame-white">
                              {formatBillingAmount(amount, invoiceCurrency, locale)}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ─── PROGRAMA DE INDICAÇÃO ─── */}
            <div className="liquid-glass p-6 space-y-5" style={{
              borderColor: "rgba(255,184,0,0.3)",
              background: "linear-gradient(135deg, rgba(255,184,0,0.05) 0%, transparent 100%)"
            }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 flex items-center justify-center border border-frame-gold/30 bg-frame-gold/[0.08] rounded-lg">
                    <Sparkles className="w-5 h-5 text-frame-gold" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-frame-white">Indique e Ganhe</h3>
                    <p className="text-frame-gray-light text-xs mt-1">Compartilhe CENA Studio e seja recompensado</p>
                  </div>
                </div>
              </div>

              {/* Recompensas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 rounded-lg bg-frame-black/30 border border-frame-gold/20">
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-frame-gold/15 flex items-center justify-center">
                      <span className="text-2xl">🎁</span>
                    </div>
                    <p className="text-2xl font-bold text-frame-gold">1 mês</p>
                    <p className="text-xs text-frame-gray-light mt-1">grátis por indicação</p>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-frame-black/30 border border-frame-gold/20">
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-frame-gold/15 flex items-center justify-center">
                      <span className="text-2xl">🚀</span>
                    </div>
                    <p className="text-2xl font-bold text-frame-gold">3 meses</p>
                    <p className="text-xs text-frame-gray-light mt-1">+ upgrade Pro</p>
                    <p className="text-[0.6rem] text-frame-gray-muted mt-1">(3 indicações)</p>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-frame-black/30 border border-frame-gold/20">
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-frame-gold/15 flex items-center justify-center">
                      <span className="text-2xl">👑</span>
                    </div>
                    <p className="text-2xl font-bold text-frame-gold">Studio</p>
                    <p className="text-xs text-frame-gray-light mt-1">grátis por 1 ano</p>
                    <p className="text-[0.6rem] text-frame-gray-muted mt-1">(10 indicações)</p>
                  </div>
                </div>
              </div>

              {/* Link de indicação */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-frame-white">Seu link de indicação:</p>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      readOnly
                      value={referralInfo?.url || `cenastudio.com.br/r/${user?.email?.split('@')[0]?.toUpperCase() || 'USER'}`}
                      className="frame-input w-full font-mono text-sm pr-20"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const url = referralInfo?.url || `https://cenastudio.com.br/r/${user?.email?.split('@')[0] || 'user'}`;
                        navigator.clipboard.writeText(url);
                        toast.success("Link copiado!");
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-frame-orange hover:text-frame-white transition text-xs font-medium flex items-center gap-1"
                    >
                      <MessageCircle className="w-3 h-3" />
                      Copiar
                    </button>
                  </div>
                </div>

                {/* Botões de compartilhamento */}
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`https://wa.me/?text=Tô usando o CENA Studio pra gerenciar meus projetos audiovisuais e tá incrível! 🎬 Se inscreve por esse link e a gente ganha desconto: ${referralInfo?.url || `https://cenastudio.com.br/r/${user?.email?.split('@')[0] || 'user'}`}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg transition text-sm"
                    style={{ backgroundColor: "color-mix(in srgb, var(--ds-brand-whatsapp) 10%, transparent)", borderColor: "color-mix(in srgb, var(--ds-brand-whatsapp) 30%, transparent)", color: "var(--ds-brand-whatsapp)" }}
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                  </a>
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Tô usando o CENA Studio pra gerenciar meus projetos audiovisuais! 🎬`)}&url=${referralInfo?.url || `https://cenastudio.com.br/r/${user?.email?.split('@')[0] || 'user'}`}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg transition text-sm"
                    style={{ backgroundColor: "color-mix(in srgb, var(--ds-brand-twitter) 10%, transparent)", borderColor: "color-mix(in srgb, var(--ds-brand-twitter) 30%, transparent)", color: "var(--ds-brand-twitter)" }}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Twitter
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      const subject = "Descubra o CENA Studio 🎬";
                      const url = referralInfo?.url || `https://cenastudio.com.br/r/${user?.email?.split('@')[0] || 'user'}`;
                      const body = `Oi!\n\nEstou usando o CENA Studio para gerenciar meus projetos audiovisuais e estou adorando. A plataforma é completa: CRM, propostas, contratos, reviews de vídeo e muito mais.\n\nSe você trabalha com audiovisual, vale muito a pena conhecer. Se cadastra por esse link e a gente ganha desconto:\n\n${url}\n\nAbraço!`;
                      window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-frame-gray-2 border border-frame-gray-3 text-frame-gray-light hover:text-frame-white hover:border-frame-gray-4 transition text-sm"
                  >
                    <Mail className="w-4 h-4" />
                    Email
                  </button>
                </div>
              </div>

              {/* Status de indicações */}
              <div className="p-4 rounded-lg bg-frame-black/50 border border-frame-gray-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-frame-white">Suas indicações</span>
                  <span className="text-[0.6rem] font-mono uppercase tracking-wider text-frame-gray-light bg-frame-gray-2 px-2 py-1 rounded">
                    {loadingReferral ? "..." : `${referralInfo?.stats.convertedReferrals || 0} ativas`}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-frame-gray-light">Progresso para próxima recompensa</span>
                    <span className="font-mono text-frame-white">
                      {loadingReferral ? "..." : `${referralInfo?.stats.nextRewardProgress.current || 0} / ${referralInfo?.stats.nextRewardProgress.target || 1}`}
                    </span>
                  </div>
                  <div className="h-2 bg-frame-gray-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-frame-gold to-frame-gold/60 transition-all duration-500 rounded-full"
                      style={{ width: `${referralInfo?.stats.nextRewardProgress.percentage || 0}%` }}
                    />
                  </div>
                  <p className="text-[0.65rem] text-frame-gray-light">
                    {referralInfo?.stats.nextRewardProgress.percentage === 100
                      ? "🎉 Parabéns! Você desbloqueou uma recompensa!"
                      : "Compartilhe seu link e ganhe 1 mês grátis quando alguém assinar!"}
                  </p>
                </div>
              </div>

              {/* Lista de indicações individuais */}
              {referralList.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-frame-gray-3/50">
                  <p className="text-xs font-medium text-frame-gray-light">Suas indicações</p>
                  <div className="space-y-1.5">
                    {referralList.map((referral) => {
                      const statusLabels: Record<string, string> = {
                        pending: "Aguardando cadastro",
                        converted: "Convertido",
                        rewarded: "Recompensado",
                      };
                      const statusColors: Record<string, string> = {
                        pending: "text-frame-gray-light",
                        converted: "text-frame-green",
                        rewarded: "text-frame-gold",
                      };
                      return (
                        <div
                          key={referral.id}
                          className="flex items-center justify-between gap-3 p-2.5 border border-frame-gray-3/50 rounded-lg text-sm"
                        >
                          <span className="text-frame-white truncate">
                            {referral.referredUser?.name || referral.referredUser?.email || "—"}
                          </span>
                          <span className={`text-[0.65rem] font-mono uppercase tracking-wider shrink-0 ${statusColors[referral.status] || "text-frame-gray-light"}`}>
                            {statusLabels[referral.status] || referral.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ─── FAQ RÁPIDO ─── */}
            <div className="liquid-glass p-6 space-y-4">
              <h3 className="text-lg font-bold text-frame-white">{t("app.profile.faqTitle")}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1"><p className="text-sm font-medium text-frame-white">{t("app.profile.faqCancel")}</p><p className="text-xs text-frame-gray-light">{t("app.profile.faqCancelAnswer")}</p></div>
                <div className="space-y-1"><p className="text-sm font-medium text-frame-white">{t("app.profile.faqLimit")}</p><p className="text-xs text-frame-gray-light">{t("app.profile.faqLimitAnswer")}</p></div>
                <div className="space-y-1"><p className="text-sm font-medium text-frame-white">{t("app.profile.faqPix")}</p><p className="text-xs text-frame-gray-light">{t("app.profile.faqPixAnswer")}</p></div>
                <div className="space-y-1"><p className="text-sm font-medium text-frame-white">{t("app.profile.faqAnnual")}</p><p className="text-xs text-frame-gray-light">{t("app.profile.faqAnnualAnswer")}</p></div>
              </div>
            </div>
          </div>
        )}


        {/* ═══════════════════════════════════════════════════════════════════
            TAB: PREFERÊNCIAS
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "preferences" && (
          <div className="space-y-6 animate-in fade-in duration-300">

            {/* Idioma */}
            <div className="liquid-glass p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center border border-frame-orange/30 bg-frame-orange/[0.08] rounded-lg">
                  <Languages className="w-5 h-5 text-frame-orange" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">{t("app.profile.language")}</h3>
                  <p className="text-frame-gray-light text-xs">{t("app.profile.languageDesc")}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setLocale("pt")}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition ${
                    locale === "pt"
                      ? "border-frame-orange bg-frame-orange/10 text-frame-white"
                      : "border-frame-gray-3 text-frame-gray-light hover:border-frame-gray-light"
                  }`}
                >
                  <span className="text-lg">🇧🇷</span>
                  <span className="text-sm font-medium">Português</span>
                  {locale === "pt" && <Check className="w-4 h-4 text-frame-orange ml-2" />}
                </button>
                <button
                  type="button"
                  onClick={() => setLocale("en")}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition ${
                    locale === "en"
                      ? "border-frame-orange bg-frame-orange/10 text-frame-white"
                      : "border-frame-gray-3 text-frame-gray-light hover:border-frame-gray-light"
                  }`}
                >
                  <span className="text-lg">🇺🇸</span>
                  <span className="text-sm font-medium">English</span>
                  {locale === "en" && <Check className="w-4 h-4 text-frame-orange ml-2" />}
                </button>
              </div>
            </div>

            {/* Tema */}
            <div className="liquid-glass p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center border border-frame-orange/30 bg-frame-orange/[0.08] rounded-lg">
                  <Palette className="w-5 h-5 text-frame-orange" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">{t("app.profile.theme")}</h3>
                  <p className="text-frame-gray-light text-xs">{t("app.profile.themeDesc")}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => theme === "light" && toggleTheme?.()}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition ${
                    theme === "dark"
                      ? "border-frame-orange bg-frame-orange/10 text-frame-white"
                      : "border-frame-gray-3 text-frame-gray-light hover:border-frame-gray-light"
                  }`}
                >
                  <span className="text-lg">🌙</span>
                  <span className="text-sm font-medium">{t("app.profile.themeDark")}</span>
                  {theme === "dark" && <Check className="w-4 h-4 text-frame-orange ml-1" />}
                </button>
                <button
                  type="button"
                  onClick={() => theme === "dark" && toggleTheme?.()}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition ${
                    theme === "light"
                      ? "border-frame-orange bg-frame-orange/10 text-frame-white"
                      : "border-frame-gray-3 text-frame-gray-light hover:border-frame-gray-light"
                  }`}
                >
                  <span className="text-lg">☀️</span>
                  <span className="text-sm font-medium">{t("app.profile.themeLight")}</span>
                  {theme === "light" && <Check className="w-4 h-4 text-frame-orange ml-1" />}
                </button>
              </div>
            </div>


            {/* FASE 4: Notificações Granulares (8 tipos) */}
            <div className="liquid-glass p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center border border-frame-orange/30 bg-frame-orange/[0.08] rounded-lg">
                  <Bell className="w-5 h-5 text-frame-orange" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Notificações por Email</h3>
                  <p className="text-frame-gray-light text-xs">Escolha exatamente o que você quer receber</p>
                </div>
              </div>

              <div className="space-y-2">
                {/* Grid 2 colunas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {/* Novos comentários */}
                  <label className="flex items-center justify-between p-3 rounded-lg border border-frame-gray-3 hover:border-frame-orange/30 transition cursor-pointer group">
                    <div className="flex items-center gap-2.5">
                      <MessageCircle className="w-4 h-4 text-frame-orange" />
                      <div>
                        <p className="text-sm font-medium text-frame-white">Novos comentários</p>
                        <p className="text-[0.65rem] text-frame-gray-light">Em reviews que você participa</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleNotification("newComments")}
                      className={`relative w-9 h-5 rounded-full transition-colors ${
                        notificationPrefs.newComments ? "bg-frame-orange" : "bg-frame-gray-3"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                          notificationPrefs.newComments ? "translate-x-[1.125rem]" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </label>

                  {/* Cliente enviou arquivos */}
                  <label className="flex items-center justify-between p-3 rounded-lg border border-frame-gray-3 hover:border-frame-orange/30 transition cursor-pointer group">
                    <div className="flex items-center gap-2.5">
                      <Upload className="w-4 h-4 text-frame-orange" />
                      <div>
                        <p className="text-sm font-medium text-frame-white">Cliente enviou arquivos</p>
                        <p className="text-[0.65rem] text-frame-gray-light">Novos uploads em projetos</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleNotification("clientUploads")}
                      className={`relative w-9 h-5 rounded-full transition-colors ${
                        notificationPrefs.clientUploads ? "bg-frame-orange" : "bg-frame-gray-3"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                          notificationPrefs.clientUploads ? "translate-x-[1.125rem]" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </label>

                  {/* Projeto atrasado */}
                  <label className="flex items-center justify-between p-3 rounded-lg border border-frame-gray-3 hover:border-frame-orange/30 transition cursor-pointer group">
                    <div className="flex items-center gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-frame-orange" />
                      <div>
                        <p className="text-sm font-medium text-frame-white">Projeto atrasado</p>
                        <p className="text-[0.65rem] text-frame-gray-light">Avisos de deadline próximo</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleNotification("projectDeadlines")}
                      className={`relative w-9 h-5 rounded-full transition-colors ${
                        notificationPrefs.projectDeadlines ? "bg-frame-orange" : "bg-frame-gray-3"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                          notificationPrefs.projectDeadlines ? "translate-x-[1.125rem]" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </label>

                  {/* Newsletter semanal */}
                  <label className="flex items-center justify-between p-3 rounded-lg border border-frame-gray-3 hover:border-frame-orange/30 transition cursor-pointer group">
                    <div className="flex items-center gap-2.5">
                      <Megaphone className="w-4 h-4 text-frame-orange" />
                      <div>
                        <p className="text-sm font-medium text-frame-white">Newsletter semanal</p>
                        <p className="text-[0.65rem] text-frame-gray-light">Dicas e novidades</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleNotification("weeklyNewsletter")}
                      className={`relative w-9 h-5 rounded-full transition-colors ${
                        notificationPrefs.weeklyNewsletter ? "bg-frame-orange" : "bg-frame-gray-3"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                          notificationPrefs.weeklyNewsletter ? "translate-x-[1.125rem]" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </label>

                  {/* Menções */}
                  <label className="flex items-center justify-between p-3 rounded-lg border border-frame-gray-3 hover:border-frame-orange/30 transition cursor-pointer group">
                    <div className="flex items-center gap-2.5">
                      <UserRound className="w-4 h-4 text-frame-orange" />
                      <div>
                        <p className="text-sm font-medium text-frame-white">Menções (@você)</p>
                        <p className="text-[0.65rem] text-frame-gray-light">Quando alguém te mencionar</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleNotification("mentions")}
                      className={`relative w-9 h-5 rounded-full transition-colors ${
                        notificationPrefs.mentions ? "bg-frame-orange" : "bg-frame-gray-3"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                          notificationPrefs.mentions ? "translate-x-[1.125rem]" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </label>

                  {/* Novos projetos */}
                  <label className="flex items-center justify-between p-3 rounded-lg border border-frame-gray-3 hover:border-frame-orange/30 transition cursor-pointer group">
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="w-4 h-4 text-frame-orange" />
                      <div>
                        <p className="text-sm font-medium text-frame-white">Novos projetos</p>
                        <p className="text-[0.65rem] text-frame-gray-light">Quando alguém criar projeto</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleNotification("newProjects")}
                      className={`relative w-9 h-5 rounded-full transition-colors ${
                        notificationPrefs.newProjects ? "bg-frame-orange" : "bg-frame-gray-3"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                          notificationPrefs.newProjects ? "translate-x-[1.125rem]" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </label>

                  {/* Review aprovada */}
                  <label className="flex items-center justify-between p-3 rounded-lg border border-frame-gray-3 hover:border-frame-orange/30 transition cursor-pointer group">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-frame-orange" />
                      <div>
                        <p className="text-sm font-medium text-frame-white">Review aprovada</p>
                        <p className="text-[0.65rem] text-frame-gray-light">Quando cliente aprovar</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleNotification("reviewApproved")}
                      className={`relative w-9 h-5 rounded-full transition-colors ${
                        notificationPrefs.reviewApproved ? "bg-frame-orange" : "bg-frame-gray-3"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                          notificationPrefs.reviewApproved ? "translate-x-[1.125rem]" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </label>

                  {/* Pagamento confirmado */}
                  <label className="flex items-center justify-between p-3 rounded-lg border border-frame-gray-3 hover:border-frame-orange/30 transition cursor-pointer group">
                    <div className="flex items-center gap-2.5">
                      <CreditCard className="w-4 h-4 text-frame-orange" />
                      <div>
                        <p className="text-sm font-medium text-frame-white">Pagamento confirmado</p>
                        <p className="text-[0.65rem] text-frame-gray-light">Faturas e cobranças</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleNotification("paymentSuccess")}
                      className={`relative w-9 h-5 rounded-full transition-colors ${
                        notificationPrefs.paymentSuccess ? "bg-frame-orange" : "bg-frame-gray-3"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                          notificationPrefs.paymentSuccess ? "translate-x-[1.125rem]" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-frame-gray-3">
                <p className="text-xs text-frame-gray-light flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-frame-orange" />
                  Emails enviados para: <strong className="text-frame-white">{user?.email}</strong>
                </p>
              </div>
            </div>

            {/* FASE 4: Regionalização Completa */}
            <div className="liquid-glass p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center border border-frame-orange/30 bg-frame-orange/[0.08] rounded-lg">
                  <Globe className="w-5 h-5 text-frame-orange" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Regionalização</h3>
                  <p className="text-frame-gray-light text-xs">Adapte o sistema à sua localização</p>
                </div>
              </div>

              {/* Fuso horário */}
              <div className="space-y-2">
                <label className="frame-label text-frame-gray-light flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  Fuso Horário
                </label>
                <select
                  value={timezone}
                  onChange={(e) => handleTimezoneChange(e.target.value)}
                  className="frame-input w-full"
                >
                  <option value="America/Sao_Paulo">São Paulo (GMT-3)</option>
                  <option value="America/New_York">Nova York (GMT-5)</option>
                  <option value="Europe/London">Londres (GMT+0)</option>
                  <option value="Europe/Lisbon">Lisboa (GMT+0)</option>
                  <option value="Asia/Tokyo">Tóquio (GMT+9)</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Formato de data */}
                <div className="space-y-2">
                  <label className="frame-label text-frame-gray-light">Formato de Data</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleDateFormatChange("DD/MM/YYYY")}
                      className={`flex-1 py-2.5 px-3 rounded-lg border text-sm font-medium transition ${
                        dateFormat === "DD/MM/YYYY"
                          ? "border-frame-orange bg-frame-orange/10 text-frame-white"
                          : "border-frame-gray-3 text-frame-gray-light hover:border-frame-gray-light"
                      }`}
                    >
                      DD/MM/YYYY
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDateFormatChange("MM/DD/YYYY")}
                      className={`flex-1 py-2.5 px-3 rounded-lg border text-sm font-medium transition ${
                        dateFormat === "MM/DD/YYYY"
                          ? "border-frame-orange bg-frame-orange/10 text-frame-white"
                          : "border-frame-gray-3 text-frame-gray-light hover:border-frame-gray-light"
                      }`}
                    >
                      MM/DD/YYYY
                    </button>
                  </div>
                  <p className="text-[0.65rem] text-frame-gray-light">
                    Exemplo: {dateFormat === "DD/MM/YYYY" ? "12/07/2026" : "07/12/2026"}
                  </p>
                </div>

                {/* Moeda preferida */}
                <div className="space-y-2">
                  <label className="frame-label text-frame-gray-light">Moeda Preferida</label>
                  <div className="flex gap-2">
                    {[
                      { value: "BRL", label: "R$", name: "Real" },
                      { value: "USD", label: "$", name: "Dólar" },
                      { value: "EUR", label: "€", name: "Euro" },
                    ].map((curr) => (
                      <button
                        key={curr.value}
                        type="button"
                        onClick={() => handleCurrencyChange(curr.value as "BRL" | "USD" | "EUR")}
                        className={`flex-1 py-2.5 px-3 rounded-lg border text-sm font-medium transition ${
                          currency === curr.value
                            ? "border-frame-orange bg-frame-orange/10 text-frame-white"
                            : "border-frame-gray-3 text-frame-gray-light hover:border-frame-gray-light"
                        }`}
                      >
                        {curr.label} {curr.name}
                      </button>
                    ))}
                  </div>
                  <p className="text-[0.65rem] text-frame-gray-light">
                    Exibição de preços e valores
                  </p>
                </div>
              </div>
            </div>

            {/* Preferências visuais — aplicadas globalmente e salvas automaticamente */}
            <div className="liquid-glass p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center border border-frame-orange/30 bg-frame-orange/[0.08] rounded-lg">
                  <Layout className="w-5 h-5 text-frame-orange" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Preferências Visuais</h3>
                  <p className="text-frame-gray-light text-xs">Alterações aplicadas imediatamente em toda a interface</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="frame-label text-frame-gray-light">Modo de Tema</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "dark", label: "Escuro", icon: "🌙" },
                    { value: "light", label: "Claro", icon: "☀️" },
                    { value: "auto", label: "Auto", icon: "💻" },
                  ].map((option) => (
                    <button key={option.value} type="button" onClick={() => handleThemeModeChange(option.value as "dark" | "light" | "auto")}
                      className={`py-2.5 px-3 rounded-lg border text-sm font-medium transition ${visualPrefs.themeMode === option.value ? "border-frame-orange bg-frame-orange/10 text-frame-white" : "border-frame-gray-3 text-frame-gray-light hover:border-frame-gray-light"}`}>
                      {option.icon} {option.label}
                    </button>
                  ))}
                </div>
                <p className="text-[0.65rem] text-frame-gray-light">Auto acompanha mudanças do tema do sistema operacional.</p>
              </div>

              <div className="space-y-2">
                <label className="frame-label text-frame-gray-light">Densidade da Interface</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "compact", label: "Compacta", desc: "Mais conteúdo" },
                    { value: "normal", label: "Normal", desc: "Balanceado" },
                    { value: "spacious", label: "Espaçosa", desc: "Mais ar" },
                  ].map((option) => (
                    <button key={option.value} type="button" onClick={() => handleDensityChange(option.value as "compact" | "normal" | "spacious")}
                      className={`py-2.5 px-3 rounded-lg border transition ${visualPrefs.density === option.value ? "border-frame-orange bg-frame-orange/10 text-frame-white" : "border-frame-gray-3 text-frame-gray-light hover:border-frame-gray-light"}`}>
                      <span className="block text-sm font-medium">{option.label}</span>
                      <span className="block text-[0.65rem] opacity-70">{option.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="frame-label text-frame-gray-light">Família de Fonte</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "inter", label: "Cena", desc: "Padrão" },
                    { value: "system", label: "Sistema", desc: "Nativa" },
                    { value: "mono", label: "Mono", desc: "Técnica" },
                  ].map((option) => (
                    <button key={option.value} type="button" onClick={() => handleFontChange(option.value as "inter" | "system" | "mono")}
                      className={`py-2.5 px-3 rounded-lg border transition ${visualPrefs.fontFamily === option.value ? "border-frame-orange bg-frame-orange/10 text-frame-white" : "border-frame-gray-3 text-frame-gray-light hover:border-frame-gray-light"}`}>
                      <span className="block text-sm font-medium">{option.label}</span>
                      <span className="block text-[0.65rem] opacity-70">{option.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button type="button" onClick={handleToggleAnimations}
                className="flex w-full items-center justify-between p-3 rounded-lg border border-frame-gray-3 hover:border-frame-orange/30 transition text-left">
                <span className="flex items-center gap-3">
                  <Sliders className="w-4 h-4 text-frame-orange" />
                  <span><span className="block text-sm font-medium text-frame-white">Reduzir animações</span><span className="block text-xs text-frame-gray-light">Remove transições e movimentos decorativos</span></span>
                </span>
                <span className={`relative w-11 h-6 rounded-full transition-colors ${visualPrefs.reduceAnimations ? "bg-frame-orange" : "bg-frame-gray-3"}`}>
                  <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${visualPrefs.reduceAnimations ? "translate-x-5" : "translate-x-0"}`} />
                </span>
              </button>
            </div>

            {/* Comportamentos — consumidos por Projetos e Video Reviews */}
            <div className="liquid-glass p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center border border-frame-orange/30 bg-frame-orange/[0.08] rounded-lg">
                  <Settings className="w-5 h-5 text-frame-orange" />
                </div>
                <div><h3 className="text-lg font-bold">Comportamentos Padrão</h3><p className="text-frame-gray-light text-xs">Define como Projetos e Video Reviews abrem</p></div>
              </div>

              <div className="space-y-2">
                <label className="frame-label text-frame-gray-light flex items-center gap-2"><SortAsc className="w-3.5 h-3.5" />Ordenação Padrão de Projetos</label>
                <select value={behaviorPrefs.defaultProjectSort} onChange={(event) => handleDefaultProjectSortChange(event.target.value as "recent" | "alphabetical" | "deadline")} className="frame-input w-full">
                  <option value="recent">Mais recentes primeiro</option>
                  <option value="alphabetical">Ordem alfabética</option>
                  <option value="deadline">Deadline (urgente primeiro)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="frame-label text-frame-gray-light flex items-center gap-2"><Layout className="w-3.5 h-3.5" />Visualização Padrão de Projetos</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => handleDefaultViewChange("grid")} className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border text-sm font-medium transition ${behaviorPrefs.defaultView === "grid" ? "border-frame-orange bg-frame-orange/10 text-frame-white" : "border-frame-gray-3 text-frame-gray-light"}`}><Grid className="w-4 h-4" /> Grade</button>
                  <button type="button" onClick={() => handleDefaultViewChange("list")} className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border text-sm font-medium transition ${behaviorPrefs.defaultView === "list" ? "border-frame-orange bg-frame-orange/10 text-frame-white" : "border-frame-gray-3 text-frame-gray-light"}`}><List className="w-4 h-4" /> Lista</button>
                </div>
              </div>

              <button type="button" onClick={handleAutoplayVideosChange} className="flex w-full items-center justify-between p-3 rounded-lg border border-frame-gray-3 hover:border-frame-orange/30 transition text-left">
                <span className="flex items-center gap-3"><PlayCircle className="w-4 h-4 text-frame-orange" /><span><span className="block text-sm font-medium text-frame-white">Autoplay de vídeos</span><span className="block text-xs text-frame-gray-light">Inicia reviews automaticamente, sem som</span></span></span>
                <span className={`relative w-11 h-6 rounded-full transition-colors ${behaviorPrefs.autoplayVideos ? "bg-frame-orange" : "bg-frame-gray-3"}`}><span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${behaviorPrefs.autoplayVideos ? "translate-x-5" : "translate-x-0"}`} /></span>
              </button>
            </div>

            {/* Discord */}
            <div className="liquid-glass p-6 space-y-4" style={{ borderColor: "rgba(var(--ds-brand-discord-rgb), 0.4)", background: "linear-gradient(135deg, rgba(var(--ds-brand-discord-rgb),0.08) 0%, rgba(var(--ds-brand-discord-rgb),0.02) 100%)" }}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-frame-mono text-[0.6rem] tracking-[0.18em] text-[var(--ds-brand-discord-label)] uppercase">{t("app.profile.community")}</p>
                  <h3 className="text-lg font-bold mt-1">{t("app.profile.discordTitle")}</h3>
                  <p className="text-frame-gray-light text-xs mt-1">{t("app.profile.discordDesc")}</p>
                </div>
                <a href="https://discord.gg/VYCVMHKKT" target="_blank" rel="noreferrer"
                  className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 bg-[var(--ds-brand-discord)] hover:bg-[var(--ds-brand-discord-hover)] px-4 py-2 font-frame-mono text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-white transition rounded-lg"
                >
                  <MessageCircle className="w-4 h-4" />
                  {t("app.profile.joinDiscord")}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        )}


        {/* ═══════════════════════════════════════════════════════════════════
            TAB: PRIVACIDADE
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "privacy" && (
          <div className="space-y-6 animate-in fade-in duration-300">

            {/* Exportar dados */}
            <div className="liquid-glass p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center border border-frame-orange/30 bg-frame-orange/[0.08] rounded-lg">
                  <Download className="w-5 h-5 text-frame-orange" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">{t("app.profile.exportData")}</h3>
                  <p className="text-frame-gray-light text-xs">{t("app.profile.exportDataLgpd")}</p>
                </div>
              </div>

              <p className="text-sm text-frame-gray-light">
                {t("app.profile.exportDataDesc")}
              </p>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 py-1">
                {[
                  t("app.profile.dataAccount"),
                  t("app.profile.dataProjects"),
                  t("app.profile.dataClients"),
                  t("app.profile.dataAiHistory"),
                  t("app.profile.dataFinancial"),
                  t("app.profile.dataPipeline"),
                ].map((item) => (
                  <div key={item} className="flex items-center gap-1.5 text-xs text-frame-gray-light">
                    <Check className="w-3 h-3 text-frame-orange shrink-0" />
                    {item}
                  </div>
                ))}
              </div>

              <button type="button" onClick={handleExportData} className="frame-btn-primary flex items-center gap-2">
                <Download className="w-4 h-4" />
                {t("app.profile.downloadData")}
              </button>
            </div>

            {/* FASE 5: Transparência de Dados */}
            <div className="liquid-glass p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center border border-frame-orange/30 bg-frame-orange/[0.08] rounded-lg">
                  <Database className="w-5 h-5 text-frame-orange" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Transparência de Dados</h3>
                  <p className="text-frame-gray-light text-xs">Veja exatamente o que armazenamos sobre você</p>
                </div>
              </div>

              {/* Dashboard de dados */}
              <div className="p-4 bg-frame-gray-2/30 border border-frame-gray-3 rounded-lg">
                <p className="text-xs text-frame-gray-light mb-4">Seus dados no CENA Studio:</p>

                {dataStatsLoading ? (
                  <p className="py-6 text-center text-xs text-frame-gray-light">Consultando dados vinculados à sua conta...</p>
                ) : dataStatsError || !dataStats ? (
                  <div className="border border-frame-red/30 bg-frame-red/5 p-4 text-sm text-frame-red">
                    Não foi possível confirmar os dados agora. Nenhum valor estimado será exibido.
                  </div>
                ) : (
                  <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="p-3 bg-frame-black rounded-lg border border-frame-gray-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Film className="w-4 h-4 text-frame-orange" />
                      <span className="text-[0.65rem] text-frame-gray-light uppercase tracking-wider">Projetos</span>
                    </div>
                    <p className="text-xl font-bold text-frame-white">{dataStats.projects.count}</p>
                    <p className="text-xs text-frame-gray-light mt-1">{dataStats.projects.size} MB</p>
                  </div>

                  <div className="p-3 bg-frame-black rounded-lg border border-frame-gray-3">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-frame-orange" />
                      <span className="text-[0.65rem] text-frame-gray-light uppercase tracking-wider">Arquivos</span>
                    </div>
                    <p className="text-xl font-bold text-frame-white">{dataStats.files.count}</p>
                    <p className="text-xs text-frame-gray-light mt-1">{dataStats.files.size} MB</p>
                  </div>

                  <div className="p-3 bg-frame-black rounded-lg border border-frame-gray-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-frame-orange" />
                      <span className="text-[0.65rem] text-frame-gray-light uppercase tracking-wider">Clientes</span>
                    </div>
                    <p className="text-xl font-bold text-frame-white">{dataStats.clients.count}</p>
                    <p className="text-xs text-frame-gray-light mt-1">{dataStats.clients.size} MB</p>
                  </div>

                  <div className="p-3 bg-frame-black rounded-lg border border-frame-gray-3">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageCircle className="w-4 h-4 text-frame-orange" />
                      <span className="text-[0.65rem] text-frame-gray-light uppercase tracking-wider">Reviews</span>
                    </div>
                    <p className="text-xl font-bold text-frame-white">{dataStats.reviews.count}</p>
                    <p className="text-xs text-frame-gray-light mt-1">{dataStats.reviews.size} MB</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-frame-orange/5 border border-frame-orange/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-frame-orange" />
                    <span className="text-sm font-medium text-frame-white">Armazenamento Total</span>
                  </div>
                  <span className="text-lg font-bold text-frame-orange">{dataStats.totalSize} MB</span>
                </div>
                  </>
                )}
              </div>

              {/* O que coletamos */}
              <div className="p-4 border border-frame-gray-3 rounded-lg space-y-3">
                <p className="text-sm font-medium text-frame-white flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-frame-orange" />
                  O que coletamos sobre você:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-frame-gray-light">
                  {[
                    "Informações de conta (nome, email, telefone)",
                    "Dados de projetos e clientes criados",
                    "Histórico de ações (login, uploads, edições)",
                    "Arquivos enviados (vídeos, imagens, documentos)",
                    "Comentários e reviews publicadas",
                    "Dados de pagamento (Stripe - não vemos seu cartão)",
                    "Estatísticas de uso (anônimas e agregadas)",
                    "Logs de segurança (IPs, dispositivos)",
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Check className="w-3 h-3 text-frame-orange shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Como usamos */}
              <div className="p-4 border border-frame-gray-3 rounded-lg space-y-2">
                <p className="text-sm font-medium text-frame-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-frame-orange" />
                  Como usamos seus dados:
                </p>
                <ul className="space-y-1.5 text-xs text-frame-gray-light">
                  <li className="flex items-start gap-2">
                    <span className="text-frame-orange">•</span>
                    <span>Fornecer e melhorar nossos serviços</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-frame-orange">•</span>
                    <span>Enviar notificações sobre atividades (se habilitado)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-frame-orange">•</span>
                    <span>Analisar uso agregado para melhorias (anônimo)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-frame-orange">•</span>
                    <span>Garantir segurança e prevenir fraudes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-frame-orange">•</span>
                    <span><strong>Nunca vendemos</strong> seus dados a terceiros</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* FASE 5: Controles de Privacidade */}
            <div className="liquid-glass p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center border border-frame-orange/30 bg-frame-orange/[0.08] rounded-lg">
                  <UserCheck className="w-5 h-5 text-frame-orange" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Controles de Privacidade</h3>
                  <p className="text-frame-gray-light text-xs">Defina quem pode ver suas informações</p>
                </div>
              </div>

              <div className="space-y-3">
                {/* Visibilidade do perfil */}
                <div className="p-4 border border-frame-gray-3 rounded-lg space-y-3">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-frame-orange" />
                    <p className="text-sm font-medium text-frame-white">Visibilidade do Perfil</p>
                  </div>
                  <p className="text-xs text-frame-gray-light">Quem pode ver seu nome e informações básicas</p>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => handleTogglePrivacy("profileVisibility", "public")}
                      className={`flex-1 py-2.5 px-3 rounded-lg border text-sm font-medium transition ${
                        privacySettings.profileVisibility === "public"
                          ? "border-frame-orange bg-frame-orange/10 text-frame-white"
                          : "border-frame-gray-3 text-frame-gray-light hover:border-frame-gray-light"
                      }`}
                    >
                      <div>Público</div>
                      <div className="text-[0.65rem] text-frame-gray-light">Todos podem ver</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTogglePrivacy("profileVisibility", "team")}
                      className={`flex-1 py-2.5 px-3 rounded-lg border text-sm font-medium transition ${
                        privacySettings.profileVisibility === "team"
                          ? "border-frame-orange bg-frame-orange/10 text-frame-white"
                          : "border-frame-gray-3 text-frame-gray-light hover:border-frame-gray-light"
                      }`}
                    >
                      <div>Equipe</div>
                      <div className="text-[0.65rem] text-frame-gray-light">Só membros</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTogglePrivacy("profileVisibility", "private")}
                      className={`flex-1 py-2.5 px-3 rounded-lg border text-sm font-medium transition ${
                        privacySettings.profileVisibility === "private"
                          ? "border-frame-orange bg-frame-orange/10 text-frame-white"
                          : "border-frame-gray-3 text-frame-gray-light hover:border-frame-gray-light"
                      }`}
                    >
                      <div>Privado</div>
                      <div className="text-[0.65rem] text-frame-gray-light">Só você</div>
                    </button>
                  </div>
                </div>

                {/* Indexação por buscadores */}
                <label className="flex items-center justify-between p-4 rounded-lg border border-frame-gray-3 hover:border-frame-orange/30 transition cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Search className="w-4 h-4 text-frame-orange" />
                    <div>
                      <p className="text-sm font-medium text-frame-white">Aparecer em buscadores</p>
                      <p className="text-xs text-frame-gray-light">Permitir Google/Bing indexar seu perfil público</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTogglePrivacy("allowSearchEngineIndexing")}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      privacySettings.allowSearchEngineIndexing ? "bg-frame-orange" : "bg-frame-gray-3"
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform shadow-sm ${
                        privacySettings.allowSearchEngineIndexing
                          ? "translate-x-5 bg-frame-black"
                          : "translate-x-0 bg-white"
                      }`}
                    />
                  </button>
                </label>

                {/* Compartilhar analytics com equipe */}
                <label className="flex items-center justify-between p-4 rounded-lg border border-frame-gray-3 hover:border-frame-orange/30 transition cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Share2 className="w-4 h-4 text-frame-orange" />
                    <div>
                      <p className="text-sm font-medium text-frame-white">Compartilhar estatísticas com equipe</p>
                      <p className="text-xs text-frame-gray-light">Membros podem ver métricas de uso agregadas</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTogglePrivacy("shareAnalyticsWithTeam")}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      privacySettings.shareAnalyticsWithTeam ? "bg-frame-orange" : "bg-frame-gray-3"
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform shadow-sm ${
                        privacySettings.shareAnalyticsWithTeam
                          ? "translate-x-5 bg-frame-black"
                          : "translate-x-0 bg-white"
                      }`}
                    />
                  </button>
                </label>
              </div>
            </div>

            {/* FASE 5: Solicitações LGPD */}
            <div className="liquid-glass p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center border border-frame-orange/30 bg-frame-orange/[0.08] rounded-lg">
                  <FileCheck className="w-5 h-5 text-frame-orange" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Direitos LGPD / GDPR</h3>
                  <p className="text-frame-gray-light text-xs">Exerça seus direitos sobre seus dados pessoais</p>
                </div>
              </div>

              <div className="p-4 bg-frame-orange/5 border border-frame-orange/20 rounded-lg">
                <p className="text-xs text-frame-gray-light">
                  De acordo com a <strong className="text-frame-white">LGPD</strong> (Lei Geral de Proteção de Dados) e <strong className="text-frame-white">GDPR</strong>, você tem direito de:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Solicitar cópia */}
                <div className="p-4 border border-frame-gray-3 rounded-lg hover:border-frame-orange/30 transition">
                  <div className="flex items-center gap-2 mb-3">
                    <Copy className="w-4 h-4 text-frame-orange" />
                    <h4 className="text-sm font-semibold text-frame-white">Solicitar Cópia</h4>
                  </div>
                  <p className="text-xs text-frame-gray-light mb-4">
                    Baixe agora, na hora, uma cópia completa de todos os seus dados em formato JSON
                  </p>
                  <button
                    type="button"
                    onClick={handleExportData}
                    className="w-full frame-btn-ghost text-xs py-2"
                  >
                    Baixar Cópia (JSON)
                  </button>
                </div>

                {/* Solicitar correção */}
                <div className="p-4 border border-frame-gray-3 rounded-lg hover:border-frame-orange/30 transition">
                  <div className="flex items-center gap-2 mb-3">
                    <FileCheck className="w-4 h-4 text-frame-orange" />
                    <h4 className="text-sm font-semibold text-frame-white">Corrigir Dados</h4>
                  </div>
                  <p className="text-xs text-frame-gray-light mb-4">
                    Solicite correção de informações incorretas ou desatualizadas
                  </p>
                  <button
                    type="button"
                    onClick={() => handleLgpdRequest("correct")}
                    className="w-full frame-btn-ghost text-xs py-2"
                  >
                    Solicitar Correção
                  </button>
                </div>

                {/* Solicitar exclusão */}
                <div className="p-4 border border-frame-red/30 rounded-lg hover:border-frame-red/50 transition bg-frame-red/5">
                  <div className="flex items-center gap-2 mb-3">
                    <Trash2 className="w-4 h-4 text-frame-red" />
                    <h4 className="text-sm font-semibold text-frame-red">Excluir Dados</h4>
                  </div>
                  <p className="text-xs text-frame-gray-light mb-4">
                    Solicite exclusão permanente de todos os seus dados
                  </p>
                  <button
                    type="button"
                    onClick={() => handleLgpdRequest("delete")}
                    className="w-full px-3 py-2 border border-frame-red/50 text-frame-red hover:bg-frame-red/10 rounded-lg text-xs font-medium transition"
                  >
                    Solicitar Exclusão
                  </button>
                </div>
              </div>

              {/* Modal de solicitação */}
              {showLgpdRequest && (
                <div className="p-4 border border-frame-orange/30 rounded-lg bg-frame-orange/5 space-y-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-frame-orange shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-frame-white mb-2">
                        {lgpdRequestType === "copy" && "Confirmar Solicitação de Cópia de Dados"}
                        {lgpdRequestType === "correct" && "Confirmar Solicitação de Correção"}
                        {lgpdRequestType === "delete" && "Confirmar Solicitação de Exclusão"}
                      </p>
                      <p className="text-xs text-frame-gray-light mb-4">
                        {lgpdRequestType === "copy" &&
                          "Você receberá um email com link para download de todos os seus dados em até 30 dias, conforme LGPD Art. 18."}
                        {lgpdRequestType === "correct" &&
                          "Nossa equipe entrará em contato em até 5 dias úteis para entender quais correções você precisa."}
                        {lgpdRequestType === "delete" &&
                          "Todos os seus dados serão PERMANENTEMENTE excluídos em até 7 dias úteis. Esta ação é IRREVERSÍVEL."}
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleSubmitLgpdRequest}
                          className="frame-btn-primary text-xs py-2 px-4"
                        >
                          Confirmar Solicitação
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowLgpdRequest(false); setLgpdRequestType(null); }}
                          className="frame-btn-ghost text-xs py-2 px-4"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-3 bg-frame-gray-2/30 border border-frame-gray-3 rounded-lg">
                <p className="text-xs text-frame-gray-light flex items-start gap-2">
                  <Shield className="w-3.5 h-3.5 text-frame-orange shrink-0 mt-0.5" />
                  <span>
                    Todas as solicitações são processadas conforme <strong className="text-frame-white">LGPD (Lei nº 13.709/2018)</strong> e <strong className="text-frame-white">GDPR</strong>.
                    Para dúvidas, entre em contato: <a href="mailto:privacidade@cenastudio.com.br" className="text-frame-orange hover:underline">privacidade@cenastudio.com.br</a>
                  </span>
                </p>
              </div>
            </div>

            {/* Histórico de Solicitações LGPD */}
            {lgpdRequestHistory.length > 0 && (
              <div className="liquid-glass p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 flex items-center justify-center border border-frame-orange/30 bg-frame-orange/[0.08] rounded-lg">
                    <Clock className="w-5 h-5 text-frame-orange" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Histórico de Solicitações</h3>
                    <p className="text-frame-gray-light text-xs">Suas solicitações LGPD/GDPR anteriores</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {lgpdRequestHistory.map((request) => {
                    const typeLabels = {
                      data_copy: "Cópia de Dados",
                      data_correction: "Correção de Dados",
                      data_deletion: "Exclusão de Dados",
                    };
                    const statusLabels = {
                      pending: "Pendente",
                      processing: "Processando",
                      completed: "Concluído",
                    };
                    const statusColors = {
                      pending: "text-frame-orange",
                      processing: "text-blue-400",
                      completed: "text-frame-green",
                    };

                    return (
                      <div
                        key={request.id}
                        className="p-4 border border-frame-gray-3 rounded-lg hover:border-frame-orange/30 transition"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <FileCheck className="w-4 h-4 text-frame-orange" />
                              <span className="text-sm font-semibold text-frame-white">
                                {typeLabels[request.type as keyof typeof typeLabels] || request.type}
                              </span>
                            </div>
                            <div className="space-y-1 text-xs text-frame-gray-light">
                              <p className="flex items-center gap-2">
                                <span className="text-frame-gray-muted">Protocolo:</span>
                                <code className="font-mono text-frame-white">{request.id}</code>
                              </p>
                              <p className="flex items-center gap-2">
                                <span className="text-frame-gray-muted">Solicitado em:</span>
                                <span>{formatDateTime(request.createdAt)}</span>
                              </p>
                              {request.processedAt && (
                                <p className="flex items-center gap-2">
                                  <span className="text-frame-gray-muted">Processado em:</span>
                                  <span>{formatDateTime(request.processedAt)}</span>
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
                                request.status === "completed"
                                  ? "border-frame-green/30 bg-frame-green/10 text-frame-green"
                                  : request.status === "processing"
                                  ? "border-blue-400/30 bg-blue-400/10 text-blue-400"
                                  : "border-frame-orange/30 bg-frame-orange/10 text-frame-orange"
                              }`}
                            >
                              {request.status === "completed" && <CheckCircle2 className="w-3 h-3" />}
                              {request.status === "processing" && <RefreshCw className="w-3 h-3 animate-spin" />}
                              {request.status === "pending" && <Clock className="w-3 h-3" />}
                              {statusLabels[request.status as keyof typeof statusLabels] || request.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Termos e políticas */}
            <div className="liquid-glass p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center border border-frame-orange/30 bg-frame-orange/[0.08] rounded-lg">
                  <FileText className="w-5 h-5 text-frame-orange" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">{t("app.profile.termsTitle")}</h3>
                  <p className="text-frame-gray-light text-xs">{t("app.profile.termsDesc")}</p>
                </div>
              </div>

              <div className="space-y-2">
                <a href="https://cenastudio.com.br/termos" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 rounded-lg border border-frame-gray-3 hover:border-frame-orange/50 transition group">
                  <span className="text-sm text-frame-white">{t("app.profile.termsOfUse")}</span>
                  <ExternalLink className="w-4 h-4 text-frame-gray-light group-hover:text-frame-orange transition" />
                </a>
                <a href="https://cenastudio.com.br/privacidade" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 rounded-lg border border-frame-gray-3 hover:border-frame-orange/50 transition group">
                  <span className="text-sm text-frame-white">{t("app.profile.privacyPolicy")}</span>
                  <ExternalLink className="w-4 h-4 text-frame-gray-light group-hover:text-frame-orange transition" />
                </a>
                {(plan?.planId === "studio" || plan?.planId === "whitelabel" || plan?.planId === "enterprise") && (
                  <a href="https://cenastudio.com.br/sla" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 rounded-lg border border-frame-gray-3 hover:border-frame-orange/50 transition group">
                    <div>
                      <span className="text-sm text-frame-white">SLA - Service Level Agreement</span>
                      <span className="block text-xs text-frame-gray-light mt-0.5">Garantias do seu plano {plan?.planId}</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-frame-gray-light group-hover:text-frame-orange transition" />
                  </a>
                )}
                {plan?.planId === "enterprise" && (
                  <a href="https://cenastudio.com.br/dpa" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 rounded-lg border border-frame-gray-3 hover:border-frame-orange/50 transition group">
                    <div>
                      <span className="text-sm text-frame-white">DPA - Data Processing Agreement</span>
                      <span className="block text-xs text-frame-gray-light mt-0.5">Processamento de dados LGPD/GDPR</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-frame-gray-light group-hover:text-frame-orange transition" />
                  </a>
                )}
              </div>
            </div>


            {/* Excluir conta */}
            <div className="liquid-glass p-6 space-y-4" style={{ borderColor: "rgba(239, 68, 68, 0.3)", background: "linear-gradient(135deg, rgba(239,68,68,0.05) 0%, transparent 100%)" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center border border-frame-red/30 bg-frame-red/[0.08] rounded-lg">
                  <Trash2 className="w-5 h-5 text-frame-red" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-frame-red">{t("app.profile.deleteAccount")}</h3>
                  <p className="text-frame-gray-light text-xs">{t("app.profile.deleteAccountDesc")}</p>
                </div>
              </div>

              <p className="text-sm text-frame-gray-light">
                {t("app.profile.deleteAccountWarning")}
              </p>

              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="frame-btn-ghost text-frame-red/70 hover:text-frame-red hover:border-frame-red/50 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  {t("app.profile.deleteAccount")}
                </button>
              ) : (
                <div className="p-4 border border-frame-red/30 rounded-lg bg-frame-red/[0.05] space-y-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-frame-red shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-frame-white">{t("app.profile.deleteConfirmTitle")}</p>
                      <p className="text-xs text-frame-gray-light mt-1">
                        {locale === "en" ? "Type" : "Digite"} <strong className="text-frame-red">{deleteConfirmationPhrase}</strong> {locale === "en" ? "to submit the request." : "para enviar a solicitação."}
                      </p>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className="frame-input w-full border-frame-red/30"
                    placeholder={deleteConfirmationPhrase}
                  />

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      disabled={deleteConfirmText !== deleteConfirmationPhrase || submittingDeleteRequest}
                      className="flex-1 px-4 py-2 bg-frame-red text-white rounded-lg font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-frame-red/80 transition"
                    >
                      {submittingDeleteRequest
                        ? (locale === "en" ? "Submitting..." : "Enviando...")
                        : t("app.profile.deletePermanently")}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(""); }}
                      className="frame-btn-ghost"
                    >
                      {t("app.profile.cancel")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default function Profile() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}
