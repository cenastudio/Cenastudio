import { describe, expect, it } from "vitest";
import { assertProposalLinkUsable } from "./proposalsController.js";
import { assertMeetingLinkUsable, renderMeetingInvitationEmail } from "./meetingsController.js";

const DAY = 24 * 60 * 60 * 1000;

describe("proposal public link guard", () => {
  it("allows a freshly sent proposal", () => {
    expect(() => assertProposalLinkUsable({ status: "sent", createdAt: new Date() })).not.toThrow();
  });

  it("blocks a revoked proposal (410)", () => {
    expect(() => assertProposalLinkUsable({ status: "revoked", createdAt: new Date() }))
      .toThrowError(expect.objectContaining({ status: 410 }));
  });

  it("blocks a draft proposal before it is sent", () => {
    expect(() => assertProposalLinkUsable({ status: "draft", createdAt: new Date() }))
      .toThrowError(expect.objectContaining({ status: 404 }));
  });

  it("blocks a non-accepted proposal past the TTL (410)", () => {
    const old = new Date(Date.now() - 1000 * DAY);
    expect(() => assertProposalLinkUsable({ status: "sent", createdAt: old }))
      .toThrowError(expect.objectContaining({ status: 410 }));
  });

  it("keeps an accepted proposal accessible as a record, even when old", () => {
    const old = new Date(Date.now() - 1000 * DAY);
    expect(() => assertProposalLinkUsable({ status: "accepted", createdAt: old })).not.toThrow();
  });
});

describe("meeting public link guard", () => {
  it("allows a future meeting", () => {
    const future = new Date(Date.now() + 3 * DAY);
    expect(() => assertMeetingLinkUsable({ status: "scheduled", startsAt: future })).not.toThrow();
  });

  it("blocks a cancelled meeting (410)", () => {
    const future = new Date(Date.now() + 3 * DAY);
    expect(() => assertMeetingLinkUsable({ status: "cancelled", startsAt: future }))
      .toThrowError(expect.objectContaining({ status: 410 }));
  });

  it("blocks a meeting well past its date + grace (410)", () => {
    const past = new Date(Date.now() - 30 * DAY);
    expect(() => assertMeetingLinkUsable({ status: "scheduled", startsAt: past }))
      .toThrowError(expect.objectContaining({ status: 410 }));
  });

  it("renders meeting invitation through the shared transactional shell", () => {
    const email = renderMeetingInvitationEmail({
      locale: "pt",
      studioName: "Cena Studio",
      studioSignature: "Clara <script>alert(1)</script>",
      contactLine: "contato@example.com",
      clientName: "Marina Cliente",
      meetingTitle: "Briefing <script>alert(1)</script>",
      startsAt: new Date("2026-08-22T14:00:00.000Z"),
      location: "Sala 2 <b>VIP</b>",
      notes: "Levar roteiro <img src=x onerror=alert(1)>",
      meetingUrl: "https://cena.example/meeting/token",
    });

    expect(email.subject).toBe("Reunião agendada pelo Cena Studio");
    expect(email.html).toContain("background:#080808");
    expect(email.html).toContain("Ver Detalhes da Reunião");
    expect(email.html).toContain("href=\"https://cena.example/meeting/token\"");
    expect(email.html).toContain("Briefing &lt;script&gt;alert(1)&lt;/script&gt;");
    expect(email.html).toContain("Sala 2 &lt;b&gt;VIP&lt;/b&gt;");
    expect(email.html).not.toContain("<script>");
    expect(email.html).not.toContain("<img");
    expect(email.text).toContain("Ver Detalhes da Reunião: https://cena.example/meeting/token");
  });

  it("omits the meeting CTA when the action URL is unsafe", () => {
    const email = renderMeetingInvitationEmail({
      locale: "en",
      studioName: "Cena Studio",
      studioSignature: "Clara",
      clientName: "Marina Client",
      meetingTitle: "Kickoff",
      startsAt: new Date("2026-08-22T14:00:00.000Z"),
      meetingUrl: "javascript:alert(1)",
    });

    expect(email.subject).toBe("Meeting scheduled via Cena Studio");
    expect(email.html).not.toContain("javascript:");
    expect(email.text).not.toContain("View Meeting Details:");
  });
});
