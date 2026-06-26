const API_BASE = import.meta.env.VITE_API_URL ?? "";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    },
    ...options,
  });

  const json = (await res.json()) as ApiResponse<T>;
  if (!res.ok || !json.success) {
    throw new ApiError(json.error || `Request failed (${res.status})`, res.status);
  }
  return json.data as T;
}

export interface AuthUser {
  id: number;
  email: string;
  role: "user" | "admin";
  name?: string;
}

export interface UserPlan {
  planId: string;
  planName: string;
  status: string;
  generationLimit: number;
  trialEndsAt: string | null;
  features: string[];
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ user: AuthUser }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    register: (name: string, email: string, password: string) =>
      request<{ user: AuthUser }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      }),
    forgotPassword: (email: string) =>
      request<{ message: string }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),
    resetPassword: (token: string, password: string) =>
      request<{ message: string }>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      }),
    logout: () => request<null>("/auth/logout", { method: "POST" }),
    me: () => request<{ user: AuthUser; plan: UserPlan | null }>("/auth/me"),
    supabase: (accessToken: string) =>
      request<{ user: AuthUser }>("/auth/supabase", {
        method: "POST",
        body: JSON.stringify({ accessToken }),
      }),
  },
  tools: {
    list: () => request<ToolFromApi[]>("/tools"),
    get: (id: string) => request<ToolFromApi>(`/tools/${id}`),
  },
  ai: {
    generate: (toolId: string, input: Record<string, string>, projectId?: number | null) =>
      request<{ output: string; generationId: number }>("/ai/generate", {
        method: "POST",
        body: JSON.stringify({ toolId, input, projectId }),
      }),
    history: (toolId: string) =>
      request<
        Array<{
          id: number;
          toolId: string;
          input: string;
          output: string;
          createdAt: string;
        }>
      >(`/ai/history/${toolId}`),
  },
  projects: {
    list: () => request<Project[]>("/projects"),
    activity: () => request<RecentActivity[]>("/projects/activity"),
    create: (name: string, description?: string, clientId?: number) =>
      request<Project>("/projects", {
        method: "POST",
        body: JSON.stringify({ name, description, clientId }),
      }),
    get: (id: number) => request<Project>(`/projects/${id}`),
    update: (id: number, data: Partial<Omit<Project, "id" | "userId" | "createdAt" | "updatedAt">>) =>
      request<Project>(`/projects/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: number) => request<{ id: number }>(`/projects/${id}`, { method: "DELETE" }),
    saveState: (id: number, toolId: string, formData: Record<string, string>, outputData?: string) =>
      request<{ projectId: number; toolId: string }>(`/projects/${id}/state`, {
        method: "POST",
        body: JSON.stringify({ toolId, formData, outputData }),
      }),
    getState: (id: number, toolId: string) =>
      request<ToolState | null>(`/projects/${id}/state/${toolId}`),
    populatedStates: (id: number) =>
      request<Array<{ toolId: string; updatedAt: string }>>(`/projects/${id}/states`),
  },
  admin: {
    listTools: () => request<ToolFromApi[]>("/admin/tools"),
    updateTool: (id: string, body: Record<string, unknown>) =>
      request<ToolFromApi>(`/admin/tools/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    createTool: (body: Record<string, unknown>) =>
      request<ToolFromApi>("/admin/tools", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    deleteTool: (id: string) =>
      request<{ id: string; isActive: boolean }>(`/admin/tools/${id}`, {
        method: "DELETE",
      }),
    users: () => request<{ count: number; users: { id: number; email: string; role: string; name?: string; plan?: string }[] }>("/admin/users"),
  },
  contact: {
    submit: (data: ContactPayload) =>
      request<{ message: string }>("/contact", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    demo: (data: { name: string; email: string }) =>
      request<{ message: string }>("/contact/demo", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
  checkout: {
    session: (planId: string) =>
      request<{ url: string }>("/checkout/session", {
        method: "POST",
        body: JSON.stringify({ planId }),
      }),
    portal: () =>
      request<{ url: string }>("/checkout/portal", {
        method: "POST",
      }),
  },
};

/** Start Stripe Checkout — redirects to Stripe hosted page */
export async function startCheckout(planId: string): Promise<void> {
  const data = await api.checkout.session(planId);
  window.location.href = data.url;
}

/** Open Stripe Customer Portal */
export async function openBillingPortal(): Promise<void> {
  const data = await api.checkout.portal();
  window.location.href = data.url;
}

export interface ToolFromApi {
  id: string;
  name: string;
  description: string;
  category: string;
  isActive: boolean;
  icon: string;
  tags: string[];
  slug: string;
  processingTime?: string;
  placeholder?: string;
}

export interface ContactPayload {
  name: string;
  email: string;
  phone?: string;
  message: string;
  type?: "contact" | "demo" | "support";
}

export interface Project {
  id: number;
  userId: number;
  name: string;
  description?: string;
  status: "active" | "completed" | "archived";
  metadataJson: string;
  createdAt: string;
  updatedAt: string;
}

export interface ToolState {
  projectId: number;
  toolId: string;
  formData: Record<string, string>;
  outputData: string;
  updatedAt: string;
}

export interface RecentActivity {
  id: number;
  toolId: string;
  createdAt: string;
  projectId: number | null;
  projectName: string | null;
}
