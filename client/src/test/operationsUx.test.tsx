import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { PlanProvider } from "@/contexts/PlanContext";
import { api } from "@/lib/api";
import { DEFAULT_STUDIO_SETTINGS } from "@/lib/studioSettings";

const routerState = vi.hoisted(() => ({
  setLocation: vi.fn(),
  params: { id: "7" },
}));
const projectContextState = vi.hoisted(() => ({
  activeProject: null as null | { id: number; name: string },
  projects: [] as Array<{ id: number; metadataJson: string }>,
  createProject: vi.fn(),
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/", routerState.setLocation],
  useParams: () => routerState.params,
}));

vi.mock("@/components/AppNavBar", () => ({ default: () => <div data-testid="app-nav" /> }));
vi.mock("@/components/ProjectNav", () => ({ default: () => <div data-testid="project-nav" /> }));
vi.mock("@/components/ProtectedRoute", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/contexts/ProjectContext", () => ({
  useProject: () => projectContextState,
}));

function renderWithLanguage(component: React.ReactElement) {
  // AuthProvider is required because pages like Collaborators/Tools now
  // render ProductionNav (the Production area sub-navigation), which calls
  // useAuth() to determine role-based tab visibility. PlanProvider is
  // required for the same reason since ProductionNav also calls
  // usePlanContext() to gate feature-flagged tabs (e.g. Equipment,
  // Timesheet — see .kiro/specs/landing-features-implementation).
  return render(
    <AuthProvider>
      <PlanProvider>
        <LanguageProvider>{component}</LanguageProvider>
      </PlanProvider>
    </AuthProvider>,
  );
}

function jsonResponse(data: unknown, ok = true) {
  return {
    ok,
    json: vi.fn().mockResolvedValue(data),
  } as unknown as Response;
}

