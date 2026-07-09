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
      updateProfile: vi.fn(),
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
    studioSettings: {
      get: vi.fn(),
      update: vi.fn(),
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
