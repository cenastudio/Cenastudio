import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { AdminContent } from "@/pages/AdminDashboard";

vi.mock("@/components/AppNavBar", () => ({
  default: () => <div data-testid="app-nav" />,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: 99, email: "admin@cenastudio.com", role: "admin", name: "Admin" },
    isAuthenticated: true,
    isAdmin: true,
    isLoading: false,
  }),
}));

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({
    locale: "pt",
    t: (key: string) => {
      const labels: Record<string, string> = {
        "app.admin.tabOverview": "Visão geral",
        "app.admin.users": "Usuários",
        "app.admin.tabTools": "Ferramentas",
        "app.admin.noName": "Sem nome",
        "app.admin.projects": "projetos",
        "app.admin.files": "arquivos",
        "app.admin.reviews": "reviews",
        "app.admin.deleteAccount": "Excluir conta",
        "app.admin.cannotDeleteSelf": "Você não pode excluir sua conta",
        "app.admin.deleting": "Excluindo...",
        "app.admin.accountDeleted": "Conta excluída",
        "app.admin.viewAllUsers": "Ver usuários",
        "app.admin.promote": "Promover",
        "app.admin.demote": "Rebaixar",
        "app.common.loading": "Carregando...",
      };
      return labels[key] ?? key;
    },
  }),
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/admin", vi.fn()],
}));

const targetUser = {
  id: 7,
  name: "Cliente Risco",
  email: "cliente-risco@example.com",
  role: "user",
  github_id: null,
  created_at: "2026-08-01T00:00:00.000Z",
  disabled: false,
  plan_name: "pro",
  generation_limit: 100,
  project_count: 2,
  file_count: 3,
  review_count: 1,
};

function mockAdminApi() {
  Object.assign(api.admin, {
    listTools: vi.fn().mockResolvedValue([]),
    users: vi.fn().mockResolvedValue({ users: [targetUser], count: 1 }),
    metrics: vi.fn().mockResolvedValue(null),
    auditLog: vi.fn().mockResolvedValue([]),
    lgpdRequests: vi.fn().mockResolvedValue([]),
    referrals: vi.fn().mockResolvedValue({ summary: null, entries: [] }),
    aiUsage: vi.fn().mockResolvedValue(null),
    updateUserPlan: vi.fn().mockResolvedValue({}),
    updateUserRole: vi.fn().mockResolvedValue({}),
    deleteUser: vi.fn().mockResolvedValue({}),
    createUser: vi.fn().mockResolvedValue({}),
    createTool: vi.fn().mockResolvedValue({}),
    updateTool: vi.fn().mockResolvedValue({}),
    deleteTool: vi.fn().mockResolvedValue({}),
    userDetail: vi.fn(),
    setUserStatus: vi.fn(),
    updateUserSubscription: vi.fn(),
    resetUserPassword: vi.fn(),
    processLgpdRequest: vi.fn(),
    broadcast: vi.fn(),
  });
}

async function renderUsersTab() {
  render(<AdminContent />);
  fireEvent.click(await screen.findByRole("button", { name: /ver usuários/i }));
  return screen.findByText(targetUser.email);
}

describe("AdminDashboard mobile destructive actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminApi();
  });

  it("renders real mobile-safe touch targets for user actions", async () => {
    await renderUsersTab();

    const userCard = screen.getByText(targetUser.email).closest("div.border");
    expect(userCard).not.toBeNull();

    const actions = within(userCard as HTMLElement);
    expect(actions.getByLabelText(`Plano de ${targetUser.email}`)).toHaveClass("min-h-11");
    expect(actions.getByRole("button", { name: /promover/i })).toHaveClass("min-h-11");
    expect(actions.getByRole("button", { name: `Gerenciar ${targetUser.email}` })).toHaveClass("h-11", "w-11");
    expect(actions.getByRole("button", { name: `Excluir ${targetUser.email}` })).toHaveClass("h-11", "w-11", "border-2");
  });

  it("requires typing the user email before deleting an account", async () => {
    await renderUsersTab();

    fireEvent.click(screen.getByRole("button", { name: `Excluir ${targetUser.email}` }));

    const confirmButton = await screen.findByRole("button", { name: "Confirmar exclusão" });
    expect(confirmButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Digite o e-mail para confirmar"), {
      target: { value: "cliente-risco" },
    });
    expect(confirmButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Digite o e-mail para confirmar"), {
      target: { value: targetUser.email },
    });
    expect(confirmButton).toBeEnabled();

    fireEvent.click(confirmButton);

    await waitFor(() => expect(api.admin.deleteUser).toHaveBeenCalledWith(targetUser.id));
  });
});
