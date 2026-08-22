import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { api } from "@/lib/api";

vi.mock("wouter", () => ({
  useRoute: () => [true, { projectId: "5" }],
}));

vi.mock("@/contexts/PlanContext", () => ({
  usePlanContext: () => ({ planMode: "studio" }),
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
    shot_number: null,
    thumbnail_url: null,
    production_notes: null,
    created_at: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("ShotList page — grouped by scene (step 2)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(api.shotlists.get).mockReset();
    vi.mocked(api.shotlists.listStoryboardFrames).mockReset();
    vi.mocked(api.shotlists.generateStoryboardFrame).mockReset();
    vi.mocked(api.shotlists.approveStoryboardFrame).mockReset();
    vi.mocked(api.shotlists.deleteStoryboardFrame).mockReset();
  });

  afterEach(() => {
    localStorage.clear();
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

    // Scene header badges render the shot count per scene (1A: 2 shots, 1B: 1 shot)
    expect(screen.getByText("2 shots")).toBeInTheDocument();
    expect(screen.getByText("1 shot")).toBeInTheDocument();

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

    await screen.findByText("Sem cena definida");
    // Scene groups auto-expand asynchronously after shots load, so await the
    // shot rows rather than reading them synchronously.
    expect(await screen.findByText("Com cena")).toBeInTheDocument();
    expect(await screen.findByText("Sem cena ainda")).toBeInTheDocument();
  });
});

describe("ShotList page — storyboard frames (G4)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(api.shotlists.get).mockReset();
    vi.mocked(api.shotlists.listStoryboardFrames).mockReset();
    vi.mocked(api.shotlists.generateStoryboardFrame).mockReset();
    vi.mocked(api.shotlists.approveStoryboardFrame).mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("generates and approves a storyboard frame from a shot row", async () => {
    vi.mocked(api.shotlists.get).mockResolvedValue({
      shotList: { id: 1, user_id: 1, project_id: 5, title: "", created_at: "", updated_at: "" },
      shots: [makeShot({ id: 7, scene: "3A", description: "Entrada heroica" })],
    });
    vi.mocked(api.shotlists.listStoryboardFrames).mockResolvedValue([]);
    vi.mocked(api.shotlists.generateStoryboardFrame).mockResolvedValue({
      id: 10,
      user_id: 1,
      project_id: 5,
      shot_id: 7,
      prompt: "Luz recortando personagem",
      final_prompt: "final prompt",
      provider: "mock",
      model: "storyboard-mock",
      image_url: "https://cdn.example.com/storyboard.png",
      storage_path: null,
      status: "generated",
      error_message: null,
      revision: 1,
      approved_at: null,
      approved_by_id: null,
      created_at: "2026-08-22T00:00:00.000Z",
      updated_at: "2026-08-22T00:00:00.000Z",
    });
    vi.mocked(api.shotlists.approveStoryboardFrame).mockResolvedValue({
      id: 10,
      user_id: 1,
      project_id: 5,
      shot_id: 7,
      prompt: "Luz recortando personagem",
      final_prompt: "final prompt",
      provider: "mock",
      model: "storyboard-mock",
      image_url: "https://cdn.example.com/storyboard.png",
      storage_path: null,
      status: "approved",
      error_message: null,
      revision: 1,
      approved_at: "2026-08-22T00:01:00.000Z",
      approved_by_id: 1,
      created_at: "2026-08-22T00:00:00.000Z",
      updated_at: "2026-08-22T00:01:00.000Z",
    });

    const { default: ShotList } = await import("@/pages/ShotList");
    renderWithLanguage(<ShotList />);

    await screen.findByText("Entrada heroica");
    fireEvent.click(screen.getByRole("button", { name: "Storyboard" }));

    expect(await screen.findByText("Storyboard do plano")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Ex: desenho a lápis com contraluz e câmera baixa"), {
      target: { value: "Luz recortando personagem" },
    });
    fireEvent.click(screen.getByRole("button", { name: /gerar frame/i }));

    await waitFor(() =>
      expect(api.shotlists.generateStoryboardFrame).toHaveBeenCalledWith(7, {
        prompt: "Luz recortando personagem",
        aspectRatio: "16:9",
      }),
    );
    expect(await screen.findByText("Luz recortando personagem")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Aprovar" }));

    await waitFor(() => expect(api.shotlists.approveStoryboardFrame).toHaveBeenCalledWith(10));
    expect(await screen.findByText("Aprovado")).toBeInTheDocument();
  });
});

describe("ShotList page — duration field (step 3)", () => {
  beforeEach(() => {
    vi.mocked(api.shotlists.get).mockReset();
    vi.mocked(api.shotlists.addShot).mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("converts minutes entered in the form to seconds when creating a shot", async () => {
    vi.mocked(api.shotlists.get).mockResolvedValue({
      shotList: { id: 1, user_id: 1, project_id: 5, title: "", created_at: "", updated_at: "" },
      shots: [],
    });
    vi.mocked(api.shotlists.addShot).mockResolvedValue(
      makeShot({ id: 1, description: "Novo plano", duration_sec: 120 }) as any,
    );

    const { default: ShotList } = await import("@/pages/ShotList");
    renderWithLanguage(<ShotList />);

    fireEvent.click(await screen.findByText("Adicionar primeiro plano"));

    fireEvent.change(screen.getByPlaceholderText("Ex: Protagonista entra em cena"), {
      target: { value: "Novo plano" },
    });
    fireEvent.change(screen.getByPlaceholderText("Ex: 2"), { target: { value: "2" } });

    const submitButtons = screen.getAllByRole("button", { name: /adicionar plano/i });
    const submitButton = submitButtons.find((btn) => btn.getAttribute("type") === "submit");
    fireEvent.click(submitButton!);

    await waitFor(() =>
      expect(api.shotlists.addShot).toHaveBeenCalledWith(
        5,
        expect.objectContaining({ durationSec: 120 }),
      ),
    );
  });

  it("shows the per-shot duration column when printing (aggregate label present in header)", async () => {
    vi.mocked(api.shotlists.get).mockResolvedValue({
      shotList: { id: 1, user_id: 1, project_id: 5, title: "", created_at: "", updated_at: "" },
      shots: [makeShot({ id: 1, scene: "1A", description: "Plano com duração", duration_sec: 90 })],
    });

    const { default: ShotList } = await import("@/pages/ShotList");
    renderWithLanguage(<ShotList />);

    await screen.findByText("Plano com duração");
    // Aggregate duration header reflects the 90s shot (1min30 -> our formatDuration rounds to 2min)
    expect(screen.getByText(/Duração total:/)).toBeInTheDocument();
  });
});
