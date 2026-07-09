import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ResponsiveTabs } from "@/components/ui/responsive-tabs";
import { TabsContent } from "@/components/ui/tabs";

// Radix TabsTrigger activates on pointer/mouse down (not just click). In
// happy-dom, dispatching mouseDown + click reliably switches the active tab.
function activateTab(el: HTMLElement) {
  fireEvent.mouseDown(el);
  fireEvent.click(el);
}

describe("ResponsiveTabs", () => {
  const sampleTabs = [
    { value: "one", label: "First", count: 3 },
    { value: "two", label: "Second", count: 7 },
    { value: "three", label: "Third" },
  ];

  it("renderiza todas as abas com labels e contadores", () => {
    render(
      <ResponsiveTabs defaultValue="one" tabs={sampleTabs}>
        <TabsContent value="one">Painel um</TabsContent>
      </ResponsiveTabs>
    );

    expect(screen.getByRole("tab", { name: /First/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Second/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Third/i })).toBeInTheDocument();
    // Contadores aparecem no texto acessível
    expect(screen.getByRole("tab", { name: /First/i })).toHaveTextContent(/3/);
    expect(screen.getByRole("tab", { name: /Second/i })).toHaveTextContent(/7/);
    // "Third" não tem count — não deve ter número no texto
    expect(
      screen.getByRole("tab", { name: /Third/i })
    ).not.toHaveTextContent(/\d/);
  });

  it("uncontrolled: clique na segunda aba muda o data-state ativo", () => {
    render(
      <ResponsiveTabs defaultValue="one" tabs={sampleTabs}>
        <TabsContent value="one">Painel um</TabsContent>
        <TabsContent value="two">Painel dois</TabsContent>
      </ResponsiveTabs>
    );

    const secondTab = screen.getByRole("tab", { name: /Second/i });
    expect(secondTab).toHaveAttribute("data-state", "inactive");
    activateTab(secondTab);
    expect(secondTab).toHaveAttribute("data-state", "active");
  });

  it("controlled: chama onValueChange ao clicar", () => {
    const onValueChange = vi.fn();
    render(
      <ResponsiveTabs value="one" onValueChange={onValueChange} tabs={sampleTabs}>
        <TabsContent value="one">Painel um</TabsContent>
      </ResponsiveTabs>
    );

    activateTab(screen.getByRole("tab", { name: /Second/i }));
    expect(onValueChange).toHaveBeenCalledWith("two");
  });
});
