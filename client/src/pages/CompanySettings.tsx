import { useEffect, useState, useRef } from "react";
import AppNavBar from "@/components/AppNavBar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { api } from "@/lib/api";
import { DEFAULT_STUDIO_SETTINGS, readStudioSettings, saveStudioSettings, type StudioSettings } from "@/lib/studioSettings";
import {
  Building2, Check, FileText, Globe2, Mail, Palette, Phone, Save,
  BadgeCheck, ShieldCheck, MapPin, PenLine, Sparkles, Camera,
  FileSignature, Users, Receipt, ExternalLink, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation } from "wouter";

// Preview mini-doc component
function DocPreview({ settings }: { settings: StudioSettings }) {
  const color = settings.primaryColor || "#e85002";
  return (
    <div className="rounded-lg overflow-hidden border border-frame-gray-3/50 shadow-2xl"
      style={{ background: "linear-gradient(180deg, #111 0%, #0a0a0a 100%)" }}>
      {/* Header */}
      <div className="p-5 border-b border-white/10" style={{ borderBottom: `2px solid ${color}` }}>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[0.5rem] font-mono uppercase tracking-[0.18em] mb-1" style={{ color }}>
              // estúdio audiovisual
            </div>
            <div className="text-xl font-bold text-white leading-tight">
              {settings.studioName || "Seu Estúdio"}
              <span style={{ color }}>.</span>
            </div>
            <div className="text-[0.55rem] text-white/40 mt-0.5">
              {settings.legalName || "Razão social"}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[0.5rem] font-mono uppercase tracking-wider text-white/40">Proposta</div>
            <div className="text-lg font-bold mt-0.5" style={{ color }}>#001</div>
            <div className="text-[0.5rem] text-white/40">{new Date().toLocaleDateString("pt-BR")}</div>
          </div>
        </div>
      </div>
      {/* Body */}
      <div className="p-5 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {[
            ["CNPJ", settings.document || "00.000.000/0001-00"],
            ["Email", settings.email || "contato@estudio.com"],
            ["WhatsApp", settings.phone || "(11) 99999-9999"],
            ["Cidade", settings.city || "São Paulo"],
          ].map(([label, value]) => (
            <div key={label} className="bg-white/5 rounded px-2.5 py-1.5">
              <div className="text-[0.45rem] font-mono uppercase tracking-wider text-white/30">{label}</div>
              <div className="text-[0.6rem] text-white/80 truncate">{value}</div>
            </div>
          ))}
        </div>
        {/* Service line placeholder */}
        <div className="rounded overflow-hidden border border-white/10">
          <div className="grid grid-cols-4 gap-0 bg-white/[0.04] px-2 py-1">
            {["Serviço", "Qtd", "Unitário", "Total"].map((h) => (
              <div key={h} className="text-[0.45rem] font-mono uppercase text-white/30">{h}</div>
            ))}
          </div>
          <div className="grid grid-cols-4 px-2 py-1.5 border-t border-white/5">
            {["Filmagem 1 diária", "1x", "R$ 5.000", "R$ 5.000"].map((v) => (
              <div key={v} className="text-[0.55rem] text-white/60">{v}</div>
            ))}
          </div>
        </div>
        {/* Total */}
        <div className="flex justify-between items-center px-3 py-2 rounded border"
          style={{ borderColor: `${color}44`, background: `${color}11` }}>
          <span className="text-[0.5rem] font-mono uppercase tracking-wider" style={{ color }}>Total do projeto</span>
          <span className="text-sm font-bold text-white">R$ 5.000,00</span>
        </div>
      </div>
      {/* Footer */}
      <div className="px-5 pb-4 pt-2 border-t border-white/10 flex items-center justify-between">
        <div>
          <div className="text-[0.5rem] text-white/30">Assinatura</div>
          <div className="text-[0.6rem] text-white/60">{settings.signature || "Responsável comercial"}</div>
        </div>
        {settings.website && (
          <div className="text-[0.5rem] text-white/30">{settings.website}</div>
        )}
      </div>
    </div>
  );
}

