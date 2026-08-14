import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Calendar, Loader2, Mail, MessageCircle, CheckCircle2, AlertTriangle, Globe2 } from "lucide-react";
import { toast } from "sonner";
import { api, type MeetingCreatedResponse } from "@/lib/api";

interface ScheduleMeetingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: number;
  clientName: string;
  clientEmail?: string | null;
  clientPhone?: string | null;
  opportunityId?: number;
  onCreated?: (meeting: MeetingCreatedResponse) => void;
}

/**
 * Books a meeting for a client: persists it, emails an .ics invite to the
 * client's registered email (if configured), and hands back a ready-to-send
 * WhatsApp link. This is the "connect to the client's calendar" flow without
 * requiring Google OAuth — see ARCHITECTURE notes on meetings.
 */
export function ScheduleMeetingModal({
  open,
  onOpenChange,
  clientId,
  clientName,
  clientEmail,
  clientPhone,
  opportunityId,
  onCreated,
}: ScheduleMeetingModalProps) {
  const [title, setTitle] = useState("Reunião de briefing");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [duration, setDuration] = useState(30);
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<MeetingCreatedResponse | null>(null);

  const resetForm = () => {
    setTitle("Reunião de briefing");
    setDate("");
    setTime("10:00");
    setDuration(30);
    setLocation("");
    setNotes("");
    setResult(null);
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time) {
      toast.error("Selecione data e horário da reunião.");
      return;
    }
    const startsAt = new Date(`${date}T${time}:00`);
    if (Number.isNaN(startsAt.getTime())) {
      toast.error("Data/horário inválido.");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await api.meetings.create({
        clientId,
        opportunityId,
        title: title.trim() || "Reunião",
        location: location.trim() || undefined,
        startsAt: startsAt.toISOString(),
        durationMinutes: duration,
        notes: notes.trim() || undefined,
      });
      setResult(created);
      onCreated?.(created);
      toast.success("Reunião agendada!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao agendar reunião.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePortalVisibility = async () => {
    if (!result) return;
    const nextVisible = !Boolean(result.visible_in_client_portal);
    try {
      const updated = await api.meetings.updatePortalVisibility(result.id, nextVisible);
      setResult({
        ...result,
        ...updated,
        meeting_url: result.meeting_url,
        whatsapp_url: result.whatsapp_url,
        email_available: result.email_available,
        email_configured: result.email_configured,
      });
      toast.success(nextVisible ? "Reunião liberada no portal do cliente" : "Reunião removida do portal do cliente");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar portal da reunião.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-frame-black border-frame-gray-3 text-frame-white max-w-lg rounded-none p-6">
        <DialogHeader>
          <DialogTitle className="font-frame-display text-2xl tracking-wider text-frame-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-frame-orange" />
            Marcar Reunião
          </DialogTitle>
          <DialogDescription className="font-frame-body text-xs text-frame-gray-light">
            {result
              ? "Reunião criada com sucesso."
              : `Agendar reunião com ${clientName}.`}
          </DialogDescription>
        </DialogHeader>

        {!result && (
          <div className="mt-3 flex items-start gap-2.5 border border-frame-gray-3 bg-frame-gray-2/20 p-3">
            <Calendar className="w-4 h-4 text-frame-orange shrink-0 mt-0.5" />
            <p className="text-[0.7rem] text-frame-gray-light leading-relaxed">
              Ao confirmar, {clientEmail ? "enviamos um convite por email" : "geramos um link do WhatsApp"} com um arquivo de convite que{" "}
              <strong className="text-frame-white">{clientName}</strong> pode abrir para adicionar a reunião em qualquer agenda —
              Google Agenda, Outlook ou Apple Calendar.
            </p>
          </div>
        )}

        {result ? (
          <div className="space-y-4 mt-2">
            <div className="flex items-start gap-3 border border-frame-gray-3 bg-frame-gray-2/20 p-4">
              <CheckCircle2 className="w-5 h-5 text-frame-green shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-frame-white">{result.title}</p>
                <p className="text-xs text-frame-gray-light">
                  {new Date(result.starts_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                </p>
              </div>
            </div>

            {/* Email status */}
            {result.email_available ? (
              result.email_configured ? (
                result.email_error ? (
                  <div className="flex items-start gap-3 border border-frame-orange/30 bg-frame-orange/[0.06] p-3">
                    <AlertTriangle className="w-4 h-4 text-frame-orange shrink-0 mt-0.5" />
                    <p className="text-xs text-frame-gray-light">
                      Não foi possível enviar o convite por email ({result.email_error}). Use o link do WhatsApp abaixo.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 border border-frame-green/30 bg-frame-green/[0.06] p-3">
                    <Mail className="w-4 h-4 text-frame-green shrink-0" />
                    <p className="text-xs text-frame-gray-light">
                      Convite (.ics) enviado por email para <strong className="text-frame-white">{result.client_email}</strong>.
                    </p>
                  </div>
                )
              ) : (
                <div className="flex items-start gap-3 border border-frame-gray-3 bg-frame-gray-2/20 p-3">
                  <AlertTriangle className="w-4 h-4 text-frame-gray-light shrink-0 mt-0.5" />
                  <p className="text-xs text-frame-gray-light">
                    Envio automático de email não está configurado. Use o link do WhatsApp abaixo.
                  </p>
                </div>
              )
            ) : (
              <div className="flex items-start gap-3 border border-frame-gray-3 bg-frame-gray-2/20 p-3">
                <AlertTriangle className="w-4 h-4 text-frame-gray-light shrink-0 mt-0.5" />
                <p className="text-xs text-frame-gray-light">
                  Este cliente não tem email cadastrado. Use o link do WhatsApp abaixo para avisar.
                </p>
              </div>
            )}

            <div className={`flex flex-col gap-3 border p-3 ${
              result.visible_in_client_portal
                ? "border-frame-green/30 bg-frame-green/[0.06]"
                : "border-frame-gray-3 bg-frame-gray-2/20"
            }`}>
              <div className="flex items-start gap-3">
                <Globe2 className={`w-4 h-4 shrink-0 mt-0.5 ${result.visible_in_client_portal ? "text-frame-green" : "text-frame-gray-light"}`} />
                <div>
                  <p className="text-xs font-semibold text-frame-white">
                    {result.visible_in_client_portal ? "Reunião liberada no portal" : "Reunião interna"}
                  </p>
                  <p className="text-[0.68rem] text-frame-gray-light leading-relaxed">
                    {result.visible_in_client_portal
                      ? "O cliente já consegue ver este compromisso na central dele."
                      : "Libere quando quiser que o cliente veja este compromisso dentro do portal."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={togglePortalVisibility}
                className="frame-btn-ghost w-full flex items-center justify-center gap-2 text-xs"
              >
                <Globe2 className="w-3.5 h-3.5" />
                {result.visible_in_client_portal ? "Remover do portal" : "Liberar no portal"}
              </button>
            </div>

            <a
              href={result.whatsapp_url}
              target="_blank"
              rel="noopener noreferrer"
              className="frame-btn-primary w-full flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              Enviar confirmação pelo WhatsApp
            </a>

            <DialogFooter>
              <button type="button" onClick={() => handleClose(false)} className="frame-btn-ghost w-full">
                Fechar
              </button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <label className="block font-frame-mono text-[0.64rem] tracking-[0.15em] text-frame-orange uppercase">Assunto</label>
              <input
                type="text" required disabled={isSubmitting} value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="frame-input w-full"
                placeholder="Reunião de briefing"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block font-frame-mono text-[0.64rem] tracking-[0.15em] text-frame-orange uppercase">Data</label>
                <input
                  type="date" required disabled={isSubmitting} value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="frame-input w-full"
                  min={new Date().toISOString().slice(0, 10)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block font-frame-mono text-[0.64rem] tracking-[0.15em] text-frame-orange uppercase">Horário</label>
                <input
                  type="time" required disabled={isSubmitting} value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="frame-input w-full"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block font-frame-mono text-[0.64rem] tracking-[0.15em] text-frame-orange uppercase">Duração (minutos)</label>
              <input
                type="number" min={15} step={15} disabled={isSubmitting} value={duration}
                onChange={(e) => setDuration(Number(e.target.value) || 30)}
                className="frame-input w-full"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block font-frame-mono text-[0.64rem] tracking-[0.15em] text-frame-orange uppercase">Local ou link (Meet/Zoom)</label>
              <input
                type="text" disabled={isSubmitting} value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="frame-input w-full"
                placeholder="https://meet.google.com/... ou endereço"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block font-frame-mono text-[0.64rem] tracking-[0.15em] text-frame-orange uppercase">Observações (opcional)</label>
              <textarea
                disabled={isSubmitting} value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="frame-input w-full min-h-[72px]"
                placeholder="Pauta, links úteis, etc."
              />
            </div>

            {!clientEmail && (
              <p className="text-[0.68rem] text-frame-gray-light">
                Este cliente não tem email cadastrado — você poderá enviar a confirmação pelo WhatsApp.
              </p>
            )}

            <DialogFooter>
              <button type="submit" disabled={isSubmitting} className="frame-btn-primary w-full flex items-center justify-center gap-2">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                {isSubmitting ? "Agendando..." : "Agendar Reunião"}
              </button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ScheduleMeetingModal;
