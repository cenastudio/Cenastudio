import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock factories are hoisted above imports, so the spies they reference must
// be created with vi.hoisted to exist at that point.
const {
  checkAndIncrementUsage,
  generateScriptSuggestions,
  analyzeBudget,
  generateProposal,
  summarizeInteraction,
  analyzeSentiment,
  chatbotHelp,
} = vi.hoisted(() => ({
  checkAndIncrementUsage: vi.fn(),
  generateScriptSuggestions: vi.fn(async () => ({ ok: true })),
  analyzeBudget: vi.fn(async () => ({ ok: true })),
  generateProposal: vi.fn(async () => "proposal"),
  summarizeInteraction: vi.fn(async () => ({ ok: true })),
  analyzeSentiment: vi.fn(async () => ({ ok: true })),
  chatbotHelp: vi.fn(async () => "answer"),
}));

vi.mock("../services/authService.js", () => ({ checkAndIncrementUsage }));
vi.mock("../services/ai/scriptSuggestions.js", () => ({ generateScriptSuggestions }));
vi.mock("../services/ai/budgetAnalysis.js", () => ({ analyzeBudget }));
vi.mock("../services/ai/proposalGenerator.js", () => ({ generateProposal }));
vi.mock("../services/ai/interactionSummarizer.js", () => ({ summarizeInteraction }));
vi.mock("../services/ai/sentimentAnalysis.js", () => ({ analyzeSentiment }));
vi.mock("../services/ai/helpChatbot.js", () => ({ chatbotHelp }));
vi.mock("../services/aiService.js", () => ({ generateForTool: vi.fn(), trackUsage: vi.fn() }));
vi.mock("../models/db.js", () => ({ db: {} }));
vi.mock("../models/prisma.js", () => ({ prisma: {}, shouldUsePrisma: false }));
vi.mock("../utils/prismaSerialization.js", () => ({ jsonSafe: (x: unknown) => x }));

import * as aiController from "./aiController.js";

function mockRes() {
  const res: Partial<Response> & { statusCode?: number; body?: unknown } = {};
  res.status = vi.fn((code: number) => {
    res.statusCode = code;
    return res as Response;
  }) as unknown as Response["status"];
  res.json = vi.fn((payload: unknown) => {
    res.body = payload;
    return res as Response;
  }) as unknown as Response["json"];
  return res as Response & { statusCode?: number; body?: unknown };
}

type Handler = (req: Request, res: Response, next: (err?: unknown) => void) => Promise<void> | void;

const cases: Array<{ name: string; handler: Handler; body: Record<string, unknown>; aiFn: ReturnType<typeof vi.fn> }> = [
  {
    name: "scriptSuggestions",
    handler: aiController.scriptSuggestions as Handler,
    body: { briefTitle: "t", briefDescription: "d" },
    aiFn: generateScriptSuggestions,
  },
  {
    name: "budgetAnalysis",
    handler: aiController.budgetAnalysis as Handler,
    body: { projectName: "p", totalBudget: 1000, items: [{ name: "x", value: 1 }] },
    aiFn: analyzeBudget,
  },
  {
    name: "generateProposalEndpoint",
    handler: aiController.generateProposalEndpoint as Handler,
    body: {
      clientName: "c",
      projectName: "p",
      projectDescription: "d",
      deliverables: ["a"],
      timeline: "2w",
      budget: 1000,
    },
    aiFn: generateProposal,
  },
  {
    name: "summarizeInteractionEndpoint",
    handler: aiController.summarizeInteractionEndpoint as Handler,
    body: { notes: "some notes" },
    aiFn: summarizeInteraction,
  },
  {
    name: "analyzeSentimentEndpoint",
    handler: aiController.analyzeSentimentEndpoint as Handler,
    body: { text: "hello" },
    aiFn: analyzeSentiment,
  },
  {
    name: "chatbotEndpoint",
    handler: aiController.chatbotEndpoint as Handler,
    body: { question: "how?" },
    aiFn: chatbotHelp,
  },
];

describe("aiController auxiliary endpoints enforce quota", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  for (const c of cases) {
    it(`${c.name} consumes quota before calling the AI provider`, async () => {
      checkAndIncrementUsage.mockResolvedValueOnce(undefined);
      const req = { user: { id: 42 }, body: c.body } as unknown as Request;
      const res = mockRes();
      const next = vi.fn();

      await c.handler(req, res, next);

      expect(checkAndIncrementUsage).toHaveBeenCalledTimes(1);
      expect(checkAndIncrementUsage).toHaveBeenCalledWith(42, expect.stringContaining("ai-features:"));
      expect(c.aiFn).toHaveBeenCalledTimes(1);
      expect(next).not.toHaveBeenCalled();
    });

    it(`${c.name} blocks the AI provider and forwards the error when quota is exceeded`, async () => {
      const quotaError = Object.assign(new Error("limit"), { status: 403 });
      checkAndIncrementUsage.mockRejectedValueOnce(quotaError);
      const req = { user: { id: 42 }, body: c.body } as unknown as Request;
      const res = mockRes();
      const next = vi.fn();

      await c.handler(req, res, next);

      expect(checkAndIncrementUsage).toHaveBeenCalledTimes(1);
      expect(c.aiFn).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(quotaError);
    });
  }
});
