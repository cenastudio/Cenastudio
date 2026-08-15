import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ProductProofSection, { LANDING_WORKFLOW_STAGES } from "./ProductProofSection";
import PricingSection from "./PricingSection";
import ToolsSection from "./ToolsSection";

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({
    locale: "pt",
    t: (key: string) => key,
  }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ isAuthenticated: false }),
}));

vi.mock("@/lib/api", () => ({
  startCheckout: vi.fn(),
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/", vi.fn()],
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), message: vi.fn() },
}));

describe("landing product story", () => {
  it("keeps every workflow step tied to a real Cena route", async () => {
    expect(LANDING_WORKFLOW_STAGES).toHaveLength(5);
    expect(LANDING_WORKFLOW_STAGES.every((stage) => stage.route.startsWith("/"))).toBe(true);

    const user = userEvent.setup();
    render(<ProductProofSection />);

    await user.click(screen.getByTestId("landing-workflow-step-approval"));

    expect(screen.getByTestId("landing-workflow-stage")).toHaveAttribute("data-route", "/portal/proposals");
    expect(screen.getByTestId("landing-workflow-step-approval")).toHaveAttribute("aria-selected", "true");
  });

  it("keeps the full AI catalog available without rendering it before intent", async () => {
    const user = userEvent.setup();
    render(<ToolsSection />);

    expect(screen.queryByTestId("landing-ai-tools")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("landing-ai-tools-toggle"));

    expect(screen.getByTestId("landing-ai-tools")).toBeInTheDocument();
    expect(screen.getByTestId("landing-ai-tools-toggle")).toHaveAttribute("aria-expanded", "true");
  });

  it("groups self-serve plans and reveals tailored options only on intent", async () => {
    const user = userEvent.setup();
    render(<PricingSection />);

    expect(screen.getByTestId("pricing-core-plans").querySelectorAll("[data-testid^='pricing-plan-']")).toHaveLength(3);
    expect(screen.getByTestId("pricing-plan-profissional")).toBeInTheDocument();
    expect(screen.queryByTestId("pricing-tailored-plans")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("pricing-tailored-toggle"));

    expect(screen.getByTestId("pricing-tailored-plans").querySelectorAll("[data-testid^='pricing-plan-']")).toHaveLength(2);
    expect(screen.getByTestId("pricing-plan-enterprise")).toBeInTheDocument();
  });
});
