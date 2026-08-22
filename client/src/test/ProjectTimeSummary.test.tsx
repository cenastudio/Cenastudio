import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { api } from "@/lib/api";

function renderWithLanguage(component: React.ReactElement) {
  return render(<LanguageProvider>{component}</LanguageProvider>);
}

describe("ProjectTimeSummary", () => {
  beforeEach(() => {
    vi.mocked(api.timesheets.getReport).mockReset();
  });

  it("shows hours and cost for the current project", async () => {
    vi.mocked(api.timesheets.getReport).mockResolvedValue([
      { projectId: 5, totalDurationSec: 5400, totalCost: 22500 },
      { projectId: 9, totalDurationSec: 3600, totalCost: 10000 },
    ]);

    const { default: ProjectTimeSummary } = await import("@/components/timesheet/ProjectTimeSummary");
    renderWithLanguage(<ProjectTimeSummary projectId={5} />);

    expect(await screen.findByText("Tempo do projeto")).toBeInTheDocument();
    expect(screen.getByText("01:30")).toBeInTheDocument();
    expect(screen.getByText("R$ 225,00")).toBeInTheDocument();
  });
});
