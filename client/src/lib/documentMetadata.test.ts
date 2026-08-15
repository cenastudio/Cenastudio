import { afterEach, describe, expect, it } from "vitest";
import { applyDocumentMetadata } from "./documentMetadata";

const ORIGINAL_HEAD = document.head.innerHTML;

afterEach(() => {
  document.head.innerHTML = ORIGINAL_HEAD;
  document.title = "Cena Studio";
});

describe("applyDocumentMetadata", () => {
  it("updates the title, description and social tags for a public page", () => {
    applyDocumentMetadata({
      title: "Filme manifesto | Revisao de video | Cena Studio",
      description: "Assista e envie comentarios para esta revisao de video.",
      path: "/review/share-token",
      robots: "noindex, nofollow, noarchive",
      publicUrl: "https://cena-studio-prod.vercel.app",
    });

    expect(document.title).toBe("Filme manifesto | Revisao de video | Cena Studio");
    expect(document.querySelector('meta[name="description"]')?.getAttribute("content"))
      .toBe("Assista e envie comentarios para esta revisao de video.");
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute("content"))
      .toBe("Filme manifesto | Revisao de video | Cena Studio");
    expect(document.querySelector('meta[name="twitter:description"]')?.getAttribute("content"))
      .toBe("Assista e envie comentarios para esta revisao de video.");
    expect(document.querySelector('meta[name="robots"]')?.getAttribute("content"))
      .toBe("noindex, nofollow, noarchive");
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href"))
      .toBe("https://cena-studio-prod.vercel.app/review/share-token");
    expect(document.querySelector('meta[property="og:url"]')?.getAttribute("content"))
      .toBe("https://cena-studio-prod.vercel.app/review/share-token");
  });
});
