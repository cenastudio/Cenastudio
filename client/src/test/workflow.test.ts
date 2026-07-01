import { describe, expect, it } from "vitest";
import {
  getArtifactStatus,
  getArtifactVersion,
  getStageForLocation,
  getStageForTool,
  isActionComplete,
  visibleFormValues,
  WORKFLOW_STAGES,
} from "@/lib/workflow";

describe("project storytelling workflow", () => {
  it("keeps the complete job story in a stable order", () => {
    expect(WORKFLOW_STAGES.map((stage) => stage.id)).toEqual([
      "entry",
      "planning",
      "production",
      "review",
      "delivery",
      "closing",
    ]);
  });

  it("maps all twelve Studio tools into a chapter", () => {
    const tools = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
    expect(tools.map(getStageForTool)).toEqual([
      "planning",
      "planning",
      "planning",
      "entry",
      "entry",
      "entry",
      "entry",
      "planning",
      "planning",
      "planning",
      "delivery",
      "production",
    ]);
  });

  it("infers the active chapter from contextual routes", () => {
    expect(getStageForLocation("/project/8/studio/briefing")).toBe("entry");
    expect(getStageForLocation("/project/8/video-reviews")).toBe("review");
    expect(getStageForLocation("/project/8/journey/closing")).toBe("closing");
  });

  it("recognizes saved actions by tool id or slug", () => {
    const briefing = WORKFLOW_STAGES[0].actions[0];
    expect(isActionComplete(briefing, ["07"])).toBe(true);
    expect(isActionComplete(briefing, ["briefing"])).toBe(true);
    expect(isActionComplete(briefing, [])).toBe(false);
  });

  it("keeps lifecycle metadata out of AI input and restores valid status", () => {
    const form = {
      objective: "Filme manifesto",
      audience: "Produtoras",
      __artifactStatus: "approved",
      __artifactVersion: "3",
    };
    expect(visibleFormValues(form)).toEqual(["Filme manifesto", "Produtoras"]);
    expect(getArtifactStatus(form)).toBe("approved");
    expect(getArtifactVersion(form)).toBe(3);
  });
});
