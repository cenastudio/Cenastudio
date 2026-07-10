import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import BrandLogo from "@/components/BrandLogo";

/**
 * BrandLogo tests. Because BrandLogo reads SITE_CONFIG at render time
 * (not at module load), tests can `vi.stubEnv()` + `vi.resetModules()`
 * to observe branded / unbranded output without rebuilding the tree.
 */

describe("BrandLogo", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders brandNameParts as two spans when parts are configured", async () => {
    vi.stubEnv("VITE_APP_NAME", "Aurora Filmes");
    vi.stubEnv("VITE_APP_NAME_PARTS", "Aurora|Filmes");
    vi.resetModules();
    const { default: Logo } = await import("@/components/BrandLogo");

    render(<Logo />);
    expect(screen.getByText("Aurora")).toBeInTheDocument();
    expect(screen.getByText("Filmes")).toBeInTheDocument();
    expect(screen.getByLabelText("Aurora Filmes")).toBeInTheDocument();
  });

  it("renders brandName as single span when parts are absent", async () => {
    vi.stubEnv("VITE_APP_NAME", "MonoBrand");
    vi.stubEnv("VITE_APP_NAME_PARTS", "MonoBrand");
    vi.resetModules();
    const { default: Logo } = await import("@/components/BrandLogo");

    render(<Logo />);
    expect(screen.getByText("MonoBrand")).toBeInTheDocument();
    // No secondary part visible.
    expect(screen.queryByText("|")).not.toBeInTheDocument();
    expect(screen.getByLabelText("MonoBrand")).toBeInTheDocument();
  });

  it("renders <img> in variant='image' mode with alt=brandName", async () => {
    vi.stubEnv("VITE_APP_NAME", "Aurora");
    vi.stubEnv("VITE_APP_NAME_PARTS", "Aurora|");
    vi.stubEnv("VITE_APP_LOGO_URL", "https://cdn.example/logo.png");
    vi.resetModules();
    const { default: Logo } = await import("@/components/BrandLogo");

    render(<Logo variant="image" />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://cdn.example/logo.png");
    expect(img).toHaveAttribute("alt", "Aurora");
  });

  it("falls back to wordmark when the image fails to load", async () => {
    vi.stubEnv("VITE_APP_NAME", "Aurora");
    vi.stubEnv("VITE_APP_NAME_PARTS", "Aurora|");
    vi.stubEnv("VITE_APP_LOGO_URL", "https://cdn.example/broken.png");
    vi.resetModules();
    const { default: Logo } = await import("@/components/BrandLogo");

    const { container } = render(<Logo variant="image" />);
    const img = container.querySelector("img");
    expect(img).toBeTruthy();
    // Simulate onError.
    if (img) fireEvent.error(img);
    // After error, wordmark should be visible; img should be gone.
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByLabelText("Aurora")).toBeInTheDocument();
  });

  it("falls back to wordmark when variant='image' but logoUrl is empty", async () => {
    vi.stubEnv("VITE_APP_NAME", "NoLogo");
    vi.stubEnv("VITE_APP_NAME_PARTS", "No|Logo");
    vi.stubEnv("VITE_APP_LOGO_URL", "");
    vi.resetModules();
    const { default: Logo } = await import("@/components/BrandLogo");

    const { container } = render(<Logo variant="image" />);
    // No <img>, only wordmark.
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByLabelText("NoLogo")).toBeInTheDocument();
  });

  it("uses the default 'Cena Studio' brand when no env is set", () => {
    render(<BrandLogo />);
    expect(screen.getByText("Cena")).toBeInTheDocument();
    expect(screen.getByText("Studio")).toBeInTheDocument();
    expect(screen.getByLabelText("Cena Studio")).toBeInTheDocument();
  });
});
