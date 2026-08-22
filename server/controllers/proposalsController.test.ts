import { describe, expect, it } from "vitest";
import { validateProposalPayload } from "./proposalsController.js";

describe("validateProposalPayload", () => {
  it("normalizes a valid payload before it reaches persistence", () => {
    expect(validateProposalPayload({
      clientId: "42",
      title: "  Filme institucional  ",
      html: "<h1>Filme</h1>",
      total: 125_500,
    })).toEqual({
      clientId: 42n,
      title: "Filme institucional",
      html: "<h1>Filme</h1>",
      total: 125_500,
    });
  });

  it.each([
    [{ clientId: "42x", title: "Titulo", html: "<p>ok</p>", total: 100 }],
    [{ clientId: 42, title: "Titulo", html: "<p>ok</p>", total: 100.5 }],
    [{ clientId: 42, title: { trim: () => "Titulo" }, html: "<p>ok</p>", total: 100 }],
    [{ clientId: 42, title: "Titulo", html: { trim: () => "<p>ok</p>" }, total: 100 }],
  ])("rejects malformed proposal input as a 400 domain error", (input) => {
    expect(() => validateProposalPayload(input)).toThrowError(expect.objectContaining({ status: 400 }));
  });
});
