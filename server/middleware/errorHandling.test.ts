import { describe, expect, it } from "vitest";
import { AppError, errorHandler } from "./errorHandler.js";

type MockResponse = {
  statusCode: number;
  body: unknown;
  locals: Record<string, unknown>;
  headers: Record<string, string>;
  setHeader: (name: string, value: string) => void;
  status: (code: number) => MockResponse;
  json: (body: unknown) => MockResponse;
};

function response(): MockResponse {
  return {
    statusCode: 200,
    body: undefined,
    locals: {},
    headers: {},
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

describe("errorHandler", () => {
  it("keeps validation messages actionable without exposing a request id", () => {
    const res = response();

    errorHandler(new AppError("Valor total invalido", 400), {} as any, res as any, () => undefined);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ success: false, error: "Valor total invalido" });
  });

  it("returns a safe, traceable response for an unexpected production error", () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    const res = response();

    errorHandler(new Error("database connection details must stay private"), {} as any, res as any, () => undefined);

    process.env.NODE_ENV = previousNodeEnv;
    expect(res.statusCode).toBe(500);
    expect(res.body).toMatchObject({
      success: false,
      error: "Nao foi possivel concluir esta acao. Tente novamente.",
      requestId: expect.stringMatching(/^[0-9a-f-]{36}$/),
    });
    expect(res.headers["x-request-id"]).toBe((res.body as { requestId: string }).requestId);
  });
});
