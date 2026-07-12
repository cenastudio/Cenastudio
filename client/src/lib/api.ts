function resolveApiBase() {
  const raw = (import.meta.env.VITE_API_URL ?? "").trim();
  if (!raw) return "";
  if (raw.startsWith("/")) return raw.replace(/\/$/, "");

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(withProtocol).origin;
  } catch {
    return "";
  }
}

const API_BASE = resolveApiBase();

export function apiUrl(path: string) {
  return `${API_BASE}/api${path.startsWith("/") ? path : `/${path}`}`;
}

export function redirectToStripe(url: string) {
  const parsed = new URL(url);
  const trustedHost = parsed.hostname === "stripe.com" || parsed.hostname.endsWith(".stripe.com");
  if (parsed.protocol !== "https:" || !trustedHost) {
    throw new ApiError("O checkout retornou um endereco invalido.", 502);
  }
  window.location.assign(parsed.toString());
}

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
  const res = await fetch(apiUrl(path), {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    },
    ...options,
  });

  const contentType = res.headers.get("content-type") || "";
  let json: ApiResponse<T> | null = null;
  let text = "";

  if (contentType.includes("application/json")) {
    try {
      json = (await res.json()) as ApiResponse<T>;
    } catch {
      json = null;
    }
  } else {
    text = await res.text().catch(() => "");
  }

  if (!res.ok || !json?.success) {
    if (res.status === 401 && path !== "/auth/me") {
      window.dispatchEvent(new CustomEvent("frame:auth-expired"));
    }

    const fallbackMessage =
      res.status === 429
        ? "Muitas tentativas no servidor. Aguarde alguns segundos e tente novamente."
        : text || `Request failed (${res.status})`;

    throw new ApiError(
      res.status === 401
        ? json?.error || "Sessão expirada. Entre novamente para continuar."
        : json?.error || fallbackMessage,
      res.status,
    );
  }
  return json.data as T;
}

export interface AuthUser {
  id: number;
  email: string;
  role: "user" | "admin";
  name?: string;
  studioName?: string;
  studioRole?: string;
  phone?: string;
  mustResetPassword?: boolean;
}

export interface UserPlan {
  planId: string;
  planName: string;
  status: string;
  generationLimit: number;
  trialEndsAt: string | null;
  features: string[];
}

export interface ClientAllowance {
  planId: "free" | "pro" | "studio";
  status: string;
  used: number;
  limit: number | null;
  remaining: number | null;
  canCreate: boolean;
}