function CompanySettingsContent() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const [settings, setSettings] = useState<StudioSettings>(DEFAULT_STUDIO_SETTINGS);
  const [savedSettings, setSavedSettings] = useState<StudioSettings>(DEFAULT_STUDIO_SETTINGS);
  const [saving, setSaving] = useState(false);
  const isDirty = JSON.stringify(settings) !== JSON.stringify(savedSettings);

  useEffect(() => {
    const local = readStudioSettings();
    setSettings(local);
    setSavedSettings(local);
    api.studioSettings.get().then((data) => {
      setSettings(data);
      setSavedSettings(data);
      saveStudioSettings(data);
    }).catch(() => null);
  }, []);

  useEffect(() => {
    if (!isDirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const update = (key: keyof StudioSettings, value: string) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await api.studioSettings.update(settings);
      setSettings(saved);
      setSavedSettings(saved);
      saveStudioSettings(saved);
      toast.success(t("app.company.toastSaved"));
    } catch {
      saveStudioSettings(settings);
      setSavedSettings(settings);
      toast.warning(t("app.company.toastOffline"));
    } finally {
      setSaving(false);
    }
  };

  const color = settings.primaryColor || "#e85002";

  return (
    <div className="min-h-screen bg-frame-black text-frame-white font-frame-body flex flex-col">
      <AppNavBar />

      <main id="main-content" className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-10 md:py-14 space-y-8">

        {/* ─── HERO ─── */}
        <header className="relative overflow-hidden pb-8 border-b border-frame-gray-3/50">
          <div className="absolute top-0 right-0 w-72 h-72 rounded-full blur-3xl opacity-[0.08] pointer-events-none"
            style={{ background: color }} />
          <div className="relative">
            <p className="font-frame-mono text-[0.56rem] uppercase tracking-[0.22em] text-frame-orange mb-2">
              // {t("app.company.eyebrow")}
            </p>
            <h1 className="frame-title text-[clamp(2rem,4vw,3rem)] text-frame-white leading-tight">
              {t("app.company.title")} <span className="text-frame-orange">{t("app.company.titleHighlight")}</span>
            </h1>
            <p className="text-frame-gray-light text-sm mt-3 max-w-lg leading-relaxed">
              {t("app.company.subtitle")}
            </p>
          </div>

          {/* Steps de impacto */}
          <div className="relative flex flex-wrap gap-2 mt-5">
            {[
              { icon: FileSignature, label: t("app.company.impactProposals") },
              { icon: FileText, label: t("app.company.impactContracts") },
              { icon: Receipt, label: t("app.company.impactReceipts") },
              { icon: ShieldCheck, label: t("app.company.impactStudioAi") },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 border border-frame-orange/20 bg-frame-orange/[0.05] px-3 py-1.5 rounded-lg">
                <Icon className="w-3 h-3 text-frame-orange" />
                <span className="font-frame-mono text-[0.58rem] uppercase tracking-wider text-frame-gray-light">{label}</span>
              </div>
            ))}
          </div>
        </header>

        {/* ─── LAYOUT 2 COLUNAS ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 items-start">

          {/* ─── FORM ─── */}
          <div className="space-y-6">

            {/* Identidade */}
            <div className="liquid-glass p-6 space-y-5">
              <div className="flex items-center gap-3 pb-4 border-b border-frame-gray-3/50">
                <div className="w-9 h-9 flex items-center justify-center border border-frame-orange/30 bg-frame-orange/[0.08] rounded-lg">
                  <Building2 className="w-4 h-4 text-frame-orange" />
                </div>
                <div>
                  <h2 className="font-bold text-frame-white">{t("app.company.brandIdentity")}</h2>
                  <p className="text-[0.65rem] text-frame-gray-light">{t("app.company.brandIdentityDesc")}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-1.5 md:col-span-2">
                  <span className="frame-label text-frame-gray-light">{t("app.company.studioNameLabel")}</span>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-frame-gray-light" />
                    <input className="frame-input w-full pl-10" value={settings.studioName}
                      onChange={(e) => update("studioName", e.target.value)}
                      placeholder={t("app.company.studioNamePlaceholder")} />
                  </div>
                </label>
                <label className="space-y-1.5">
                  <span className="frame-label text-frame-gray-light">{t("app.company.legalNameLabel")}</span>
                  <input className="frame-input w-full" value={settings.legalName}
                    onChange={(e) => update("legalName", e.target.value)}
                    placeholder={t("app.company.legalNamePlaceholder")} />
                </label>
                <label className="space-y-1.5">
                  <span className="frame-label text-frame-gray-light">{t("app.company.documentLabel")}</span>
                  <input className="frame-input w-full" value={settings.document}
                    onChange={(e) => update("document", e.target.value)}
                    placeholder="00.000.000/0001-00" />
                </label>
              </div>
            </div>

            {/* Contato */}
            <div className="liquid-glass p-6 space-y-5">
              <div className="flex items-center gap-3 pb-4 border-b border-frame-gray-3/50">
                <div className="w-9 h-9 flex items-center justify-center border border-frame-orange/30 bg-frame-orange/[0.08] rounded-lg">
                  <Phone className="w-4 h-4 text-frame-orange" />
                </div>
                <div>
                  <h2 className="font-bold text-frame-white">{t("app.company.contactLocation")}</h2>
                  <p className="text-[0.65rem] text-frame-gray-light">{t("app.company.contactLocationDesc")}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-1.5">
                  <span className="frame-label text-frame-gray-light">{t("app.company.commercialEmail")}</span>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-frame-gray-light" />
                    <input className="frame-input w-full pl-10" type="email" value={settings.email}
                      onChange={(e) => update("email", e.target.value)}
                      placeholder={t("app.company.emailPlaceholder")} />
                  </div>
                </label>
                <label className="space-y-1.5">
                  <span className="frame-label text-frame-gray-light">{t("app.company.whatsappPhone")}</span>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-frame-gray-light" />
                    <input className="frame-input w-full pl-10" value={settings.phone}
                      onChange={(e) => update("phone", e.target.value)}
                      placeholder="(11) 99999-9999" />
                  </div>
                </label>
                <label className="space-y-1.5">
                  <span className="frame-label text-frame-gray-light">WhatsApp para Aprovações</span>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-frame-orange" />
                    <input className="frame-input w-full pl-10" value={settings.approvalWhatsapp || ""}
                      onChange={(e) => update("approvalWhatsapp", e.target.value)}
                      placeholder="5511999998888" />
                  </div>
                  <p className="text-[0.6rem] text-frame-gray-light mt-1">
                    Número usado no botão "Compartilhar" das salas de review (formato: 5511999998888)
                  </p>
                </label>
                <label className="space-y-1.5">
                  <span className="frame-label text-frame-gray-light">{t("app.company.cityState")}</span>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-frame-gray-light" />
                    <input className="frame-input w-full pl-10" value={settings.city}
                      onChange={(e) => update("city", e.target.value)}
                      placeholder={t("app.company.cityPlaceholder")} />
                  </div>
                </label>
                <label className="space-y-1.5">
                  <span className="frame-label text-frame-gray-light">{t("app.company.websiteLabel")}</span>
                  <div className="relative">
                    <Globe2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-frame-gray-light" />
                    <input className="frame-input w-full pl-10" value={settings.website}
                      onChange={(e) => update("website", e.target.value)}
                      placeholder={t("app.company.websitePlaceholder")} />
                  </div>
                </label>
              </div>
            </div>

            {/* Assinatura e cor */}
            <div className="liquid-glass p-6 space-y-5">
              <div className="flex items-center gap-3 pb-4 border-b border-frame-gray-3/50">
                <div className="w-9 h-9 flex items-center justify-center border border-frame-orange/30 bg-frame-orange/[0.08] rounded-lg">
                  <Palette className="w-4 h-4 text-frame-orange" />
                </div>
                <div>
                  <h2 className="font-bold text-frame-white">{t("app.company.visualIdentity")}</h2>
                  <p className="text-[0.65rem] text-frame-gray-light">{t("app.company.visualIdentityDesc")}</p>
                </div>
              </div>
              <label className="space-y-1.5 block">
                <span className="frame-label text-frame-gray-light">{t("app.company.signatureLabel")}</span>
                <div className="relative">
                  <PenLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-frame-gray-light" />
                  <input className="frame-input w-full pl-10" value={settings.signature}
                    onChange={(e) => update("signature", e.target.value)}
                    placeholder={t("app.company.signaturePlaceholder")} />
                </div>
                <p className="text-[0.62rem] text-frame-gray-light">{t("app.company.signatureHint")}</p>
              </label>
              <label className="space-y-1.5 block">
                <span className="frame-label text-frame-gray-light">{t("app.company.primaryColor")}</span>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <input type="color" value={settings.primaryColor}
                      onChange={(e) => update("primaryColor", e.target.value)}
                      className="w-14 h-12 rounded cursor-pointer border border-frame-gray-3 bg-transparent" />
                  </div>
                  <div className="relative flex-1">
                    <Palette className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-frame-gray-light" />
                    <input className="frame-input w-full pl-10 font-mono" value={settings.primaryColor}
                      onChange={(e) => update("primaryColor", e.target.value)}
                      placeholder="#e85002" />
                  </div>
                  <div className="w-10 h-10 rounded-lg border border-frame-gray-3 shrink-0"
                    style={{ background: color }} />
                </div>
                <div className="flex gap-2 flex-wrap mt-2">
                  {["#e85002", "#FF6B00", "#e63946", "#2563eb", "#7c3aed", "#059669"].map((c) => (
                    <button key={c} type="button" onClick={() => update("primaryColor", c)}
                      className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                      style={{ background: c, borderColor: settings.primaryColor === c ? "#fff" : "transparent" }} />
                  ))}
                </div>
              </label>
            </div>

            {/* Equipe do estúdio */}
            <div className="liquid-glass p-6 space-y-5">
              <div className="flex items-center gap-3 pb-4 border-b border-frame-gray-3/50">
                <div className="w-9 h-9 flex items-center justify-center border border-frame-orange/30 bg-frame-orange/[0.08] rounded-lg">
                  <Users className="w-4 h-4 text-frame-orange" />
                </div>
                <div>
                  <h2 className="font-bold text-frame-white">{t("app.company.teamSection")}</h2>
                  <p className="text-[0.65rem] text-frame-gray-light">{t("app.company.teamSectionDesc")}</p>
                </div>
              </div>
              <p className="text-sm text-frame-gray-light leading-relaxed">
                {t("app.company.teamSectionBody")}
              </p>
              <button type="button" onClick={() => setLocation("/team")} className="frame-btn-primary flex items-center gap-2">
                <Users className="w-4 h-4" />
                {t("app.company.teamManage")}
              </button>
            </div>

            {/* Save bar */}
            <div className="sticky bottom-4 z-10">
              <div className="liquid-glass p-4 flex items-center justify-between gap-4 shadow-2xl border-frame-orange/20"
                style={{ borderColor: isDirty ? "rgba(232,80,2,0.4)" : undefined }}>
                <div className="flex items-center gap-2">
                  {isDirty ? (
                    <span className="text-[0.6rem] font-mono uppercase tracking-wider text-frame-orange">{t("app.company.unsavedChanges")}</span>
                  ) : (
                    <span className="text-[0.6rem] font-mono uppercase tracking-wider text-frame-green flex items-center gap-1">
                      <Check className="w-3 h-3" /> {t("app.company.allSaved")}
                    </span>
                  )}
                </div>
                <button type="button" onClick={handleSave} disabled={saving || !isDirty}
                  className="frame-btn-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                  {saving ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? t("app.company.saving") : t("app.company.saveStudio")}
                </button>
              </div>
            </div>
          </div>

          {/* ─── PREVIEW STICKY ─── */}
          <div className="lg:sticky lg:top-24 space-y-4">
            <div>
              <p className="font-frame-mono text-[0.56rem] uppercase tracking-[0.2em] text-frame-orange mb-3">// {t("app.company.livePreview")}</p>
              <DocPreview settings={settings} />
            </div>

            {/* Impacto */}
            <div className="liquid-glass p-4 space-y-3">
              <p className="font-frame-mono text-[0.56rem] uppercase tracking-[0.18em] text-frame-orange">{t("app.company.whereAppears")}</p>
              <div className="space-y-2">
                {[
                  { icon: FileSignature, label: t("app.company.impactProposals"), desc: t("app.company.impactProposalsDesc") },
                  { icon: FileText, label: t("app.company.impactContracts"), desc: t("app.company.impactContractsDesc") },
                  { icon: Receipt, label: t("app.company.impactReceipts"), desc: t("app.company.impactReceiptsDesc") },
                  { icon: Sparkles, label: t("app.company.impactStudioAi"), desc: t("app.company.impactStudioAiDesc") },
                ].map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="flex items-center gap-3 py-2 border-b border-frame-gray-3/30 last:border-0">
                    <Icon className="w-4 h-4 text-frame-orange shrink-0" />
                    <div>
                      <p className="text-[0.75rem] font-semibold text-frame-white">{label}</p>
                      <p className="text-[0.62rem] text-frame-gray-light">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Atalhos */}
            <div className="liquid-glass p-4 space-y-2">
              <p className="font-frame-mono text-[0.56rem] uppercase tracking-[0.18em] text-frame-orange mb-3">{t("app.company.shortcuts")}</p>
              {[
                { label: t("app.company.shortcutProposal"), path: "/proposals" },
                { label: t("app.company.shortcutAccount"), path: "/profile" },
              ].map(({ label, path }) => (
                <button key={path} type="button" onClick={() => setLocation(path)}
                  className="w-full flex items-center justify-between py-2 px-3 rounded-lg border border-frame-gray-3/50 hover:border-frame-orange/40 hover:bg-frame-orange/[0.04] transition text-sm text-frame-gray-light hover:text-frame-white">
                  {label}
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function CompanySettings() {
  return (
    <ProtectedRoute>
      <CompanySettingsContent />
    </ProtectedRoute>
  );
}
