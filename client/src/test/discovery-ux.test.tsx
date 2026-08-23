import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  ModuleCatalog,
  NextActionsPanel,
  OperationMap,
  type DiscoveryAction,
  type DiscoveryModule,
} from "@/components/discovery/DiscoverySystem";

const actions: DiscoveryAction[] = [
  { id: "briefing", label: "Completar briefing", description: "Fechar entrada do job", href: "/project/1" },
  { id: "proposal", label: "Enviar proposta", description: "Cliente aguarda valor", href: "/proposals" },
];

const modules: DiscoveryModule[] = [
  { id: "commercial", label: "Comercial", description: "Clientes e propostas", href: "/commercial", group: "Jornada" },
  { id: "documents", label: "Documentos", description: "Briefing e callsheet", href: "/documents", group: "Produção" },
];

describe("DiscoverySystem", () => {
  it("renders the operational map as a visible journey", () => {
    render(<OperationMap current="production" />);

    expect(screen.getByRole("navigation", { name: /mapa operacional/i })).toBeInTheDocument();
    expect(screen.getByText("Comercial")).toBeInTheDocument();
    expect(screen.getByText("Projeto")).toBeInTheDocument();
    expect(screen.getByText("Produção")).toBeInTheDocument();
    expect(screen.getByText("Financeiro")).toBeInTheDocument();
  });

  it("renders next actions before generic navigation", () => {
    render(<NextActionsPanel actions={actions} />);

    expect(screen.getByRole("region", { name: /próximas ações/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /completar briefing/i })).toHaveAttribute("href", "/project/1");
    expect(screen.getByRole("link", { name: /enviar proposta/i })).toHaveAttribute("href", "/proposals");
  });

  it("renders a grouped module catalog so features are discoverable", () => {
    render(<ModuleCatalog modules={modules} />);

    expect(screen.getByRole("region", { name: /catálogo de módulos/i })).toBeInTheDocument();
    expect(screen.getByText("Jornada")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /documentos/i })).toHaveAttribute("href", "/documents");
  });
});
