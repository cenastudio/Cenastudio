import { describe, expect, it } from "vitest";
import { assertProposalLinkUsable } from "./proposalsController.js";
import { assertMeetingLinkUsable } from "./meetingsController.js";

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
});
