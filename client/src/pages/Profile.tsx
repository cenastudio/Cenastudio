import AppNavBar from "@/components/AppNavBar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { CHECKOUT_MODAL_PLAN, planDisplayLabel } from "@/lib/plans";
import { useApp } from "@/contexts/AppContext";
import { api, openBillingPortal, ApiError } from "@/lib/api";
import { useLanguage, translate } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { readStudioSettings, type StudioSettings } from "@/lib/studioSettings";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useEffect, useState, useRef } from "react";
import {
  CalendarClock, Crown, LogOut, ShieldCheck, UserRound, Zap, Settings,
  Users, Save, Building2, Phone, MessageCircle, Bug, Megaphone, ExternalLink,
  Lock, Eye, EyeOff, KeyRound, Check, Globe, Bell, Clock, Camera, Upload,
  FileText, Trash2, Download, History, Shield, Smartphone, Monitor, MapPin,
  Mail, CreditCard, Receipt, TrendingUp, ChevronRight, AlertTriangle, X,
  Palette, Languages, Sparkles
} from "lucide-react";

type ProfileTab = "profile" | "security" | "plan" | "preferences" | "privacy";

// ─── RECEIPT PDF ────────────────────────────────────────────────────────────
function esc(value: string | number | null | undefined) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c] || c));
}

interface ReceiptData {
  receiptNumber: string;
  planName: string;
  planId: string;
  amount: number;
  paidAt: string;
  userName: string;
  userEmail: string;
  studio: StudioSettings;
  locale: "pt" | "en";
}

