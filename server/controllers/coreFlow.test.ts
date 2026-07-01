import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { RequestHandler } from "express";

type MockResponse = {
  statusCode: number;
  body: any;
  cookies: Record<string, string>;
  status: (code: number) => MockResponse;
  json: (body: unknown) => MockResponse;
  cookie: (name: string, value: string) => MockResponse;
  clearCookie: (name: string) => MockResponse;
};

let authController: typeof import("./authController.js");
let clientsController: typeof import("./clientsController.js");
let projectsController: typeof import("./projectsController.js");
let authMiddleware: typeof import("../middleware/authenticate.js");

function createResponse(): MockResponse {
  const response: MockResponse = {
    statusCode: 200,
    body: undefined,
    cookies: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    cookie(name, value) {
      this.cookies[name] = value;
      return this;
    },
    clearCookie(name) {
      delete this.cookies[name];
      return this;
    },
  };
  return response;
}

async function invoke(handler: RequestHandler, req: Record<string, any>) {
  const res = createResponse();
  let capturedError: unknown;
  await handler(req as any, res as any, (error?: unknown) => {
    capturedError = error;
  });
  if (capturedError) throw capturedError;
  return res;
}

describe("core controller flow", () => {
  beforeAll(async () => {
    vi.resetModules();
    process.env.NODE_ENV = "test";
    process.env.JWT_SECRET = "test-secret-with-at-least-32-characters";
    process.env.LOG_LEVEL = "error";
    process.env.DATABASE_PATH = path.join(mkdtempSync(path.join(tmpdir(), "cena-core-flow-")), "test.db");
    delete process.env.DATABASE_URL;
    delete process.env.POSTGRES_PRISMA_URL;
    delete process.env.POSTGRES_URL;

    const dbModule = await import("../models/db.js");
    dbModule.initDatabase();
    authController = await import("./authController.js");
    clientsController = await import("./clientsController.js");
    projectsController = await import("./projectsController.js");
    authMiddleware = await import("../middleware/authenticate.js");
  });

  it("rejects protected handlers without a frame_token cookie", async () => {
    const req = { cookies: {} };
    const res = createResponse();
    let capturedError: any;

    await authMiddleware.authenticate(req as any, res as any, (error?: unknown) => {
      capturedError = error;
    });

    expect(capturedError?.status).toBe(401);
    expect(capturedError?.message).toBe("Unauthorized");
  });

  it("registers, authenticates and persists client/project records", async () => {
    const email = `flow-${Date.now()}@example.com`;
    const register = await invoke(authController.register, {
      body: {
        name: "Core Flow",
        email,
        password: "flow-password-123",
      },
    });

    expect(register.statusCode).toBe(201);
    expect(register.body.success).toBe(true);
    expect(register.cookies[authMiddleware.COOKIE_NAME]).toBeTruthy();

    const authReq = { cookies: { [authMiddleware.COOKIE_NAME]: register.cookies[authMiddleware.COOKIE_NAME] } };
    await invoke(authMiddleware.authenticate, authReq);
    expect(authReq).toHaveProperty("user.email", email);

    const me = await invoke(authController.me, authReq);
    expect(me.body.data.user.email).toBe(email);

    const client = await invoke(clientsController.createClient, {
      user: authReq.user,
      body: {
        name: "Cliente Teste",
        company: "Cena Flow",
        email: "cliente-flow@example.com",
      },
    });
    expect(client.statusCode).toBe(200);
    expect(client.body.data.name).toBe("Cliente Teste");

    const project = await invoke(projectsController.createProject, {
      user: authReq.user,
      body: {
        name: "Projeto Teste",
        description: "Fluxo coberto por teste",
        clientId: client.body.data.id,
        metadataJson: JSON.stringify({ source: "test" }),
      },
    });
    expect(project.statusCode).toBe(200);
    expect(project.body.data.name).toBe("Projeto Teste");
    expect(project.body.data.client_id).toBe(client.body.data.id);

    const projects = await invoke(projectsController.listProjects, { user: authReq.user });
    expect(projects.body.data.some((item: any) => item.id === project.body.data.id)).toBe(true);
  });
});
