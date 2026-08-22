import { useEffect, useState } from "react";
import { AlertCircle, Copy, Key } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";

type ApiKey = { id: string; name: string; key: string; createdAt: string; lastUsed: string | null };

function formatDate(value: string, locale: "pt" | "en") {
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
  }).format(new Date(value));
}

export default function ApiKeysManager() {
  const { locale } = useLanguage();
  const isEn = locale === "en";
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api.auth.listApiKeys()
      .then((result) => {
        if (active) setKeys(result.keys.map((key) => ({ ...key, key: key.keyPrefix })));
      })
      .catch(() => toast.error(isEn ? "Could not load API keys" : "Não foi possível carregar as chaves de API"));
    return () => { active = false; };
  }, [isEn]);

  const createKey = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const result = await api.auth.createApiKey(name.trim());
      setKeys((current) => [...current, { id: result.id, name: result.name, key: result.key, createdAt: result.createdAt, lastUsed: null }]);
      setNewKey(result.key);
      setName("");
      setShowCreate(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (isEn ? "Could not create API key" : "Não foi possível criar a chave de API"));
    } finally {
      setCreating(false);
    }
  };

  const revokeKey = async (id: string) => {
    try {
      await api.auth.revokeApiKey(id);
      setKeys((current) => current.filter((key) => key.id !== id));
      toast.success(isEn ? "API key revoked" : "Chave de API revogada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (isEn ? "Could not revoke API key" : "Não foi possível revogar a chave de API"));
    }
  };

  return (
    <section className="liquid-glass mt-6 space-y-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center border border-frame-orange/30 bg-frame-orange/[0.08]">
            <Key className="h-5 w-5 text-frame-orange" />
          </div>
          <div>
            <h3 className="text-lg font-bold">{isEn ? "API keys" : "Chaves de API"}</h3>
            <p className="text-xs text-frame-gray-light">{isEn ? "Authenticate your studio's automations." : "Autentique as automações do seu estúdio."}</p>
          </div>
        </div>
        {!showCreate && <button type="button" onClick={() => setShowCreate(true)} className="frame-btn-primary inline-flex items-center gap-2"><Key className="h-4 w-4" />{isEn ? "New key" : "Nova chave"}</button>}
      </div>

      {showCreate && <div className="space-y-4 border border-frame-orange/30 bg-frame-orange/5 p-4">
        <label className="space-y-1.5"><span className="frame-label text-frame-gray-light">{isEn ? "Key name" : "Nome da chave"}</span><input value={name} onChange={(event) => setName(event.target.value)} className="frame-input w-full" autoFocus placeholder={isEn ? "Production webhook" : "Webhook de produção"} /></label>
        <div className="flex gap-2"><button type="button" onClick={createKey} disabled={creating || !name.trim()} className="frame-btn-primary disabled:opacity-40">{creating ? "..." : (isEn ? "Create key" : "Criar chave")}</button><button type="button" onClick={() => { setShowCreate(false); setName(""); }} className="frame-btn-ghost">{isEn ? "Cancel" : "Cancelar"}</button></div>
      </div>}

      {newKey && <div className="space-y-3 border border-frame-green/30 bg-frame-green/10 p-4"><div className="flex gap-2"><AlertCircle className="h-5 w-5 shrink-0 text-frame-green" /><p className="text-sm text-frame-green">{isEn ? "Copy this key now. It will not be displayed again." : "Copie esta chave agora. Ela não será exibida novamente."}</p></div><div className="flex gap-2"><code className="min-w-0 flex-1 break-all border border-frame-gray-3 bg-frame-gray-2 px-3 py-2 text-xs text-frame-white">{newKey}</code><button type="button" onClick={() => navigator.clipboard.writeText(newKey).then(() => toast.success(isEn ? "Copied" : "Copiada"))} className="frame-btn-primary p-2" aria-label={isEn ? "Copy API key" : "Copiar chave de API"}><Copy className="h-4 w-4" /></button></div><button type="button" onClick={() => setNewKey(null)} className="text-xs text-frame-gray-light hover:text-frame-white">{isEn ? "I copied it" : "Já copiei"}</button></div>}

      {keys.length === 0 ? <p className="py-4 text-center text-xs text-frame-gray-light">{isEn ? "No API keys yet" : "Nenhuma chave de API criada ainda"}</p> : <div className="space-y-2">{keys.map((key) => <div key={key.id} className="glow-card flex items-start justify-between gap-3 p-4"><div className="min-w-0"><p className="text-sm font-medium text-frame-white">{key.name}</p><code className="text-xs text-frame-gray-light">{key.key}••••••</code><p className="mt-2 text-[0.65rem] text-frame-gray-light">{isEn ? "Created" : "Criada"}: {formatDate(key.createdAt, locale)} {key.lastUsed ? `· ${isEn ? "Last used" : "Último uso"}: ${formatDate(key.lastUsed, locale)}` : `· ${isEn ? "Never used" : "Nunca usada"}`}</p></div><button type="button" onClick={() => revokeKey(key.id)} className="frame-btn-ghost px-3 py-1.5 text-xs text-frame-red/70 hover:text-frame-red">{isEn ? "Revoke" : "Revogar"}</button></div>)}</div>}
    </section>
  );
}
