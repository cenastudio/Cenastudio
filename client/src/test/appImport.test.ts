import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";

const authSnapshot = JSON.stringify({
  user: {
    id: 1,
    email: "dante@cena.studio",
    role: "admin",
    name: "Dante",
  },
  plan: {
    planId: "produtora",
    planName: "Produtora",
    status: "active",
    generationLimit: 100,
    trialEndsAt: null,
    features: [],
  },
});

describe("application module", () => {
  it("imports every eagerly loaded route without executing React hooks", async () => {
    const appModule = await import("@/App");

    expect(appModule.default).toBeTypeOf("function");
  }, 15000);

  it("renders the complete application shell", async () => {
    window.history.replaceState({}, "", "/");
    const { default: App } = await import("@/App");

    let container: HTMLElement | undefined;
    await act(async () => {
      container = render(React.createElement(App)).container;
    });

    expect(container).toBeTruthy();
    fireEvent.click(await screen.findByRole("button", { name: "EN" }, { timeout: 5000 }));
    expect(container?.textContent).toContain("AUDIOVISUAL");
    expect(container?.textContent).not.toMatch(/app\.[a-z]/i);
  });

  it("renders authentication in English without exposing translation keys", async () => {
    window.history.replaceState({}, "", "/login");
    vi.mocked(window.localStorage.getItem).mockReturnValue("en");
    const { default: App } = await import("@/App");

    let container: HTMLElement | undefined;
    await act(async () => {
      container = render(React.createElement(App)).container;
    });
    await waitFor(() => {
      expect(container?.textContent).toContain("Access your audiovisual operation.");
    });
    expect(container?.textContent).not.toMatch(/app\.[a-z]/i);
    vi.mocked(window.localStorage.getItem).mockReset();
  });

  it("renders the internal language switcher on authenticated app pages", async () => {
    window.history.replaceState({}, "", "/dashboard");
    vi.mocked(window.localStorage.getItem).mockImplementation((key: string) => {
      if (key === "frame.auth.snapshot") return authSnapshot;
      if (key === "language") return "pt";
      return null;
    });
    vi.mocked(api.auth.me).mockResolvedValue({
      user: {
        id: 1,
        email: "dante@cena.studio",
        role: "admin",
        name: "Dante",
      },
      plan: {
        planId: "produtora",
        planName: "Produtora",
        status: "active",
        generationLimit: 100,
        trialEndsAt: null,
        features: [],
      },
    });
    vi.mocked(api.projects.list).mockResolvedValue([]);
    vi.mocked(api.projects.activity).mockResolvedValue([]);
    vi.mocked(api.clients.list).mockResolvedValue([]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ success: true, data: [] }),
    }));

    const { default: App } = await import("@/App");

    let container: HTMLElement | undefined;
    await act(async () => {
      container = render(React.createElement(App)).container;
    });

    await waitFor(() => {
      expect(screen.getAllByRole("group", { name: "Idioma" }).length).toBeGreaterThan(0);
    }, { timeout: 5000 });
    fireEvent.click(screen.getAllByRole("button", { name: "EN" })[0]);
    expect(container?.textContent).toContain("Operations Center");
    expect(container?.textContent).not.toMatch(/app\.[a-z]/i);

    vi.mocked(window.localStorage.getItem).mockReset();
    vi.unstubAllGlobals();
  });
});
