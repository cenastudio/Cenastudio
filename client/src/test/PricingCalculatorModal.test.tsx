import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import PricingCalculatorModal, { escapeProposalHtml } from "@/components/production/PricingCalculatorModal";
import { LanguageProvider } from "@/contexts/LanguageContext";

function renderPricingCalculator() {
  return render(
    <LanguageProvider>
      <PricingCalculatorModal open onOpenChange={vi.fn()} />
    </LanguageProvider>,
  );
}

describe("PricingCalculatorModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("makes a destination loading failure visible and keeps write actions unavailable", async () => {
    vi.mocked(api.projects.list).mockRejectedValue(new Error("Falha na rede"));
    vi.mocked(api.clients.list).mockResolvedValue([]);

    renderPricingCalculator();

    expect(screen.getByRole("button", { name: /lançar no orçamento/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /gerar proposta/i })).toBeDisabled();

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/não foi possível carregar projetos ou clientes/i),
    );

    expect(screen.getByRole("button", { name: /lançar no orçamento/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /gerar proposta/i })).toBeDisabled();
  });

  it("escapes user text before it enters a proposal document", () => {
    expect(escapeProposalHtml('<img src=x onerror="alert(1)"> &')).toBe(
      "&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp;",
    );
  });
});
