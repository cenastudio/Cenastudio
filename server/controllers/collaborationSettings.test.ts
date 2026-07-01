import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { RequestHandler } from "express";

type MockResponse = {
  statusCode: number;
  body: any;
  status: (code: number) => MockResponse;
  json: (body: unknown) => MockResponse;
};

let authService: typeof import("../services/authService.js");
let collaboratorsController: typeof import("./collaboratorsController.js");
let projectMembersController: typeof import("./projectMembersController.js");
let projectsController: typeof import("./projectsController.js");
let notificationsController: typeof import("./notificationsController.js");
let studioSettingsController: typeof import("./studioSettingsController.js");
let notificationService: typeof import("../services/notificationService.js");
let dbModule: typeof import("../models/db.js");
let user: { id: number; email: string; role: "user" };
let otherUser: { id: number; email: string; role: "user" };

function response(): MockResponse {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

async function invoke(handler: RequestHandler, req: Record<string, any>) {
  const res = response();
  let capturedError: unknown;
  await handler(req as any, res as any, (error?: unknown) => { capturedError = error; });
  if (capturedError) throw capturedError;
  return res;
}

describe("collaboration, notifications and studio settings", () => {
  beforeAll(async () => {
    vi.resetModules();
    process.env.NODE_ENV = "test";
    process.env.JWT_SECRET = "test-secret-with-at-least-32-characters";
    process.env.LOG_LEVEL = "error";
    process.env.DATABASE_PATH = path.join(mkdtempSync(path.join(tmpdir(), "cena-collaboration-")), "test.db");
    delete process.env.DATABASE_URL;
    delete process.env.POSTGRES_PRISMA_URL;
    delete process.env.POSTGRES_URL;

    dbModule = await import("../models/db.js");
    dbModule.initDatabase();
    authService = await import("../services/authService.js");
    collaboratorsController = await import("./collaboratorsController.js");
    projectMembersController = await import("./projectMembersController.js");
    projectsController = await import("./projectsController.js");
    notificationsController = await import("./notificationsController.js");
    studioSettingsController = await import("./studioSettingsController.js");
    notificationService = await import("../services/notificationService.js");

    const stamp = Date.now();
    user = await authService.registerUser("Studio Owner", `studio-owner-${stamp}@example.com`, "password-123");
    otherUser = await authService.registerUser("Other Studio", `other-studio-${stamp}@example.com`, "password-123");
  });

  it("covers collaborator lifecycle, statistics and account isolation", async () => {
    const created = await invoke(collaboratorsController.createCollaborator, {
      user,
      body: {
        name: "  Ana Fotografia  ",
        email: "  ana@example.com  ",
        role: "photographer",
        skills: "camera, light",
        daily_rate: 1800,
      },
    });
    const collaboratorId = String(created.body.data.id);
    expect(created.body.data).toMatchObject({
      name: "Ana Fotografia",
      email: "ana@example.com",
      role: "photographer",
      daily_rate: 1800,
    });

    const listed = await invoke(collaboratorsController.listCollaborators, { user });
    expect(listed.body.data.some((item: any) => item.id === created.body.data.id)).toBe(true);

    const updated = await invoke(collaboratorsController.updateCollaborator, {
      user,
      params: { id: collaboratorId },
      body: { role: "director_of_photography", daily_rate: 2200, status: "inactive" },
    });
    expect(updated.body.data).toMatchObject({
      role: "director_of_photography",
      daily_rate: 2200,
      status: "inactive",
    });

    const stats = await invoke(collaboratorsController.getCollaboratorStats, { user });
    expect(stats.body.data.totalCollaborators).toBeGreaterThanOrEqual(1);
    expect(stats.body.data.activeCollaborators).toBe(0);
    expect(stats.body.data.byRole).toContainEqual({ role: "director_of_photography", count: 1 });

    await expect(invoke(collaboratorsController.getCollaborator, {
      user: otherUser,
      params: { id: collaboratorId },
    })).rejects.toMatchObject({ status: 404 });

    const removed = await invoke(collaboratorsController.deleteCollaborator, {
      user,
      params: { id: collaboratorId },
    });
    expect(removed.body.success).toBe(true);
  });

  it("covers project membership and protects owner-only mutations", async () => {
    const project = await invoke(projectsController.createProject, {
      user,
      body: { name: "Equipe Comercial", metadataJson: "{}" },
    });
    const collaborator = await invoke(collaboratorsController.createCollaborator, {
      user,
      body: { name: "Bruno Som", email: "bruno@example.com", role: "sound" },
    });
    const projectId = String(project.body.data.id);
    const collaboratorId = String(collaborator.body.data.id);

    const added = await invoke(projectMembersController.addProjectMember, {
      user,
      params: { projectId },
      body: { collaboratorId: collaborator.body.data.id, role: "sound_mixer" },
    });
    const memberId = String(added.body.data.id);
    expect(added.body.data).toMatchObject({ name: "Bruno Som", role: "sound_mixer" });

    await expect(invoke(projectMembersController.addProjectMember, {
      user,
      params: { projectId },
      body: { collaboratorId: collaborator.body.data.id, role: "member" },
    })).rejects.toMatchObject({ status: 400 });

    const members = await invoke(projectMembersController.listProjectMembers, {
      user,
      params: { projectId },
    });
    expect(members.body.data).toHaveLength(1);

    const projects = await invoke(projectMembersController.getCollaboratorProjects, {
      user,
      params: { collaboratorId },
    });
    expect(projects.body.data).toHaveLength(1);
    expect(projects.body.data[0]).toMatchObject({ id: project.body.data.id, member_role: "sound_mixer" });

    await expect(invoke(projectMembersController.updateProjectMember, {
      user: otherUser,
      params: { id: memberId },
      body: { role: "producer" },
    })).rejects.toMatchObject({ status: 403 });

    const updated = await invoke(projectMembersController.updateProjectMember, {
      user,
      params: { id: memberId },
      body: { role: "audio_supervisor" },
    });
    expect(updated.body.data.role).toBe("audio_supervisor");

    await expect(invoke(projectMembersController.listProjectMembers, {
      user: otherUser,
      params: { projectId },
    })).rejects.toMatchObject({ status: 404 });

    const removed = await invoke(projectMembersController.removeProjectMember, {
      user,
      params: { id: memberId },
    });
    expect(removed.body.success).toBe(true);
  });

  it("scopes notification reads and cleanup to the authenticated user", async () => {
    notificationService.notifyUser(user.id, "Primeira", "Mensagem 1", "info", "/projects");
    notificationService.notifyUser(user.id, "Segunda", "Mensagem 2", "success");
    notificationService.notifyUser(otherUser.id, "Privada", "Outro usuario", "warning");

    const listed = await invoke(notificationsController.listNotifications, {
      user,
      query: { limit: "1" },
    });
    expect(listed.body.data).toHaveLength(1);
    expect(listed.body.data[0].title).toBe("Segunda");

    const unread = await invoke(notificationsController.getUnreadCount, { user });
    expect(unread.body.data.count).toBe(2);

    const first = dbModule.db
      .prepare("SELECT id FROM notifications WHERE user_id = ? ORDER BY id ASC LIMIT 1")
      .get(user.id) as { id: number };
    await invoke(notificationsController.markAsRead, { user, params: { id: String(first.id) } });

    await expect(invoke(notificationsController.markAsRead, {
      user: otherUser,
      params: { id: String(first.id) },
    })).rejects.toMatchObject({ status: 404 });

    const clearedRead = await invoke(notificationsController.clearReadNotifications, { user });
    expect(clearedRead.body.data.removed).toBe(1);

    const markedAll = await invoke(notificationsController.markAllAsRead, { user });
    expect(markedAll.body.success).toBe(true);

    const clearedAll = await invoke(notificationsController.clearAllNotifications, { user });
    expect(clearedAll.body.data.removed).toBe(1);

    const otherCount = await invoke(notificationsController.getUnreadCount, { user: otherUser });
    expect(otherCount.body.data.count).toBe(1);
  });

  it("returns defaults, sanitizes updates and isolates studio settings", async () => {
    const defaults = await invoke(studioSettingsController.getStudioSettings, { user });
    expect(defaults.body.data).toMatchObject({
      studioName: "Cena Studio",
      signature: "Responsavel comercial",
      primaryColor: "#ff4d1d",
    });

    const updated = await invoke(studioSettingsController.updateStudioSettings, {
      user,
      body: {
        studioName: "  Aurora Filmes  ",
        legalName: "Aurora Producoes LTDA",
        email: " contato@aurora.example ",
        website: "https://aurora.example",
        signature: "  Direcao comercial  ",
        primaryColor: "not-a-color",
      },
    });
    expect(updated.body.data).toMatchObject({
      studioName: "Aurora Filmes",
      email: "contato@aurora.example",
      signature: "Direcao comercial",
      primaryColor: "#ff4d1d",
    });

    const persisted = await invoke(studioSettingsController.getStudioSettings, { user });
    expect(persisted.body.data.studioName).toBe("Aurora Filmes");

    const otherDefaults = await invoke(studioSettingsController.getStudioSettings, { user: otherUser });
    expect(otherDefaults.body.data.studioName).toBe("Cena Studio");
  });
});
