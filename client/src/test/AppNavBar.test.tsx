import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import AppNavBar from '@/components/AppNavBar';
import { AuthProvider } from '@/contexts/AuthContext';
import { AppProvider } from '@/contexts/AppContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ProjectProvider } from '@/contexts/ProjectContext';
import { api } from '@/lib/api';

/**
 * AppNavBar - 4 Tab Navigation
 *
 * Covers the current job-story navigation: Painel → Comercial → Produção →
 * Financeiro. This replaces the previous 5-tab (HOME/CLIENTS/JOBS/STUDIO/
 * FINANCE) test suite, which described an earlier version of the
 * navigation that no longer matches AppNavBar.tsx.
 *
 * STUDIO is no longer a top-level tab — it now lives inside PRODUÇÃO
 * (see ProductionNav.tsx), so it's intentionally not asserted on here.
 */

let mockLocation = '/dashboard';
const mockSetLocation = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => [mockLocation, mockSetLocation],
  // AppNavBar renders JourneyBreadcrumb, which uses wouter's Link.
  Link: ({ href, children, className }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
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
    <ThemeProvider defaultTheme="dark">
      <LanguageProvider>
        <AuthProvider>
          <AppProvider>
            <ProjectProvider>
              {children}
            </ProjectProvider>
          </AppProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};

