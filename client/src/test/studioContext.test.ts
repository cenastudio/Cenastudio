import { describe, expect, it } from "vitest";
import {
  buildDocumentPrefill,
  buildStudioLinkedContext,
  countFillableFields,
  mergeStudioPrefill,
} from "@/lib/studioContext";
import type { Client, Project } from "@/lib/api";

const project: Project = {
  id: 7,
  userId: 1,
  clientId: 12,
  clientName: "Cliente antigo",
  name: "Campanha Aurora",
  description: "Filme principal com recortes verticais",
  status: "active",
  metadataJson: JSON.stringify({
    creativeGoals: {
      format: "16:9 e 9:16",
      client: "Marca Aurora",
      tone: "Documental e humano",
      cameraModel: "Sony FX3",
      budget: "R$ 28.000",
    },
  }),
  createdAt: "2026-06-30T12:00:00.000Z",
  updatedAt: "2026-06-30T12:00:00.000Z",
};

const client: Client = {
  id: 12,
  name: "Ana Cliente",
  company: "Aurora Filmes",
  email: "ana@example.com",
  phone: "11999999999",
  tax_id: "12.345.678/0001-90",
  address: "Rua Central, 100",
  city: "Sao Paulo",
  state: "SP",
  country: "BR",
  industry: "Tecnologia",
};

describe("studio linked context", () => {
  it("prefills proposal with client and commercial scope without writing producer fields", () => {
    const context = buildStudioLinkedContext("proposta", project, client);

    expect(context?.prefill).toMatchObject({
      cliente: "Aurora Filmes",
      escopo: "Filme principal com recortes verticais",
      valor: "R$ 28.000",
      tom: "Documental e humano",
    });
    expect(context?.prefill).not.toHaveProperty("empresa");
    expect(context?.prefill).not.toHaveProperty("nome");
  });

  it("merges only empty fields by default", () => {
    const prefill = { cliente: "Aurora Filmes", escopo: "Escopo do projeto", valor: "R$ 28.000" };
    const result = mergeStudioPrefill({ cliente: "Cliente manual", escopo: "" }, prefill);

    expect(result.applied).toBe(2);
    expect(result.merged).toEqual({
      cliente: "Cliente manual",
      escopo: "Escopo do projeto",
      valor: "R$ 28.000",
    });
    expect(countFillableFields({ cliente: "Cliente manual", escopo: "" }, prefill)).toBe(2);
  });

  it("builds document context from project metadata and client details", () => {
    expect(buildDocumentPrefill(project, client)).toMatchObject({
      title: "Campanha Aurora",
      project: "Campanha Aurora",
      client: "Aurora Filmes",
      objective: "Filme principal com recortes verticais",
      format: "16:9 e 9:16",
      budget: "R$ 28.000",
      location: "Rua Central, 100 - Sao Paulo / SP",
      notes: "Documental e humano",
    });
  });
});
