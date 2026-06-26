import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { AppProvider, useApp } from '@/contexts/AppContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { ProjectProvider, useProject } from '@/contexts/ProjectContext';
import { ApiError, api } from '@/lib/api';
import { TOOLS, getToolById, getToolBySlug } from '@shared/tools';

const TestAuthComponent = () => {
  const { user, login, logout, isLoading } = useAuth();
  return (
    <div>
      <span data-testid="loading">{isLoading ? 'true' : 'false'}</span>
      <span data-testid="user">{user?.email ?? 'null'}</span>
      <button onClick={() => login('test@test.com', 'password')} data-testid="login-btn">
        Login
      </button>
      <button onClick={logout} data-testid="logout-btn">
        Logout
      </button>
    </div>
  );
};

const TestAppComponent = () => {
  const { openModal, closeModal, modals } = useApp();
  return (
    <div>
      <span data-testid="modal-checkout">{modals.checkout ? 'open' : 'closed'}</span>
      <button onClick={() => openModal('checkout')} data-testid="open-checkout">
        Open Checkout
      </button>
      <button onClick={() => closeModal('checkout')} data-testid="close-checkout">
        Close Checkout
      </button>
    </div>
  );
};

const TestThemeComponent = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={toggleTheme} data-testid="toggle-theme">
        Toggle
      </button>
    </div>
  );
};

const TestProjectComponent = () => {
  const { activeProject, selectProject, projects } = useProject();
  return (
    <div>
      <span data-testid="active-project">{activeProject?.name ?? 'none'}</span>
      <span data-testid="projects-count">{projects.length}</span>
      <button onClick={() => selectProject(1)} data-testid="set-project">
        Set Project
      </button>
    </div>
  );
};

const authWrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

const appWrapper = ({ children }: { children: React.ReactNode }) => (
  <AppProvider>{children}</AppProvider>
);

const themeWrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider defaultTheme="dark">{children}</ThemeProvider>
);

const projectWrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider defaultTheme="dark">
    <AuthProvider>
      <ProjectProvider>{children}</ProjectProvider>
    </AuthProvider>
  </ThemeProvider>
);

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.auth.me).mockRejectedValue(new ApiError('Sessão expirada', 401));
    vi.mocked(api.auth.login).mockResolvedValue({
      user: { id: 1, email: 'test@test.com', role: 'user', name: 'Test' },
    });
    vi.mocked(api.auth.logout).mockResolvedValue(null);
    vi.mocked(api.auth.register).mockResolvedValue({
      user: { id: 2, email: 'new@test.com', role: 'user', name: 'New' },
    });
  });

  it('provides initial state correctly', async () => {
    render(<TestAuthComponent />, { wrapper: authWrapper });
    
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
    expect(screen.getByTestId('user')).toHaveTextContent('null');
  });

  it('calls login with correct params', async () => {
    render(<TestAuthComponent />, { wrapper: authWrapper });
    
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
    
    await act(async () => {
      fireEvent.click(screen.getByTestId('login-btn'));
    });
    
    await waitFor(() => {
      expect(api.auth.login).toHaveBeenCalledWith('test@test.com', 'password');
    });
  });

  it('calls logout', async () => {
    render(<TestAuthComponent />, { wrapper: authWrapper });
    
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
    
    await act(async () => {
      fireEvent.click(screen.getByTestId('logout-btn'));
    });
    
    await waitFor(() => expect(api.auth.logout).toHaveBeenCalled());
  });
});

describe('AppContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.auth.me).mockRejectedValue(new ApiError('Sessão expirada', 401));
  });

  it('manages modals state', () => {
    render(<TestAppComponent />, { wrapper: appWrapper });
    expect(screen.getByTestId('modal-checkout')).toHaveTextContent('closed');
    
    act(() => {
      fireEvent.click(screen.getByTestId('open-checkout'));
    });
    expect(screen.getByTestId('modal-checkout')).toHaveTextContent('open');
    
    act(() => {
      fireEvent.click(screen.getByTestId('close-checkout'));
    });
    expect(screen.getByTestId('modal-checkout')).toHaveTextContent('closed');
  });
});

describe('ThemeContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.auth.me).mockRejectedValue(new ApiError('Sessão expirada', 401));
  });

  it('provides theme and toggle', () => {
    render(<TestThemeComponent />, { wrapper: themeWrapper });
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    
    act(() => {
      fireEvent.click(screen.getByTestId('toggle-theme'));
    });
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
  });
});

describe('ProjectContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.auth.me).mockResolvedValue({
      user: { id: 1, email: 'test@test.com', role: 'user', name: 'Test' },
      plan: { planId: 'free', planName: 'Free', status: 'active', generationLimit: 5, trialEndsAt: null, features: [] }
    });
    vi.mocked(api.projects.list).mockResolvedValue([]);
    vi.mocked(api.projects.get).mockResolvedValue({ id: 1, name: 'Test Project', userId: 1, status: 'active', metadataJson: '{}', createdAt: '', updatedAt: '' });
  });

  it('provides initial empty state', async () => {
    render(<TestProjectComponent />, { wrapper: projectWrapper });
    
    await waitFor(() => {
      expect(screen.getByTestId('active-project')).toHaveTextContent('none');
    });
    expect(screen.getByTestId('projects-count')).toHaveTextContent('0');
  });

  it('selects active project', async () => {
    render(<TestProjectComponent />, { wrapper: projectWrapper });
    
    await waitFor(() => {
      expect(screen.getByTestId('active-project')).toHaveTextContent('none');
    });
    
    await act(async () => {
      fireEvent.click(screen.getByTestId('set-project'));
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('active-project')).toHaveTextContent('Test Project');
    });
  });
});

describe('Tools from shared/tools.ts', () => {
  it('has 12 tools defined', () => {
    expect(TOOLS).toHaveLength(12);
  });

  it('each tool has required fields', () => {
    TOOLS.forEach((tool) => {
      expect(tool).toHaveProperty('id');
      expect(tool).toHaveProperty('slug');
      expect(tool).toHaveProperty('name');
      expect(tool).toHaveProperty('icon');
      expect(tool).toHaveProperty('description');
      expect(tool).toHaveProperty('category');
      expect(tool).toHaveProperty('tags');
      expect(tool).toHaveProperty('processingTime');
      expect(tool).toHaveProperty('placeholder');
      expect(tool).toHaveProperty('promptRole');
      expect(Array.isArray(tool.tags)).toBe(true);
      expect(tool.tags.length).toBeGreaterThan(0);
    });
  });

  it('getToolById works correctly', () => {
    const tool = getToolById('01');
    expect(tool).toBeDefined();
    expect(tool?.slug).toBe('roteiro');
    expect(tool?.name).toBe('Gerador de Roteiro');
  });

  it('getToolBySlug works correctly', () => {
    const tool = getToolBySlug('orcamento');
    expect(tool).toBeDefined();
    expect(tool?.id).toBe('04');
    expect(tool?.name).toBe('Orçamento Automático');
  });
});
