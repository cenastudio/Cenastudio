import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

let authService: typeof import("./authService.js");
let teamService: typeof import("./teamService.js");
let taskService: typeof import("./taskService.js");
let projectsController: typeof import("../controllers/projectsController.js");
let dbModule: typeof import("../models/db.js");

type MockResponse = {
  statusCode: number;
  body: any;
  status: (code: number) => MockResponse;
  json: (body: unknown) => MockResponse;
};

function response(): MockResponse {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

async function createProject(user: { id: number }, name: string): Promise<number> {
  const res = response();
  await projectsController.createProject(
    { user, body: { name, metadataJson: "{}" } } as any,
    res as any,
    () => {},
  );
  return res.body.data.id as number;
}

describe("taskService", () => {
  let owner: { id: number; email: string };
  let producer: { id: number; email: string };
  let editor: { id: number; email: string };
  let outsider: { id: number; email: string };
  let projectId: number;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    process.env.JWT_SECRET = "test-secret-with-at-least-32-characters";
    process.env.LOG_LEVEL = "error";
    process.env.DATABASE_PATH = path.join(mkdtempSync(path.join(tmpdir(), "cena-tasks-")), "test.db");
    delete process.env.DATABASE_URL;
    delete process.env.POSTGRES_PRISMA_URL;
    delete process.env.POSTGRES_URL;

    dbModule = await import("../models/db.js");
    dbModule.initDatabase();
    authService = await import("./authService.js");
    teamService = await import("./teamService.js");
    taskService = await import("./taskService.js");
    projectsController = await import("../controllers/projectsController.js");

    const stamp = Date.now();
    owner = await authService.createManagedUser({
      name: "Studio Owner",
      email: `owner-${stamp}@example.com`,
      password: "password-123",
      role: "user",
      planId: "studio",
    });

    const producerMember = await teamService.createTeamMember(owner.id, {
      name: "Produtora",
      email: `producer-${stamp}@example.com`,
      password: "password-123",
      role: "producer",
    });
    producer = { id: producerMember.userId, email: producerMember.email };

    const editorMember = await teamService.createTeamMember(owner.id, {
      name: "Editor",
      email: `editor-${stamp}@example.com`,
      password: "password-123",
      role: "editor",
    });
    editor = { id: editorMember.userId, email: editorMember.email };

    outsider = await authService.registerUser("Fora do Workspace", `outsider-${stamp}@example.com`, "password-123");

    projectId = await createProject(owner, "Job de Teste");
  });

  it("allows the owner to create a task assigned to a team member", async () => {
    const task = await taskService.createTask(owner.id, projectId, {
      title: "Gravar cena 3",
      description: "Até sexta-feira",
      assigneeUserId: editor.id,
    });

    expect(task).toMatchObject({
      title: "Gravar cena 3",
      assignee_user_id: editor.id,
      created_by_user_id: owner.id,
      status: "pending",
    });
  });

  it("allows a team member with role producer to create/assign tasks", async () => {
    const task = await taskService.createTask(producer.id, projectId, {
      title: "Editar corte final",
      assigneeUserId: editor.id,
    });
    expect(task.created_by_user_id).toBe(producer.id);
  });

  it("rejects task creation from a team member without producer role", async () => {
    await expect(
      taskService.createTask(editor.id, projectId, {
        title: "Não deveria criar",
        assigneeUserId: editor.id,
      }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("rejects assigning a task to a user outside the workspace", async () => {
    await expect(
      taskService.createTask(owner.id, projectId, {
        title: "Tarefa inválida",
        assigneeUserId: outsider.id,
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("rejects an invalid stageId/toolSlug", async () => {
    await expect(
      taskService.createTask(owner.id, projectId, {
        title: "Etapa inválida",
        assigneeUserId: editor.id,
        stageId: "not-a-real-stage",
      }),
    ).rejects.toMatchObject({ status: 400 });

    await expect(
      taskService.createTask(owner.id, projectId, {
        title: "Ferramenta inválida",
        assigneeUserId: editor.id,
        toolSlug: "not-a-real-tool",
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("accepts a valid stageId/toolSlug vinculado ao workflow", async () => {
    const task = await taskService.createTask(owner.id, projectId, {
      title: "Preencher callsheet",
      assigneeUserId: editor.id,
      stageId: "planning",
      toolSlug: "callsheet",
    });
    expect(task).toMatchObject({ stage_id: "planning", tool_slug: "callsheet" });
  });

  it("lists tasks by project including assignee display fields", async () => {
    const tasks = await taskService.listTasksByProject(owner.id, projectId);
    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks[0]).toHaveProperty("assignee_name");
  });

  it("denies listing project tasks to users outside the workspace", async () => {
    await expect(taskService.listTasksByProject(outsider.id, projectId)).rejects.toMatchObject({ status: 404 });
  });

  it("lists tasks assigned to the acting user across projects (mine)", async () => {
    const mine = await taskService.listMyTasks(editor.id);
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every((t) => t.assignee_user_id === editor.id)).toBe(true);
    expect(mine[0]).toHaveProperty("project_name");
  });

  it("allows the assignee to update the task status to done and sets completedAt", async () => {
    const created = await taskService.createTask(owner.id, projectId, {
      title: "Concluir isso",
      assigneeUserId: editor.id,
    });
    const updated = await taskService.updateTask(editor.id, created.id, { status: "done" });
    expect(updated.status).toBe("done");
    expect(updated.completed_at).not.toBeNull();
  });

  it("rejects status update from a user who is not assignee, creator or owner", async () => {
    const created = await taskService.createTask(owner.id, projectId, {
      title: "Protegida",
      assigneeUserId: editor.id,
    });
    await expect(
      taskService.updateTask(outsider.id, created.id, { status: "done" }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("allows the owner to delete a task", async () => {
    const created = await taskService.createTask(owner.id, projectId, {
      title: "Para deletar",
      assigneeUserId: editor.id,
    });
    await taskService.deleteTask(owner.id, created.id);
    await expect(taskService.updateTask(owner.id, created.id, { status: "done" })).rejects.toMatchObject({
      status: 404,
    });
  });
});
