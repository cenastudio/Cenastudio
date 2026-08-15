import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import AppNavBar from '@/components/AppNavBar';
import { AuthProvider } from '@/contexts/AuthContext';
import { AppProvider } from '@/contexts/AppContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { VisualPreferencesProvider } from '@/contexts/VisualPreferencesContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ProjectProvider } from '@/contexts/ProjectContext';
import { api } from '@/lib/api';

// The theme toggle button only renders inside the logged-in user's avatar
// dropdown, so every test needs an authenticated user for AuthProvider to
// pick up via api.auth.me().
const mockUser = { id: 1, name: 'Test User', email: 'test@example.com' };

// Mock wouter for navigation
const mockSetLocation = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/dashboard', mockSetLocation],
  Router: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    button: ({ children, onClick, className, style, ...props }: any) => (
      <button onClick={onClick} className={className} style={style} {...props}>
        {children}
      </button>
    ),
    div: ({ children, onClick, className, ...props }: any) => (
      <div onClick={onClick} className={className} {...props}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const AllProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <LanguageProvider>
      <AuthProvider>
        <VisualPreferencesProvider>
          <ThemeProvider defaultTheme="dark" switchable={true}>
            <AppProvider>
              <ProjectProvider>{children}</ProjectProvider>
            </AppProvider>
          </ThemeProvider>
        </VisualPreferencesProvider>
      </AuthProvider>
    </LanguageProvider>
  );
};

