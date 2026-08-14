import "@testing-library/jest-dom";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProjectNav from "@/components/ProjectNav";

const routerState = vi.hoisted(() => ({
  location: "/project/7",
  setLocation: vi.fn(),
}));

vi.mock("wouter", () => ({
  useLocation: () => [routerState.location, routerState.setLocation],
}));

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const labels: Record<string, string> = {
        "app.common.backToDashboard": "Voltar ao painel",
        "app.common.project": "Projeto",
        "app.common.overview": "Visão geral",
        "app.nav.projectJourney": "Jornada do projeto",
      };
      return labels[key] ?? key;
    },
  }),
}));

vi.mock("@/contexts/PlanContext", () => ({
  usePlanContext: () => ({
    planMode: "studio",
  }),
}));

function mockProjectFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: { name: "Projeto Alfa" } }),
    }),
  );
}

function renderProjectNav(location = "/project/7") {
  routerState.location = location;
  routerState.setLocation.mockClear();
  return render(<ProjectNav projectId={7} />);
}

function getMobileNav(container: HTMLElement) {
  const mobileNav = container.querySelector(".md\\:hidden");
  expect(mobileNav).not.toBeNull();
  return mobileNav as HTMLElement;
}

describe("ProjectNav mobile navigation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockProjectFetch();
    routerState.location = "/project/7";
    routerState.setLocation.mockClear();
  });

  it("replaces stacked horizontal scroll rows with mobile dropdown controls", async () => {
    const { container } = renderProjectNav();
    expect(await screen.findAllByText("Projeto Alfa")).toHaveLength(2);

    const mobileNav = getMobileNav(container);
    expect(mobileNav.querySelector(".overflow-x-auto")).toBeNull();

    expect(within(mobileNav).getByRole("button", { name: /seção do projeto/i })).toHaveClass("min-h-11");
    expect(within(mobileNav).getByRole("button", { name: /jornada do projeto/i })).toHaveClass("min-h-11");
  });

  it("opens project sections and navigates to each section in two taps", () => {
    const { container, rerender } = renderProjectNav();

    const targets = [
      ["Visão geral", "/project/7"],
      ["Orçamento", "/project/7/budget"],
      ["DRE", "/project/7/dre"],
      ["Shot List", "/project/7/shotlist"],
    ] as const;

    for (const [label, path] of targets) {
      routerState.location = "/project/7";
      rerender(<ProjectNav projectId={7} />);

      const mobileNav = getMobileNav(container);
      fireEvent.click(within(mobileNav).getByRole("button", { name: /seção do projeto/i }));

      const item = within(mobileNav).getByRole("button", { name: new RegExp(label, "i") });
      expect(item).toHaveClass("min-h-11");
      fireEvent.click(item);

      expect(routerState.setLocation).toHaveBeenLastCalledWith(path);
    }
  });

  it("opens journey stages and navigates to each stage in two taps", () => {
    const { container, rerender } = renderProjectNav();

    const targets = [
      ["Entrada", "/project/7/journey/entry"],
      ["Planejamento", "/project/7/journey/planning"],
      ["Produção", "/project/7/journey/production"],
      ["Revisão", "/project/7/journey/review"],
      ["Entrega", "/project/7/journey/delivery"],
      ["Fechamento", "/project/7/journey/closing"],
    ] as const;

    for (const [label, path] of targets) {
      routerState.location = "/project/7";
      rerender(<ProjectNav projectId={7} />);

      const mobileNav = getMobileNav(container);
      fireEvent.click(within(mobileNav).getByRole("button", { name: /jornada do projeto/i }));

      const item = within(mobileNav).getByRole("button", { name: new RegExp(label, "i") });
      expect(item).toHaveClass("min-h-11");
      fireEvent.click(item);

      expect(routerState.setLocation).toHaveBeenLastCalledWith(path);
    }
  });
});
