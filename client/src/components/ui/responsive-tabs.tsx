import * as React from "react";
import { Tabs, TabsList, TabsTrigger } from "./tabs";

export interface ResponsiveTab {
  value: string;
  label: string;
  count?: number;
  disabled?: boolean;
}

export interface ResponsiveTabsProps {
  /** Lista das abas. */
  tabs: ResponsiveTab[];
  /** Valor da aba ativa (controlado). */
  value?: string;
  /** Valor default (uncontrolled). */
  defaultValue?: string;
  /** Callback ao trocar aba. */
  onValueChange?: (value: string) => void;
  /** Classes extras aplicadas no TabsList. */
  listClassName?: string;
  /** Classes extras aplicadas em cada TabsTrigger. */
  triggerClassName?: string;
  /** Conteúdo — pode incluir <TabsContent value="..."> filhos. */
  children?: React.ReactNode;
}

/**
 * Tabs responsivos padronizados. Substitui as implementações manuais
 * espalhadas por AdminDashboard, ClientDetail, CommercialOverview.
 *
 * Garante:
 * - Altura mínima ≥ 44 px por trigger (WCAG 2.5.5 / Apple HIG)
 * - Scroll horizontal quando labels não cabem
 * - Suporte a contador via prop `count`
 *
 * Ver FASE_1_ACHADOS.md seção 8 (P1 item 4) para contexto.
 */
export function ResponsiveTabs({
  tabs,
  value,
  defaultValue,
  onValueChange,
  listClassName,
  triggerClassName,
  children,
}: ResponsiveTabsProps) {
  return (
    <Tabs
      value={value}
      defaultValue={defaultValue ?? tabs[0]?.value}
      onValueChange={onValueChange}
      className="gap-0"
    >
      <TabsList
        className={[
          "!min-h-11 !h-auto w-full justify-start overflow-x-auto scrollbar-none",
          "bg-transparent border-b border-frame-gray-3 rounded-none p-0 gap-0",
          listClassName ?? "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            disabled={tab.disabled}
            className={[
              "!min-h-11 !h-auto px-4 py-2 rounded-none border-0 border-b-2 border-transparent",
              "data-[state=active]:border-frame-orange data-[state=active]:bg-transparent",
              "data-[state=active]:text-frame-orange text-frame-gray-light",
              "font-frame-mono text-[0.68rem] tracking-[0.12em] uppercase",
              "data-[state=active]:shadow-none whitespace-nowrap",
              triggerClassName ?? "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {tab.label}
            {typeof tab.count === "number" && (
              <span className="ml-2 text-frame-gray-muted normal-case tracking-normal">
                · {tab.count}
              </span>
            )}
          </TabsTrigger>
        ))}
      </TabsList>
      {children}
    </Tabs>
  );
}
