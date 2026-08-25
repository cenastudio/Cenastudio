import path from "path";
import { mkdtemp, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { describe, expect, it, vi } from "vitest";
import { createPublicShareSeoHandler, createSpaFallbackHandler } from "./app.js";

function invokeHandler(requestPath: string) {
  const staticPath = "/srv/public";
  const handler = createSpaFallbackHandler(staticPath);
  const headers: Record<string, string> = {};
  const res = {
    setHeader: vi.fn((name: string, value: string) => {
      headers[name] = value;
    }),
    sendFile: vi.fn(),
  };

  handler({ path: requestPath }, res);

  return { headers, res, staticPath };
}

describe("createSpaFallbackHandler", () => {
  it("keeps the public landing page indexable", () => {
    const { headers, res, staticPath } = invokeHandler("/");

    expect(headers["X-Robots-Tag"]).toBeUndefined();
    expect(res.setHeader).not.toHaveBeenCalledWith("X-Robots-Tag", expect.anything());
    expect(res.sendFile).toHaveBeenCalledWith(path.join(staticPath, "index.html"));
  });

  it("blocks indexing for private authenticated routes", () => {
    for (const route of ["/app", "/profile", "/projects", "/studio/123"]) {
      const { headers, res, staticPath } = invokeHandler(route);

      expect(headers["X-Robots-Tag"]).toBe("noindex, nofollow, noarchive");
      expect(res.sendFile).toHaveBeenCalledWith(path.join(staticPath, "index.html"));
    }
  });
});

describe("createPublicShareSeoHandler", () => {
  it("serves public proposal links directly when the platform rewrite preserves the original path", async () => {
    const staticPath = await mkdtemp(path.join(tmpdir(), "cena-public-share-"));
    await writeFile(path.join(staticPath, "index.html"), `<!doctype html><html><head>
      <title>Cena Studio</title>
      <meta name="description" content="Default description" />
      <meta name="robots" content="index, follow" />
      <link rel="canonical" href="https://cena-studio-prod.vercel.app/" />
      <meta property="og:title" content="Cena Studio" />
      <meta property="og:description" content="Default description" />
      <meta property="og:url" content="https://cena-studio-prod.vercel.app/" />
      <meta name="twitter:title" content="Cena Studio" />
      <meta name="twitter:description" content="Default description" />
    </head><body><div id="root"></div></body></html>`);
    const handler = createPublicShareSeoHandler(staticPath);
    const headers: Record<string, string> = {};
    const res = {
      setHeader: vi.fn((name: string, value: string) => {
        headers[name] = value;
      }),
      type: vi.fn(() => res),
      send: vi.fn(),
    };
    const next = vi.fn();
    const req = {
      path: "/proposal/ddc8804b37d48c1564b3ecb330cfe7c563a90fb2f8f1d789",
      query: {},
      get: vi.fn(() => "pt-BR"),
    };

    await handler(req as any, res as any, next);

    expect(next).not.toHaveBeenCalled();
    expect(headers["X-Robots-Tag"]).toBe("noindex, nofollow, noarchive");
    expect(res.type).toHaveBeenCalledWith("html");
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('<div id="root"></div>'));
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining("Conteudo compartilhado | Cena Studio"));
  });
});