function buildReceiptHtml(data: ReceiptData): string {
  const L = (key: string) => translate(data.locale, key);
  const color = data.studio.primaryColor || "#FF6B00";
  const currencyLocale = data.locale === "en" ? "en-US" : "pt-BR";
  const formattedAmount = new Intl.NumberFormat(currencyLocale, { style: "currency", currency: "BRL" }).format(data.amount);
  const formattedDate = new Intl.DateTimeFormat(currencyLocale, { day: "2-digit", month: "long", year: "numeric" }).format(new Date(data.paidAt));

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${L("app.receipt.title")} #${esc(data.receiptNumber)} — ${esc(data.studio.studioName)}</title>
  <style>
    @page{size:A4;margin:0}
    *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    html,body{margin:0;min-height:100%;background:#0d0d0d;color:#e8e8e8;font-family:Arial,sans-serif}
    body{background:radial-gradient(circle at 88% 5%,${color}2e,transparent 34%),linear-gradient(135deg,#15100d 0%,#0d0d0d 42%,#050505 100%)}
    .page{width:210mm;min-height:297mm;margin:0 auto;padding:18mm;background:radial-gradient(circle at 92% 4%,${color}30,transparent 33%),linear-gradient(180deg,#111 0%,#0d0d0d 100%);position:relative;overflow:visible}
    .page:before{content:"";position:absolute;inset:0;background:linear-gradient(135deg,rgba(232,80,2,.08),transparent 32%),radial-gradient(circle at 10% 92%,rgba(217,195,171,.08),transparent 32%);pointer-events:none}
    .page>*{position:relative;z-index:1}
    .header{display:flex;justify-content:space-between;gap:32px;padding-bottom:28px;border-bottom:3px solid ${color}}
    .brand{font-size:34px;font-weight:900;letter-spacing:.06em;color:#fff}.brand span{color:${color}}
    .sub{font-size:11px;color:${color};font-weight:900;letter-spacing:.18em;text-transform:uppercase;margin-top:5px}
    .doc{text-align:right}.doc small{display:block;color:#777;font-size:10px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}
    .doc strong{display:block;color:${color};font-size:28px;margin-top:4px}
    .badge{display:inline-flex;align-items:center;gap:8px;margin-top:32px;background:rgba(0,200,100,0.12);border:1px solid rgba(0,200,100,0.3);padding:10px 20px}
    .badge-dot{width:10px;height:10px;border-radius:50%;background:#00c864;flex-shrink:0}
    .badge-text{font-size:13px;font-weight:700;color:#00c864;letter-spacing:.06em;text-transform:uppercase}
    h1{font-size:42px;line-height:1;margin:28px 0 8px;color:#fff}
    .muted{color:#999;font-size:13px;line-height:1.55}
    .divider{height:1px;background:linear-gradient(90deg,${color}44,transparent);margin:28px 0}
    .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:0 0 28px}
    .field{background:#151515;border:1px solid #252525;padding:13px 15px}
    .label{font-size:9px;color:#777;font-weight:900;letter-spacing:.1em;text-transform:uppercase;margin-bottom:5px}
    .value{font-size:13px;color:#eee;font-weight:700}
    .breakdown{background:#141414;border:1px solid #252525;margin-bottom:16px}
    .breakdown-row{display:flex;justify-content:space-between;padding:14px 20px;border-top:1px solid #252525;font-size:13px;color:#bbb}
    .breakdown-row:first-child{border-top:0}
    .breakdown-row strong{color:#eee}
    .total-box{display:flex;justify-content:space-between;align-items:center;gap:20px;padding:24px 28px;border:1px solid ${color}77;background:linear-gradient(135deg,${color}22,rgba(0,0,0,0))}
    .total-box small{display:block;color:${color};font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;margin-bottom:6px}
    .total-box strong{font-size:44px;color:#fff;font-weight:900}
    .total-box .method{font-size:12px;color:#777;margin-top:4px}
    .note{background:#111;border:1px solid #242424;padding:20px;margin-top:28px;color:#aaa;font-size:12px;line-height:1.7}
    .footer{display:flex;justify-content:space-between;align-items:flex-end;margin-top:48px;padding-top:20px;border-top:1px solid #252525}
    .footer-brand{font-size:13px;color:#555}
    .footer-brand strong{display:block;color:#888;font-size:15px;margin-bottom:4px}
    .watermark{font-size:10px;color:#333;font-weight:900;letter-spacing:.2em;text-transform:uppercase}
    @media screen{.page{box-shadow:0 22px 70px rgba(0,0,0,.34)}}
    @media print{
      html,body{width:210mm;min-height:297mm;background:#0d0d0d}
      .page{width:210mm;min-height:297mm;height:auto;margin:0;padding:16mm;box-shadow:none}
      .header,.field,.breakdown-row,.total-box,.note{break-inside:avoid;page-break-inside:avoid}
    }
  </style>
</head>
<body>
  <main class="page">
    <header class="header">
      <div>
        <div class="brand">${esc(data.studio.studioName)}<span>.</span></div>
        <div class="sub">${esc(data.studio.legalName || L("app.receipt.platformLabel"))}</div>
      </div>
      <div class="doc">
        <small>${L("app.receipt.title")}</small>
        <strong>#${esc(data.receiptNumber)}</strong>
        <small>${formattedDate}</small>
      </div>
    </header>

    <div class="badge">
      <div class="badge-dot"></div>
      <span class="badge-text">${L("app.receipt.confirmed")}</span>
    </div>

    <h1>${L("app.receipt.subscription")} ${esc(data.planName)}</h1>
    <p class="muted">${L("app.receipt.platformAccess").replace("{plan}", esc(data.planName))}</p>

    <div class="divider"></div>

    <div class="grid">
      <div class="field"><div class="label">${L("app.receipt.client")}</div><div class="value">${esc(data.userName)}</div></div>
      <div class="field"><div class="label">Email</div><div class="value">${esc(data.userEmail)}</div></div>
      <div class="field"><div class="label">${L("app.receipt.plan")}</div><div class="value">Cena Studio ${esc(data.planName)}</div></div>
      <div class="field"><div class="label">${L("app.receipt.paymentDate")}</div><div class="value">${formattedDate}</div></div>
      <div class="field"><div class="label">${L("app.receipt.accessPeriod")}</div><div class="value">${L("app.receipt.accessValue")}</div></div>
      <div class="field"><div class="label">${L("app.receipt.receiptNumber")}</div><div class="value">#${esc(data.receiptNumber)}</div></div>
    </div>

    <div class="breakdown">
      <div class="breakdown-row"><span>${L("app.receipt.subscription")} Cena Studio ${esc(data.planName)}</span><strong>${formattedAmount}</strong></div>
      <div class="breakdown-row"><span>${L("app.receipt.discount")}</span><strong>R$ 0,00</strong></div>
    </div>

    <div class="total-box">
      <div>
        <small>${L("app.receipt.totalPaid")}</small>
        <div class="method">${L("app.receipt.paymentMethod")}</div>
      </div>
      <strong>${formattedAmount}</strong>
    </div>

    <div class="note">
      ${L("app.receipt.note").replace("{plan}", esc(data.planName))}
      ${data.studio.email ? `<br/>${data.locale === "en" ? "Contact" : "Contato"}: ${esc(data.studio.email)}` : ""}
    </div>

    <footer class="footer">
      <div class="footer-brand">
        <strong>${esc(data.studio.studioName)}</strong>
        ${data.studio.city ? esc(data.studio.city) + " · " : ""}cenastudio.com.br
      </div>
      <div class="watermark">${L("app.receipt.watermark")}</div>
    </footer>
  </main>
</body>
</html>`;
}

function printReceiptPdf(data: ReceiptData) {
  const html = buildReceiptHtml(data);
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0";
  document.body.appendChild(iframe);
  const cleanup = () => window.setTimeout(() => iframe.remove(), 1000);
  iframe.onload = () => {
    const fw = iframe.contentWindow;
    if (!fw) { cleanup(); return; }
    fw.focus();
    fw.onafterprint = cleanup;
    window.setTimeout(() => { fw.print(); cleanup(); }, 250);
  };
  iframe.srcdoc = html;
}
// ─────────────────────────────────────────────────────────────────────────────

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
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all rounded-lg ${
        active
          ? "bg-frame-orange/15 text-frame-orange border border-frame-orange/30"
          : "text-frame-gray-light hover:text-frame-white hover:bg-frame-gray-2/50"
      }`}
    >
      <Icon className="w-4 h-4" />
      <span className="hidden sm:inline">{label}</span>
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


// Usage progress bar
function UsageBar({ used, total, label }: { used: number; total: number; label: string }) {
  const { t } = useLanguage();
  const percentage = total === -1 ? 0 : Math.min((used / total) * 100, 100);
  const isUnlimited = total === -1;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs">
        <span className="text-frame-gray-light">{label}</span>
        <span className="font-mono text-frame-white">
          {isUnlimited ? t("app.profile.unlimited") : `${used}/${total}`}
        </span>
      </div>
      <div className="h-2 bg-frame-gray-2 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 rounded-full ${
            isUnlimited
              ? "bg-gradient-to-r from-frame-green to-frame-green/60 w-full"
              : percentage > 80
              ? "bg-gradient-to-r from-frame-red to-frame-orange"
              : "bg-gradient-to-r from-frame-orange to-frame-gold"
          }`}
          style={{ width: isUnlimited ? "100%" : `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Session card
function SessionCard({ device, location, lastActive, current }: {
  device: string;
  location: string;
  lastActive: string;
  current?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <div className={`glow-card p-4 ${current ? "border-frame-green/40" : ""}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {device.toLowerCase().includes("mobile") ? (
            <Smartphone className="w-5 h-5 text-frame-orange" />
          ) : (
            <Monitor className="w-5 h-5 text-frame-orange" />
          )}
          <div>
            <p className="text-sm font-medium text-frame-white">{device}</p>
            <p className="text-xs text-frame-gray-light flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {location}
            </p>
          </div>
        </div>
        {current ? (
          <span className="text-[0.6rem] font-mono uppercase tracking-wider text-frame-green bg-frame-green/10 px-2 py-1 rounded">
            {t("app.profile.currentSession")}
          </span>
        ) : (
          <button className="text-frame-red/70 hover:text-frame-red text-xs">{t("app.profile.endSession")}</button>
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
  const [studioName, setStudioName] = useState("");
  const [studioRole, setStudioRole] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Studio extended info
  const [legalName, setLegalName] = useState("");
  const [document, setDocument] = useState(""); // CNPJ/CPF
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [website, setWebsite] = useState("");

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);

  // Preferences state
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);

  // Privacy state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Studio settings (para o recibo)
  const [studio, setStudio] = useState<StudioSettings>(() => readStudioSettings());

  useEffect(() => {
    api.studioSettings.get().then((data) => setStudio(data)).catch(() => null);
  }, []);

  useEffect(() => {
    setName(user?.name || "");
    setStudioName(user?.studioName || "");
    setStudioRole(user?.studioRole || "");
    setPhone(user?.phone || "");
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
      await api.auth.updateProfile({ name, studioName, studioRole, phone });
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

  const handleExportReceipt = (amount: number) => {
    const receiptNumber = `RCB-${Date.now().toString().slice(-8)}`;
    printReceiptPdf({
      receiptNumber,
      planName: plan?.planId === "studio" ? "Studio" : plan?.planId === "pro" ? "Pro" : "Free",
      planId: plan?.planId ?? "free",
      amount,
      paidAt: new Date().toISOString(),
      userName: user?.name || user?.email || "—",
      userEmail: user?.email || "—",
      studio,
      locale,
    });
    toast.success(t("app.profile.toastReceiptOpen"));
  };

  const handleDeleteAccount = () => {
    if (deleteConfirmText !== "EXCLUIR MINHA CONTA") {
      toast.error(t("app.profile.toastDeleteConfirmError"));
      return;
    }
    toast.info(t("app.profile.toastDeleteInfo"));
    setShowDeleteConfirm(false);
    setDeleteConfirmText("");
  };

  const avatarChar = (user?.name ?? user?.email ?? "U").charAt(0).toUpperCase();


  // Mock data for sessions (would come from API)
  const sessions = [
    { device: "Chrome no macOS", location: "São Paulo, BR", lastActive: "Agora", current: true },
    { device: "Safari no iPhone", location: "São Paulo, BR", lastActive: "Há 2 horas", current: false },
  ];

  // Mock activity data
  const recentActivity = [
    { action: "Login realizado", date: new Date().toISOString() },
    { action: "Projeto criado: Demo", date: new Date(Date.now() - 86400000).toISOString() },
    { action: "Senha alterada", date: new Date(Date.now() - 172800000).toISOString() },
  ];

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

        {/* ─── TABS ─── */}
        <div className="flex flex-wrap gap-2 mb-8 pb-4 border-b border-frame-gray-3/30">
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
            </div>

            {/* Dados do estúdio */}
            <div className="liquid-glass p-6 space-y-5">
              <div>
                <p className="font-frame-mono text-[0.6rem] tracking-[0.18em] text-frame-orange uppercase">
                  {t("app.profile.studioData")}
                </p>
                <h3 className="text-lg font-bold mt-1">{t("app.profile.companyInfo")}</h3>
                <p className="text-frame-gray-light text-xs mt-1">{t("app.profile.companyInfoDesc")}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-1.5">
                  <span className="frame-label text-frame-gray-light">{t("app.profile.studioName")}</span>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-frame-gray-light" />
                    <input value={studioName} onChange={(e) => setStudioName(e.target.value)} className="frame-input w-full pl-10" placeholder="Ex: Cena Studio" />
                  </div>
                </label>
                <label className="space-y-1.5">
                  <span className="frame-label text-frame-gray-light">{t("app.profile.yourRole")}</span>
                  <input value={studioRole} onChange={(e) => setStudioRole(e.target.value)} className="frame-input w-full" placeholder="Ex: Diretor, Produtor" />
                </label>
                <label className="space-y-1.5">
                  <span className="frame-label text-frame-gray-light">{t("app.profile.legalName")} <span className="text-frame-gray-light/50">{t("app.profile.optional")}</span></span>
                  <input value={legalName} onChange={(e) => setLegalName(e.target.value)} className="frame-input w-full" placeholder={t("app.profile.legalNamePlaceholder")} />
                </label>
                <label className="space-y-1.5">
                  <span className="frame-label text-frame-gray-light">{t("app.profile.cnpjCpf")} <span className="text-frame-gray-light/50">{t("app.profile.optional")}</span></span>
                  <input value={document} onChange={(e) => setDocument(e.target.value)} className="frame-input w-full" placeholder="00.000.000/0001-00" />
                </label>
                <label className="space-y-1.5">
                  <span className="frame-label text-frame-gray-light">{t("app.profile.city")} <span className="text-frame-gray-light/50">{t("app.profile.optional")}</span></span>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-frame-gray-light" />
                    <input value={city} onChange={(e) => setCity(e.target.value)} className="frame-input w-full pl-10" placeholder="São Paulo, SP" />
                  </div>
                </label>
                <label className="space-y-1.5">
                  <span className="frame-label text-frame-gray-light">Website <span className="text-frame-gray-light/50">{t("app.profile.optional")}</span></span>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-frame-gray-light" />
                    <input value={website} onChange={(e) => setWebsite(e.target.value)} className="frame-input w-full pl-10" placeholder="https://seusite.com" />
                  </div>
                </label>
              </div>

              <button type="button" onClick={handleSaveProfile} disabled={savingProfile} className="frame-btn-primary flex items-center gap-2">
                <Save className="w-4 h-4" />
                {savingProfile ? t("app.profile.saving") : t("app.profile.saveChanges")}
              </button>
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

            {/* Alterar senha */}
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


            {/* 2FA - Preparado para futuro */}
            <div className="liquid-glass p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center border border-frame-gray-3 bg-frame-gray-2/50 rounded-lg">
                  <Smartphone className="w-5 h-5 text-frame-gray-light" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold">{t("app.profile.twoFactor")}</h3>
                  <p className="text-frame-gray-light text-xs">{t("app.profile.twoFactorDesc")}</p>
                </div>
                <span className="text-[0.6rem] font-mono uppercase tracking-wider px-2 py-1 rounded text-frame-gray-light bg-frame-gray-2 border border-frame-gray-3">
                  {t("app.profile.comingSoon")}
                </span>
              </div>
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
                <button className="frame-btn-ghost text-xs text-frame-red/70 hover:text-frame-red">
                  {t("app.profile.endAll")}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sessions.map((session, idx) => (
                  <SessionCard key={idx} {...session} />
                ))}
              </div>
            </div>

            {/* Histórico de atividade */}
            <div className="liquid-glass p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center border border-frame-orange/30 bg-frame-orange/[0.08] rounded-lg">
                  <History className="w-5 h-5 text-frame-orange" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">{t("app.profile.recentActivity")}</h3>
                  <p className="text-frame-gray-light text-xs">{t("app.profile.recentActivityDesc")}</p>
                </div>
              </div>

              <div className="space-y-2">
                {recentActivity.map((activity, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b border-frame-gray-3/30 last:border-0">
                    <span className="text-sm text-frame-white">{activity.action}</span>
                    <span className="text-xs text-frame-gray-light">{formatDateTime(activity.date, locale)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
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
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-15 pointer-events-none" style={{ background: "#e85002" }} />

              <div className="relative flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider"
                      style={{
                        background: "rgba(232,80,2,0.15)",
                        color: "#e85002",
                        border: "1px solid rgba(232,80,2,0.35)",
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
                    <div className="flex items-center gap-2"><Users className="w-4 h-4 text-frame-orange" /><span className="text-sm text-frame-white"><strong>{plan?.planId === "studio" ? t("app.profile.planFeat.teamMembers") : plan?.planId === "pro" ? t("app.profile.planFeat.proClients") : t("app.profile.planFeat.freeClients")}</strong></span></div>
                    {plan?.status === "trial" && plan?.trialEndsAt && <div className="flex items-center gap-2"><CalendarClock className="w-4 h-4 text-frame-orange" /><span className="text-sm text-frame-orange">Trial até {formatDate(plan.trialEndsAt, "—", locale)}</span></div>}
                  </div>
                </div>
                <div className="flex flex-col gap-3 shrink-0">
                  <button type="button" onClick={handlePlanAction} className="frame-btn-primary px-6 py-3 text-sm">{plan?.planId === "free" || plan?.status === "trial" ? t("app.profile.upgrade") : t("app.profile.managePlan")}</button>
                  {plan?.planId !== "free" && <p className="text-[0.65rem] text-frame-gray-light text-center">{t("app.profile.nextCharge")} {formatDate(plan?.trialEndsAt, "—", locale)}</p>}
                </div>
              </div>
              <div className="relative mt-6 pt-6 border-t border-white/10"><UsageBar used={42} total={plan?.generationLimit ?? 100} label={t("app.profile.usageThisMonth")} /></div>
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
                  <p className="text-xs text-frame-gray-light mt-2">{plan?.planId === "free" ? t("app.profile.planFeat.freeClients") : plan?.planId === "pro" ? t("app.profile.planFeat.proClients") : t("app.profile.planFeat.unlimitedClients")}</p>
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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* FREE */}
                <div className={`plan-card plan-card-free relative p-5 ${plan?.planId === "free" ? "ring-2 ring-frame-orange" : ""}`}>
                  {plan?.planId === "free" && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-frame-orange text-frame-black text-[0.6rem] font-bold uppercase tracking-wider rounded-full">{t("app.profile.yourPlan")}</div>}
                  <div className="text-center pt-2">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center" style={{ background: "rgba(232,80,2,0.15)", border: "1px solid rgba(232,80,2,0.40)" }}>
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
                    <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-frame-orange shrink-0 opacity-70" />{t("app.profile.planFeat.freeExport")}</li>
                    <li className="plan-struck flex items-center gap-2 text-sm"><X className="w-4 h-4 shrink-0 opacity-40" />{t("app.profile.planFeat.noReviews")}</li>
                    <li className="plan-struck flex items-center gap-2 text-sm"><X className="w-4 h-4 shrink-0 opacity-40" />{t("app.profile.planFeat.noTeam")}</li>
                  </ul>
                </div>

                {/* PRO */}
                <div className={`plan-card plan-card-pro relative p-5 ${plan?.planId === "pro" ? "ring-2 ring-frame-orange" : ""}`}>
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-frame-orange text-frame-black text-[0.6rem] font-bold uppercase tracking-wider rounded-full">
                    {plan?.planId === "pro" ? t("app.profile.yourPlan") : t("app.profile.popular")}
                  </div>
                  <div className="text-center pt-2">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center" style={{ background: "rgba(232,80,2,0.20)", border: "1px solid rgba(232,80,2,0.55)" }}>
                      <Zap className="w-6 h-6 text-frame-orange" />
                    </div>
                    <h4 className="text-xl font-bold">Pro</h4>
                    <p className="text-3xl font-bold mt-2">R$ 199<span className="plan-muted text-base font-normal">{t("app.profile.perMonth")}</span></p>
                  </div>
                  <p className="plan-muted text-sm text-center mt-4">{t("app.profile.proDesc")}</p>
                  <ul className="mt-6 space-y-3">
                    <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-frame-orange shrink-0" />{t("app.profile.planFeat.proGen")}</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-frame-orange shrink-0" />{t("app.profile.planFeat.proClients")}</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-frame-orange shrink-0" />{t("app.profile.planFeat.unlimitedProjects")}</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-frame-orange shrink-0" />{t("app.profile.planFeat.proExport")}</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-frame-orange shrink-0" />{t("app.profile.planFeat.reviews")}</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-frame-orange shrink-0" />{t("app.profile.planFeat.crm")}</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-frame-orange shrink-0" />{t("app.profile.planFeat.financial")}</li>
                    <li className="plan-struck flex items-center gap-2 text-sm"><X className="w-4 h-4 shrink-0 opacity-40" />{t("app.profile.planFeat.noTeam")}</li>
                  </ul>
                  {plan?.planId === "free" && <button type="button" onClick={handlePlanAction} className="w-full mt-6 frame-btn-primary py-2.5">{t("app.profile.subscribePro")}</button>}
                </div>

                {/* STUDIO */}
                <div className={`plan-card plan-card-studio relative p-5 ${plan?.planId === "studio" ? "ring-2 ring-frame-orange" : ""}`}>
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-frame-orange text-frame-black text-[0.6rem] font-bold uppercase tracking-wider rounded-full">
                    {plan?.planId === "studio" ? t("app.profile.yourPlan") : t("app.profile.complete")}
                  </div>
                  <div className="text-center pt-2">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center" style={{ background: "rgba(232,80,2,0.28)", border: "1px solid rgba(232,80,2,0.70)" }}>
                      <Crown className="w-6 h-6 text-frame-orange" />
                    </div>
                    <h4 className="text-xl font-bold">Studio</h4>
                    <p className="text-3xl font-bold mt-2">R$ 399<span className="plan-muted text-base font-normal">{t("app.profile.perMonth")}</span></p>
                  </div>
                  <p className="plan-muted text-sm text-center mt-4">{t("app.profile.studioDesc")}</p>
                  <ul className="mt-6 space-y-3">
                    <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-frame-orange shrink-0" />{t("app.profile.planFeat.unlimitedGen")}</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-frame-orange shrink-0" />{t("app.profile.planFeat.unlimitedClients")}</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-frame-orange shrink-0" />{t("app.profile.planFeat.allPro")}</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-frame-orange shrink-0" />{t("app.profile.planFeat.teamMembers")}</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-frame-orange shrink-0" />{t("app.profile.planFeat.projectFiles")}</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-frame-orange shrink-0" />{t("app.profile.planFeat.reports")}</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-frame-orange shrink-0" />{t("app.profile.planFeat.premiumSupport")}</li>
                  </ul>
                  {(plan?.planId === "free" || plan?.planId === "pro") && <button type="button" onClick={() => { selectPlan("produtora"); openModal("checkout"); }} className="w-full mt-6 frame-btn-primary py-2.5">{t("app.profile.subscribeStudio")}</button>}
                </div>
              </div>
            </div>

            {/* ─── HISTÓRICO DE FATURAS ─── */}
            <div className="liquid-glass p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Receipt className="w-5 h-5 text-frame-orange" />
                <div><h3 className="text-lg font-bold">{t("app.profile.invoiceHistory")}</h3><p className="text-frame-gray-light text-xs">{t("app.profile.invoiceHistoryDesc")}</p></div>
              </div>
              {plan?.planId === "free" ? (
                <div className="py-8 text-center">
                  <Receipt className="w-10 h-10 mx-auto text-frame-gray-light/30 mb-3" />
                  <p className="text-sm text-frame-gray-light">{t("app.profile.noInvoiceFree")}</p>
                  <p className="text-xs text-frame-gray-light/70 mt-1">{t("app.profile.noInvoiceFreeDesc")}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-frame-gray-2/30 border border-frame-gray-3/30">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-frame-green/10 flex items-center justify-center"><Check className="w-4 h-4 text-frame-green" /></div>
                      <div>
                        <span className="text-sm text-frame-white">Plano {plan?.planId === "studio" ? "Studio" : "Pro"} - Julho 2026</span>
                        <p className="text-xs text-frame-gray-light">Pago em 01/07/2026</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-mono text-frame-white">R$ {plan?.planId === "studio" ? "399" : "199"},00</span>
                      <button onClick={() => handleExportReceipt(plan?.planId === "studio" ? 399 : 199)} className="text-frame-orange hover:text-frame-white text-xs flex items-center gap-1 transition font-medium">
                        <Download className="w-3 h-3" /> PDF
                      </button>
                    </div>
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
                  onClick={() => theme !== "dark" && toggleTheme?.()}
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
                  onClick={() => theme !== "light" && toggleTheme?.()}
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


            {/* Notificações */}
            <div className="liquid-glass p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center border border-frame-orange/30 bg-frame-orange/[0.08] rounded-lg">
                  <Bell className="w-5 h-5 text-frame-orange" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">{t("app.profile.notifications")}</h3>
                  <p className="text-frame-gray-light text-xs">{t("app.profile.notificationsDesc")}</p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 rounded-lg border border-frame-gray-3 hover:border-frame-gray-light transition cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-frame-gray-light" />
                    <div>
                      <p className="text-sm text-frame-white">{t("app.profile.emailNotifications")}</p>
                      <p className="text-xs text-frame-gray-light">{t("app.profile.emailNotificationsDesc")}</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                    className="w-5 h-5 rounded border-frame-gray-3 bg-frame-gray-2 text-frame-orange focus:ring-frame-orange"
                  />
                </label>
              </div>
            </div>

            {/* Fuso horário */}
            <div className="liquid-glass p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center border border-frame-orange/30 bg-frame-orange/[0.08] rounded-lg">
                  <Clock className="w-5 h-5 text-frame-orange" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">{t("app.profile.timezone")}</h3>
                  <p className="text-frame-gray-light text-xs">{t("app.profile.timezoneDesc")}</p>
                </div>
              </div>

              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="frame-input w-full max-w-md"
              >
                <option value="America/Sao_Paulo">São Paulo (GMT-3)</option>
                <option value="America/New_York">Nova York (GMT-5)</option>
                <option value="Europe/London">Londres (GMT+0)</option>
                <option value="Europe/Lisbon">Lisboa (GMT+0)</option>
                <option value="Asia/Tokyo">Tóquio (GMT+9)</option>
              </select>
            </div>

            {/* Discord */}
            <div className="liquid-glass p-6 space-y-4" style={{ borderColor: "rgba(88, 101, 242, 0.4)", background: "linear-gradient(135deg, rgba(88,101,242,0.08) 0%, rgba(88,101,242,0.02) 100%)" }}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-frame-mono text-[0.6rem] tracking-[0.18em] text-[#9BA3FF] uppercase">{t("app.profile.community")}</p>
                  <h3 className="text-lg font-bold mt-1">{t("app.profile.discordTitle")}</h3>
                  <p className="text-frame-gray-light text-xs mt-1">{t("app.profile.discordDesc")}</p>
                </div>
                <a href="https://discord.gg/VYCVMHKKT" target="_blank" rel="noreferrer"
                  className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] px-4 py-2 font-frame-mono text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-white transition rounded-lg"
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
                <a href="/terms-of-use.html" target="_blank" className="flex items-center justify-between p-3 rounded-lg border border-frame-gray-3 hover:border-frame-orange/50 transition group">
                  <span className="text-sm text-frame-white">{t("app.profile.termsOfUse")}</span>
                  <ChevronRight className="w-4 h-4 text-frame-gray-light group-hover:text-frame-orange transition" />
                </a>
                <a href="/privacy-policy.html" target="_blank" className="flex items-center justify-between p-3 rounded-lg border border-frame-gray-3 hover:border-frame-orange/50 transition group">
                  <span className="text-sm text-frame-white">{t("app.profile.privacyPolicy")}</span>
                  <ChevronRight className="w-4 h-4 text-frame-gray-light group-hover:text-frame-orange transition" />
                </a>
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
                        Digite <strong className="text-frame-red">EXCLUIR MINHA CONTA</strong> para confirmar.
                      </p>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className="frame-input w-full border-frame-red/30"
                    placeholder="EXCLUIR MINHA CONTA"
                  />

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      disabled={deleteConfirmText !== "EXCLUIR MINHA CONTA"}
                      className="flex-1 px-4 py-2 bg-frame-red text-white rounded-lg font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-frame-red/80 transition"
                    >
                      {t("app.profile.deletePermanently")}
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