describe('Theme Toggle Integration - Task 1.2.4', () => {
  beforeEach(() => {
    // The global test setup mocks `window.localStorage` with no-op vi.fn()
    // methods (getItem always returns undefined, setItem doesn't persist).
    // This suite specifically tests real localStorage persistence, so we
    // replace it with a working in-memory implementation for these tests.
    const store = new Map<string, string>();
    Object.defineProperty(window, 'localStorage', {
      writable: true,
      configurable: true,
      value: {
        getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
        setItem: (key: string, value: string) => store.set(key, value),
        removeItem: (key: string) => store.delete(key),
        clear: () => store.clear(),
      },
    });

    // Clear localStorage before each test
    localStorage.clear();

    // Reset document attributes
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.classList.remove('dark');

    // Mock fetch for profile API
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
    ) as any;

    // Simulate an authenticated user so AuthProvider exposes `user`, which
    // is required for AppNavBar to render the avatar dropdown containing
    // the theme toggle button.
    (api.auth.me as any).mockResolvedValue({ user: mockUser, plan: null });
    (api.auth.getVisualPreferences as any).mockResolvedValue({ themeMode: 'dark', density: 'normal', fontFamily: 'inter', reduceAnimations: false });
    (api.auth.updateVisualPreferences as any).mockResolvedValue({ message: 'ok' });
    // ProjectProvider loads projects once authenticated; without a resolved
    // array, `projects` becomes undefined and AppNavBar's `.find()` throws.
    (api.projects.list as any).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('AC1: Theme toggle button present in TopNav', () => {
    it('should render theme toggle button in AppNavBar', async () => {
      render(
        <AllProviders>
          <AppNavBar />
        </AllProviders>
      );

      const themeButton = await screen.findByTitle(/modo/i);
      expect(themeButton).toBeInTheDocument();
    });
  });

  describe('AC2: Clicking toggles between light and dark themes', () => {
    it('should toggle from dark to light theme', async () => {
      render(
        <AllProviders>
          <AppNavBar />
        </AllProviders>
      );

      // Initial state: dark theme shows Sun icon
      const themeButton = await screen.findByTitle(/modo escuro/i);

      // Click to toggle
      fireEvent.click(themeButton);

      // Should now show dark mode title (Moon icon)
      await waitFor(() => {
        expect(screen.getByTitle(/modo claro/i)).toBeInTheDocument();
      });
    });

    it('should toggle back to dark theme when clicked again', async () => {
      render(
        <AllProviders>
          <AppNavBar />
        </AllProviders>
      );

      const themeButton = await screen.findByTitle(/modo/i);

      // Click to light mode
      fireEvent.click(themeButton);
      await waitFor(() => {
        expect(screen.getByTitle(/modo claro/i)).toBeInTheDocument();
      });

      // Click to dark mode
      const updatedButton = await screen.findByTitle(/modo/i);
      fireEvent.click(updatedButton);
      await waitFor(() => {
        expect(screen.getByTitle(/modo escuro/i)).toBeInTheDocument();
      });
    });
  });

  describe('AC3: Document root data-theme attribute updates', () => {
    it('should set data-theme="dark" on document root initially', () => {
      render(
        <AllProviders>
          <AppNavBar />
        </AllProviders>
      );

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should update data-theme attribute when toggling theme', async () => {
      render(
        <AllProviders>
          <AppNavBar />
        </AllProviders>
      );

      const themeButton = await screen.findByTitle(/modo/i);

      // Toggle to light
      fireEvent.click(themeButton);

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      });

      // Toggle back to dark
      fireEvent.click(themeButton);

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      });
    });
  });

  describe('AC4: All glass components update colors', () => {
    it('should maintain dark class on root element for Tailwind compatibility', () => {
      render(
        <AllProviders>
          <AppNavBar />
        </AllProviders>
      );

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should remove dark class when switching to light mode', async () => {
      render(
        <AllProviders>
          <AppNavBar />
        </AllProviders>
      );

      const themeButton = await screen.findByTitle(/modo/i);
      fireEvent.click(themeButton);

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(false);
      });
    });
  });

  describe('AC5: Theme preference saves to user profile', () => {
    it('should call the visual preferences API when toggling', async () => {
      const updateSpy = vi.spyOn(api.auth, 'updateVisualPreferences');

      render(
        <AllProviders>
          <AppNavBar />
        </AllProviders>
      );

      const themeButton = await screen.findByTitle(/modo/i);
      fireEvent.click(themeButton);

      await waitFor(() => {
        expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ themeMode: 'light' }));
      });
    });

    it('should restore the previous theme if the API call fails', async () => {
      (api.auth.updateVisualPreferences as any).mockRejectedValueOnce(new Error('API Error'));

      render(
        <AllProviders>
          <AppNavBar />
        </AllProviders>
      );

      const themeButton = await screen.findByTitle(/modo/i);
      fireEvent.click(themeButton);

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      });
    });

    it('keeps a newly selected theme when the initial preferences request resolves late', async () => {
      let resolvePreferences: ((preferences: {
        themeMode: 'dark';
        density: 'normal';
        fontFamily: 'inter';
        reduceAnimations: false;
      }) => void) | undefined;
      (api.auth.getVisualPreferences as any).mockImplementationOnce(
        () => new Promise((resolve) => {
          resolvePreferences = resolve;
        }),
      );

      render(
        <AllProviders>
          <AppNavBar />
        </AllProviders>
      );

      const themeButton = await screen.findByTitle(/modo escuro/i);
      await waitFor(() => expect(api.auth.getVisualPreferences).toHaveBeenCalled());
      fireEvent.click(themeButton);
      expect(resolvePreferences).toBeDefined();
      await act(async () => {
        resolvePreferences?.({ themeMode: 'dark', density: 'normal', fontFamily: 'inter', reduceAnimations: false });
        await Promise.resolve();
      });

      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });
  });

  describe('AC6: Theme persists across browser sessions', () => {
    it('should save theme to localStorage', async () => {
      render(
        <AllProviders>
          <AppNavBar />
        </AllProviders>
      );

      const themeButton = await screen.findByTitle(/modo/i);
      fireEvent.click(themeButton);

      await waitFor(() => {
        expect(localStorage.getItem('theme')).toBe('light');
      });
    });

    it('should load theme from localStorage on mount', () => {
      // Set localStorage before rendering
      localStorage.setItem('theme', 'light');

      render(
        <AllProviders>
          <AppNavBar />
        </AllProviders>
      );

      // Should initialize with light theme from localStorage
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('AC7: Icon changes - Sun (light mode) ↔ Moon (dark mode)', () => {
    it('should show Sun icon in dark mode (to switch to light)', async () => {
      render(
        <AllProviders>
          <AppNavBar />
        </AllProviders>
      );

      // In dark mode, button should have title indicating it switches to light
      const themeButton = await screen.findByTitle(/modo escuro/i);
      expect(themeButton).toBeInTheDocument();
    });

    it('should show Moon icon in light mode (to switch to dark)', async () => {
      // Start with light theme locally and on the authenticated profile.
      localStorage.setItem('theme', 'light');
      (api.auth.getVisualPreferences as any).mockResolvedValueOnce({ themeMode: 'light', density: 'normal', fontFamily: 'inter', reduceAnimations: false });

      render(
        <AllProviders>
          <AppNavBar />
        </AllProviders>
      );

      const themeButton = await screen.findByTitle(/modo claro/i);
      expect(themeButton).toBeInTheDocument();
    });
  });

  describe('AC8: Animation - smooth color transition 300ms ease', () => {
    it('should apply transition CSS to root element', async () => {
      // The global transition rule (transition-duration: 300ms on
      // *::before/*::after) lives in tokens.css, a real stylesheet that
      // isn't loaded by the component test environment (no Vite CSS
      // pipeline here). We verify the source of truth for that duration
      // instead of a computed style that depends on the stylesheet being
      // present.
      const fs = await import('fs');
      const path = await import('path');
      const cssPath = path.resolve(__dirname, '../styles/tokens.css');
      const css = fs.readFileSync(cssPath, 'utf-8');
      expect(css).toMatch(/transition-duration:\s*300ms/);
    });
  });

  describe('AC9: No FOUC (Flash of Unstyled Content) on page load', () => {
    it('should immediately set data-theme attribute on first render', () => {
      localStorage.setItem('theme', 'light');

      render(
        <AllProviders>
          <AppNavBar />
        </AllProviders>
      );

      // Theme should be set immediately, not after a delay
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('should prevent theme change API call on initial mount', () => {
      const fetchSpy = vi.spyOn(global, 'fetch');

      render(
        <AllProviders>
          <AppNavBar />
        </AllProviders>
      );

      // Should not call API on mount (only on user action)
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('Integration with Design Tokens', () => {
    it('should work with CSS custom properties from tokens.css', async () => {
      render(
        <AllProviders>
          <AppNavBar />
        </AllProviders>
      );

      // Verify data-theme attribute is set for CSS custom properties
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

      // CSS custom properties like --duration-normal are defined in
      // tokens.css, a real stylesheet not loaded in this component test
      // environment. We verify it's defined at the source instead of via
      // getComputedStyle, which would only reflect an actually loaded sheet.
      const fs = await import('fs');
      const path = await import('path');
      const cssPath = path.resolve(__dirname, '../styles/tokens.css');
      const css = fs.readFileSync(cssPath, 'utf-8');
      expect(css).toMatch(/--duration-normal:\s*300ms/);
    });

    it('should switch theme which updates CSS custom properties', async () => {
      render(
        <AllProviders>
          <AppNavBar />
        </AllProviders>
      );

      const themeButton = await screen.findByTitle(/modo/i);

      // Initial dark theme
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

      // Toggle to light
      fireEvent.click(themeButton);

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      });
    });
  });

  describe('TopNav Integration', () => {
    it('should have theme toggle button in the correct position in TopNav', async () => {
      render(
        <AllProviders>
          <AppNavBar />
        </AllProviders>
      );

      const header = screen.getByRole('banner');
      const themeButton = await screen.findByTitle(/modo/i);

      // Theme button should be within the header
      expect(header).toContainElement(themeButton);
    });

    it('should apply glass nav styling to TopNav', () => {
      render(
        <AllProviders>
          <AppNavBar />
        </AllProviders>
      );

      const header = screen.getByRole('banner');
      expect(header).toHaveClass('frame-nav');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible title for theme toggle button', async () => {
      render(
        <AllProviders>
          <AppNavBar />
        </AllProviders>
      );

      const themeButton = await screen.findByTitle(/modo/i);
      expect(themeButton).toHaveAttribute('title');
      expect(themeButton).toHaveAttribute('type', 'button');
    });

    it('should be keyboard accessible', async () => {
      render(
        <AllProviders>
          <AppNavBar />
        </AllProviders>
      );

      const themeButton = await screen.findByTitle(/modo/i);

      // Should be focusable
      themeButton.focus();
      expect(document.activeElement).toBe(themeButton);
    });
  });
});
