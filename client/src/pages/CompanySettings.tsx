import { useEffect, useState } from "react";
import AppNavBar from "@/components/AppNavBar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { api } from "@/lib/api";
import { DEFAULT_STUDIO_SETTINGS, readStudioSettings, saveStudioSettings, type StudioSettings } from "@/lib/studioSettings";
import { Building2, Mail, Palette, Phone, Save } from "lucide-react";
import { toast } from "sonner";

function CompanySettingsContent() {
  const [settings, setSettings] = useState<StudioSettings>(DEFAULT_STUDIO_SETTINGS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSettings(readStudioSettings());
    api.studioSettings
      .get()
      .then((data) => {
        setSettings(data);
        saveStudioSettings(data);
      })
      .catch(() => null);
  }, []);

  const update = (key: keyof StudioSettings, value: string) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await api.studioSettings.update(settings);
      setSettings(saved);
      saveStudioSettings(saved);
      toast.success("Dados da empresa salvos");
    } catch (error) {
      saveStudioSettings(settings);
      toast.error(error instanceof Error ? error.message : "Salvo apenas neste navegador");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-frame-black text-frame-white font-frame-body">
      <AppNavBar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-5">
        <section className="border border-frame-gray-3 bg-frame-gray-1/40 p-5">
          <p className="frame-label">// EMPRESA</p>
          <h1 className="frame-title text-[clamp(2rem,4vw,3.8rem)] leading-none mt-2">CONFIGURAR STUDIO</h1>
          <p className="text-sm text-frame-gray-light max-w-2xl mt-3">
            Esses dados aparecem automaticamente em Docs, Propostas e próximos PDFs comerciais da plataforma.
          </p>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
          <div className="border border-frame-gray-3 bg-frame-gray-1/30 p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="space-y-2">
                <span className="frame-label text-frame-gray-light">Nome da produtora</span>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-frame-gray-light" />
                  <input className="frame-input w-full pl-10" value={settings.studioName} onChange={(event) => update("studioName", event.target.value)} />
                </div>
              </label>
              <label className="space-y-2">
                <span className="frame-label text-frame-gray-light">Razão social</span>
                <input className="frame-input w-full" value={settings.legalName} onChange={(event) => update("legalName", event.target.value)} placeholder="Nome legal da empresa" />
              </label>
              <label className="space-y-2">
                <span className="frame-label text-frame-gray-light">CNPJ / CPF</span>
                <input className="frame-input w-full" value={settings.document} onChange={(event) => update("document", event.target.value)} placeholder="00.000.000/0001-00" />
              </label>
              <label className="space-y-2">
                <span className="frame-label text-frame-gray-light">Cidade</span>
                <input className="frame-input w-full" value={settings.city} onChange={(event) => update("city", event.target.value)} placeholder="Florianopolis, SC" />
              </label>
              <label className="space-y-2">
                <span className="frame-label text-frame-gray-light">E-mail comercial</span>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-frame-gray-light" />
                  <input className="frame-input w-full pl-10" value={settings.email} onChange={(event) => update("email", event.target.value)} placeholder="contato@produtora.com" />
                </div>
              </label>
              <label className="space-y-2">
                <span className="frame-label text-frame-gray-light">WhatsApp</span>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-frame-gray-light" />
                  <input className="frame-input w-full pl-10" value={settings.phone} onChange={(event) => update("phone", event.target.value)} placeholder="(00) 00000-0000" />
                </div>
              </label>
              <label className="space-y-2">
                <span className="frame-label text-frame-gray-light">Site / Instagram</span>
                <input className="frame-input w-full" value={settings.website} onChange={(event) => update("website", event.target.value)} placeholder="https://..." />
              </label>
              <label className="space-y-2">
                <span className="frame-label text-frame-gray-light">Cor principal</span>
                <div className="flex gap-2">
                  <input className="h-12 w-16 border border-frame-gray-3 bg-transparent" type="color" value={settings.primaryColor} onChange={(event) => update("primaryColor", event.target.value)} />
                  <div className="relative flex-1">
                    <Palette className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-frame-gray-light" />
                    <input className="frame-input w-full pl-10" value={settings.primaryColor} onChange={(event) => update("primaryColor", event.target.value)} />
                  </div>
                </div>
              </label>
            </div>
            <label className="space-y-2 block">
              <span className="frame-label text-frame-gray-light">Assinatura nos documentos</span>
              <input className="frame-input w-full" value={settings.signature} onChange={(event) => update("signature", event.target.value)} placeholder="Responsável comercial / produtor executivo" />
            </label>
            <button type="button" onClick={handleSave} disabled={saving} className="frame-btn-primary flex items-center justify-center gap-2 disabled:opacity-60">
              <Save className="w-4 h-4" />
              {saving ? "Salvando..." : "Salvar empresa"}
            </button>
          </div>

          <aside className="border border-frame-gray-3 bg-frame-gray-1/30 p-5 h-max">
            <p className="frame-label mb-3">// PREVIEW</p>
            <div className="border border-frame-gray-3 bg-frame-black/40 p-5">
              <div className="text-[0.62rem] font-frame-mono uppercase tracking-[0.18em]" style={{ color: settings.primaryColor }}>
                Studio configurado
              </div>
              <h2 className="frame-title text-[2.2rem] mt-2">{settings.studioName || "Sua produtora"}</h2>
              <div className="mt-5 space-y-2 text-sm text-frame-gray-light">
                <p>{settings.legalName || "Razão social"}</p>
                <p>{settings.document || "CNPJ / CPF"}</p>
                <p>{settings.email || "email comercial"}</p>
                <p>{settings.phone || "WhatsApp"}</p>
                <p>{settings.city || "Cidade"}</p>
              </div>
              <div className="mt-6 border-t border-frame-gray-3 pt-4 text-xs text-frame-gray-light">
                Assinatura: {settings.signature || "Responsável"}
              </div>
            </div>
          </aside>
        </section>
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
