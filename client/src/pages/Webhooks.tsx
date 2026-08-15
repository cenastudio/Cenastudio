import { useEffect, useState } from "react";
import AppNavBar from "@/components/AppNavBar";
import EmptyState from "@/components/EmptyState";
import ProductionNav from "@/components/ProductionNav";
import ProtectedRoute from "@/components/ProtectedRoute";
import { FeatureUpgradeRequired } from "@/components/FeatureUpgradeRequired";
import { api } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Webhook as WebhookIcon,
  Plus,
  Trash2,
  Power,
  Send,
  Copy,
  Check,
  Loader2,
  ArrowRight,
  Zap,
  MessageSquare,
  Sheet,
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

interface WebhookEvent {
  id: string;
  label: string;
}

interface WebhookItem {
  id: number;
  url: string;
  label: string;
  events: string[];
  active: boolean;
  lastStatus: number | null;
  lastFiredAt: string | null;
  createdAt: string;
}

function formatDate(iso: string | null) {
  if (!iso) return "Nunca disparado";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function WebhooksContent() {
  const { t } = useLanguage();
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<WebhookItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [testingId, setTestingId] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([api.webhooks.list(), api.webhooks.listEvents()])
      .then(([webhookList, eventList]) => {
        setWebhooks(webhookList);
        setEvents(eventList);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Falha ao carregar webhooks"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const toggleEvent = (eventId: string) => {
    setSelectedEvents((prev) => (prev.includes(eventId) ? prev.filter((e) => e !== eventId) : [...prev, eventId]));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || selectedEvents.length === 0) {
      toast.error("Informe a URL e selecione ao menos um evento");
      return;
    }
    setSubmitting(true);
    try {
      const created = await api.webhooks.create({ url: url.trim(), label: label.trim(), events: selectedEvents });
      setWebhooks((prev) => [created, ...prev]);
      setNewSecret(created.secret);
      setCreateOpen(false);
      setUrl("");
      setLabel("");
      setSelectedEvents([]);
      toast.success("Webhook criado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao criar webhook");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (webhook: WebhookItem) => {
    try {
      await api.webhooks.update(webhook.id, { active: !webhook.active });
      setWebhooks((prev) => prev.map((w) => (w.id === webhook.id ? { ...w, active: !w.active } : w)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao atualizar webhook");
    }
  };

  const handleTest = async (webhook: WebhookItem) => {
    setTestingId(webhook.id);
    try {
      const result = await api.webhooks.test(webhook.id);
      if (result.success) {
        toast.success(`Ping enviado com sucesso (HTTP ${result.statusCode})`);
      } else {
        toast.error(`Endpoint não respondeu OK: ${result.error || `HTTP ${result.statusCode}`}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao testar webhook");
    } finally {
      setTestingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.webhooks.delete(deleteTarget.id);
      setWebhooks((prev) => prev.filter((w) => w.id !== deleteTarget.id));
      toast.success("Webhook removido");
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao remover webhook");
    } finally {
      setDeleting(false);
    }
  };

  const copySecret = () => {
    if (!newSecret) return;
    navigator.clipboard.writeText(newSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-frame-black text-frame-white font-frame-body">
      <AppNavBar />
      <ProductionNav />
      <main id="main-content" className="px-4 sm:px-6 py-5 sm:py-6 max-w-[1200px] mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-frame-gray-3 pb-4">
          <div>
            <p className="frame-label mb-1">// Automação</p>
            <h1 className="frame-title text-[clamp(1.5rem,3vw,2.2rem)] leading-none">Webhooks</h1>
            <p className="text-xs text-frame-gray-light mt-2 max-w-lg leading-relaxed">
              Avise outras ferramentas automaticamente quando algo acontecer no Cena Studio — sem precisar checar
              manualmente. Cadastre uma URL, escolha os eventos, e recebemos o aviso na hora via POST HTTP.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="frame-btn-primary inline-flex items-center gap-2 shrink-0 self-start"
          >
            <Plus className="w-4 h-4" />
            Novo Webhook
          </button>
        </header>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-frame-orange" />
          </div>
        )}

        {/* Empty state — explains what webhooks are for, with the orange-square icon pattern */}
        {!loading && webhooks.length === 0 && (
          <section className="mx-auto max-w-4xl py-10 space-y-5">
            <EmptyState
              icon={WebhookIcon}
              eyebrow={t("app.webhooks.onboardEyebrow")}
              title={t("app.webhooks.onboardTitle")}
              description={t("app.webhooks.onboardDesc")}
              action={{ label: t("app.webhooks.onboardCta"), onClick: () => setCreateOpen(true), icon: Plus }}
              steps={[
                { title: t("app.webhooks.onboardStep1"), description: t("app.webhooks.onboardStep1Desc") },
                { title: t("app.webhooks.onboardStep2"), description: t("app.webhooks.onboardStep2Desc") },
                { title: t("app.webhooks.onboardStep3"), description: t("app.webhooks.onboardStep3Desc") },
              ]}
            />

            <div className="border border-frame-gray-3/50 bg-frame-gray-1/10 p-5">
              <p className="font-frame-mono text-[0.6rem] uppercase tracking-[0.14em] text-frame-orange mb-4">
                Exemplos de uso
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MessageSquare className="w-4 h-4 text-frame-gray-light mt-0.5 shrink-0" />
                  <p className="text-xs text-frame-gray-light leading-relaxed">
                    Cliente aprova um vídeo → aviso cai automaticamente no Slack ou WhatsApp da equipe
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Sheet className="w-4 h-4 text-frame-gray-light mt-0.5 shrink-0" />
                  <p className="text-xs text-frame-gray-light leading-relaxed">
                    Novo cliente cadastrado → linha nova criada automaticamente numa planilha do Google Sheets
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Zap className="w-4 h-4 text-frame-gray-light mt-0.5 shrink-0" />
                  <p className="text-xs text-frame-gray-light leading-relaxed">
                    Proposta aceita → dispara um fluxo no Zapier/Make (email de boas-vindas, criar pasta no Drive, etc.)
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* List of webhooks */}
        {!loading && webhooks.length > 0 && (
          <div className="space-y-3">
            {webhooks.map((webhook) => (
              <div
                key={webhook.id}
                className={`border p-4 sm:p-5 transition ${
                  webhook.active ? "border-frame-gray-3/60 bg-frame-gray-1/10" : "border-frame-gray-3/30 bg-transparent opacity-60"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 shrink-0 border border-frame-orange/30 bg-frame-orange/10 flex items-center justify-center">
                      <WebhookIcon className="w-5 h-5 text-frame-orange" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-frame-white truncate">
                        {webhook.label || "Webhook sem nome"}
                      </p>
                      <p className="text-xs text-frame-gray-light truncate font-mono">{webhook.url}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {webhook.events.map((eventId) => {
                          const eventLabel = events.find((e) => e.id === eventId)?.label || eventId;
                          return (
                            <span
                              key={eventId}
                              className="text-[0.6rem] font-frame-mono uppercase tracking-wide px-2 py-0.5 border border-frame-gray-3/50 text-frame-gray-light"
                            >
                              {eventLabel}
                            </span>
                          );
                        })}
                      </div>
                      <p className="text-[0.65rem] text-frame-gray-light mt-2">
                        Último disparo: {formatDate(webhook.lastFiredAt)}
                        {webhook.lastStatus != null && (
                          <span className={webhook.lastStatus < 300 ? "text-green-400 ml-1" : "text-red-400 ml-1"}>
                            (HTTP {webhook.lastStatus})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleTest(webhook)}
                      disabled={testingId === webhook.id}
                      className="p-2 border border-frame-gray-3/50 hover:border-frame-orange hover:text-frame-orange transition disabled:opacity-50"
                      title="Enviar ping de teste"
                    >
                      {testingId === webhook.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(webhook)}
                      className={`p-2 border transition ${
                        webhook.active
                          ? "border-green-500/40 text-green-400 hover:border-green-500"
                          : "border-frame-gray-3/50 text-frame-gray-light hover:border-frame-white"
                      }`}
                      title={webhook.active ? "Desativar" : "Ativar"}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(webhook)}
                      className="p-2 border border-frame-gray-3/50 hover:border-red-500 hover:text-red-500 transition"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create webhook modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-frame-black border-frame-gray-3 text-frame-white max-w-lg rounded-none p-6">
          <DialogHeader>
            <DialogTitle className="frame-title text-2xl">Novo Webhook</DialogTitle>
            <DialogDescription className="text-frame-gray-light text-sm">
              Informe a URL que deve receber os avisos e escolha quais eventos disparam esse webhook.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 mt-4">
            <div>
              <label className="block text-xs font-medium text-frame-gray-light mb-1.5">Nome (opcional)</label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Ex: Slack da equipe"
                className="frame-input w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-frame-gray-light mb-1.5">URL de destino</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://hooks.zapier.com/..."
                required
                className="frame-input w-full font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-frame-gray-light mb-2">Quais eventos avisar</label>
              <div className="space-y-2">
                {events.map((event) => (
                  <label
                    key={event.id}
                    className="flex items-center gap-3 p-2.5 border border-frame-gray-3/50 cursor-pointer hover:border-frame-orange/40 transition"
                  >
                    <input
                      type="checkbox"
                      checked={selectedEvents.includes(event.id)}
                      onChange={() => toggleEvent(event.id)}
                      className="accent-frame-orange"
                    />
                    <span className="text-sm text-frame-white">{event.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <DialogFooter className="gap-2 pt-4 border-t border-frame-gray-3">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="frame-btn-ghost"
                disabled={submitting}
              >
                Cancelar
              </button>
              <button type="submit" className="frame-btn-primary inline-flex items-center gap-2" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Criar Webhook
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Show secret once, right after creation */}
      <Dialog open={!!newSecret} onOpenChange={(open) => !open && setNewSecret(null)}>
        <DialogContent className="bg-frame-black border-frame-gray-3 text-frame-white max-w-md rounded-none p-6">
          <DialogHeader>
            <DialogTitle className="frame-title text-2xl text-frame-orange">Webhook criado</DialogTitle>
            <DialogDescription className="text-frame-gray-light text-sm">
              Guarde esse segredo agora — ele não será mostrado de novo. Use-o para validar que os avisos vieram
              mesmo do Cena Studio (assinatura HMAC no header <code className="text-frame-orange">X-Cena-Signature</code>).
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex items-center gap-2 border border-frame-orange/30 bg-frame-orange/5 p-3">
            <code className="text-xs text-frame-white font-mono break-all flex-1">{newSecret}</code>
            <button
              type="button"
              onClick={copySecret}
              className="p-2 border border-frame-gray-3/50 hover:border-frame-orange transition shrink-0"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <DialogFooter className="pt-4">
            <button type="button" onClick={() => setNewSecret(null)} className="frame-btn-primary w-full">
              Entendi, guardei o segredo
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir webhook?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.label || deleteTarget?.url}" será removido e deixará de receber avisos.
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

export default function Webhooks() {
  return (
    <ProtectedRoute>
      <FeatureUpgradeRequired feature="webhooks" variant="full">
        <WebhooksContent />
      </FeatureUpgradeRequired>
    </ProtectedRoute>
  );
}
