import * as React from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

export interface FinanceStripProps {
  monthlyRevenue: number;
  jobsCompleted: number;
  currency?: string;
  onViewFinance?: () => void;
  className?: string;
}

/**
 * Formats a number as Brazilian Real (BRL) currency
 * @param amount - The amount to format
 * @param currency - Currency code (default: 'BRL')
 * @returns Formatted currency string (e.g., "R$ 12.500,50")
 */
export function formatCurrency(amount: number, currency: string = "BRL"): string {
  // Handle edge cases
  if (!isFinite(amount)) {
    return "R$ 0,00";
  }

  // Use Intl.NumberFormat for proper BRL formatting
  const formatter = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Normalize the non-breaking space Intl.NumberFormat inserts between the
  // currency symbol and the value (varies by Node/ICU version) to a regular
  // space, so the output is visually identical but deterministic.
  return formatter.format(amount).replace(/\u00A0/g, " ");
}

/**
 * FinanceStrip - Displays monthly revenue and completed jobs count
 *
 * Features:
 * - Single-line strip layout with glass effect
 * - BRL currency formatting with thousands separator
 * - Navigation link to full finance page
 * - Responsive: wraps to 2 lines on mobile
 * - Accessible with proper ARIA labels
 */
export function FinanceStrip({
  monthlyRevenue,
  jobsCompleted,
  currency = "BRL",
  onViewFinance,
  className,
}: FinanceStripProps) {
  const [, setLocation] = useLocation();

  const handleViewFinance = React.useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();

      if (onViewFinance) {
        onViewFinance();
      } else {
        setLocation("/finance");
      }
    },
    [onViewFinance, setLocation]
  );

  const formattedRevenue = formatCurrency(monthlyRevenue, currency);

  return (
    <section
      className={cn(
        "w-full flex flex-wrap items-center gap-2 text-sm",
        "rounded-2xl transition-all duration-300",
        className
      )}
      style={{
        background: "rgba(255, 255, 255, 0.05)",
        borderTop: "1px solid rgba(255, 255, 255, 0.1)",
        padding: "1rem 1.5rem",
        fontSize: "0.875rem",
      }}
      aria-label="Finance summary strip"
    >
      {/* Icon */}
      <span
        role="img"
        aria-label="Money icon"
        className="text-base"
      >
        💰
      </span>

      {/* Monthly Revenue */}
      <span
        style={{
          color: "var(--text-muted, #94a3b8)",
        }}
      >
        {formattedRevenue} este mês
      </span>

      {/* Separator */}
      <span
        style={{
          color: "var(--text-muted, #94a3b8)",
        }}
        aria-hidden="true"
      >
        •
      </span>

      {/* Jobs Completed */}
      <span
        style={{
          color: "var(--text-muted, #94a3b8)",
        }}
      >
        {jobsCompleted} jobs faturados
      </span>

      {/* Link to Finance Page */}
      <a
        href="/finance"
        onClick={handleViewFinance}
        className="ml-auto hover:underline focus:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        style={{
          color: "#FF6B00",
          fontWeight: 500,
          transition: "opacity 200ms ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = "0.8";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = "1";
        }}
      >
        → Ver Finance
      </a>
    </section>
  );
}
