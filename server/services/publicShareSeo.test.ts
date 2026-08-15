import { describe, expect, it } from "vitest";
import {
  buildPublicShareMetadata,
  isMeetingShareUsable,
  isProposalShareUsable,
  isReviewShareUsable,
  renderPublicShareHtml,
} from "./publicShareSeo.js";

const SPA_SHELL = `<!doctype html><html><head>
  <title>Cena Studio</title>
  <meta name="description" content="Default description" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://cena-studio-prod.vercel.app/" />
  <meta property="og:title" content="Cena Studio" />
  <meta property="og:description" content="Default description" />
  <meta property="og:url" content="https://cena-studio-prod.vercel.app/" />
  <meta name="twitter:title" content="Cena Studio" />
  <meta name="twitter:description" content="Default description" />
  <script type="application/ld+json">{"@type":"SoftwareApplication"}</script>
</head><body><div id="root"></div></body></html>`;

describe("public share SEO", () => {
  it("renders an escaped, noindex preview for a valid public review", () => {
    const metadata = buildPublicShareMetadata({
      kind: "review",
      title: 'Filme <manifesto> & "v2"',
      path: "/review/share-token",
      publicOrigin: "https://cena-studio-prod.vercel.app",
    });

    const html = renderPublicShareHtml(SPA_SHELL, metadata);

    expect(html).toContain("<title>Filme &lt;manifesto&gt; &amp; &quot;v2&quot; | Revisao de video | Cena Studio</title>");
    expect(html).toContain('name="robots" content="noindex, nofollow, noarchive"');
    expect(html).toContain('property="og:url" content="https://cena-studio-prod.vercel.app/review/share-token"');
    expect(html).toContain('name="twitter:title" content="Filme &lt;manifesto&gt; &amp; &quot;v2&quot; | Revisao de video | Cena Studio"');
    expect(html).not.toContain('application/ld+json');
  });

  it("uses the same expiry rules as the public links", () => {
    const now = new Date("2026-08-14T12:00:00.000Z");

    expect(isReviewShareUsable({ expiresAt: new Date("2026-08-14T12:00:01.000Z") }, now)).toBe(true);
    expect(isReviewShareUsable({ expiresAt: new Date("2026-08-14T11:59:59.000Z") }, now)).toBe(false);
    expect(isProposalShareUsable({ status: "accepted", createdAt: new Date("2025-01-01") }, now, 90)).toBe(true);
    expect(isProposalShareUsable({ status: "revoked", createdAt: now }, now, 90)).toBe(false);
    expect(isProposalShareUsable({ status: "sent", createdAt: new Date("2026-05-01") }, now, 90)).toBe(false);
    expect(isMeetingShareUsable({ status: "scheduled", startsAt: new Date("2026-08-13T12:00:00.000Z") }, now, 2)).toBe(true);
    expect(isMeetingShareUsable({ status: "cancelled", startsAt: new Date("2026-08-20T12:00:00.000Z") }, now, 2)).toBe(false);
  });
});
