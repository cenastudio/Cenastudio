import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ProductTour from "./ProductTour";
import WelcomeModal from "./WelcomeModal";

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ isTeamMember: false }),
}));

vi.mock("@/lib/api", () => ({
  api: {
    demo: {
      check: vi.fn().mockResolvedValue({ exists: false }),
      create: vi.fn(),
    },
  },
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/dashboard", vi.fn()],
}));

describe("first-run onboarding", () => {
  it("starts the real commercial flow from the welcome surface", () => {
    const onStartCommercial = vi.fn();

    render(
      <WelcomeModal
        isOpen
        onClose={vi.fn()}
        onComplete={vi.fn()}
        onStartCommercial={onStartCommercial}
        userName="Clara"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /^app\.onboarding\.startCommercial/ }));

    expect(onStartCommercial).toHaveBeenCalledOnce();
  });

  it("renders a compact tour sheet alongside the contextual desktop card", () => {
    const target = document.createElement("button");
    target.dataset.tour = "dashboard";
    document.body.appendChild(target);

    render(<ProductTour isOpen onClose={vi.fn()} onComplete={vi.fn()} />);

    expect(screen.getByTestId("product-tour-sheet")).toBeInTheDocument();
    expect(screen.getByTestId("product-tour-desktop-card")).toBeInTheDocument();

    target.remove();
  });
});
