import { describe, expect, it } from "vitest";
import { mapReceitaWsResponse, normalizeCnpj } from "./cnpjService";

describe("cnpjService", () => {
  it("normalizes formatted CNPJ values", () => {
    expect(normalizeCnpj("11.378.117/0001-20")).toBe("11378117000120");
  });

  it("maps ReceitaWS data to the client form contract", () => {
    expect(mapReceitaWsResponse("11378117000120", {
      nome: "LEADS2B S/A",
      fantasia: "LEADS2B.COM",
      email: " CONTATO@EXEMPLO.COM ",
      telefone: "(41) 0000-0000",
      logradouro: "Rua Exemplo",
      numero: "10",
      complemento: "Sala 2",
      municipio: "Curitiba",
      uf: "PR",
      porte: "DEMAIS",
      situacao: "ATIVA",
      atividade_principal: [{ text: "Tratamento de dados" }],
    })).toMatchObject({
      cnpj: "11378117000120",
      legalName: "LEADS2B S/A",
      tradeName: "LEADS2B.COM",
      email: "contato@exemplo.com",
      address: "Rua Exemplo, 10 - Sala 2",
      city: "Curitiba",
      state: "PR",
      country: "Brasil",
      industry: "Tratamento de dados",
      companySize: "DEMAIS",
      status: "ATIVA",
    });
  });
});
