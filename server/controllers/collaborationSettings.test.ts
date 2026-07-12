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
let teamService: typeof import("../services/teamService.js");
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
    teamService = await import("../services/teamService.js");
    projectMembersController = await import("./projectMembersController.js");
    projectsController = await import("./projectsController.js");
    notificationsController = await import("./notificationsController.js");
    studioSettingsController = await import("./studioSettingsController.js");
    notificationService = await import("../services/notificationService.js");

    const stamp = Date.now();
    user = await authService.createManagedUser({
      name: "Studio Owner",
      email: `studio-owner-${stamp}@example.com`,
      password: "password-123",
      role: "user",
      planId: "studio",
    });
    otherUser = await authService.registerUser("Other Studio", `other-studio-${stamp}@example.com`, "password-123");
  });

  // Spec: team-task-delegation, Fase 6 — Collaborator (freelancer sem login)
  // foi fundido em Team. Membros de projeto agora são team members (userId),
  // não mais collaboratorId.
  it("covers project membership via team members and protects owner-only mutations", async () => {
    const project = await invoke(projectsController.createProject, {
      user,
      body: { name: "Equipe Comercial", metadataJson: "{}" },
    });
    const stamp = Date.now();
    const bruno = await teamService.createTeamMember(user.id, {
      name: "Bruno Som",
      email: `bruno-${stamp}@example.com`,
      password: "password-123",
      role: "editor",
    });
    const projectId = String(project.body.data.id);

    const added = await invoke(projectMembersController.addProjectMember, {
      user,
      params: { projectId },
      body: { userId: bruno.userId, role: "sound_mixer" },
    });
    const memberId = String(added.body.data.id);
    expect(added.body.data).toMatchObject({ name: "Bruno Som", role: "sound_mixer" });

    await expect(invoke(projectMembersController.addProjectMember, {
      user,
      params: { projectId },
      body: { userId: bruno.userId, role: "member" },
    })).rejects.toMatchObject({ status: 400 });

    const members = await invoke(projectMembersController.listProjectMembers, {
      user,
      params: { projectId },
    });
    expect(members.body.data).toHaveLength(1);

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

  it("rejects adding a member whose userId is outside the workspace", async () => {
    const project = await invoke(projectsController.createProject, {
      user,
      body: { name: "Job Isolado", metadataJson: "{}" },
    });
    const projectId = String(project.body.data.id);

    await expect(invoke(projectMembersController.addProjectMember, {
      user,
      params: { projectId },
      body: { userId: otherUser.id, role: "member" },
    })).rejects.toMatchObject({ status: 400 });
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
    // Fase 3: defaults derivam de SITE_CONFIG.brandName / .primaryColor (env-driven).
    // Sem env definida, o default é o Cena Studio original.
    const { SITE_CONFIG } = await import("@shared/site");
    expect(defaults.body.data).toMatchObject({
      studioName: SITE_CONFIG.brandName,
      signature: "Responsavel comercial",
      primaryColor: SITE_CONFIG.primaryColor,
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
    const { SITE_CONFIG: SITE_CONFIG_FOR_UPDATED } = await import("@shared/site");
    expect(updated.body.data).toMatchObject({
      studioName: "Aurora Filmes",
      email: "contato@aurora.example",
      signature: "Direcao comercial",
      // Invalid color falls back to the env-driven default.
      primaryColor: SITE_CONFIG_FOR_UPDATED.primaryColor,
    });

    const persisted = await invoke(studioSettingsController.getStudioSettings, { user });
    expect(persisted.body.data.studioName).toBe("Aurora Filmes");

    const otherDefaults = await invoke(studioSettingsController.getStudioSettings, { user: otherUser });
    expect(otherDefaults.body.data.studioName).toBe(SITE_CONFIG_FOR_UPDATED.brandName);
  });
});
