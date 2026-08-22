import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import StorageTab from "./StorageTab";

function renderStorageTab() {
  return render(
    <LanguageProvider>
      <StorageTab />
    </LanguageProvider>,
  );
}

describe("StorageTab", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders production storage stats that include uncategorized files", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({
          success: true,
          data: {
            totalUsed: 2048,
            quota: 0,
            byType: {
              images: 1024,
              videos: 0,
              documents: 0,
              audio: 0,
              other: 1024,
            },
            topFiles: null,
          },
        }),
      }),
    );

    renderStorageTab();

    expect(await screen.findByText("Uso de Armazenamento")).toBeInTheDocument();
    expect(screen.getByText("Outros")).toBeInTheDocument();
    expect(screen.getByText("0.0% da sua cota de armazenamento")).toBeInTheDocument();
    expect(screen.queryByText(/Erro inesperado/i)).not.toBeInTheDocument();

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/storage/stats", { credentials: "include" });
    });
  });
});
