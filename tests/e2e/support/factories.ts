import { type Page } from "@playwright/test";

/**
 * Factories para criar/deletar dados de teste via API durante testes E2E.
 *
 * Padrões:
 * - Cada criação usa sufixo `Date.now()` para evitar colisões em execução paralela.
 * - Falhas HTTP em criação → lançam Error com corpo da resposta (falha explícita).
 * - Falhas em cleanup → apenas `console.warn`. Nunca re-lançam, para não
 *   mascarar falha do teste que originou o cleanup (Property 3).
 * - Cleanup respeita ordem: projetos primeiro, clientes depois (FK constraint,
 *   Property 4).
 */

export interface TestClient {
  id: string;
  name: string;
  company: string;
}

export interface TestProject {
  id: string;
  clientId: string;
  name: string;
}

/**
 * Cria um cliente via `POST /api/clients` com defaults sensatos.
 *
 * @param overrides Campos que sobrescrevem os defaults. Pode incluir campos
 *   extras (segment, tax_id, address, etc.) — serão enviados no payload.
 * @throws Error se a resposta HTTP não for 2xx.
 */
export async function createClientViaApi(
  page: Page,
  overrides: Partial<Omit<TestClient, "id">> & Record<string, unknown> = {},
): Promise<TestClient> {
  const suffix = Date.now();
  const defaults: Record<string, unknown> = {
    name: `Cliente Fase1 ${suffix}`,
    company: `Marca Fase1 ${suffix}`,
    status: "active",
  };
  const payload = { ...defaults, ...overrides };

  const response = await page.request.post("/api/clients", { data: payload });
  if (!response.ok()) {
    const body = await response.text();
    throw new Error(
      `[factory] createClientViaApi falhou: HTTP ${response.status()} — ${body}`,
    );
  }

  const json = await response.json();
  const data = json?.data ?? json;
  return {
    id: String(data.id),
    name: String(data.name ?? payload.name),
    company: String(data.company ?? payload.company),
  };
}

/**
 * Cria um projeto via `POST /api/projects` associado a `clientId`.
 *
 * @param clientId ID do cliente dono do projeto (obrigatório).
 * @param overrides Campos extras (metadataJson, etc.). `clientId` é sempre
 *   forçado no payload final, mesmo se presente em overrides.
 * @throws Error se a resposta HTTP não for 2xx.
 */
export async function createProjectViaApi(
  page: Page,
  clientId: string,
  overrides: Partial<Omit<TestProject, "id" | "clientId">> &
    Record<string, unknown> = {},
): Promise<TestProject> {
  const suffix = Date.now();
  const defaults: Record<string, unknown> = {
    name: `Projeto Fase1 ${suffix}`,
  };
  const payload = { ...defaults, ...overrides, clientId };

  const response = await page.request.post("/api/projects", { data: payload });
  if (!response.ok()) {
    const body = await response.text();
    throw new Error(
      `[factory] createProjectViaApi falhou: HTTP ${response.status()} — ${body}`,
    );
  }

  const json = await response.json();
  const data = json?.data ?? json;
  return {
    id: String(data.id),
    clientId: String(data.clientId ?? clientId),
    name: String(data.name ?? payload.name),
  };
}

/**
 * Deleta dados de teste. Idempotente e resiliente:
 * - Ordem obrigatória: projetos primeiro (FK), depois clientes.
 * - Falhas individuais viram `console.warn` — nunca re-lançam.
 *
 * Property 3: cleanup não mascara falhas do teste.
 * Property 4: ordem de deleção evita erro de FK constraint.
 */
export async function cleanupTestData(
  page: Page,
  data: { projects?: TestProject[]; clients?: TestClient[] },
): Promise<void> {
  for (const project of data.projects ?? []) {
    try {
      await page.request.delete(`/api/projects/${project.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(
        `[cleanup] falhou ao deletar project ${project.id}: ${msg}`,
      );
    }
  }

  for (const client of data.clients ?? []) {
    try {
      await page.request.delete(`/api/clients/${client.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(
        `[cleanup] falhou ao deletar client ${client.id}: ${msg}`,
      );
    }
  }
}
