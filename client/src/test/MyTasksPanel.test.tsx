import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { api } from "@/lib/api";

const routerState = vi.hoisted(() => ({ setLocation: vi.fn() }));
const timerState = vi.hoisted(() => ({ startTimer: vi.fn() }));

vi.mock("wouter", () => ({
  useLocation: () => ["/dashboard", routerState.setLocation],
}));

vi.mock("@/contexts/TimerContext", () => ({
  useTimer: () => ({ startTimer: timerState.startTimer, activeTimer: null, isStarting: false }),
}));

function renderWithLanguage(component: React.ReactElement) {
  return render(<LanguageProvider>{component}</LanguageProvider>);
}

describe("MyTasksPanel", () => {
  beforeEach(() => {
    routerState.setLocation.mockClear();
    timerState.startTimer.mockClear();
    vi.mocked(api.tasks.update).mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders an empty state when there are no pending tasks", async () => {
    vi.mocked(api.tasks.listMine).mockResolvedValue([]);

    const { default: MyTasksPanel } = await import("@/components/MyTasksPanel");
    renderWithLanguage(<MyTasksPanel />);

    expect(await screen.findByText("Nenhuma tarefa pendente")).toBeInTheDocument();
  });

  it("lists pending tasks with project, due date and open link", async () => {
    vi.mocked(api.tasks.listMine).mockResolvedValue([
      {
        id: 1,
        project_id: 5,
        assignee_user_id: 2,
        created_by_user_id: 1,
        title: "Gravar cena 3",
        description: "Até sexta",
        due_date: "2026-08-01T00:00:00.000Z",
        status: "pending",
        stage_id: "planning",
        tool_slug: "callsheet",
        completed_at: null,
        created_at: "2026-07-01T00:00:00.000Z",
        updated_at: "2026-07-01T00:00:00.000Z",
        project_name: "Job Aurora",
      },
    ]);

    const { default: MyTasksPanel } = await import("@/components/MyTasksPanel");
    renderWithLanguage(<MyTasksPanel />);

    expect(await screen.findByText("Gravar cena 3")).toBeInTheDocument();
    expect(screen.getByText("Job Aurora")).toBeInTheDocument();
    expect(screen.getByText("Abrir")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Abrir"));
    expect(routerState.setLocation).toHaveBeenCalledWith("/project/5/studio/callsheet");
  });

  it("starts a timesheet timer from a task without leaving the dashboard", async () => {
    vi.mocked(api.tasks.listMine).mockResolvedValue([
      {
        id: 1,
        project_id: 5,
        assignee_user_id: 2,
        created_by_user_id: 1,
        title: "Decupar material",
        description: null,
        due_date: null,
        status: "pending",
        stage_id: null,
        tool_slug: null,
        completed_at: null,
        created_at: "2026-07-01T00:00:00.000Z",
        updated_at: "2026-07-01T00:00:00.000Z",
        project_name: "Job Aurora",
      },
    ]);

    const { default: MyTasksPanel } = await import("@/components/MyTasksPanel");
    renderWithLanguage(<MyTasksPanel />);

    await screen.findByText("Decupar material");
    fireEvent.click(screen.getByText("Iniciar timer"));

    expect(timerState.startTimer).toHaveBeenCalledWith({
      projectId: 5,
      description: "Decupar material",
    });
    expect(routerState.setLocation).not.toHaveBeenCalled();
  });

  it("marks a task as done inline without navigating", async () => {
    vi.mocked(api.tasks.listMine).mockResolvedValue([
      {
        id: 1,
        project_id: 5,
        assignee_user_id: 2,
        created_by_user_id: 1,
        title: "Concluir isso",
        description: null,
        due_date: null,
        status: "pending",
        stage_id: null,
        tool_slug: null,
        completed_at: null,
        created_at: "2026-07-01T00:00:00.000Z",
        updated_at: "2026-07-01T00:00:00.000Z",
        project_name: "Job Aurora",
      },
    ]);
    vi.mocked(api.tasks.update).mockResolvedValue({
      id: 1,
      project_id: 5,
      assignee_user_id: 2,
      created_by_user_id: 1,
      title: "Concluir isso",
      description: null,
      due_date: null,
      status: "done",
      stage_id: null,
      tool_slug: null,
      completed_at: "2026-07-02T00:00:00.000Z",
      created_at: "2026-07-01T00:00:00.000Z",
      updated_at: "2026-07-02T00:00:00.000Z",
    });

    const { default: MyTasksPanel } = await import("@/components/MyTasksPanel");
    renderWithLanguage(<MyTasksPanel />);

    await screen.findByText("Concluir isso");
    fireEvent.click(screen.getByLabelText("Marcar como concluída"));

    await waitFor(() => expect(api.tasks.update).toHaveBeenCalledWith(1, { status: "done" }));
    expect(routerState.setLocation).not.toHaveBeenCalled();
  });
});
