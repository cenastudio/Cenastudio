import { AppError } from "../middleware/errorHandler.js";

const RECEITA_WS_BASE_URL = "https://receitaws.com.br/v1/cnpj";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface ReceitaWsActivity {
  code?: string;
  text?: string;
}

interface ReceitaWsResponse {
  status?: string;
  message?: string;
  nome?: string;
  fantasia?: string;
  email?: string;
  telefone?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  cep?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  porte?: string;
  situacao?: string;
  natureza_juridica?: string;
  capital_social?: string;
  ultima_atualizacao?: string;
  atividade_principal?: ReceitaWsActivity[];
}

export interface CnpjCompanyData {
  cnpj: string;
  legalName: string;
  tradeName: string;
  email: string;
  phone: string;
  address: string;
  postalCode: string;
  district: string;
  city: string;
  state: string;
  country: string;
  industry: string;
  companySize: string;
  status: string;
  legalNature: string;
  shareCapital: string;
  updatedAt: string;
}

const cache = new Map<string, { expiresAt: number; data: CnpjCompanyData }>();

export function normalizeCnpj(value: string) {
  return value.replace(/\D/g, "");
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function buildAddress(data: ReceitaWsResponse) {
  const street = clean(data.logradouro);
  const number = clean(data.numero);
  const complement = clean(data.complemento);
  return [street, number].filter(Boolean).join(", ") + (complement ? ` - ${complement}` : "");
}

export function mapReceitaWsResponse(cnpj: string, data: ReceitaWsResponse): CnpjCompanyData {
  return {
    cnpj,
    legalName: clean(data.nome),
    tradeName: clean(data.fantasia),
    email: clean(data.email).toLowerCase(),
    phone: clean(data.telefone),
    address: buildAddress(data),
    postalCode: clean(data.cep),
    district: clean(data.bairro),
    city: clean(data.municipio),
    state: clean(data.uf),
    country: "Brasil",
    industry: clean(data.atividade_principal?.[0]?.text),
    companySize: clean(data.porte),
    status: clean(data.situacao),
    legalNature: clean(data.natureza_juridica),
    shareCapital: clean(data.capital_social),
    updatedAt: clean(data.ultima_atualizacao),
  };
}

export async function lookupCnpj(rawCnpj: string): Promise<CnpjCompanyData> {
  const cnpj = normalizeCnpj(rawCnpj);
  if (cnpj.length !== 14) {
    throw new AppError("Informe um CNPJ válido com 14 dígitos.", 400);
  }

  const cached = cache.get(cnpj);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  let response: Response;
  try {
    response = await fetch(`${RECEITA_WS_BASE_URL}/${cnpj}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    throw new AppError("A consulta de CNPJ está temporariamente indisponível.", 503);
  }

  if (response.status === 429) {
    throw new AppError("Limite da ReceitaWS atingido. Aguarde um minuto e tente novamente.", 429);
  }
  if (response.status === 504) {
    throw new AppError("Este CNPJ não está disponível no cache público da ReceitaWS.", 504);
  }
  if (!response.ok) {
    throw new AppError("Não foi possível consultar este CNPJ agora.", 502);
  }

  const payload = (await response.json()) as ReceitaWsResponse;
  if (payload.status === "ERROR") {
    throw new AppError(clean(payload.message) || "CNPJ não encontrado.", 404);
  }

  const data = mapReceitaWsResponse(cnpj, payload);
  if (!data.legalName) throw new AppError("A consulta não retornou os dados da empresa.", 502);

  cache.set(cnpj, { expiresAt: Date.now() + CACHE_TTL_MS, data });
  return data;
}
