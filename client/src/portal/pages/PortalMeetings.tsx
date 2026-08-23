import { useEffect, useState } from "react";
import { portalApi, type PortalMeetingSummary } from "../portalApi";
import PortalLayout from "../PortalLayout";
import { formatPortalDateTime, PortalEmptyState, PortalPageHeader, portalStatusLabel } from "../portalUi";

export default function PortalMeetings() {
  const [meetings, setMeetings] = useState<PortalMeetingSummary[] | null>(null);

  useEffect(() => {
    portalApi.meetings.list().then(setMeetings).catch(() => setMeetings([]));
  }, []);

  const upcoming = (meetings ?? [])
    .filter((meeting) => new Date(meeting.startsAt).getTime() >= Date.now())
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const past = (meetings ?? [])
    .filter((meeting) => new Date(meeting.startsAt).getTime() < Date.now())
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());

  return (
    <PortalLayout>
      <PortalPageHeader
        eyebrow="Agenda"
        title="Reunioes agendadas"
        description="Veja os proximos encontros, alinhamentos e historico de conversas vinculadas ao seu projeto."
      />

      {meetings === null && <p className="text-frame-gray-light">Carregando…</p>}
      {meetings?.length === 0 && (
        <PortalEmptyState
          title="Nenhuma reuniao agendada."
          description="Quando o estudio marcar um alinhamento, ele aparece aqui com data, duracao e local."
        />
      )}

      {meetings && meetings.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section>
            <h2 className="font-frame-mono text-xs uppercase tracking-wider text-frame-gray-light mb-3">Proximas</h2>
            {upcoming.length === 0 ? (
              <div className="border border-frame-gray-3 bg-frame-gray-1/25 p-5">
                <p className="text-sm text-frame-gray-light">Sem reunioes futuras no momento.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcoming.map((meeting) => (
                  <article key={meeting.id} className="border border-frame-orange/40 bg-frame-orange/[0.04] p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div>
                        <p className="font-semibold text-frame-white">{meeting.title}</p>
                        <p className="text-sm text-frame-gray-light mt-1">{formatPortalDateTime(meeting.startsAt)}</p>
                      </div>
                      <span className="font-frame-mono text-[0.6rem] uppercase text-frame-orange">{portalStatusLabel(meeting.status)}</span>
                    </div>
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <div className="border border-frame-gray-3/60 px-3 py-2">
                        <p className="frame-label text-frame-gray-light">Duracao</p>
                        <p className="text-frame-white mt-1">{meeting.durationMinutes} min</p>
                      </div>
                      <div className="border border-frame-gray-3/60 px-3 py-2">
                        <p className="frame-label text-frame-gray-light">Local</p>
                        <p className="text-frame-white mt-1">{meeting.location || "A definir"}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="font-frame-mono text-xs uppercase tracking-wider text-frame-gray-light mb-3">Historico</h2>
            {past.length === 0 ? (
              <div className="border border-frame-gray-3 bg-frame-gray-1/25 p-5">
                <p className="text-sm text-frame-gray-light">Nenhuma reuniao anterior.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {past.map((meeting) => (
                  <article key={meeting.id} className="border border-frame-gray-3 bg-frame-gray-1/25 px-4 py-3">
                    <p className="text-sm font-medium text-frame-white">{meeting.title}</p>
                    <p className="font-frame-mono text-[0.6rem] uppercase text-frame-gray-light mt-1">
                      {formatPortalDateTime(meeting.startsAt)} · {meeting.durationMinutes} min
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </PortalLayout>
  );
}
