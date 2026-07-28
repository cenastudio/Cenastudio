import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import BudgetBridgeAction from "@/components/studio/BudgetBridgeAction";

const routerState = vi.hoisted(() => ({ setLocation: vi.fn() }));

vi.mock("wouter", () => ({
  useLocation: () => ["/project/5/studio/orcamento", routerState.setLocation],
}));

const outputWithBlock = [
  "ORÇAMENTO",
  "• Equipe: R$ 3.300 – R$ 5.500",
  "",
  "<<<CENA_BUDGET_JSON",
  JSON.stringify({
    schema: "cena.budget.v1",
    currency: "BRL",
    categories: [
      { key: "equipe", label: "Equipe", min: 3300, max: 5500 },
      { key: "posproducao", label: "Pós-produção", min: 1800, max: 3600 },
    ],
    margin: { min: 1690, max: 3080 },
    assumptions: "1 diária de 10h em BH",
  }),
  "CENA_BUDGET_JSON>>>",
].join("\n");

function emptyOverview(categories: Array<{ name: string }> = []) {
  return {
    budgetId: 1,
    totalBudgeted: 0,
    totalSpent: 0,
    currency: "BRL",
    byCategory: categories.map((c) => ({ name: c.name, budgeted: 100, spent: 0, pct: 0 })),
    alerts: [],
  } as any;
}

