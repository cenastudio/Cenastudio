import '@testing-library/jest-dom';
import { vi } from 'vitest';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

Object.defineProperty(window, 'localStorage', {
  writable: true,
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
});

HTMLCanvasElement.prototype.getContext = vi.fn();
HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,');
HTMLCanvasElement.prototype.toBlob = vi.fn((cb) => cb(new Blob()));

// Mock ResizeObserver/IntersectionObserver on both `global` and `window`.
// happy-dom keeps its own `window` reference that isn't always the same
// object as `globalThis`, so libraries (like cmdk) reading `window.ResizeObserver`
// would otherwise miss a mock that's only assigned to `global`.
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

global.ResizeObserver = MockResizeObserver as any;
global.IntersectionObserver = MockIntersectionObserver as any;
window.ResizeObserver = MockResizeObserver as any;
window.IntersectionObserver = MockIntersectionObserver as any;

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    dismiss: vi.fn(),
  },
  Toaster: () => null,
}));

vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
  api: {
    auth: {
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      me: vi.fn(),
      providers: vi.fn().mockResolvedValue({ github: false, supabase: false }),
      getUsageMetrics: vi.fn().mockResolvedValue({
        period: '2026-07',
        generations: { used: 0, limit: 100 },
        clients: { used: 0, limit: 15 },
        projectsThisMonth: 0,
        teamMembers: { used: 0, limit: 0 },
        storageBytes: 0,
      }),
      updateProfile: vi.fn(),
      getVisualPreferences: vi.fn().mockResolvedValue({ themeMode: 'dark', density: 'normal', fontFamily: 'inter', reduceAnimations: false }),
      updateVisualPreferences: vi.fn().mockResolvedValue({ message: 'ok' }),
      getBehaviorPreferences: vi.fn().mockResolvedValue({ defaultProjectSort: 'recent', defaultView: 'grid', autoplayVideos: true }),
      updateBehaviorPreferences: vi.fn().mockResolvedValue({ message: 'ok' }),
    },
    tools: {
      list: vi.fn(),
      get: vi.fn(),
    },
    ai: {
      generate: vi.fn(),
      history: vi.fn(),
    },
    projects: {
      list: vi.fn(),
      activity: vi.fn(),
      create: vi.fn(),
      get: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      saveState: vi.fn(),
      getState: vi.fn(),
      populatedStates: vi.fn(),
    },
    clients: {
      list: vi.fn(),
      get: vi.fn(),
      allowance: vi.fn().mockResolvedValue({ planId: 'pro', status: 'trial', used: 0, limit: 50, remaining: 50, canCreate: true }),
      lookupCnpj: vi.fn(),
    },
    checkout: {
      invoices: vi.fn().mockResolvedValue({
        invoices: [],
        upcoming: null,
        totalsByCurrency: {},
        canManageBilling: false,
      }),
      session: vi.fn(),
      syncSession: vi.fn(),
      portal: vi.fn(),
    },
    studioSettings: {
      get: vi.fn(),
      update: vi.fn(),
    },
    budgets: {
      getOverview: vi.fn(),
      updateBaseline: vi.fn(),
      addEntry: vi.fn(),
      deleteEntry: vi.fn(),
    },
    equipment: {
      list: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      checkAvailability: vi.fn(),
      listBookings: vi.fn(),
      createBooking: vi.fn(),
      cancelBooking: vi.fn(),
    },
    shotlists: {
      get: vi.fn(),
      addShot: vi.fn(),
      updateShot: vi.fn(),
      deleteShot: vi.fn(),
      reorder: vi.fn(),
      uploadThumbnail: vi.fn(),
      duplicateShot: vi.fn(),
    },
    shotTypes: {
      list: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      delete: vi.fn(),
    },
    storage: {
      getStats: vi.fn().mockResolvedValue({
        totalUsed: 0,
        quota: 25 * 1024 * 1024 * 1024,
        byType: { images: 0, videos: 0, documents: 0, audio: 0, other: 0 },
        topFiles: [],
        fileCount: 0,
      }),
    },
    timesheets: {
      list: vi.fn(),
      getRunning: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      addManualEntry: vi.fn(),
      deleteEntry: vi.fn(),
      getReport: vi.fn(),
    },
    calendar: {
      projectIcsUrl: vi.fn((projectId: number) => `/api/calendar/project/${projectId}.ics`),
    },
    tasks: {
      listMine: vi.fn(),
      listByProject: vi.fn(),
      listAssignableMembers: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
    demo: {
      check: vi.fn().mockResolvedValue({ exists: false, project: null }),
      create: vi.fn(),
    },
    projectMembers: {
      list: vi.fn(),
      add: vi.fn(),
      updateRole: vi.fn(),
      remove: vi.fn(),
    },
    admin: {
      listTools: vi.fn(),
      updateTool: vi.fn(),
      createTool: vi.fn(),
      deleteTool: vi.fn(),
      users: vi.fn(),
    },
  },
  startCheckout: vi.fn(),
  openBillingPortal: vi.fn(),
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'dark',
    setTheme: vi.fn(),
    toggleTheme: vi.fn(),
  }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));