export interface StudioSettingsPayload {
  studioName: string;
  legalName: string;
  document: string;
  email: string;
  phone: string;
  city: string;
  website: string;
  signature: string;
  primaryColor: string;
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ user: AuthUser }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    register: (name: string, email: string, password: string, desiredPlan?: "pro" | "studio") =>
      request<{ user: AuthUser }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password, desiredPlan }),
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
    updateProfile: (data: { name: string; studioName: string; studioRole: string; phone: string }) =>
      request<{ user: AuthUser }>("/auth/profile", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    changePassword: (currentPassword: string, newPassword: string) =>
      request<{ message: string }>("/auth/change-password", {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
    exportData: () =>
      fetch(apiUrl("/auth/export-data"), { credentials: "include" }),
    supabase: (accessToken: string) =>
      request<{ user: AuthUser; plan: UserPlan | null }>("/auth/supabase", {
        method: "POST",
        body: JSON.stringify({ accessToken }),
      }),
    providers: () => request<{ github: boolean; supabase: boolean }>("/auth/providers"),
  },
  tools: {
    list: () => request<ToolFromApi[]>("/tools"),
    get: (id: string) => request<ToolFromApi>(`/tools/${id}`),
  },
  clients: {
    list: () => request<Client[]>("/clients"),
    get: (id: number) => request<ClientDetails>(`/clients/${id}`),
    allowance: () => request<ClientAllowance>("/clients/allowance"),
    lookupCnpj: (cnpj: string) => request<CnpjCompanyData>(`/clients/lookup/cnpj/${encodeURIComponent(cnpj)}`),
  },
  meetings: {
    list: (clientId?: number) =>
      request<MeetingItem[]>(`/clients/meetings${clientId ? `?clientId=${clientId}` : ""}`),
    create: (data: {
      clientId: number;
      opportunityId?: number;
      title: string;
      location?: string;
      startsAt: string;
      durationMinutes?: number;
      notes?: string;
    }) =>
      request<MeetingCreatedResponse>("/clients/meetings", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    delete: (id: number) => request<{ id: number }>(`/clients/meetings/${id}`, { method: "DELETE" }),
  },
  proposals: {
    list: (clientId?: number) =>
      request<ProposalItem[]>(`/clients/proposals${clientId ? `?clientId=${clientId}` : ""}`),
    create: (data: { clientId: number; title: string; html: string; total: number }) =>
      request<ProposalCreatedResponse>("/clients/proposals", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    delete: (id: number) => request<{ id: number }>(`/clients/proposals/${id}`, { method: "DELETE" }),
  },
  ai: {
    generate: (toolId: string, input: Record<string, string>, projectId?: number | null, model?: string) =>
      request<{ output: string; generationId: number }>("/ai/generate", {
        method: "POST",
        body: JSON.stringify({ toolId, input, projectId, model }),
      }),
    history: (toolId: string, projectId?: number | null) =>
      request<
        Array<{
          id: number;
          toolId: string;
          input: string;
          output: string;
          createdAt: string;
          projectId?: number | null;
          projectName?: string | null;
        }>
      >(`/ai/history/${toolId}${projectId ? `?projectId=${projectId}` : ""}`),
  },
  projects: {
    list: () => request<Project[]>("/projects"),
    activity: () => request<RecentActivity[]>("/projects/activity"),
    create: (name: string, description?: string, clientId?: number, metadataJson?: string) =>
      request<Project>("/projects", {
        method: "POST",
        body: JSON.stringify({ name, description, clientId, metadataJson }),
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
  sessions: {
    list: () =>
      request<
        Array<{ id: number; deviceLabel: string; ipAddress: string | null; lastActiveAt: string; createdAt: string; current: boolean }>
      >("/sessions"),
    revoke: (id: number) => request<null>(`/sessions/${id}`, { method: "DELETE" }),
    revokeOthers: () => request<{ revokedCount: number }>("/sessions/revoke-others", { method: "POST" }),
  },
  webhooks: {
    listEvents: () => request<Array<{ id: string; label: string }>>("/webhooks/events"),
    list: () =>
      request<
        Array<{
          id: number;
          url: string;
          label: string;
          events: string[];
          active: boolean;
          lastStatus: number | null;
          lastFiredAt: string | null;
          createdAt: string;
        }>
      >("/webhooks"),
    create: (data: { url: string; label: string; events: string[] }) =>
      request<{
        id: number;
        url: string;
        label: string;
        events: string[];
        active: boolean;
        lastStatus: number | null;
        lastFiredAt: string | null;
        createdAt: string;
        secret: string;
      }>("/webhooks", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: { url?: string; label?: string; events?: string[]; active?: boolean }) =>
      request<null>(`/webhooks/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: number) => request<null>(`/webhooks/${id}`, { method: "DELETE" }),
    test: (id: number) =>
      request<{ success: boolean; statusCode: number | null; error: string | null }>(`/webhooks/${id}/test`, {
        method: "POST",
      }),
    deliveries: (id: number) =>
      request<
        Array<{
          id: number;
          event: string;
          statusCode: number | null;
          success: boolean;
          error: string | null;
          attempt: number;
          createdAt: string;
        }>
      >(`/webhooks/${id}/deliveries`),
  },
  budgets: {
    getOverview: (projectId: number) =>
      request<BudgetOverview>(`/budgets/${projectId}`),
    updateBaseline: (
      projectId: number,
      data: { totalAmount: number; currency: string; categories: Array<{ name: string; budgeted: number }> },
    ) =>
      request<{ id: number; total_amount: number; currency: string; categories: unknown }>(`/budgets/${projectId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    addEntry: (
      projectId: number,
      data: { category: string; description: string; amount: number; entryDate: string; receiptUrl?: string | null },
    ) =>
      request<BudgetEntryItem>(`/budgets/${projectId}/entries`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    deleteEntry: (id: number) => request<null>(`/budgets/entries/${id}`, { method: "DELETE" }),
  },
  equipment: {
    list: () => request<EquipmentItem[]>("/equipment"),
    create: (data: {
      name: string;
      category: string;
      specs?: Record<string, string | number | boolean>;
      costPerDay?: number | null;
      isOwned?: boolean;
    }) => request<EquipmentItem>("/equipment", { method: "POST", body: JSON.stringify(data) }),
    update: (
      id: number,
      data: Partial<{
        name: string;
        category: string;
        specs: Record<string, string | number | boolean>;
        status: string;
        costPerDay: number | null;
        isOwned: boolean;
      }>,
    ) => request<EquipmentItem>(`/equipment/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: number) => request<null>(`/equipment/${id}`, { method: "DELETE" }),
    checkAvailability: (id: number, start: string, end: string) =>
      request<{ available: boolean }>(`/equipment/${id}/availability?start=${start}&end=${end}`),
    listBookings: (id: number) => request<EquipmentBookingItem[]>(`/equipment/${id}/bookings`),
    createBooking: (id: number, data: { projectId: number; startDate: string; endDate: string }) =>
      request<EquipmentBookingItem>(`/equipment/${id}/bookings`, { method: "POST", body: JSON.stringify(data) }),
    cancelBooking: (bookingId: number) => request<null>(`/equipment/bookings/${bookingId}`, { method: "DELETE" }),
  },
  shotlists: {
    get: (projectId: number) =>
      request<{ shotList: ShotListItem; shots: ShotItem[] }>(`/shotlists/${projectId}`),
    addShot: (
      projectId: number,
      data: {
        scene?: string;
        shotType?: string;
        description?: string;
        camera?: string;
        lens?: string;
        movement?: string;
        durationSec?: number | null;
      },
    ) => request<ShotItem>(`/shotlists/${projectId}/shots`, { method: "POST", body: JSON.stringify(data) }),
    updateShot: (
      shotId: number,
      data: Partial<{
        scene: string;
        shotType: string;
        description: string;
        camera: string;
        lens: string;
        movement: string;
        durationSec: number | null;
        status: "pending" | "shot";
      }>,
    ) => request<ShotItem>(`/shotlists/shots/${shotId}`, { method: "PATCH", body: JSON.stringify(data) }),
    deleteShot: (shotId: number) => request<null>(`/shotlists/shots/${shotId}`, { method: "DELETE" }),
    reorder: (projectId: number, orderedIds: number[]) =>
      request<ShotItem[]>(`/shotlists/${projectId}/reorder`, { method: "PUT", body: JSON.stringify({ orderedIds }) }),
  },
  timesheets: {
    list: (filters?: { projectId?: number; from?: string; to?: string }) => {
      const params = new URLSearchParams();
      if (filters?.projectId) params.set("projectId", String(filters.projectId));
      if (filters?.from) params.set("from", filters.from);
      if (filters?.to) params.set("to", filters.to);
      const qs = params.toString();
      return request<{ entries: TimeEntryItem[]; totals: { totalDurationSec: number; totalCost: number } }>(
        `/timesheets${qs ? `?${qs}` : ""}`,
      );
    },
    getRunning: () => request<TimeEntryItem | null>("/timesheets/running"),
    start: (data: { projectId?: number | null; description?: string }) =>
      request<TimeEntryItem>("/timesheets/start", { method: "POST", body: JSON.stringify(data) }),
    stop: (id: number, hourlyRate?: number | null) =>
      request<TimeEntryItem>(`/timesheets/${id}/stop`, { method: "POST", body: JSON.stringify({ hourlyRate }) }),
    addManualEntry: (data: {
      projectId?: number | null;
      description?: string;
      startedAt: string;
      endedAt: string;
      hourlyRate?: number | null;
    }) => request<TimeEntryItem>("/timesheets", { method: "POST", body: JSON.stringify(data) }),
    deleteEntry: (id: number) => request<null>(`/timesheets/${id}`, { method: "DELETE" }),
    getReport: () =>
      request<Array<{ projectId: number | null; totalDurationSec: number; totalCost: number }>>("/timesheets/report"),
  },
  calendar: {
    projectIcsUrl: (projectId: number) => apiUrl(`/calendar/project/${projectId}.ics`),
  },
  tasks: {
    listMine: () => request<TaskItem[]>("/tasks/mine"),
    listByProject: (projectId: number) => request<TaskItem[]>(`/tasks/projects/${projectId}`),
    listAssignableMembers: (projectId: number) =>
      request<Array<{ id: number; name: string; email: string }>>(`/tasks/projects/${projectId}/assignable-members`),
    create: (
      projectId: number,
      data: {
        title: string;
        description?: string | null;
        assigneeUserId: number;
        dueDate?: string | null;
        stageId?: string | null;
        toolSlug?: string | null;
      },
    ) => request<TaskItem>(`/tasks/projects/${projectId}`, { method: "POST", body: JSON.stringify(data) }),
    update: (
      id: number,
      data: Partial<{
        title: string;
        description: string | null;
        dueDate: string | null;
        status: "pending" | "in_progress" | "done";
        assigneeUserId: number;
      }>,
    ) => request<TaskItem>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    remove: (id: number) => request<null>(`/tasks/${id}`, { method: "DELETE" }),
  },
  assets: {
    list: () =>
      request<
        Array<{
          id: number;
          project_id: number | null;
          project_name: string | null;
          filename: string;
          original_name: string;
          mime_type: string | null;
          size: number | null;
          path: string;
          created_at: string;
        }>
      >("/files/all"),
    download: (id: number) => apiUrl(`/files/${id}/download`),
    delete: (id: number) => request<{ success: boolean }>(`/files/${id}`, { method: "DELETE" }),
  },
  studioSettings: {
    get: () => request<StudioSettingsPayload>("/studio-settings"),
    update: (data: StudioSettingsPayload) =>
      request<StudioSettingsPayload>("/studio-settings", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
  },
  dashboard: {
    stats: () =>
      request<{
        activeJobs: number;
        clientsWaiting: number;
        reviewsPending: number;
      }>("/dashboard/stats"),
    financeStrip: () =>
      request<{
        monthlyRevenue: number;
        jobsCompleted: number;
      }>("/dashboard/finance-strip"),
    userInfo: () =>
      request<{
        name: string;
      }>("/dashboard/user-info"),
    jobsActive: () =>
      request<
        Array<{
          id: string;
          title: string;
          client: string;
          status: "briefing" | "production" | "review" | "delivered";
          deadline: string;
          daysLeft: number;
          progress: number;
          urgent?: boolean;
        }>
      >("/dashboard/jobs/active"),
  },
  checklist: {
    list: (status?: "completed" | "pending" | "all") =>
      request<
        Array<{
          id: string;
          text: string;
          checked: boolean;
          link?: string;
        }>
      >(`/checklist${status ? `?status=${status}` : ""}`),
    create: (data: { text: string; link?: string }) =>
      request<{
        id: string;
        text: string;
        checked: boolean;
        link?: string;
      }>("/checklist", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (
      id: string,
      data: { text?: string; checked?: boolean; link?: string | null }
    ) =>
      request<{
        id: string;
        text: string;
        checked: boolean;
        link?: string;
      }>(`/checklist/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ id: string }>(`/checklist/${id}`, {
        method: "DELETE",
      }),
  },
  commercial: {
    dashboard: () =>
      request<{
        totalRevenue: number;
        monthlyRevenue: number;
        conversionRate: number;
        pipelineValue: number;
        averageTicket: number;
        activeDeals: number;
        wonDeals: number;
        lostDeals: number;
      }>("/commercial/dashboard"),
    metrics: () =>
      request<{
        winRate: number;
        avgCloseTime: number;
        stageTickets: Record<string, { count: number; totalValue: number; avgTicket: number }>;
        pipelineVelocity: number;
        velocityChange: number;
        totalOpportunities: number;
        wonOpportunities: number;
        lostOpportunities: number;
      }>("/commercial/metrics"),
    revenue: () =>
      request<Array<{ month: string; revenue: number }>>("/commercial/revenue"),
    funnel: () =>
      request<Array<{ stage: string; count: number; value: number }>>("/commercial/funnel"),
    forecast: () =>
      request<{
        historical: Array<{ month: string; revenue: number; isForecast: boolean }>;
        forecast: Array<{ month: string; revenue: number; isForecast: boolean }>;
        metrics: {
          avgRevenue: number;
          recentTrend: number;
          growthRate: string;
          confidence: string;
        };
      }>("/commercial/forecast"),
    comparison: () =>
      request<{
        revenue: { current: number; previous: number; change: string; isPositive: boolean };
        conversionRate: { current: number; previous: number; change: string; isPositive: boolean };
        pipelineValue: { current: number; previous: number; change: string; isPositive: boolean };
        activeDeals: { current: number; previous: number; change: string; isPositive: boolean };
      }>("/commercial/comparison"),
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
    users: () => request<{ count: number; users: { id: number; email: string; role: string; name?: string; plan_name?: string; generation_limit?: number | null; project_count?: number; file_count?: number; review_count?: number }[] }>("/admin/users"),
    createUser: (body: { name: string; email: string; password: string; role: "user" | "admin"; planId: "free" | "pro" | "studio" }) =>
      request<{ id: number; email: string; role: string; planId: string }>("/admin/users", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    updateUserRole: (id: number, role: "user" | "admin") =>
      request<{ id: number; role: string }>(`/admin/users/${id}/role`, {
        method: "PUT",
        body: JSON.stringify({ role }),
      }),
    updateUserPlan: (id: number, planId: "free" | "pro" | "studio") =>
      request<{ id: number; planId: string }>(`/admin/users/${id}/plan`, {
        method: "PUT",
        body: JSON.stringify({ planId }),
      }),
    deleteUser: (id: number) =>
      request<{ id: number; email: string; deleted: boolean; summary: Record<string, number> }>(`/admin/users/${id}`, {
        method: "DELETE",
      }),
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
    syncSession: (sessionId: string) =>
      request<{ synced: boolean; status: string | null; paymentStatus: string | null; planId: string }>(
        "/checkout/sync-session",
        {
          method: "POST",
          body: JSON.stringify({ sessionId }),
        },
      ),
    portal: () =>
      request<{ url: string }>("/checkout/portal", {
        method: "POST",
      }),
  },
  demo: {
    check: () =>
      request<{
        exists: boolean;
        project: {
          id: number;
          name: string;
          description: string;
          status: string;
        } | null;
      }>("/demo/check"),
    create: () =>
      request<{
        message: string;
        data: {
          client: { id: number; name: string; company: string };
          project: { id: number; name: string; description: string };
        };
      }>("/demo/create", {
        method: "POST",
      }),
  },
  team: {
    context: () =>
      request<{
        isTeamMember: boolean;
        ownerUserId: number | null;
        workspaceId: number | null;
        role: string | null;
      }>("/team/context"),
    list: () =>
      request<
        Array<{
          id: number;
          userId: number;
          name: string;
          email: string;
          role: string;
          status: string;
          createdAt: string;
        }>
      >("/team"),
    create: (data: { name: string; email: string; password: string; role: string }) =>
      request<{
        id: number;
        userId: number;
        name: string;
        email: string;
        role: string;
        status: string;
      }>("/team", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: number, data: { role?: string; status?: string }) =>
      request<{
        id: number;
        userId: number;
        name: string;
        email: string;
        role: string;
        status: string;
      }>(`/team/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    remove: (id: number) =>
      request<{ message: string }>(`/team/${id}`, {
        method: "DELETE",
      }),
  },
};

/** Start Stripe Checkout — redirects to Stripe hosted page */
export async function startCheckout(planId: string): Promise<void> {
  const data = await api.checkout.session(planId);
  redirectToStripe(data.url);
}

/** Open Stripe Customer Portal */
export async function openBillingPortal(): Promise<void> {
  const data = await api.checkout.portal();
  redirectToStripe(data.url);
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
  clientId?: number | null;
  clientName?: string | null;
  name: string;
  description?: string;
  status: "active" | "completed" | "archived";
  metadataJson: string;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: number;
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  tax_id?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  industry?: string | null;
}

export interface ClientDetails {
  client: Client;
  projects: Project[];
  opportunities: unknown[];
  interactions: unknown[];
}

export interface MeetingItem {
  id: number;
  client_id: number;
  opportunity_id?: number | null;
  title: string;
  location?: string | null;
  starts_at: string;
  duration_minutes: number;
  notes?: string | null;
  status: string;
  share_token: string;
  email_sent_at?: string | null;
  email_error?: string | null;
  client_name?: string;
  client_email?: string | null;
  client_phone?: string | null;
  created_at: string;
}

export interface MeetingCreatedResponse extends MeetingItem {
  meeting_url: string;
  whatsapp_url: string;
  email_available: boolean;
  email_configured: boolean;
}

export interface ProposalItem {
  id: number;
  client_id: number;
  title: string;
  total: number;
  status: "sent" | "viewed" | "accepted" | "rejected";
  share_token: string;
  document_hash: string;
  accepted_at?: string | null;
  accepted_by_name?: string | null;
  client_name?: string;
  client_email?: string | null;
  created_at: string;
}

export interface ProposalCreatedResponse extends ProposalItem {
  proposal_url: string;
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

export interface BudgetCategoryOverview {
  name: string;
  budgeted: number;
  spent: number;
  pct: number;
}

export interface BudgetAlert {
  category: string;
  level: "warn" | "over";
}

export interface BudgetOverview {
  budgetId: number;
  totalBudgeted: number;
  totalSpent: number;
  currency: string;
  byCategory: BudgetCategoryOverview[];
  alerts: BudgetAlert[];
}

export interface BudgetEntryItem {
  id: number;
  budget_id: number;
  category: string;
  description: string;
  amount: number;
  entry_date: string;
  receipt_url: string | null;
  created_at: string;
}

export interface EquipmentItem {
  id: number;
  user_id: number;
  name: string;
  category: string;
  specs: Record<string, string | number | boolean>;
  status: "available" | "in_use" | "maintenance" | "rented" | string;
  cost_per_day: number | null;
  is_owned: boolean;
  created_at: string;
  updated_at: string;
}

export interface EquipmentBookingItem {
  id: number;
  equipment_id: number;
  project_id: number;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
}

export interface ShotListItem {
  id: number;
  user_id: number;
  project_id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ShotItem {
  id: number;
  shot_list_id: number;
  order_index: number;
  scene: string;
  shot_type: string;
  description: string;
  camera: string;
  lens: string;
  movement: string;
  duration_sec: number | null;
  status: "pending" | "shot" | string;
  created_at: string;
}

export interface TimeEntryItem {
  id: number;
  user_id: number;
  project_id: number | null;
  description: string;
  started_at: string;
  ended_at: string | null;
  duration_sec: number;
  hourly_rate: number | null;
  created_at: string;
}

export interface TaskItem {
  id: number;
  project_id: number;
  assignee_user_id: number;
  created_by_user_id: number;
  title: string;
  description: string | null;
  due_date: string | null;
  status: "pending" | "in_progress" | "done";
  stage_id: string | null;
  tool_slug: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  assignee_name?: string;
  assignee_email?: string;
  project_name?: string;
}
