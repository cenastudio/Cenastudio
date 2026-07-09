import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { FinanceStrip, formatCurrency, type FinanceStripProps } from "./FinanceStrip";

// Mock wouter
vi.mock("wouter", () => ({
  useLocation: () => ["/", vi.fn()],
}));

describe("FinanceStrip", () => {
  const defaultProps: FinanceStripProps = {
    monthlyRevenue: 12500.5,
    jobsCompleted: 5,
  };

  describe("Component Rendering", () => {
    it("should render the component", () => {
      render(<FinanceStrip {...defaultProps} />);
      expect(screen.getByRole("region", { name: /finance summary strip/i })).toBeInTheDocument();
    });

    it("should render the money icon", () => {
      render(<FinanceStrip {...defaultProps} />);
      const icon = screen.getByRole("img", { name: /money icon/i });
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveTextContent("💰");
    });

    it("should render monthly revenue text", () => {
      render(<FinanceStrip {...defaultProps} />);
      expect(screen.getByText(/este mês/i)).toBeInTheDocument();
    });

    it("should render jobs completed text", () => {
      render(<FinanceStrip {...defaultProps} />);
      expect(screen.getByText(/5 jobs faturados/i)).toBeInTheDocument();
    });

    it("should render the Ver Finance link", () => {
      render(<FinanceStrip {...defaultProps} />);
      const link = screen.getByRole("link", { name: /→ Ver Finance/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/finance");
    });

    it("should render bullet separator", () => {
      const { container } = render(<FinanceStrip {...defaultProps} />);
      const separator = container.querySelector('[aria-hidden="true"]');
      expect(separator).toHaveTextContent("•");
    });

    it("should apply custom className", () => {
      const { container } = render(<FinanceStrip {...defaultProps} className="custom-class" />);
      const section = container.querySelector("section");
      expect(section).toHaveClass("custom-class");
    });
  });

  describe("Currency Formatting", () => {
    it("should format currency in BRL format with default currency", () => {
      render(<FinanceStrip monthlyRevenue={12500.5} jobsCompleted={5} />);
      expect(screen.getByText(/R\$\s*12\.500,50/i)).toBeInTheDocument();
    });

    it("should format zero revenue correctly", () => {
      render(<FinanceStrip monthlyRevenue={0} jobsCompleted={0} />);
      expect(screen.getByText(/R\$\s*0,00/i)).toBeInTheDocument();
    });

    it("should format large numbers correctly", () => {
      render(<FinanceStrip monthlyRevenue={125000.99} jobsCompleted={15} />);
      expect(screen.getByText(/R\$\s*125\.000,99/i)).toBeInTheDocument();
    });

    it("should format numbers with cents correctly", () => {
      render(<FinanceStrip monthlyRevenue={1234.56} jobsCompleted={3} />);
      expect(screen.getByText(/R\$\s*1\.234,56/i)).toBeInTheDocument();
    });

    it("should format whole numbers with .00", () => {
      render(<FinanceStrip monthlyRevenue={10000} jobsCompleted={10} />);
      expect(screen.getByText(/R\$\s*10\.000,00/i)).toBeInTheDocument();
    });

    it("should handle very large numbers", () => {
      render(<FinanceStrip monthlyRevenue={9999999.99} jobsCompleted={100} />);
      expect(screen.getByText(/R\$\s*9\.999\.999,99/i)).toBeInTheDocument();
    });

    it("should handle decimal precision correctly", () => {
      render(<FinanceStrip monthlyRevenue={100.999} jobsCompleted={1} />);
      // Should round to 2 decimal places
      expect(screen.getByText(/R\$\s*101,00/i)).toBeInTheDocument();
    });

    it("should accept custom currency prop", () => {
      render(<FinanceStrip monthlyRevenue={1000} jobsCompleted={2} currency="USD" />);
      // Should still render (even though we're using BRL format internally)
      expect(screen.getByText(/este mês/i)).toBeInTheDocument();
    });
  });

  describe("Jobs Completed Display", () => {
    it("should display singular job count correctly", () => {
      render(<FinanceStrip monthlyRevenue={1000} jobsCompleted={1} />);
      expect(screen.getByText(/1 jobs faturados/i)).toBeInTheDocument();
    });

    it("should display zero jobs completed", () => {
      render(<FinanceStrip monthlyRevenue={0} jobsCompleted={0} />);
      expect(screen.getByText(/0 jobs faturados/i)).toBeInTheDocument();
    });

    it("should display large job count", () => {
      render(<FinanceStrip monthlyRevenue={50000} jobsCompleted={99} />);
      expect(screen.getByText(/99 jobs faturados/i)).toBeInTheDocument();
    });
  });

  describe("Navigation and Interaction", () => {
    it("should call onViewFinance when link is clicked", () => {
      const onViewFinance = vi.fn();
      render(<FinanceStrip {...defaultProps} onViewFinance={onViewFinance} />);

      const link = screen.getByRole("link", { name: /→ Ver Finance/i });
      fireEvent.click(link);

      expect(onViewFinance).toHaveBeenCalledTimes(1);
    });

    it("should prevent default link behavior when clicked", () => {
      const onViewFinance = vi.fn();
      render(<FinanceStrip {...defaultProps} onViewFinance={onViewFinance} />);

      const link = screen.getByRole("link", { name: /→ Ver Finance/i });
      const event = new MouseEvent("click", { bubbles: true, cancelable: true });
      const preventDefaultSpy = vi.spyOn(event, "preventDefault");

      link.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it("should navigate to /finance by default when no callback provided", () => {
      render(<FinanceStrip {...defaultProps} />);

      const link = screen.getByRole("link", { name: /→ Ver Finance/i });
      fireEvent.click(link);

      // Link should have correct href
      expect(link).toHaveAttribute("href", "/finance");
    });

    it("should show hover effect on link", () => {
      render(<FinanceStrip {...defaultProps} />);
      const link = screen.getByRole("link", { name: /→ Ver Finance/i });

      // Initial state: no inline opacity override (CSS default is fully visible)
      expect(link.style.opacity).toBe("");

      // Hover state
      fireEvent.mouseEnter(link);
      expect(link.style.opacity).toBe("0.8");

      // Leave hover
      fireEvent.mouseLeave(link);
      expect(link.style.opacity).toBe("1");
    });

    it("should be keyboard accessible", () => {
      render(<FinanceStrip {...defaultProps} />);
      const link = screen.getByRole("link", { name: /→ Ver Finance/i });

      // Should not have outline by default
      expect(link).toHaveClass("focus:outline-none");

      // Should have focus-visible ring classes
      expect(link).toHaveClass("focus-visible:ring-2");
    });
  });

  describe("Styling and Layout", () => {
    it("should have glass effect styling", () => {
      const { container } = render(<FinanceStrip {...defaultProps} />);
      const section = container.querySelector("section");

      expect(section).toHaveStyle({
        background: "rgba(255, 255, 255, 0.05)",
        borderTop: "1px solid rgba(255, 255, 255, 0.1)",
      });
    });

    it("should have correct padding", () => {
      const { container } = render(<FinanceStrip {...defaultProps} />);
      const section = container.querySelector("section");

      expect(section).toHaveStyle({
        paddingTop: "16px",
        paddingRight: "24px",
        paddingBottom: "16px",
        paddingLeft: "24px",
      });
    });

    it("should have correct font size", () => {
      const { container } = render(<FinanceStrip {...defaultProps} />);
      const section = container.querySelector("section");

      expect(section).toHaveStyle({
        fontSize: "14px",
      });
    });

    it("should have responsive flex wrap classes", () => {
      const { container } = render(<FinanceStrip {...defaultProps} />);
      const section = container.querySelector("section");

      expect(section).toHaveClass("flex-wrap");
    });

    it("should have rounded corners", () => {
      const { container } = render(<FinanceStrip {...defaultProps} />);
      const section = container.querySelector("section");

      expect(section).toHaveClass("rounded-2xl");
    });

    it("should have link with orange color", () => {
      render(<FinanceStrip {...defaultProps} />);
      const link = screen.getByRole("link", { name: /→ Ver Finance/i });

      expect(link).toHaveStyle({
        color: "#FF6B00",
      });
    });

    it("should position link at the end with ml-auto", () => {
      render(<FinanceStrip {...defaultProps} />);
      const link = screen.getByRole("link", { name: /→ Ver Finance/i });

      expect(link).toHaveClass("ml-auto");
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA label for section", () => {
      render(<FinanceStrip {...defaultProps} />);
      expect(screen.getByRole("region", { name: /finance summary strip/i })).toBeInTheDocument();
    });

    it("should have ARIA label for money icon", () => {
      render(<FinanceStrip {...defaultProps} />);
      const icon = screen.getByRole("img", { name: /money icon/i });
      expect(icon).toBeInTheDocument();
    });

    it("should hide separator from screen readers", () => {
      const { container } = render(<FinanceStrip {...defaultProps} />);
      const separator = container.querySelector('[aria-hidden="true"]');
      expect(separator).toBeInTheDocument();
    });

    it("should have accessible link text", () => {
      render(<FinanceStrip {...defaultProps} />);
      const link = screen.getByRole("link", { name: /→ Ver Finance/i });
      expect(link).toHaveTextContent("→ Ver Finance");
    });
  });

  describe("Edge Cases", () => {
    it("should handle negative revenue gracefully", () => {
      render(<FinanceStrip monthlyRevenue={-1000} jobsCompleted={0} />);
      expect(screen.getByText(/-R\$\s*1\.000,00/i)).toBeInTheDocument();
    });

    it("should handle Infinity as revenue", () => {
      render(<FinanceStrip monthlyRevenue={Infinity} jobsCompleted={5} />);
      expect(screen.getByText(/R\$\s*0,00/i)).toBeInTheDocument();
    });

    it("should handle NaN as revenue", () => {
      render(<FinanceStrip monthlyRevenue={NaN} jobsCompleted={5} />);
      expect(screen.getByText(/R\$\s*0,00/i)).toBeInTheDocument();
    });

    it("should handle very small decimal values", () => {
      render(<FinanceStrip monthlyRevenue={0.01} jobsCompleted={1} />);
      expect(screen.getByText(/R\$\s*0,01/i)).toBeInTheDocument();
    });
  });
});

describe("formatCurrency", () => {
  describe("BRL Formatting", () => {
    it("should format zero correctly", () => {
      expect(formatCurrency(0)).toBe("R$ 0,00");
    });

    it("should format whole numbers with two decimal places", () => {
      expect(formatCurrency(1000)).toBe("R$ 1.000,00");
    });

    it("should format decimals correctly", () => {
      expect(formatCurrency(1234.56)).toBe("R$ 1.234,56");
    });

    it("should use dot as thousands separator", () => {
      expect(formatCurrency(12500)).toBe("R$ 12.500,00");
    });

    it("should use comma as decimal separator", () => {
      expect(formatCurrency(100.99)).toBe("R$ 100,99");
    });

    it("should handle large numbers", () => {
      expect(formatCurrency(1000000)).toBe("R$ 1.000.000,00");
    });

    it("should handle negative numbers", () => {
      expect(formatCurrency(-500)).toBe("-R$ 500,00");
    });

    it("should round to 2 decimal places", () => {
      expect(formatCurrency(100.999)).toBe("R$ 101,00");
    });

    it("should handle very small values", () => {
      expect(formatCurrency(0.01)).toBe("R$ 0,01");
    });

    it("should handle Infinity", () => {
      expect(formatCurrency(Infinity)).toBe("R$ 0,00");
    });

    it("should handle -Infinity", () => {
      expect(formatCurrency(-Infinity)).toBe("R$ 0,00");
    });

    it("should handle NaN", () => {
      expect(formatCurrency(NaN)).toBe("R$ 0,00");
    });
  });

  describe("Custom Currency", () => {
    it("should accept custom currency code", () => {
      const result = formatCurrency(1000, "USD");
      expect(result).toContain("US$");
    });

    it("should default to BRL when not specified", () => {
      const result = formatCurrency(1000);
      expect(result).toContain("R$");
    });
  });
});
