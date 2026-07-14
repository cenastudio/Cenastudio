import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LanguageProvider } from "@/contexts/LanguageContext";
import ChecklistForm from "@/components/studio/forms/ChecklistForm";

function renderForm(data: Record<string, string>, onChange: (k: string, v: string) => void) {
  return render(
    <LanguageProvider>
      <ChecklistForm data={data} onChange={onChange} />
    </LanguageProvider>,
  );
}

describe("ChecklistForm persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists checked state through onChange (backend tool state), not localStorage", () => {
    const onChange = vi.fn();
    renderForm({}, onChange);

    // Toggle the first camera checklist item.
    fireEvent.click(screen.getByText(/Câmera principal \+ backup testada/i));

    expect(onChange).toHaveBeenCalledWith("__checklistState", expect.any(String));
    const lastCall = onChange.mock.calls.at(-1)!;
    const saved = JSON.parse(lastCall[1] as string);
    expect(saved.camera["0"]).toBe(true);

    // Must no longer use the global localStorage key.
    expect(localStorage.getItem("cl-state-camera") ?? null).toBeNull();
  });

  it("hydrates checked state from persisted data.__checklistState", () => {
    const onChange = vi.fn();
    renderForm({ __checklistState: JSON.stringify({ camera: { 0: true, 1: true } }) }, onChange);

    // Progress region reflects the 2 pre-checked items out of 12.
    expect(screen.getByText(/2 \/ 12/)).toBeInTheDocument();
  });
});
