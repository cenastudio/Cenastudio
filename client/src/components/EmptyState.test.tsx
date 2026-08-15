import { fireEvent, render, screen } from "@testing-library/react";
import { FolderOpen, Plus } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import EmptyState from "./EmptyState";

describe("EmptyState", () => {
  it("keeps a simple state focused on its next action", () => {
    const createProject = vi.fn();

    render(
      <EmptyState
        icon={FolderOpen}
        title="No projects yet"
        description="Create a project to keep the work moving."
        action={{ label: "Create project", onClick: createProject, icon: Plus }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Create project" }));

    expect(createProject).toHaveBeenCalledOnce();
    expect(screen.queryByTestId("empty-state-steps")).not.toBeInTheDocument();
  });

  it("renders a guided flow without enabling unavailable actions", () => {
    render(
      <EmptyState
        icon={FolderOpen}
        title="Prepare the project"
        description="Set the first details before production begins."
        action={{ label: "Create first item", onClick: vi.fn(), disabled: true }}
        steps={[
          { title: "Add the brief", description: "Keep the context with the job." },
          { title: "Plan the work", description: "Turn decisions into next steps." },
        ]}
      />,
    );

    expect(screen.getByTestId("empty-state-steps")).toBeInTheDocument();
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("02")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create first item" })).toBeDisabled();
  });
});
