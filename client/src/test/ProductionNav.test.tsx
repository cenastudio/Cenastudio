import "@testing-library/jest-dom";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProductionNav from "@/components/ProductionNav";

const routerState = vi.hoisted(() => ({
  location: "/tools",
  setLocation: vi.fn(),
}));

vi.mock("wouter", () => ({
  useLocation: () => [routerState.location, routerState.setLocation],
}));

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({
    locale: "pt",
  }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    isAdmin: true,
    isTeamMember: false,
    teamRole: null,
  }),
}));

vi.mock("@/contexts/PlanContext", () => ({
  usePlanContext: () => ({
    planMode: "studio",
  }),
}));

function renderProductionNav(location = "/tools") {
  routerState.location = location;
  routerState.setLocation.mockClear();
  return render(<ProductionNav />);
}

function getMobileTrigger(mobileNav: HTMLElement) {
  return within(mobileNav).getByRole("button", { expanded: false });
}

function getMobileMenuItem(mobileNav: HTMLElement, label: string) {
  return within(mobileNav)
    .getAllByRole("button", { name: new RegExp(label, "i") })
    .find((button) => !button.hasAttribute("aria-expanded"));
}

describe("ProductionNav mobile navigation", () => {
  beforeEach(() => {
    routerState.location = "/tools";
    routerState.setLocation.mockClear();
  });

  it("keeps desktop and dropdown controls at mobile-safe touch height", () => {
    const { container } = renderProductionNav();

    const desktopNav = container.querySelector(".hidden.sm\\:flex");
    expect(desktopNav).not.toBeNull();

    for (const label of ["Jobs", "Estúdio IA", "Aprovações", "Mais"]) {
      expect(within(desktopNav as HTMLElement).getByRole("button", { name: new RegExp(label, "i") })).toHaveClass("min-h-11");
    }

    const mobileNav = container.querySelector(".sm\\:hidden");
    expect(mobileNav).not.toBeNull();

    const mobileTrigger = getMobileTrigger(mobileNav as HTMLElement);
    expect(mobileTrigger).toHaveClass("min-h-11");

    fireEvent.click(mobileTrigger);

    for (const label of ["Jobs", "Estúdio IA", "Aprovações", "Arquivos", "Documentos", "Equipamento", "Timesheet", "Equipe"]) {
      expect(getMobileMenuItem(mobileNav as HTMLElement, label)).toHaveClass("min-h-11");
    }
  });

  it("lets every production area navigate from the mobile dropdown in two taps", () => {
    const { container, rerender } = renderProductionNav();

    const targets = [
      ["Jobs", "/projects"],
      ["Estúdio IA", "/tools"],
      ["Aprovações", "/video-reviews"],
      ["Arquivos", "/files-unified"],
      ["Documentos", "/documents"],
      ["Equipamento", "/equipment"],
      ["Timesheet", "/timesheet"],
      ["Equipe", "/team"],
    ] as const;

    for (const [label, path] of targets) {
      routerState.location = "/tools";
      rerender(<ProductionNav />);

      const mobileNav = container.querySelector(".sm\\:hidden");
      expect(mobileNav).not.toBeNull();

      fireEvent.click(getMobileTrigger(mobileNav as HTMLElement));
      fireEvent.click(getMobileMenuItem(mobileNav as HTMLElement, label) as HTMLElement);

      expect(routerState.setLocation).toHaveBeenLastCalledWith(path);
    }
  });

  it("does not render inside a project route where ProjectNav owns context", () => {
    const { container } = renderProductionNav("/project/7");
    expect(screen.queryByRole("navigation", { name: /produção/i })).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });
});
