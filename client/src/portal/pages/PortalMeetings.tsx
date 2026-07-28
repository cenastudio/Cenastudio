import { useEffect, useState } from "react";
import { portalApi, type PortalMeetingSummary } from "../portalApi";
import PortalLayout from "../PortalLayout";

export default function PortalMeetings() {
  const [meetings, setMeetings] = useState<PortalMeetingSummary[] | null>(null);

  useEffect(() => {
    portalApi.meetings.list().then(setMeetings).catch(() => setMeetings([]));
  }, []);

  return (
    <PortalLayout>
      <p className="frame-label mb-2">// Reuniões</p>
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-frame-white mb-6">Reuniões</h1>

      {meetings === null && <p className="text-frame-gray-light">Carregando...</p>}
      {meetings?.length === 0 && <p className="text-frame-gray-light">Nenhuma reunião agendada.</p>}

      <ul className="space-y-2">
        {meetings?.map((meeting) => (
          <li key={meeting.id} className="border border-frame-gray-3 bg-frame-gray-1/30 px-4 py-3">
            <p className="text-sm text-frame-white">{meeting.title}</p>
            <p className="font-frame-mono text-[0.6rem] uppercase text-frame-gray-light">
              {new Date(meeting.startsAt).toLocaleString("pt-BR")} · {meeting.durationMinutes} min
              {meeting.location ? ` · ${meeting.location}` : ""}
            </p>
          </li>
        ))}
      </ul>
    </PortalLayout>
  );
}
