import { apiUrl, ApiError } from "@/lib/api";

/**
 * Cliente HTTP isolado do Portal do Cliente (spec: portal-do-cliente).
 *
 * Deliberadamente não reaproveita `request()` de `lib/api.ts`: aquele helper
 * dispara `window.dispatchEvent(new CustomEvent("frame:auth-expired"))` em
 * qualquer 401, o que deslogaria a sessão da PRODUTORA se um 401 do portal
 * (sessão de cliente expirada) vazasse para o mesmo listener global. Os dois
 * contextos de auth (produtora vs. cliente) precisam de tratamento de erro
 * totalmente independente.
 */

interface PortalApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function portalRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(apiUrl(path), {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    },
    ...options,
  });

  const contentType = res.headers.get("content-type") || "";
  let json: PortalApiResponse<T> | null = null;
  let text = "";

  if (contentType.includes("application/json")) {
    try {
      json = (await res.json()) as PortalApiResponse<T>;
    } catch {
      json = null;
    }
  } else {
    text = await res.text().catch(() => "");
  }

  if (!res.ok || !json?.success) {
    const fallbackMessage =
      res.status === 429
        ? "Muitas tentativas. Aguarde alguns segundos e tente novamente."
        : text || `Request failed (${res.status})`;
    throw new ApiError(json?.error || fallbackMessage, res.status);
  }
  return json.data as T;
}

export interface PortalClient {
  id: number;
  name: string;
  email: string | null;
  company: string | null;
}

export interface PortalProjectSummary {
  id: number;
  name: string;
  status: string;
  progress: number;
  deadline: string | null;
  createdAt: string;
}

export interface PortalFileSummary {
  id: number;
  originalName: string;
  mimeType: string | null;
  size: number | null;
  projectId: number;
  projectName: string;
  createdAt: string;
}

export interface PortalProposalSummary {
  id: number;
  title: string;
  total: number;
  status: string;
  acceptedAt: string | null;
  createdAt: string;
}

export interface PortalMeetingSummary {
  id: number;
  title: string;
  location: string | null;
  startsAt: string;
  durationMinutes: number;
  status: string;
}

export interface PortalFinancialSummary {
  totalPending: number;
  totalPaid: number;
  currency: string;
}

export const portalApi = {
  auth: {
    login: (email: string, password: string) =>
      portalRequest<{ clientId: number }>("/client-portal-auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    activate: (token: string, password: string) =>
      portalRequest<{ clientId: number }>("/client-portal-auth/activate", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      }),
    logout: () => portalRequest<null>("/client-portal-auth/logout", { method: "POST" }),
    me: () => portalRequest<PortalClient>("/client-portal-auth/me"),
    changePassword: (currentPassword: string, newPassword: string) =>
      portalRequest<null>("/client-portal-auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
  },
  projects: {
    list: () => portalRequest<PortalProjectSummary[]>("/portal/projects"),
    get: (id: number) => portalRequest<PortalProjectSummary>(`/portal/projects/${id}`),
  },
  files: {
    list: () => portalRequest<PortalFileSummary[]>("/portal/files"),
    downloadUrl: (id: number) => apiUrl(`/portal/files/${id}/download`),
  },
  proposals: {
    list: () => portalRequest<PortalProposalSummary[]>("/portal/proposals"),
  },
  meetings: {
    list: () => portalRequest<PortalMeetingSummary[]>("/portal/meetings"),
  },
  financialSummary: () => portalRequest<PortalFinancialSummary>("/portal/financial-summary"),
};
