import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { api } from "@/lib/api";

const routerState = vi.hoisted(() => ({ setLocation: vi.fn() }));
const timerState = vi.hoisted(() => ({ startTimer: vi.fn() }));

vi.mock("wouter", () => ({
  useLocation: () => ["/project/5", routerState.setLocation],
}));

vi.mock("@/contexts/TimerContext", () => ({
  useTimer: () => ({ startTimer: timerState.startTimer, activeTimer: null, isStarting: false }),
}));

function renderWithLanguage(component: React.ReactElement) {
  return render(<LanguageProvider>{component}</LanguageProvider>);
}

const sampleTask = {
  id: 1,
  project_id: 5,
  assignee_user_id: 2,
  created_by_user_id: 1,
  title: "Gravar cena 3",
  description: null,
  due_date: null,
  status: "pending" as const,
  stage_id: null,
  tool_slug: null,
  completed_at: null,
  created_at: "2026-07-01T00:00:00.000Z",
  updated_at: "2026-07-01T00:00:00.000Z",
  assignee_name: "Editor",
  assignee_email: "editor@example.com",
};

describe("ProjectTasksPanel", () => {
  beforeEach(() => {
    routerState.setLocation.mockClear();
    timerState.startTimer.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders an empty state and hides the create button for non-managers", async () => {
    vi.mocked(api.tasks.listByProject).mockResolvedValue([]);

    const { default: ProjectTasksPanel } = await import("@/components/ProjectTasksPanel");
    renderWithLanguage(<ProjectTasksPanel projectId={5} canManage={false} />);

    expect(await screen.findByText("Nenhuma tarefa neste projeto")).toBeInTheDocument();
    expect(screen.queryByText("Nova Tarefa")).not.toBeInTheDocument();
  });

  it("lists tasks with assignee and status for managers, showing the create button", async () => {
    vi.mocked(api.tasks.listByProject).mockResolvedValue([sampleTask]);

    const { default: ProjectTasksPanel } = await import("@/components/ProjectTasksPanel");
    renderWithLanguage(<ProjectTasksPanel projectId={5} canManage />);

    expect(await screen.findByText("Gravar cena 3")).toBeInTheDocument();
    expect(screen.getByText("Editor")).toBeInTheDocument();
    expect(screen.getByText("Pendente")).toBeInTheDocument();
    expect(screen.getByText("Nova Tarefa")).toBeInTheDocument();
  });

  it("starts a timesheet timer from the project task list", async () => {
    vi.mocked(api.tasks.listByProject).mockResolvedValue([sampleTask]);

    const { default: ProjectTasksPanel } = await import("@/components/ProjectTasksPanel");
    renderWithLanguage(<ProjectTasksPanel projectId={5} canManage />);

    await screen.findByText("Gravar cena 3");
    fireEvent.click(screen.getByText("Iniciar timer"));

    expect(timerState.startTimer).toHaveBeenCalledWith({
      projectId: 5,
      description: "Gravar cena 3",
    });
  });

  it("opens the create dialog, loads assignable members and submits a new task", async () => {
    vi.mocked(api.tasks.listByProject).mockResolvedValueOnce([]).mockResolvedValueOnce([sampleTask]);
    vi.mocked(api.tasks.listAssignableMembers).mockResolvedValue([
      { id: 1, name: "Owner", email: "owner@example.com" },
      { id: 2, name: "Editor", email: "editor@example.com" },
    ]);
    vi.mocked(api.tasks.create).mockResolvedValue(sampleTask);

    const { default: ProjectTasksPanel } = await import("@/components/ProjectTasksPanel");
    renderWithLanguage(<ProjectTasksPanel projectId={5} canManage />);

    await screen.findByText("Nenhuma tarefa neste projeto");
    fireEvent.click(screen.getByText("Nova Tarefa"));

    await waitFor(() => expect(api.tasks.listAssignableMembers).toHaveBeenCalledWith(5));

    fireEvent.change(await screen.findByLabelText("Título"), { target: { value: "Gravar cena 3" } });
    await waitFor(() => {
      expect(screen.getByText("Editor")).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText("Responsável"), { target: { value: "2" } });

    fireEvent.click(screen.getByText("Criar Tarefa"));

    await waitFor(() =>
      expect(api.tasks.create).toHaveBeenCalledWith(5, {
        title: "Gravar cena 3",
        description: null,
        assigneeUserId: 2,
        dueDate: null,
        stageId: null,
        toolSlug: null,
      }),
    );
  });
});
