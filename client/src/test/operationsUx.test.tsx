import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { api } from "@/lib/api";
import { DEFAULT_STUDIO_SETTINGS } from "@/lib/studioSettings";

const routerState = vi.hoisted(() => ({
  setLocation: vi.fn(),
  params: { id: "7" },
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

function renderWithLanguage(component: React.ReactElement) {
  return render(<LanguageProvider>{component}</LanguageProvider>);
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
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("searches collaborators across identity and skills", async () => {
    const collaborators = [
      {
        id: 1,
        user_id: 1,
        name: "Ana Fotografia",
        email: "ana@example.com",
        role: "camera",
        phone: "11999990000",
        skills: "luz e camera",
        daily_rate: 1800,
        status: "active",
        created_at: "2026-06-30T12:00:00.000Z",
        updated_at: "2026-06-30T12:00:00.000Z",
      },
      {
        id: 2,
        user_id: 1,
        name: "Bruno Som",
        email: "bruno@example.com",
        role: "member",
        phone: "",
        skills: "captacao de audio",
        daily_rate: 1200,
        status: "active",
        created_at: "2026-06-30T12:00:00.000Z",
        updated_at: "2026-06-30T12:00:00.000Z",
      },
    ];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/stats")) {
        return jsonResponse({ success: true, data: { totalCollaborators: 2, activeCollaborators: 2, byRole: [], totalProjects: 0 } });
      }
      return jsonResponse({ success: true, data: collaborators });
    }));

    const { default: Collaborators } = await import("@/pages/Collaborators");
    renderWithLanguage(<Collaborators />);

    const search = await screen.findByPlaceholderText("Buscar por nome, contato ou habilidade");
    await screen.findByText("Ana Fotografia");
    fireEvent.change(search, { target: { value: "audio" } });

    expect(screen.queryByText("Ana Fotografia")).not.toBeInTheDocument();
    expect(screen.getByText("Bruno Som")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ações para Bruno Som" })).toBeInTheDocument();
  });

  it("offers a retry when the collaborators request fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    let collaboratorAttempts = 0;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/stats")) {
        return jsonResponse({ success: true, data: { totalCollaborators: 0, activeCollaborators: 0, byRole: [], totalProjects: 0 } });
      }
      collaboratorAttempts += 1;
      if (collaboratorAttempts === 1) return jsonResponse({ success: false, error: "offline" }, false);
      return jsonResponse({ success: true, data: [] });
    }));

    const { default: Collaborators } = await import("@/pages/Collaborators");
    renderWithLanguage(<Collaborators />);

    const retry = await screen.findByRole("button", { name: "Tentar novamente" });
    fireEvent.click(retry);

    await waitFor(() => expect(screen.getByText("Nenhum colaborador")).toBeInTheDocument());
    expect(collaboratorAttempts).toBe(2);
    consoleError.mockRestore();
  });

  it("shows pending company changes and disables saving after synchronization", async () => {
    vi.mocked(api.studioSettings.get).mockResolvedValue(DEFAULT_STUDIO_SETTINGS);
    vi.mocked(api.studioSettings.update).mockImplementation(async (settings) => settings);

    const { default: CompanySettings } = await import("@/pages/CompanySettings");
    renderWithLanguage(<CompanySettings />);

    const studioName = await screen.findByRole("textbox", { name: "Nome da produtora" });
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
    expect(screen.getByText("Próximo movimento operacional")).toBeInTheDocument();
    expect(screen.getAllByText("Roteiro").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Transforme o briefing em narrativa pronta para revisar e produzir.").length).toBeGreaterThan(0);
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

    await screen.findByText("Sua carteira ainda está vazia");
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

  it("shows progress and expected output for critical Studio sessions", async () => {
    const onChange = vi.fn();
    const { default: ProposalForm } = await import("@/components/studio/forms/ProposalForm");

    render(<ProposalForm data={{ cliente: "Aurora", escopo: "Filme manifesto", prazo: "15 dias" }} onChange={onChange} />);

    expect(screen.getByText("Sessão proposta")).toBeInTheDocument();
    expect(screen.getByText("3/3")).toBeInTheDocument();
    expect(screen.getByText("Saída esperada: proposta pronta para cliente, com base para contrato e orçamento.")).toBeInTheDocument();
  });
});