describe("BudgetBridgeAction", () => {
  beforeEach(() => {
    routerState.setLocation.mockClear();
    vi.mocked(api.budgets.getOverview).mockResolvedValue(emptyOverview());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("explica que o orçamento é por projeto quando não há projeto selecionado", () => {
    render(<BudgetBridgeAction output={outputWithBlock} projectId={null} />);

    expect(screen.getByText(/O orçamento do módulo é por projeto/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Usar este orçamento no módulo de Orçamento/i })).toBeNull();
  });

  it("fica inerte com explicação e link quando o bloco estruturado não existe", () => {
    render(<BudgetBridgeAction output="ORÇAMENTO\nTOTAL GERAL: R$ 12.000" projectId={5} />);

    expect(screen.getByText(/este orçamento foi gerado sem os dados estruturados/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Usar no módulo/i })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /Abrir Orçamento do projeto/i }));
    expect(routerState.setLocation).toHaveBeenCalledWith("/project/5/budget");
  });

  it("abre o diálogo com teto pré-selecionado, total somado e margem fora do baseline", async () => {
    render(<BudgetBridgeAction output={outputWithBlock} projectId={5} />);

    fireEvent.click(screen.getByRole("button", { name: /Usar este orçamento no módulo de Orçamento/i }));

    expect(await screen.findByText(/Enviar orçamento para o módulo/i)).toBeInTheDocument();
    const teto = screen.getByRole("radio", { name: /Teto da faixa/i }) as HTMLInputElement;
    const piso = screen.getByRole("radio", { name: /Piso da faixa/i }) as HTMLInputElement;
    expect(teto.checked).toBe(true);
    expect(piso.checked).toBe(false);

    // Σ dos tetos = 5500 + 3600 = 9100
    expect(screen.getByText("Total do orçamento").parentElement?.textContent).toContain("9.100");
    expect(screen.getByText(/Não entra no orçamento/i)).toBeInTheDocument();
    expect(screen.getByText(/1 diária de 10h em BH/i)).toBeInTheDocument();

    // Piso = 3300 + 1800 = 5100
    fireEvent.click(piso);
    await waitFor(() =>
      expect(screen.getByText("Total do orçamento").parentElement?.textContent).toContain("5.100"),
    );
  });

  it("nada é enviado até a confirmação, e o piso/teto escolhido vira o valor gravado", async () => {
    const onApplyBaseline = vi.fn().mockResolvedValue(undefined);
    render(
      <BudgetBridgeAction output={outputWithBlock} projectId={5} onApplyBaseline={onApplyBaseline} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Usar este orçamento no módulo de Orçamento/i }));
    await screen.findByText(/Enviar orçamento para o módulo/i);
    expect(onApplyBaseline).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Confirmar e enviar/i }));

    await waitFor(() =>
      expect(onApplyBaseline).toHaveBeenCalledWith({
        totalAmount: 910_000,
        currency: "BRL",
        categories: [
          { name: "Equipe", budgeted: 550_000 },
          { name: "Pós-produção", budgeted: 360_000 },
        ],
      }),
    );
  });

  it("grava o baseline pelo endpoint do módulo quando não há override (A4.5)", async () => {
    vi.mocked(api.budgets.updateBaseline).mockResolvedValue({} as any);

    render(<BudgetBridgeAction output={outputWithBlock} projectId={5} />);

    fireEvent.click(screen.getByRole("button", { name: /Usar este orçamento no módulo de Orçamento/i }));
    await screen.findByText(/Enviar orçamento para o módulo/i);
    expect(api.budgets.updateBaseline).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Confirmar e enviar/i }));

    await waitFor(() =>
      expect(api.budgets.updateBaseline).toHaveBeenCalledWith(5, {
        totalAmount: 910_000,
        currency: "BRL",
        categories: [
          { name: "Equipe", budgeted: 550_000 },
          { name: "Pós-produção", budgeted: 360_000 },
        ],
      }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(vi.mocked(toast.success).mock.calls[0]?.[0]).toMatch(/gravado no módulo/i);
  });

  it("mantém o diálogo aberto e mostra o erro real quando a gravação falha", async () => {
    vi.mocked(api.budgets.updateBaseline).mockRejectedValue(new ApiError("Projeto não encontrado", 404));

    render(<BudgetBridgeAction output={outputWithBlock} projectId={5} />);

    fireEvent.click(screen.getByRole("button", { name: /Usar este orçamento no módulo de Orçamento/i }));
    const confirm = await screen.findByRole("button", { name: /Confirmar e enviar/i });
    fireEvent.click(confirm);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Projeto não encontrado"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    // Não pode ficar travado em "salvando": dá para tentar de novo.
    await waitFor(() => expect(confirm).not.toBeDisabled());
    expect(screen.getByRole("button", { name: /Cancelar/i })).not.toBeDisabled();
  });

  it("exige confirmação explícita quando o projeto já tem orçamento definido", async () => {
    vi.mocked(api.budgets.getOverview).mockResolvedValue(emptyOverview([{ name: "Equipe" }]));
    const onApplyBaseline = vi.fn().mockResolvedValue(undefined);

    render(
      <BudgetBridgeAction output={outputWithBlock} projectId={5} onApplyBaseline={onApplyBaseline} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Usar este orçamento no módulo de Orçamento/i }));

    expect(await screen.findByText(/Salvar substitui as categorias existentes/i)).toBeInTheDocument();
    const confirm = screen.getByRole("button", { name: /Confirmar e enviar/i });
    expect(confirm).toBeDisabled();

    fireEvent.click(screen.getByRole("checkbox", { name: /categorias atuais serão substituídas/i }));
    await waitFor(() => expect(confirm).not.toBeDisabled());

    fireEvent.click(confirm);
    await waitFor(() => expect(onApplyBaseline).toHaveBeenCalledTimes(1));
  });

  it("expõe diálogo rotulado, grupo de rádio real e alvos de toque de 44px", async () => {
    render(<BudgetBridgeAction output={outputWithBlock} projectId={5} />);
    const trigger = screen.getByRole("button", { name: /Usar este orçamento no módulo de Orçamento/i });
    // Alvo de toque mínimo (WCAG 2.5.5): min-h-11 = 44px.
    expect(trigger.className).toContain("min-h-11");

    fireEvent.click(trigger);

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAccessibleName(/Enviar orçamento para o módulo/i);
    expect(dialog).toHaveAccessibleDescription(/Nada é gravado no projeto até você confirmar/i);

    // Grupo de rádio real: fieldset + legend, dois inputs com o mesmo name.
    const group = screen.getByRole("group", { name: /Valor que vai para o orçamento/i });
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(2);
    radios.forEach((radio) => {
      expect(group).toContainElement(radio);
      expect(radio).toHaveAttribute("name", "budget-bridge-bound");
    });

    // Mobile: rubricas e footer empilham em coluna abaixo do breakpoint sm.
    expect(screen.getByText("Equipe").parentElement?.className).toContain("flex-col");
    expect(screen.getByRole("button", { name: /Confirmar e enviar/i }).className).toContain("min-h-11");
  });

  it("lista as rubricas descartadas na validação", async () => {
    const output = [
      "<<<CENA_BUDGET_JSON",
      JSON.stringify({
        schema: "cena.budget.v1",
        categories: [
          { key: "equipe", label: "Equipe", min: 3300, max: 5500 },
          { key: "locacao", label: "Locação", min: 900, max: 400 },
        ],
      }),
      "CENA_BUDGET_JSON>>>",
    ].join("\n");

    render(<BudgetBridgeAction output={output} projectId={5} />);
    fireEvent.click(screen.getByRole("button", { name: /Usar este orçamento no módulo de Orçamento/i }));

    expect(await screen.findByText(/Rubricas descartadas/i)).toBeInTheDocument();
    expect(screen.getByText(/Locação — valores inválidos/i)).toBeInTheDocument();
  });
});
