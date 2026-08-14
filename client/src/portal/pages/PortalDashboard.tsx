import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  portalApi,
  type PortalFileSummary,
  type PortalFinancialSummary,
  type PortalMeetingSummary,
  type PortalProjectSummary,
  type PortalProposalSummary,
} from "../portalApi";
import PortalLayout from "../PortalLayout";
import {
  formatPortalCurrency,
  formatPortalDate,
  formatPortalDateTime,
  PortalEmptyState,
  PortalPageHeader,
  PortalStatCard,
  portalStatusLabel,
} from "../portalUi";

export default function PortalDashboard() {
  const [projects, setProjects] = useState<PortalProjectSummary[] | null>(null);
  const [files, setFiles] = useState<PortalFileSummary[]>([]);
  const [proposals, setProposals] = useState<PortalProposalSummary[]>([]);
  const [meetings, setMeetings] = useState<PortalMeetingSummary[]>([]);
  const [financial, setFinancial] = useState<PortalFinancialSummary | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    Promise.allSettled([
      portalApi.projects.list(),
      portalApi.files.list(),
      portalApi.proposals.list(),
      portalApi.meetings.list(),
      portalApi.financialSummary(),
    ])
      .then(([projectResult, fileResult, proposalResult, meetingResult, financialResult]) => {
        setProjects(projectResult.status === "fulfilled" ? projectResult.value : []);
        setFiles(fileResult.status === "fulfilled" ? fileResult.value : []);
        setProposals(proposalResult.status === "fulfilled" ? proposalResult.value : []);
        setMeetings(meetingResult.status === "fulfilled" ? meetingResult.value : []);
        setFinancial(financialResult.status === "fulfilled" ? financialResult.value : null);
      });
  }, []);

  const activeProjects = projects?.filter((project) => !["completed", "archived"].includes(project.status)) ?? [];
  const nextMeeting = meetings
    .filter((meeting) => new Date(meeting.startsAt).getTime() >= Date.now())
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0];
  const latestFiles = files.slice(0, 4);
  const latestProposals = proposals.slice(0, 3);

  return (
    <PortalLayout>
      <PortalPageHeader
        eyebrow="Area do cliente"
        title="Tudo do seu projeto em um lugar"
        description="Acompanhe andamento, baixe arquivos, veja propostas e encontre as proximas reunioes sem procurar em conversas antigas."
        action={
          <button
            type="button"
            onClick={() => setLocation(activeProjects[0] ? `/portal/projects/${activeProjects[0].id}` : "/portal/files")}
            className="frame-btn-primary min-h-11 justify-center"
          >
            {activeProjects[0] ? "Abrir projeto ativo" : "Ver arquivos"}
          </button>
        }
      />

      {projects === null && <p className="text-frame-gray-light">Carregando...</p>}

      {projects && (
        <>
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <PortalStatCard label="Projetos ativos" value={activeProjects.length} />
            <PortalStatCard label="Arquivos" value={files.length} />
            <PortalStatCard label="Em aberto" value={financial ? formatPortalCurrency(financial.totalPending) : "--"} />
            <PortalStatCard label="Proxima reuniao" value={nextMeeting ? formatPortalDate(nextMeeting.startsAt) : "Nada agendado"} />
          </section>

          {projects.length === 0 ? (
            <PortalEmptyState
              title="Nenhum projeto vinculado ainda."
              description="Quando o estudio liberar um projeto, ele aparece aqui com arquivos e proximos passos."
            />
          ) : (
            <section className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="font-frame-mono text-xs uppercase tracking-wider text-frame-gray-light">Projetos</h2>
                  <span className="text-xs text-frame-gray-light">{projects.length} no portal</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => setLocation(`/portal/projects/${project.id}`)}
                      className="min-h-[180px] text-left border border-frame-gray-3 bg-frame-gray-1/30 p-5 hover:border-frame-orange/60 transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-frame-white mb-1 truncate">{project.name}</p>
                          <p className="font-frame-mono text-[0.65rem] uppercase text-frame-gray-light">{portalStatusLabel(project.status)}</p>
                        </div>
                        <span className="font-frame-mono text-xs text-frame-orange">{project.progress}%</span>
                      </div>
                      <div className="h-1.5 bg-frame-gray-3 overflow-hidden my-4">
                        <div className="h-full bg-frame-orange" style={{ width: `${Math.min(100, Math.max(0, project.progress))}%` }} />
                      </div>
                      <p className="text-xs text-frame-gray-light">Prazo: {formatPortalDate(project.deadline)}</p>
                      <p className="mt-4 font-frame-mono text-[0.6rem] uppercase text-frame-orange">Abrir painel do projeto</p>
                    </button>
                  ))}
                </div>
              </div>

              <aside className="space-y-4">
                <div className="border border-frame-orange/40 bg-frame-orange/[0.04] p-4">
                  <h2 className="font-frame-mono text-xs uppercase tracking-wider text-frame-orange mb-3">Proxima reuniao</h2>
                  {nextMeeting ? (
                    <div className="space-y-3">
                      <div>
                        <p className="font-semibold text-frame-white">{nextMeeting.title}</p>
                        <p className="text-sm text-frame-gray-light mt-1">
                          {formatPortalDateTime(nextMeeting.startsAt)} · {nextMeeting.durationMinutes} min
                        </p>
                        {nextMeeting.location && <p className="text-sm text-frame-gray-light mt-1">{nextMeeting.location}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => setLocation("/portal/meetings")}
                        className="frame-btn-secondary min-h-11 w-full justify-center"
                      >
                        Ver agenda
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-frame-gray-light">Nenhuma reuniao futura agendada.</p>
                      <button
                        type="button"
                        onClick={() => setLocation("/portal/meetings")}
                        className="mt-3 frame-btn-secondary min-h-11 w-full justify-center"
                      >
                        Ver historico
                      </button>
                    </div>
                  )}
                </div>

                <div className="border border-frame-gray-3 bg-frame-gray-1/25 p-4">
                  <h2 className="font-frame-mono text-xs uppercase tracking-wider text-frame-gray-light mb-3">Arquivos recentes</h2>
                  {latestFiles.length === 0 ? (
                    <p className="text-sm text-frame-gray-light">Nenhum arquivo liberado ainda.</p>
                  ) : (
                    <div className="space-y-2">
                      {latestFiles.map((file) => (
                        <a key={file.id} href={portalApi.files.downloadUrl(file.id)} className="block border border-frame-gray-3/60 px-3 py-2 hover:border-frame-orange/50 transition">
                          <p className="text-sm text-frame-white truncate">{file.originalName}</p>
                          <p className="font-frame-mono text-[0.58rem] uppercase text-frame-gray-light truncate">{file.projectName}</p>
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border border-frame-gray-3 bg-frame-gray-1/25 p-4">
                  <h2 className="font-frame-mono text-xs uppercase tracking-wider text-frame-gray-light mb-3">Propostas</h2>
                  {latestProposals.length === 0 ? (
                    <p className="text-sm text-frame-gray-light">Nenhuma proposta vinculada.</p>
                  ) : (
                    <div className="space-y-2">
                      {latestProposals.map((proposal) => (
                        <div key={proposal.id} className="border border-frame-gray-3/60 px-3 py-2">
                          <p className="text-sm text-frame-white truncate">{proposal.title}</p>
                          <p className="font-frame-mono text-[0.58rem] uppercase text-frame-orange">{formatPortalCurrency(proposal.total)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </aside>
            </section>
          )}
        </>
      )}
    </PortalLayout>
  );
}
