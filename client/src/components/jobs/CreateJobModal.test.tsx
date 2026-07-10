/**
 * CreateJobModal Component Tests
 *
 * Comprehensive test suite covering all acceptance criteria:
 * 1. Modal opens on button click
 * 2. Form displays all 4 fields with correct types
 * 3. Title validation: 3-200 chars, required, shows error
 * 4. Client validation: required, dropdown works
 * 5. Deadline validation: future date, date picker UI
 * 6. Status dropdown with 4 options, default "briefing"
 * 7. Submit button: "Criar Job", disabled until valid
 * 8. Cancel/close button: closes without creating
 * 9. API call: POST /api/jobs with correct data
 * 10. Success: adds job optimistically, closes modal
 * 11. Error: shows error message with retry option
 * 12. Form reset on success or cancel
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateJobModal } from './CreateJobModal';
import { Client } from '@/lib/api';
import { Job } from '@/components/dashboard/JobCard';

// Mock dependencies
vi.mock('@/components/AnimatedModal', () => ({
  default: ({
    isOpen,
    onClose,
    title,
    description,
    children,
    footer,
  }: {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
  }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="modal">
        <div data-testid="modal-title">{title}</div>
        {description && <div data-testid="modal-description">{description}</div>}
        <button data-testid="modal-close" onClick={onClose}>
          Close
        </button>
        <div data-testid="modal-content">{children}</div>
        {footer && <div data-testid="modal-footer">{footer}</div>}
      </div>
    );
  },
}));

vi.mock('@/design-system/primitives/Button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

describe('CreateJobModal', () => {
  const mockClients: Client[] = [
    {
      id: 1,
      name: 'Acme Corp',
      company: 'Acme Corporation',
      email: 'contact@acme.com',
      phone: null,
      tax_id: null,
      address: null,
      city: null,
      state: null,
      country: null,
      industry: null,
    },
    {
      id: 2,
      name: 'TechStart',
      company: null,
      email: 'hello@techstart.io',
      phone: null,
      tax_id: null,
      address: null,
      city: null,
      state: null,
      country: null,
      industry: null,
    },
  ];

  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  // Mock fetch globally
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // Helper to get today's date in YYYY-MM-DD format
  const getTodayString = () => {
    return new Date().toISOString().split('T')[0];
  };

  // Helper to get future date string.
  // Uses local date components (not toISOString) so the returned string
  // matches the "YYYY-MM-DD" local representation the component expects.
  // Fixes a subtle bug where `date.toISOString().split('T')[0]` shifted
  // the date forward by one day whenever the test ran after ~21:00 in
  // BRT (UTC-3), producing a UTC-representation of tomorrow instead of
  // the intended local +N days.
  const getFutureDateString = (daysFromNow: number) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // 1. Modal opens on button click (tested by parent component)
  describe('Modal Rendering', () => {
    it('should render modal when isOpen is true', () => {
      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );
      expect(screen.getByTestId('modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-title')).toHaveTextContent('Criar Novo Job');
    });

    it('should not render modal when isOpen is false', () => {
      render(
        <CreateJobModal
          isOpen={false}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });

    it('should display modal description', () => {
      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );
      expect(screen.getByTestId('modal-description')).toHaveTextContent(
        'Preencha os campos abaixo para criar um novo job'
      );
    });
  });

  // 2. Form displays all 4 fields with correct types
  describe('Form Fields Display', () => {
    it('should display title input field', () => {
      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );
      const titleInput = screen.getByLabelText(/título do job/i);
      expect(titleInput).toBeInTheDocument();
      expect(titleInput).toHaveAttribute('type', 'text');
      expect(titleInput).toHaveAttribute('placeholder', 'Nome do projeto');
    });

    it('should display client select field', () => {
      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );
      const clientSelect = screen.getByLabelText(/cliente/i);
      expect(clientSelect).toBeInTheDocument();
      expect(clientSelect.tagName).toBe('SELECT');
    });

    it('should display deadline date picker', () => {
      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );
      const deadlineInput = screen.getByLabelText(/deadline/i);
      expect(deadlineInput).toBeInTheDocument();
      expect(deadlineInput).toHaveAttribute('type', 'date');
    });

    it('should display status select field', () => {
      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );
      const statusSelect = screen.getByLabelText(/status/i);
      expect(statusSelect).toBeInTheDocument();
      expect(statusSelect.tagName).toBe('SELECT');
    });

    it('should mark all fields as required', () => {
      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );
      expect(screen.getByLabelText(/título do job/i)).toHaveAttribute('aria-required', 'true');
      expect(screen.getByLabelText(/cliente/i)).toHaveAttribute('aria-required', 'true');
      expect(screen.getByLabelText(/deadline/i)).toHaveAttribute('aria-required', 'true');
      expect(screen.getByLabelText(/status/i)).toHaveAttribute('aria-required', 'true');
    });
  });

  // 3. Title validation
  describe('Title Field Validation', () => {
    it('should show error when title is empty on blur', async () => {
      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );
      const titleInput = screen.getByLabelText(/título do job/i);
      fireEvent.blur(titleInput);
      await waitFor(() => {
        expect(screen.getByText('Título é obrigatório')).toBeInTheDocument();
      });
    });

    it('should show error when title is less than 3 characters', async () => {
      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );
      const titleInput = screen.getByLabelText(/título do job/i);
      await userEvent.type(titleInput, 'ab');
      fireEvent.blur(titleInput);
      await waitFor(() => {
        expect(
          screen.getByText('Título deve ter pelo menos 3 caracteres')
        ).toBeInTheDocument();
      });
    });

    it('should show error when title is more than 200 characters', async () => {
      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );
      const titleInput = screen.getByLabelText(/título do job/i);
      const longTitle = 'a'.repeat(201);
      await userEvent.type(titleInput, longTitle);
      fireEvent.blur(titleInput);
      await waitFor(() => {
        expect(
          screen.getByText('Título deve ter no máximo 200 caracteres')
        ).toBeInTheDocument();
      });
    });

    it('should accept valid title (3-200 chars)', async () => {
      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );
      const titleInput = screen.getByLabelText(/título do job/i);
      await userEvent.type(titleInput, 'Valid Project Title');
      fireEvent.blur(titleInput);
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });

    it('should trim whitespace when validating title', async () => {
      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );
      const titleInput = screen.getByLabelText(/título do job/i);
      await userEvent.type(titleInput, '   ');
      fireEvent.blur(titleInput);
      await waitFor(() => {
        expect(screen.getByText('Título é obrigatório')).toBeInTheDocument();
      });
    });

    it('should set aria-invalid when title has error', async () => {
      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );
      const titleInput = screen.getByLabelText(/título do job/i);
      fireEvent.blur(titleInput);
      await waitFor(() => {
        expect(titleInput).toHaveAttribute('aria-invalid', 'true');
      });
    });
  });

  // 4. Client validation
  describe('Client Field Validation', () => {
    it('should display client dropdown with all clients', () => {
      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );
      const clientSelect = screen.getByLabelText(/cliente/i);
      expect(clientSelect).toBeInTheDocument();
      expect(screen.getByText('Acme Corp - Acme Corporation')).toBeInTheDocument();
      expect(screen.getByText(/TechStart/)).toBeInTheDocument();
    });

    it('should show placeholder option', () => {
      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );
      expect(screen.getByText('Selecione um cliente')).toBeInTheDocument();
    });

    it('should show error when client is not selected', async () => {
      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );
      const clientSelect = screen.getByLabelText(/cliente/i);
      fireEvent.blur(clientSelect);
      await waitFor(() => {
        expect(screen.getByText('Cliente é obrigatório')).toBeInTheDocument();
      });
    });

    it('should allow selecting a client', async () => {
      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );
      const clientSelect = screen.getByLabelText(/cliente/i) as HTMLSelectElement;
      await userEvent.selectOptions(clientSelect, '1');
      expect(clientSelect.value).toBe('1');
    });

    it('should handle clients without company name', () => {
      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );
      // TechStart has no company field
      const option = screen.getByText(/^TechStart$/);
      expect(option).toBeInTheDocument();
    });
  });

  // 5. Deadline validation
  describe('Deadline Field Validation', () => {
    it('should show error when deadline is empty', async () => {
      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );
      const deadlineInput = screen.getByLabelText(/deadline/i);
      fireEvent.blur(deadlineInput);
      await waitFor(() => {
        expect(screen.getByText('Deadline é obrigatório')).toBeInTheDocument();
      });
    });

    it('should show error when deadline is in the past', async () => {
      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );
      const deadlineInput = screen.getByLabelText(/deadline/i);
      const pastDate = '2020-01-01';
      fireEvent.change(deadlineInput, { target: { value: pastDate } });
      fireEvent.blur(deadlineInput);
      await waitFor(() => {
        expect(
          screen.getByText('Deadline deve ser hoje ou uma data futura')
        ).toBeInTheDocument();
      });
    });

    it('should accept today as deadline', async () => {
      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );
      const deadlineInput = screen.getByLabelText(/deadline/i);
      fireEvent.change(deadlineInput, { target: { value: getTodayString() } });
      fireEvent.blur(deadlineInput);
      await waitFor(() => {
        expect(
          screen.queryByText('Deadline deve ser hoje ou uma data futura')
        ).not.toBeInTheDocument();
      });
    });

    it('should accept future dates', async () => {
      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );
      const deadlineInput = screen.getByLabelText(/deadline/i);
      fireEvent.change(deadlineInput, { target: { value: getFutureDateString(7) } });
      fireEvent.blur(deadlineInput);
      await waitFor(() => {
        expect(
          screen.queryByText('Deadline deve ser hoje ou uma data futura')
        ).not.toBeInTheDocument();
      });
    });

    it('should have min attribute set to today', () => {
      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );
      const deadlineInput = screen.getByLabelText(/deadline/i);
      expect(deadlineInput).toHaveAttribute('min', getTodayString());
    });
  });

  // 6. Status dropdown with 4 options, default "briefing"
  describe('Status Field', () => {
    it('should have default value of "briefing"', () => {
      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );
      const statusSelect = screen.getByLabelText(/status/i) as HTMLSelectElement;
      expect(statusSelect.value).toBe('briefing');
    });

    it('should display all 4 status options', () => {
      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );
      expect(screen.getByText('Briefing')).toBeInTheDocument();
      expect(screen.getByText('Produção')).toBeInTheDocument();
      expect(screen.getByText('Review')).toBeInTheDocument();
      expect(screen.getByText('Entregue')).toBeInTheDocument();
    });

    it('should allow changing status', async () => {
      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );
      const statusSelect = screen.getByLabelText(/status/i) as HTMLSelectElement;
      await userEvent.selectOptions(statusSelect, 'production');
      expect(statusSelect.value).toBe('production');
    });

    it('should validate status is one of 4 valid options', async () => {
      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );
      const statusSelect = screen.getByLabelText(/status/i) as HTMLSelectElement;
      // A native <select> can only ever hold a value that matches one of its
      // declared <option> elements. Setting a value that isn't one of the 4
      // valid options ("invalid" here) makes the underlying onChange event
      // fire with an empty string (no option matches "invalid"), so the
      // controlled value becomes "" — functionally identical to the field
      // being left empty. The reachable validation message here is
      // therefore the "required" one, not a dedicated "invalid value"
      // message: there's no way to make this control hold a truly invalid,
      // non-empty value through user interaction.
      fireEvent.change(statusSelect, { target: { value: 'invalid' } });
      fireEvent.blur(statusSelect);
      await waitFor(() => {
        expect(screen.getByText('Status é obrigatório')).toBeInTheDocument();
      });
    });
  });

  // 7. Submit button: "Criar Job", disabled until valid
  describe('Submit Button', () => {
    it('should render "Criar Job" button', () => {
      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );
      const submitButton = screen.getByLabelText(/criar job/i);
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).toHaveTextContent('Criar Job');
    });

    it('should be disabled when form is empty', () => {
      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );
      const submitButton = screen.getByLabelText(/criar job/i);
      expect(submitButton).toBeDisabled();
    });

    it('should be disabled when title is invalid', async () => {
      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );
      const titleInput = screen.getByLabelText(/título do job/i);
      await userEvent.type(titleInput, 'ab'); // Too short
      const submitButton = screen.getByLabelText(/criar job/i);
      expect(submitButton).toBeDisabled();
    });

    it('should be disabled when client is not selected', async () => {
      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );
      const titleInput = screen.getByLabelText(/título do job/i);
      const deadlineInput = screen.getByLabelText(/deadline/i);
      await userEvent.type(titleInput, 'Valid Title');
      fireEvent.change(deadlineInput, { target: { value: getFutureDateString(7) } });
      const submitButton = screen.getByLabelText(/criar job/i);
      expect(submitButton).toBeDisabled();
    });

    it('should be disabled when deadline is not selected', async () => {
      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );
      const titleInput = screen.getByLabelText(/título do job/i);
      const clientSelect = screen.getByLabelText(/cliente/i);
      await userEvent.type(titleInput, 'Valid Title');
      await userEvent.selectOptions(clientSelect, '1');
      const submitButton = screen.getByLabelText(/criar job/i);
      expect(submitButton).toBeDisabled();
    });

    it('should be enabled when all fields are valid', async () => {
      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );
      const titleInput = screen.getByLabelText(/título do job/i);
      const clientSelect = screen.getByLabelText(/cliente/i);
      const deadlineInput = screen.getByLabelText(/deadline/i);

      await userEvent.type(titleInput, 'Valid Project Title');
      await userEvent.selectOptions(clientSelect, '1');
      fireEvent.change(deadlineInput, { target: { value: getFutureDateString(7) } });

      const submitButton = screen.getByLabelText(/criar job/i);
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });

    it('should show "Criando..." when submitting', async () => {
      global.fetch = vi.fn(() =>
        new Promise(() => {}) // Never resolves to keep loading state
      ) as any;

      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );

      const titleInput = screen.getByLabelText(/título do job/i);
      const clientSelect = screen.getByLabelText(/cliente/i);
      const deadlineInput = screen.getByLabelText(/deadline/i);

      await userEvent.type(titleInput, 'Valid Project Title');
      await userEvent.selectOptions(clientSelect, '1');
      fireEvent.change(deadlineInput, { target: { value: getFutureDateString(7) } });

      const submitButton = screen.getByLabelText(/criar job/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toHaveTextContent('Criando...');
        expect(submitButton).toBeDisabled();
      });
    });
  });

  // 8. Cancel/close button: closes without creating
  describe('Cancel and Close', () => {
    it('should render cancel button', () => {
      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );
      const cancelButton = screen.getByText('Cancelar');
      expect(cancelButton).toBeInTheDocument();
    });

    it('should call onClose when cancel button is clicked', () => {
      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );
      const cancelButton = screen.getByText('Cancelar');
      fireEvent.click(cancelButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when modal close button is clicked', () => {
      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );
      const closeButton = screen.getByTestId('modal-close');
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not call API when cancel is clicked', async () => {
      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );
      const titleInput = screen.getByLabelText(/título do job/i);
      await userEvent.type(titleInput, 'Some Title');
      const cancelButton = screen.getByText('Cancelar');
      fireEvent.click(cancelButton);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  // 9. API call: POST /api/jobs with correct data
  describe('API Integration', () => {
    it('should make POST request to /api/jobs on submit', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                id: 'new-job-123',
                title: 'Valid Project Title',
                clientId: '1',
                deadline: getFutureDateString(7),
                status: 'briefing',
              },
            }),
        })
      ) as any;

      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          clients={mockClients}
        />
      );

      const titleInput = screen.getByLabelText(/título do job/i);
      const clientSelect = screen.getByLabelText(/cliente/i);
      const deadlineInput = screen.getByLabelText(/deadline/i);

      await userEvent.type(titleInput, 'Valid Project Title');
      await userEvent.selectOptions(clientSelect, '1');
      fireEvent.change(deadlineInput, { target: { value: getFutureDateString(7) } });

      const submitButton = screen.getByLabelText(/criar job/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/jobs',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
          })
        );
      });
    });

    it('should send correct form data in request body', async () => {
      const futureDate = getFutureDateString(7);
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                id: 'new-job-123',
                title: 'My New Project',
                clientId: '2',
                deadline: futureDate,
                status: 'production',
              },
            }),
        })
      ) as any;

      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          clients={mockClients}
        />
      );

      const titleInput = screen.getByLabelText(/título do job/i);
      const clientSelect = screen.getByLabelText(/cliente/i);
      const deadlineInput = screen.getByLabelText(/deadline/i);
      const statusSelect = screen.getByLabelText(/status/i);

      await userEvent.type(titleInput, 'My New Project');
      await userEvent.selectOptions(clientSelect, '2');
      fireEvent.change(deadlineInput, { target: { value: futureDate } });
      await userEvent.selectOptions(statusSelect, 'production');

      const submitButton = screen.getByLabelText(/criar job/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
        const callArgs = (global.fetch as any).mock.calls[0];
        const body = JSON.parse(callArgs[1].body);
        expect(body).toEqual({
          title: 'My New Project',
          clientId: '2',
          deadline: futureDate,
          status: 'production',
        });
      });
    });
  });

  // 10. Success: adds job optimistically, closes modal
  describe('Success Flow', () => {
    it('should call onSuccess with new job data', async () => {
      const futureDate = getFutureDateString(7);
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                id: 'new-job-456',
                title: 'Success Project',
                clientId: '1',
                deadline: futureDate,
                status: 'briefing',
              },
            }),
        })
      ) as any;

      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          clients={mockClients}
        />
      );

      const titleInput = screen.getByLabelText(/título do job/i);
      const clientSelect = screen.getByLabelText(/cliente/i);
      const deadlineInput = screen.getByLabelText(/deadline/i);

      await userEvent.type(titleInput, 'Success Project');
      await userEvent.selectOptions(clientSelect, '1');
      fireEvent.change(deadlineInput, { target: { value: futureDate } });

      const submitButton = screen.getByLabelText(/criar job/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'new-job-456',
            title: 'Success Project',
            client: 'Acme Corp',
            status: 'briefing',
            deadline: futureDate,
            progress: 0,
          })
        );
      });
    });

    it('should close modal after successful submission', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                id: 'new-job-789',
                title: 'Close Test',
                clientId: '1',
                deadline: getFutureDateString(7),
                status: 'briefing',
              },
            }),
        })
      ) as any;

      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          clients={mockClients}
        />
      );

      const titleInput = screen.getByLabelText(/título do job/i);
      const clientSelect = screen.getByLabelText(/cliente/i);
      const deadlineInput = screen.getByLabelText(/deadline/i);

      await userEvent.type(titleInput, 'Close Test');
      await userEvent.selectOptions(clientSelect, '1');
      fireEvent.change(deadlineInput, { target: { value: getFutureDateString(7) } });

      const submitButton = screen.getByLabelText(/criar job/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should calculate daysLeft correctly', async () => {
      const futureDate = getFutureDateString(5);
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                id: 'new-job-999',
                title: 'Days Test',
                clientId: '1',
                deadline: futureDate,
                status: 'briefing',
              },
            }),
        })
      ) as any;

      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          clients={mockClients}
        />
      );

      const titleInput = screen.getByLabelText(/título do job/i);
      const clientSelect = screen.getByLabelText(/cliente/i);
      const deadlineInput = screen.getByLabelText(/deadline/i);

      await userEvent.type(titleInput, 'Days Test');
      await userEvent.selectOptions(clientSelect, '1');
      fireEvent.change(deadlineInput, { target: { value: futureDate } });

      const submitButton = screen.getByLabelText(/criar job/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith(
          expect.objectContaining({
            daysLeft: 5,
          })
        );
      });
    });

    it('should mark job as urgent if daysLeft < 3', async () => {
      const futureDate = getFutureDateString(2);
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                id: 'urgent-job',
                title: 'Urgent Test',
                clientId: '1',
                deadline: futureDate,
                status: 'briefing',
              },
            }),
        })
      ) as any;

      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          clients={mockClients}
        />
      );

      const titleInput = screen.getByLabelText(/título do job/i);
      const clientSelect = screen.getByLabelText(/cliente/i);
      const deadlineInput = screen.getByLabelText(/deadline/i);

      await userEvent.type(titleInput, 'Urgent Test');
      await userEvent.selectOptions(clientSelect, '1');
      fireEvent.change(deadlineInput, { target: { value: futureDate } });

      const submitButton = screen.getByLabelText(/criar job/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith(
          expect.objectContaining({
            urgent: true,
          })
        );
      });
    });
  });

  // 11. Error: shows error message with retry option
  describe('Error Handling', () => {
    it('should display error message on 400 error', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          json: () =>
            Promise.resolve({
              error: 'Invalid form data',
            }),
        })
      ) as any;

      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );

      const titleInput = screen.getByLabelText(/título do job/i);
      const clientSelect = screen.getByLabelText(/cliente/i);
      const deadlineInput = screen.getByLabelText(/deadline/i);

      await userEvent.type(titleInput, 'Error Test');
      await userEvent.selectOptions(clientSelect, '1');
      fireEvent.change(deadlineInput, { target: { value: getFutureDateString(7) } });

      const submitButton = screen.getByLabelText(/criar job/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Invalid form data');
      });
    });

    it('should display error message on 401 error', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          json: () =>
            Promise.resolve({
              error: 'Unauthorized access',
            }),
        })
      ) as any;

      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );

      const titleInput = screen.getByLabelText(/título do job/i);
      const clientSelect = screen.getByLabelText(/cliente/i);
      const deadlineInput = screen.getByLabelText(/deadline/i);

      await userEvent.type(titleInput, 'Auth Error Test');
      await userEvent.selectOptions(clientSelect, '1');
      fireEvent.change(deadlineInput, { target: { value: getFutureDateString(7) } });

      const submitButton = screen.getByLabelText(/criar job/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Unauthorized access');
      });
    });

    it('should display error message on 500 error', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          json: () =>
            Promise.resolve({
              error: 'Internal server error',
            }),
        })
      ) as any;

      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );

      const titleInput = screen.getByLabelText(/título do job/i);
      const clientSelect = screen.getByLabelText(/cliente/i);
      const deadlineInput = screen.getByLabelText(/deadline/i);

      await userEvent.type(titleInput, 'Server Error Test');
      await userEvent.selectOptions(clientSelect, '1');
      fireEvent.change(deadlineInput, { target: { value: getFutureDateString(7) } });

      const submitButton = screen.getByLabelText(/criar job/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Internal server error');
      });
    });

    it('should show generic error when response has no error message', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({}),
        })
      ) as any;

      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );

      const titleInput = screen.getByLabelText(/título do job/i);
      const clientSelect = screen.getByLabelText(/cliente/i);
      const deadlineInput = screen.getByLabelText(/deadline/i);

      await userEvent.type(titleInput, 'Generic Error Test');
      await userEvent.selectOptions(clientSelect, '1');
      fireEvent.change(deadlineInput, { target: { value: getFutureDateString(7) } });

      const submitButton = screen.getByLabelText(/criar job/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/Erro ao criar job/);
      });
    });

    it('should keep modal open on error for retry', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          json: () =>
            Promise.resolve({
              error: 'Server error',
            }),
        })
      ) as any;

      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );

      const titleInput = screen.getByLabelText(/título do job/i);
      const clientSelect = screen.getByLabelText(/cliente/i);
      const deadlineInput = screen.getByLabelText(/deadline/i);

      await userEvent.type(titleInput, 'Retry Test');
      await userEvent.selectOptions(clientSelect, '1');
      fireEvent.change(deadlineInput, { target: { value: getFutureDateString(7) } });

      const submitButton = screen.getByLabelText(/criar job/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      expect(mockOnClose).not.toHaveBeenCalled();
      expect(screen.getByTestId('modal')).toBeInTheDocument();
    });

    it('should allow retry after error', async () => {
      let callCount = 0;
      global.fetch = vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: () => Promise.resolve({ error: 'Server error' }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                id: 'retry-success',
                title: 'Retry Success',
                clientId: '1',
                deadline: getFutureDateString(7),
                status: 'briefing',
              },
            }),
        });
      }) as any;

      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          clients={mockClients}
        />
      );

      const titleInput = screen.getByLabelText(/título do job/i);
      const clientSelect = screen.getByLabelText(/cliente/i);
      const deadlineInput = screen.getByLabelText(/deadline/i);

      await userEvent.type(titleInput, 'Retry Success');
      await userEvent.selectOptions(clientSelect, '1');
      fireEvent.change(deadlineInput, { target: { value: getFutureDateString(7) } });

      const submitButton = screen.getByLabelText(/criar job/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Server error');
      });

      // Retry
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('should clear error message when user edits form', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ error: 'Validation error' }),
        })
      ) as any;

      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );

      const titleInput = screen.getByLabelText(/título do job/i);
      const clientSelect = screen.getByLabelText(/cliente/i);
      const deadlineInput = screen.getByLabelText(/deadline/i);

      await userEvent.type(titleInput, 'Error Clear Test');
      await userEvent.selectOptions(clientSelect, '1');
      fireEvent.change(deadlineInput, { target: { value: getFutureDateString(7) } });

      const submitButton = screen.getByLabelText(/criar job/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Validation error');
      });

      // Edit form
      await userEvent.type(titleInput, ' Updated');

      await waitFor(() => {
        expect(screen.queryByText('Validation error')).not.toBeInTheDocument();
      });
    });
  });

  // 12. Form reset on success or cancel
  describe('Form Reset', () => {
    it('should reset form when modal closes', async () => {
      const { rerender } = render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );

      const titleInput = screen.getByLabelText(/título do job/i);
      const clientSelect = screen.getByLabelText(/cliente/i) as HTMLSelectElement;
      const deadlineInput = screen.getByLabelText(/deadline/i);

      await userEvent.type(titleInput, 'Test Title');
      await userEvent.selectOptions(clientSelect, '1');
      fireEvent.change(deadlineInput, { target: { value: getFutureDateString(7) } });

      // Close modal
      rerender(
        <CreateJobModal
          isOpen={false}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );

      // Reopen modal
      rerender(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );

      const newTitleInput = screen.getByLabelText(/título do job/i) as HTMLInputElement;
      const newClientSelect = screen.getByLabelText(/cliente/i) as HTMLSelectElement;
      const newDeadlineInput = screen.getByLabelText(/deadline/i) as HTMLInputElement;
      const newStatusSelect = screen.getByLabelText(/status/i) as HTMLSelectElement;

      expect(newTitleInput.value).toBe('');
      expect(newClientSelect.value).toBe('');
      expect(newDeadlineInput.value).toBe('');
      expect(newStatusSelect.value).toBe('briefing');
    });

    it('should reset errors when modal closes', async () => {
      const { rerender } = render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );

      const titleInput = screen.getByLabelText(/título do job/i);
      fireEvent.blur(titleInput);

      await waitFor(() => {
        expect(screen.getByText('Título é obrigatório')).toBeInTheDocument();
      });

      // Close modal
      rerender(
        <CreateJobModal
          isOpen={false}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );

      // Reopen modal
      rerender(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );

      expect(screen.queryByText('Título é obrigatório')).not.toBeInTheDocument();
    });

    it('should reset API error when modal closes', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: 'API Error' }),
        })
      ) as any;

      const { rerender } = render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );

      const titleInput = screen.getByLabelText(/título do job/i);
      const clientSelect = screen.getByLabelText(/cliente/i);
      const deadlineInput = screen.getByLabelText(/deadline/i);

      await userEvent.type(titleInput, 'Error Reset Test');
      await userEvent.selectOptions(clientSelect, '1');
      fireEvent.change(deadlineInput, { target: { value: getFutureDateString(7) } });

      const submitButton = screen.getByLabelText(/criar job/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('API Error')).toBeInTheDocument();
      });

      // Close modal
      rerender(
        <CreateJobModal
          isOpen={false}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );

      // Reopen modal
      rerender(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );

      expect(screen.queryByText('API Error')).not.toBeInTheDocument();
    });

    it('should reset submitting state when modal closes', async () => {
      global.fetch = vi.fn(() => new Promise(() => {})) as any; // Never resolves

      const { rerender } = render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );

      const titleInput = screen.getByLabelText(/título do job/i);
      const clientSelect = screen.getByLabelText(/cliente/i);
      const deadlineInput = screen.getByLabelText(/deadline/i);

      await userEvent.type(titleInput, 'Submitting Test');
      await userEvent.selectOptions(clientSelect, '1');
      fireEvent.change(deadlineInput, { target: { value: getFutureDateString(7) } });

      const submitButton = screen.getByLabelText(/criar job/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toHaveTextContent('Criando...');
      });

      // Close modal
      rerender(
        <CreateJobModal
          isOpen={false}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );

      // Reopen modal
      rerender(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );

      const newSubmitButton = screen.getByLabelText(/criar job/i);
      expect(newSubmitButton).toHaveTextContent('Criar Job');
    });
  });

  // Additional edge cases
  describe('Edge Cases', () => {
    it('should handle empty clients list', () => {
      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={[]}
        />
      );
      const clientSelect = screen.getByLabelText(/cliente/i);
      expect(clientSelect).toBeInTheDocument();
      expect(screen.getByText('Selecione um cliente')).toBeInTheDocument();
    });

    it('should handle network error', async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error('Network error'))) as any;

      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );

      const titleInput = screen.getByLabelText(/título do job/i);
      const clientSelect = screen.getByLabelText(/cliente/i);
      const deadlineInput = screen.getByLabelText(/deadline/i);

      await userEvent.type(titleInput, 'Network Error Test');
      await userEvent.selectOptions(clientSelect, '1');
      fireEvent.change(deadlineInput, { target: { value: getFutureDateString(7) } });

      const submitButton = screen.getByLabelText(/criar job/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Network error');
      });
    });

    it('should handle form submission with enter key', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                id: 'enter-key-job',
                title: 'Enter Key Test',
                clientId: '1',
                deadline: getFutureDateString(7),
                status: 'briefing',
              },
            }),
        })
      ) as any;

      render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          clients={mockClients}
        />
      );

      const titleInput = screen.getByLabelText(/título do job/i);
      const clientSelect = screen.getByLabelText(/cliente/i);
      const deadlineInput = screen.getByLabelText(/deadline/i);

      await userEvent.type(titleInput, 'Enter Key Test');
      await userEvent.selectOptions(clientSelect, '1');
      fireEvent.change(deadlineInput, { target: { value: getFutureDateString(7) } });

      // Submit form with Enter key
      fireEvent.submit(screen.getByRole('form'));

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('should handle clients prop update', () => {
      const { rerender } = render(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={mockClients}
        />
      );

      expect(screen.getByText('Acme Corp - Acme Corporation')).toBeInTheDocument();

      const newClients: Client[] = [
        {
          id: 3,
          name: 'New Client',
          company: 'New Company',
          email: null,
          phone: null,
          tax_id: null,
          address: null,
          city: null,
          state: null,
          country: null,
          industry: null,
        },
      ];

      rerender(
        <CreateJobModal
          isOpen={true}
          onClose={mockOnClose}
          clients={newClients}
        />
      );

      expect(screen.getByText('New Client - New Company')).toBeInTheDocument();
      expect(screen.queryByText('Acme Corp - Acme Corporation')).not.toBeInTheDocument();
    });
  });
});