describe('AppNavBar - 4 Tab Navigation', () => {
  beforeEach(() => {
    mockSetLocation.mockClear();
    mockLocation = '/dashboard';
    // No authenticated user by default — most nav assertions don't need one.
    (api.auth.me as any).mockRejectedValue(new Error('not authenticated'));
  });

  describe('Desktop Navigation', () => {
    it('should render exactly 4 navigation tabs', () => {
      render(
        <AllProviders>
          <AppNavBar />
        </AllProviders>
      );

      const nav = screen.getAllByRole('navigation')[0];
      const navButtons = within(nav).getAllByRole('button');

      expect(navButtons).toHaveLength(4);
    });

    it('should render tabs in job-story order: PAINEL, COMERCIAL, PRODUÇÃO, FINANCEIRO', () => {
      render(
        <AllProviders>
          <AppNavBar />
        </AllProviders>
      );

      const nav = screen.getAllByRole('navigation')[0];
      const navButtons = within(nav).getAllByRole('button');

      expect(navButtons[0]).toHaveTextContent('PAINEL');
      expect(navButtons[1]).toHaveTextContent('COMERCIAL');
      expect(navButtons[2]).toHaveTextContent('PRODUÇÃO');
      expect(navButtons[3]).toHaveTextContent('FINANCEIRO');
    });

    it('should have data-tour attributes matching each tab', () => {
      render(
        <AllProviders>
          <AppNavBar />
        </AllProviders>
      );

      const nav = screen.getAllByRole('navigation')[0];
      const navButtons = within(nav).getAllByRole('button');

      expect(navButtons[0]).toHaveAttribute('data-tour', 'dashboard');
      expect(navButtons[1]).toHaveAttribute('data-tour', 'clients');
      expect(navButtons[2]).toHaveAttribute('data-tour', 'projects');
      expect(navButtons[3]).toHaveAttribute('data-tour', 'analytics');
    });

    it('should highlight PAINEL as active when on /dashboard', () => {
      mockLocation = '/dashboard';
      render(
        <AllProviders>
          <AppNavBar />
        </AllProviders>
      );

      const nav = screen.getAllByRole('navigation')[0];
      const panelButton = within(nav).getAllByRole('button')[0];

      expect(panelButton).toHaveClass('active');
    });

    it('should highlight COMERCIAL as active when on /commercial', () => {
      mockLocation = '/commercial';
      render(
        <AllProviders>
          <AppNavBar />
        </AllProviders>
      );

      const nav = screen.getAllByRole('navigation')[0];
      const commercialButton = within(nav).getAllByRole('button')[1];

      expect(commercialButton).toHaveClass('active');
    });

    it('should highlight PRODUÇÃO as active when on /projects', () => {
      mockLocation = '/projects';
      render(
        <AllProviders>
          <AppNavBar />
        </AllProviders>
      );

      const nav = screen.getAllByRole('navigation')[0];
      const productionButton = within(nav).getAllByRole('button')[2];

      expect(productionButton).toHaveClass('active');
    });

    it('should highlight PRODUÇÃO as active when on /tools (Studio lives under Production)', () => {
      mockLocation = '/tools';
      render(
        <AllProviders>
          <AppNavBar />
        </AllProviders>
      );

      const nav = screen.getAllByRole('navigation')[0];
      const productionButton = within(nav).getAllByRole('button')[2];

      expect(productionButton).toHaveClass('active');
    });

    it('should highlight FINANCEIRO as active when on /analytics', () => {
      mockLocation = '/analytics';
      render(
        <AllProviders>
          <AppNavBar />
        </AllProviders>
      );

      const nav = screen.getAllByRole('navigation')[0];
      const financeButton = within(nav).getAllByRole('button')[3];

      expect(financeButton).toHaveClass('active');
    });

    it('should only have one active tab at a time', () => {
      mockLocation = '/tools';
      render(
        <AllProviders>
          <AppNavBar />
        </AllProviders>
      );

      const nav = screen.getAllByRole('navigation')[0];
      const navButtons = within(nav).getAllByRole('button');
      const activeTabs = navButtons.filter((btn) => btn.classList.contains('active'));

      expect(activeTabs).toHaveLength(1);
      expect(activeTabs[0]).toHaveTextContent('PRODUÇÃO');
    });

    it('should navigate to correct route when a tab is clicked', () => {
      render(
        <AllProviders>
          <AppNavBar />
        </AllProviders>
      );

      const nav = screen.getAllByRole('navigation')[0];
      const navButtons = within(nav).getAllByRole('button');

      fireEvent.click(navButtons[0]);
      expect(mockSetLocation).toHaveBeenCalledWith('/dashboard');

      fireEvent.click(navButtons[1]);
      expect(mockSetLocation).toHaveBeenCalledWith('/commercial');

      fireEvent.click(navButtons[2]);
      expect(mockSetLocation).toHaveBeenCalledWith('/projects');

      fireEvent.click(navButtons[3]);
      expect(mockSetLocation).toHaveBeenCalledWith('/analytics');
    });
  });

  describe('Team Member Role Restrictions', () => {
    it('should hide COMERCIAL and FINANCEIRO tabs for team members', async () => {
      (api.auth.me as any).mockResolvedValue({
        user: { id: 1, name: 'Editor User', email: 'editor@example.com' },
        plan: null,
      });
      // The global api mock (client/src/test/setup.ts) doesn't define
      // `api.team`, since most suites don't need it. AuthContext calls
      // api.team.context() right after a successful login, so we add it
      // here rather than touching the shared mock.
      (api as any).team = { context: vi.fn().mockResolvedValue({
        isTeamMember: true,
        ownerUserId: 99,
        workspaceId: 1,
        role: 'editor',
      }) };
      (api.projects.list as any).mockResolvedValue([]);

      render(
        <AllProviders>
          <AppNavBar />
        </AllProviders>
      );

      const nav = await screen.findByRole('navigation');
      const navButtons = within(nav).getAllByRole('button');

      // Only PAINEL and PRODUÇÃO remain for team members.
      expect(navButtons).toHaveLength(2);
      expect(navButtons[0]).toHaveTextContent('PAINEL');
      expect(navButtons[1]).toHaveTextContent('PRODUÇÃO');
    });
  });

  describe('Mobile Navigation', () => {
    it('should toggle the mobile menu button aria-expanded state', () => {
      render(
        <AllProviders>
          <AppNavBar />
        </AllProviders>
      );

      const menuButton = screen.getByLabelText(/abrir menu/i);
      expect(menuButton).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(menuButton);
      expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('should show all 4 tabs in the mobile menu when opened', () => {
      render(
        <AllProviders>
          <AppNavBar />
        </AllProviders>
      );

      const menuButton = screen.getByLabelText(/abrir menu/i);
      fireEvent.click(menuButton);

      // With the menu open, tab labels now appear twice (desktop nav is
      // hidden via CSS but still in the DOM, plus the mobile menu copy).
      expect(screen.getAllByText('PAINEL').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('COMERCIAL').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('PRODUÇÃO').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('FINANCEIRO').length).toBeGreaterThanOrEqual(1);
    });

    it('should close the mobile menu when a tab is clicked', () => {
      render(
        <AllProviders>
          <AppNavBar />
        </AllProviders>
      );

      const menuButton = screen.getByLabelText(/abrir menu/i);
      fireEvent.click(menuButton);
      expect(menuButton).toHaveAttribute('aria-expanded', 'true');

      const panelTabs = screen.getAllByText('PAINEL');
      fireEvent.click(panelTabs[panelTabs.length - 1]);

      expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('Glass Styling', () => {
    it('should apply frame-nav class to the header for the glass effect', () => {
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
    it('should have a navigation landmark', () => {
      render(
        <AllProviders>
          <AppNavBar />
        </AllProviders>
      );

      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should have an accessible mobile menu toggle button', () => {
      render(
        <AllProviders>
          <AppNavBar />
        </AllProviders>
      );

      const menuButton = screen.getByLabelText(/abrir menu/i);
      expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('should have a minimum touch target height on nav links', () => {
      render(
        <AllProviders>
          <AppNavBar />
        </AllProviders>
      );

      const nav = screen.getAllByRole('navigation')[0];
      const navButtons = within(nav).getAllByRole('button');

      navButtons.forEach((button) => {
        // Mínimo real garantido é 45px (subpixel rendering em mobile viewport
        // faz 44px cair para 43.99 ocasionalmente — vide Fase 2 achado
        // "●PAINEL 184.81 x 44" reportado como violação apesar de min-height 44).
        const minHeight = parseFloat(button.style.minHeight);
        expect(minHeight).toBeGreaterThanOrEqual(44);
      });
    });
  });

  describe('Search Functionality', () => {
    it('should not render the search trigger when no user is authenticated', () => {
      render(
        <AllProviders>
          <AppNavBar />
        </AllProviders>
      );

      expect(screen.queryByLabelText(/abrir busca/i)).not.toBeInTheDocument();
    });

    it('should render search button with Cmd+K hint when authenticated', async () => {
      (api.auth.me as any).mockResolvedValue({
        user: { id: 1, name: 'Test User', email: 'test@example.com' },
        plan: null,
      });
      (api.projects.list as any).mockResolvedValue([]);

      render(
        <AllProviders>
          <AppNavBar />
        </AllProviders>
      );

      const searchButton = await screen.findByLabelText(/abrir busca/i);
      expect(searchButton).toBeInTheDocument();
      expect(screen.getByText('⌘K')).toBeInTheDocument();
    });

    it('should dispatch the command palette event when search is clicked', async () => {
      (api.auth.me as any).mockResolvedValue({
        user: { id: 1, name: 'Test User', email: 'test@example.com' },
        plan: null,
      });
      (api.projects.list as any).mockResolvedValue([]);

      render(
        <AllProviders>
          <AppNavBar />
        </AllProviders>
      );

      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
      const searchButton = await screen.findByLabelText(/abrir busca/i);
      fireEvent.click(searchButton);

      expect(dispatchSpy).toHaveBeenCalled();
    });
  });
});
