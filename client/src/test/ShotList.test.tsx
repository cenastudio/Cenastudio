import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { api } from "@/lib/api";

vi.mock("wouter", () => ({
  useRoute: () => [true, { projectId: "5" }],
}));

vi.mock("@/components/AppNavBar", () => ({ default: () => <div data-testid="app-nav" /> }));
vi.mock("@/components/ProjectNav", () => ({ default: () => <div data-testid="project-nav" /> }));
vi.mock("@/components/ProtectedRoute", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/FeatureUpgradeRequired", () => ({
  FeatureUpgradeRequired: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

function renderWithLanguage(component: React.ReactElement) {
  return render(<LanguageProvider>{component}</LanguageProvider>);
}

function makeShot(overrides: Record<string, unknown> & { id: number }) {
  return {
    shot_list_id: 1,
    order_index: 0,
    scene: "",
    shot_type: "",
    description: "",
    camera: "",
    lens: "",
    movement: "",
    duration_sec: null,
    status: "pending",
    created_at: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("ShotList page — grouped by scene (step 2)", () => {
  beforeEach(() => {
    vi.mocked(api.shotlists.get).mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the empty state when there are no shots", async () => {
    vi.mocked(api.shotlists.get).mockResolvedValue({
      shotList: { id: 1, user_id: 1, project_id: 5, title: "", created_at: "", updated_at: "" },
      shots: [],
    });

    const { default: ShotList } = await import("@/pages/ShotList");
    renderWithLanguage(<ShotList />);

    expect(await screen.findByText("Organize os planos do projeto")).toBeInTheDocument();
  });

  it("groups shots into scene sections with per-scene count and duration", async () => {
    vi.mocked(api.shotlists.get).mockResolvedValue({
      shotList: { id: 1, user_id: 1, project_id: 5, title: "", created_at: "", updated_at: "" },
      shots: [
        makeShot({ id: 1, scene: "1A", description: "Entrada", duration_sec: 30 }),
        makeShot({ id: 2, scene: "1B", description: "Saída", duration_sec: 45 }),
        makeShot({ id: 3, scene: "1A", description: "Close", duration_sec: 15 }),
      ],
    });

    const { default: ShotList } = await import("@/pages/ShotList");
    renderWithLanguage(<ShotList />);

    await screen.findByText("Entrada");
    expect(screen.getByText("Close")).toBeInTheDocument();
    expect(screen.getByText("Saída")).toBeInTheDocument();

    // Scene headers render with count + duration ("2 · 1min" for 1A: 30+15s)
    expect(screen.getByText(/2 · /)).toBeInTheDocument();
    expect(screen.getByText(/1 · /)).toBeInTheDocument();

    // Aggregate header: 2 scenes, total duration across all shots (90s = 2min)
    expect(screen.getByText(/2 cenas/)).toBeInTheDocument();
    expect(screen.getByText(/2min/)).toBeInTheDocument();
  });

  it("groups shots with no scene under the unassigned section, placed last", async () => {
    vi.mocked(api.shotlists.get).mockResolvedValue({
      shotList: { id: 1, user_id: 1, project_id: 5, title: "", created_at: "", updated_at: "" },
      shots: [
        makeShot({ id: 1, scene: "", description: "Sem cena ainda" }),
        makeShot({ id: 2, scene: "2A", description: "Com cena" }),
      ],
    });

    const { default: ShotList } = await import("@/pages/ShotList");
    renderWithLanguage(<ShotList />);

    await waitFor(() => expect(screen.getByText("Sem cena definida")).toBeInTheDocument());
    expect(screen.getByText("Com cena")).toBeInTheDocument();
    expect(screen.getByText("Sem cena ainda")).toBeInTheDocument();
  });
});
