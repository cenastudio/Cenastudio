import { describe, expect, it } from "vitest";
import { mapCollaboratorRole } from "./collaboratorRoleMap.js";

describe("mapCollaboratorRole", () => {
  it("maps management-ish roles to producer", () => {
    for (const r of ["admin", "director", "producer", "PRODUCER", "  Director "]) {
      expect(mapCollaboratorRole(r)).toEqual({ role: "producer", needsReview: false });
    }
  });

  it("maps hands-on roles to editor", () => {
    for (const r of ["editor", "camera", "Camera"]) {
      expect(mapCollaboratorRole(r)).toEqual({ role: "editor", needsReview: false });
    }
  });

  it("maps member/viewer/empty to viewer without review", () => {
    for (const r of ["member", "viewer", "", null, undefined]) {
      expect(mapCollaboratorRole(r)).toEqual({ role: "viewer", needsReview: false });
    }
  });

  it("maps unknown roles to viewer WITH review flag", () => {
    for (const r of ["gaffer", "sound", "colorist", "random-role"]) {
      expect(mapCollaboratorRole(r)).toEqual({ role: "viewer", needsReview: true });
    }
  });
});
