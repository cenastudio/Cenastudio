import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { apiUrl } from "@/lib/api";
import BrandLogo from "@/components/BrandLogo";
import { Calendar, Clock, MapPin, Download, AlertCircle, Loader2 } from "lucide-react";

interface PublicMeeting {
  title: string;
  location: string | null;
  starts_at: string;
  duration_minutes: number;
  notes: string | null;
  client_name: string;
  studio_name: string;
}

/**
 * Public page opened from the WhatsApp link or standalone visits.
 * No login required — anyone with the token can view and download the .ics.
 */
export default function MeetingView() {
  const { token } = useParams<{ token: string }>();
  const [meeting, setMeeting] = useState<PublicMeeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(apiUrl(`/public-meeting/${token}`))
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "Reunião não encontrada.");
        setMeeting(json.data);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar reunião."))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-frame-black text-frame-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-frame-orange" />
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="min-h-screen bg-frame-black text-frame-white flex flex-col items-center justify-center gap-4 px-4 text-center">
        <AlertCircle className="w-10 h-10 text-frame-orange" />
        <p className="text-frame-gray-light">{error || "Reunião não encontrada."}</p>
      </div>
    );
  }

  const startsAt = new Date(meeting.starts_at);
  const dateStr = startsAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const timeStr = startsAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

  return (
    <div className="min-h-screen bg-frame-black text-frame-white flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-6">
        <div className="flex justify-center mb-2">
          <BrandLogo tone="onDark" />
        </div>

        <div className="glow-card p-6 space-y-5">
          <div>
            <p className="font-frame-mono text-[0.6rem] uppercase tracking-wider text-frame-orange mb-1">
              {meeting.studio_name} convida
            </p>
            <h1 className="text-2xl font-bold text-frame-white">{meeting.title}</h1>
            <p className="text-sm text-frame-gray-light mt-1">com {meeting.client_name}</p>
          </div>

          <div className="space-y-3 border-t border-frame-gray-3 pt-4">
            <div className="flex items-center gap-3 text-sm text-frame-gray-light">
              <Calendar className="w-4 h-4 text-frame-orange shrink-0" />
              <span className="capitalize">{dateStr}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-frame-gray-light">
              <Clock className="w-4 h-4 text-frame-orange shrink-0" />
              <span>{timeStr} · {meeting.duration_minutes} min</span>
            </div>
            {meeting.location && (
              <div className="flex items-center gap-3 text-sm text-frame-gray-light">
                <MapPin className="w-4 h-4 text-frame-orange shrink-0" />
                <span className="break-all">{meeting.location}</span>
              </div>
            )}
          </div>

          {meeting.notes && (
            <div className="border-t border-frame-gray-3 pt-4">
              <p className="text-xs text-frame-gray-light whitespace-pre-wrap leading-relaxed">{meeting.notes}</p>
            </div>
          )}

          <a
            href={apiUrl(`/public-meeting/${token}/ics`)}
            className="frame-btn-primary w-full flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Adicionar à minha agenda
          </a>
          <p className="text-[0.65rem] text-frame-gray-light text-center">
            Funciona com Google Agenda, Outlook e Apple Calendar.
          </p>
        </div>
      </div>
    </div>
  );
}
