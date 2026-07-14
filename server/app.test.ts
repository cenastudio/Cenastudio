import path from "path";
import { describe, expect, it, vi } from "vitest";
import { createSpaFallbackHandler } from "./app.js";

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