describe("operational UI and UX flows", () => {
  beforeEach(() => {
    vi.mocked(window.localStorage.getItem).mockReturnValue(null);
    routerState.setLocation.mockClear();
    routerState.params = { id: "7" };
    projectContextState.activeProject = null;
    projectContextState.projects = [];
    projectContextState.createProject.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  // NOTE: os testes de busca/retry da página standalone de "Colaboradores"
  // (freelancer sem login) foram removidos junto com a página em si —
  // spec team-task-delegation, Fase 6 (fundida em Team/membros de projeto
  // por userId, cobertos em server/controllers/collaborationSettings.test.ts).

  it("shows pending company changes and disables saving after synchronization", async () => {
    vi.mocked(api.studioSettings.get).mockResolvedValue(DEFAULT_STUDIO_SETTINGS);
    vi.mocked(api.studioSettings.update).mockImplementation(async (settings) => settings);

    const { default: CompanySettings } = await import("@/pages/CompanySettings");
    renderWithLanguage(<CompanySettings />);

    const studioName = await screen.findByRole("textbox", { name: "Nome do estúdio *" });
    const savedButtons = await screen.findAllByRole("button", { name: "Tudo salvo" });
    expect(savedButtons[0]).toBeDisabled();

    fireEvent.change(studioName, { target: { value: "Aurora Filmes" } });
    expect(screen.getByText("Alterações pendentes")).toBeInTheDocument();

    const saveButton = screen.getByRole("button", { name: "Salvar empresa" });
    fireEvent.click(saveButton);

    await waitFor(() => expect(api.studioSettings.update).toHaveBeenCalledWith(
      expect.objectContaining({ studioName: "Aurora Filmes" }),
    ));
    await waitFor(() => expect(screen.getByRole("button", { name: "Tudo salvo" })).toBeDisabled());
  });

  it("shows relative and exact timestamps in notifications", async () => {
    const createdAt = new Date(Date.now() - 5 * 60_000).toISOString();
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("unread-count")) return jsonResponse({ success: true, data: { count: 1 } });
      return jsonResponse({
        success: true,
        data: [{
          id: 1,
          user_id: 1,
          title: "Conta criada",
          message: "Novo acesso liberado",
          type: "success",
          read: 0,
          link: null,
          created_at: createdAt,
        }],
      });
    }));

    const { default: NotificationsPopover } = await import("@/components/NotificationsPopover");
    renderWithLanguage(<NotificationsPopover />);

    const trigger = await screen.findByRole("button", { name: "1 Não lido" });
    fireEvent.click(trigger);

    await screen.findByText("Conta criada");
    expect(screen.getByText("5min")).toBeInTheDocument();
    const timestamp = screen.getByLabelText(/Criada em:/);
    expect(timestamp).toHaveAttribute("datetime", createdAt);
    expect(timestamp).toHaveAttribute("title", expect.stringMatching(/\d{2}\/\d{2}.*\d{2}:\d{2}/));
  });

  it("guides the next operational move in the project hub", async () => {
    vi.mocked(api.projects.populatedStates).mockResolvedValue([{ toolId: "briefing", updatedAt: "2026-06-30T12:00:00.000Z" }]);
    vi.mocked(api.tasks.listByProject).mockResolvedValue([]);
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/projects/7")) {
        return jsonResponse({
          success: true,
          data: {
            id: 7,
            name: "Campanha Aurora",
            description: "Filme de lançamento",
            status: "active",
            metadataJson: JSON.stringify({ objective: "Lançar produto", projectType: "Comercial" }),
            created_at: "2026-06-30T12:00:00.000Z",
            updated_at: "2026-06-30T12:00:00.000Z",
          },
        });
      }
      if (url.includes("/api/project-members")) return jsonResponse({ success: true, data: [] });
      if (url.includes("/api/files")) return jsonResponse({ success: true, data: { files: [] } });
      if (url.includes("/api/video-reviews")) return jsonResponse({ success: true, data: [] });
      return jsonResponse({ success: true, data: [] });
    }));

    const { default: ProjectHub } = await import("@/pages/ProjectHub");
    renderWithLanguage(<ProjectHub />);

    await screen.findByText("Campanha Aurora");
    // ProjectHub renders "Próximo passo →" followed by the current stage
    // label, then the recommended action's title/description.
    expect(screen.getByText("Próximo passo →")).toBeInTheDocument();
    expect(screen.getAllByText("Orçamento").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Custos, margem e premissas do job.").length).toBeGreaterThan(0);
  });

  it("shows client load recovery and no-result state without losing context", async () => {
    let clientAttempts = 0;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/clients/stats")) {
        return jsonResponse({ success: true, data: { totalClients: 0, activeClients: 0, leadClients: 0, totalRevenue: 0, bySegment: [], recentActivity: [] } });
      }
      clientAttempts += 1;
      if (clientAttempts <= 2) return jsonResponse({ success: false, error: "offline" }, false);
      return jsonResponse({ success: true, data: [] });
    }));

    const { default: Clients } = await import("@/pages/Clients");
    renderWithLanguage(<Clients />);

    const retry = await screen.findByRole("button", { name: "Tentar novamente" });
    fireEvent.click(retry);

    await screen.findByText("Sua carteira está vazia");
    expect(clientAttempts).toBeGreaterThanOrEqual(3);
  });

  it("summarizes pipeline focus and recovers from API failure", async () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60_000).toISOString().slice(0, 10);
    let shouldFail = true;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (shouldFail) return jsonResponse({ success: false, error: "offline" }, false);
      if (url.includes("pipeline-opportunities")) {
        return jsonResponse({
          success: true,
          data: [{
            id: 1,
            title: "Retainer mensal",
            stage: "proposal",
            estimated_value: 20000,
            probability: 50,
            expected_close_date: tomorrow,
            lost_reason: null,
            client_name: "Aurora",
            client_company: "Aurora Filmes",
            created_at: "2026-06-30T12:00:00.000Z",
            updated_at: "2026-06-30T12:00:00.000Z",
          }],
        });
      }
      if (url.includes("pipeline-stats")) {
        return jsonResponse({ success: true, data: { totalOpportunities: 1, totalPipelineValue: 20000, byStage: [], wonThisMonth: { count: 0, value: 0 } } });
      }
      return jsonResponse({ success: true, data: [{ id: 1, name: "Aurora", company: "Aurora Filmes" }] });
    }));

    const { default: Pipeline } = await import("@/pages/Pipeline");
    renderWithLanguage(<Pipeline />);

    const retry = await screen.findByRole("button", { name: "Tentar novamente" });
    shouldFail = false;
    fireEvent.click(retry);

    await waitFor(() => expect(screen.getAllByText("Retainer mensal").length).toBeGreaterThan(0));
    expect(screen.getByText("Próximo foco")).toBeInTheDocument();
    expect(screen.getByText("Abertas")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ações para Retainer mensal" })).toBeInTheDocument();
  });

  it("turns a won opportunity into a connected project", async () => {
    projectContextState.createProject.mockResolvedValue({ id: 91, name: "Filme Aurora", metadataJson: "{}" });
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("pipeline-opportunities")) return jsonResponse({ success: true, data: [{
        id: 44,
        client_id: 7,
        title: "Filme Aurora",
        stage: "won",
        estimated_value: 48000,
        probability: 100,
        expected_close_date: null,
        lost_reason: null,
        client_name: "Aurora",
        client_company: "Aurora Filmes",
        created_at: "2026-06-30T12:00:00.000Z",
        updated_at: "2026-06-30T12:00:00.000Z",
      }] });
      if (url.includes("pipeline-stats")) return jsonResponse({ success: true, data: { totalOpportunities: 1, totalPipelineValue: 48000, byStage: [], wonThisMonth: { count: 1, value: 48000 } } });
      return jsonResponse({ success: true, data: [{ id: 7, name: "Aurora", company: "Aurora Filmes" }] });
    }));

    const { default: Pipeline } = await import("@/pages/Pipeline");
    renderWithLanguage(<Pipeline />);

    const title = await screen.findByText("Filme Aurora");
    fireEvent.click(title.closest("button")!);
    const convert = await screen.findByRole("button", { name: "Transformar em projeto" });
    fireEvent.click(convert);

    await waitFor(() => expect(projectContextState.createProject).toHaveBeenCalledWith(
      "Filme Aurora",
      "Projeto criado a partir da oportunidade #44.",
      7,
      expect.stringContaining('"sourceOpportunityId":44'),
    ));
    await waitFor(() => expect(routerState.setLocation).toHaveBeenCalledWith("/project/91/journey/entry"));
  });

  it("shows progress and expected output for critical Studio sessions", async () => {
    const onChange = vi.fn();
    const { default: ProposalForm } = await import("@/components/studio/forms/ProposalForm");

    renderWithLanguage(<ProposalForm data={{ cliente: "Aurora", escopo: "Filme manifesto", prazo: "15 dias" }} onChange={onChange} />);

    expect(screen.getByText("Sessão proposta")).toBeInTheDocument();
    expect(screen.getByText("3/3")).toBeInTheDocument();
    expect(screen.getByText("Saída esperada: proposta pronta para cliente, com base para contrato e orçamento.")).toBeInTheDocument();
  });

  it("opens tools inside the active project context from the full card", async () => {
    projectContextState.activeProject = { id: 91, name: "Filme Aurora" };
    vi.mocked(api.tools.list).mockResolvedValue([{
      id: "07",
      slug: "briefing",
      name: "Briefing",
      description: "Base do job",
      category: "pre",
      icon: "file-text",
      tags: ["entrada"],
      isActive: true,
    }]);

    const { default: Tools } = await import("@/pages/Tools");
    renderWithLanguage(<Tools />);

    const card = await screen.findByText("Briefing");
    fireEvent.click(card.closest(".frame-card")!);

    expect(routerState.setLocation).toHaveBeenCalledWith("/project/91/studio/briefing");
  });
});
