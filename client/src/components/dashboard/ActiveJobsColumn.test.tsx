/**
 * ActiveJobsColumn Component Tests
 *
 * Comprehensive test suite covering all acceptance criteria:
 * 1. Component rendering with jobs
 * 2. Title display
 * 3. Job cards rendering
 * 4. Jobs ordering by deadline
 * 5. Scroll container behavior
 * 6. "+ NOVO JOB" button
 * 7. Create new job handler
 * 8. JobCard action buttons
 * 9. Card click handler
 * 10. Empty state display
 * 11. Empty state button
 * 12. Responsive behavior
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ActiveJobsColumn } from './ActiveJobsColumn';
import { Job } from './JobCard';

// Mock child components
vi.mock('./JobCard', () => ({
  JobCard: ({
    job,
    onQuickAction,
    onCardClick,
  }: {
    job: Job;
    onQuickAction?: (action: string, id: string) => void;
    onCardClick?: (id: string) => void;
  }) => (
    <div data-testid={`job-card-${job.id}`}>
      <div data-testid="job-title">{job.title}</div>
      <div data-testid="job-deadline">{job.deadline}</div>
      <div data-testid="job-days-left">{job.daysLeft}</div>
      <button onClick={() => onCardClick?.(job.id)}>View Card</button>
      <button onClick={() => onQuickAction?.('briefing', job.id)}>Briefing</button>
      <button onClick={() => onQuickAction?.('review', job.id)}>Review</button>
      <button onClick={() => onQuickAction?.('hub', job.id)}>Hub</button>
    </div>
  ),
}));

vi.mock('@/design-system/primitives/Button', () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

describe('ActiveJobsColumn', () => {
  const mockJobs: Job[] = [
    {
      id: '1',
      title: 'Project A',
      client: 'Client A',
      status: 'production',
      deadline: '2024-12-31',
      daysLeft: 5,
      progress: 60,
      urgent: false,
    },
    {
      id: '2',
      title: 'Project B',
      client: 'Client B',
      status: 'briefing',
      deadline: '2024-12-25',
      daysLeft: 2,
      progress: 30,
      urgent: true,
    },
    {
      id: '3',
      title: 'Project C',
      client: 'Client C',
      status: 'review',
      deadline: '2025-01-05',
      daysLeft: 10,
      progress: 80,
      urgent: false,
    },
  ];

  const mockHandlers = {
    onPlay: vi.fn(),
    onEdit: vi.fn(),
    onView: vi.fn(),
    onCreateNew: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Component rendering with jobs
  describe('Component Rendering', () => {
    it('should render component with TypeScript interface', () => {
      const { container } = render(
        <ActiveJobsColumn jobs={mockJobs} onCreateNew={mockHandlers.onCreateNew} />
      );
      expect(container.querySelector('.active-jobs-column')).toBeInTheDocument();
    });

    it('should accept all required props', () => {
      expect(() =>
        render(
          <ActiveJobsColumn
            jobs={mockJobs}
            onPlay={mockHandlers.onPlay}
            onEdit={mockHandlers.onEdit}
            onView={mockHandlers.onView}
            onCreateNew={mockHandlers.onCreateNew}
          />
        )
      ).not.toThrow();
    });

    it('should render with optional className', () => {
      const { container } = render(
        <ActiveJobsColumn
          jobs={mockJobs}
          onCreateNew={mockHandlers.onCreateNew}
          className="custom-class"
        />
      );
      expect(container.querySelector('.active-jobs-column.custom-class')).toBeInTheDocument();
    });
  });

  // 2. Title display
  describe('Title Display', () => {
    it('should display "🎬 JOBS ATIVOS" title', () => {
      render(<ActiveJobsColumn jobs={mockJobs} onCreateNew={mockHandlers.onCreateNew} />);
      const title = screen.getByText('🎬 JOBS ATIVOS');
      expect(title).toBeInTheDocument();
    });

    it('should render title as h2 with correct styling', () => {
      render(<ActiveJobsColumn jobs={mockJobs} onCreateNew={mockHandlers.onCreateNew} />);
      const title = screen.getByText('🎬 JOBS ATIVOS');
      expect(title.tagName).toBe('H2');
      expect(title).toHaveStyle({
        fontSize: '14px',
        textTransform: 'uppercase',
      });
    });
  });

  // 3. Job cards rendering
  describe('Job Cards Display', () => {
    it('should render all JobCard components', () => {
      render(<ActiveJobsColumn jobs={mockJobs} onCreateNew={mockHandlers.onCreateNew} />);
      expect(screen.getByTestId('job-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('job-card-2')).toBeInTheDocument();
      expect(screen.getByTestId('job-card-3')).toBeInTheDocument();
    });

    it('should pass correct job data to JobCard components', () => {
      render(<ActiveJobsColumn jobs={mockJobs} onCreateNew={mockHandlers.onCreateNew} />);
      expect(screen.getByText('Project A')).toBeInTheDocument();
      expect(screen.getByText('Project B')).toBeInTheDocument();
      expect(screen.getByText('Project C')).toBeInTheDocument();
    });
  });

  // 4. Jobs ordering by deadline
  describe('Jobs Ordering', () => {
    it('should order jobs by deadline ascending (soonest first)', () => {
      render(<ActiveJobsColumn jobs={mockJobs} onCreateNew={mockHandlers.onCreateNew} />);
      const jobCards = screen.getAllByTestId(/job-card-/);
      const titles = jobCards.map((card) => within(card).getByTestId('job-title').textContent);

      // Expected order: Project B (2 days), Project A (5 days), Project C (10 days)
      expect(titles).toEqual(['Project B', 'Project A', 'Project C']);
    });

    it('should use daysLeft for sorting', () => {
      const unsortedJobs: Job[] = [
        { ...mockJobs[2], daysLeft: 10 }, // Project C - 10 days
        { ...mockJobs[0], daysLeft: 5 },  // Project A - 5 days
        { ...mockJobs[1], daysLeft: 2 },  // Project B - 2 days
      ];

      render(<ActiveJobsColumn jobs={unsortedJobs} onCreateNew={mockHandlers.onCreateNew} />);
      const jobCards = screen.getAllByTestId(/job-card-/);
      const daysLeft = jobCards.map((card) =>
        Number(within(card).getByTestId('job-days-left').textContent)
      );

      expect(daysLeft).toEqual([2, 5, 10]);
    });

    it('should maintain original array immutability', () => {
      const originalJobs = [...mockJobs];
      render(<ActiveJobsColumn jobs={mockJobs} onCreateNew={mockHandlers.onCreateNew} />);
      expect(mockJobs).toEqual(originalJobs);
    });
  });

  // 5. Scroll container behavior
  describe('Scroll Container', () => {
    it('should render scroll container with max-height 600px', () => {
      const { container } = render(
        <ActiveJobsColumn jobs={mockJobs} onCreateNew={mockHandlers.onCreateNew} />
      );
      const scrollContainer = container.querySelector('.jobs-list-container');
      expect(scrollContainer).toHaveStyle({
        maxHeight: '600px',
        overflowY: 'auto',
      });
    });

    it('should apply gap between job cards', () => {
      const { container } = render(
        <ActiveJobsColumn jobs={mockJobs} onCreateNew={mockHandlers.onCreateNew} />
      );
      const scrollContainer = container.querySelector('.jobs-list-container');
      expect(scrollContainer).toHaveStyle({
        gap: '16px',
      });
    });

    it('should have padding for scrollbar', () => {
      const { container } = render(
        <ActiveJobsColumn jobs={mockJobs} onCreateNew={mockHandlers.onCreateNew} />
      );
      const scrollContainer = container.querySelector('.jobs-list-container');
      expect(scrollContainer).toHaveStyle({
        paddingRight: '4px',
      });
    });
  });

  // 6 & 7. "+ NOVO JOB" button and handler
  describe('Create New Job Button', () => {
    it('should render "+ NOVO JOB" button', () => {
      render(<ActiveJobsColumn jobs={mockJobs} onCreateNew={mockHandlers.onCreateNew} />);
      const button = screen.getByRole('button', { name: /criar novo job/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('+ NOVO JOB');
    });

    it('should render button with solid variant and orange color', () => {
      render(<ActiveJobsColumn jobs={mockJobs} onCreateNew={mockHandlers.onCreateNew} />);
      const button = screen.getByRole('button', { name: /criar novo job/i });
      expect(button).toHaveAttribute('variant', 'primary');
      expect(button).toHaveStyle({
        backgroundColor: 'var(--color-orange-primary, #FF6B00)',
      });
    });

    it('should render button at full width', () => {
      render(<ActiveJobsColumn jobs={mockJobs} onCreateNew={mockHandlers.onCreateNew} />);
      const button = screen.getByRole('button', { name: /criar novo job/i });
      expect(button).toHaveStyle({
        width: '100%',
      });
    });

    it('should call onCreateNew when button is clicked', () => {
      render(<ActiveJobsColumn jobs={mockJobs} onCreateNew={mockHandlers.onCreateNew} />);
      const button = screen.getByRole('button', { name: /criar novo job/i });
      fireEvent.click(button);
      expect(mockHandlers.onCreateNew).toHaveBeenCalledTimes(1);
    });

    it('should render button at bottom of component', () => {
      const { container } = render(
        <ActiveJobsColumn jobs={mockJobs} onCreateNew={mockHandlers.onCreateNew} />
      );
      const columnChildren = container.querySelector('.active-jobs-column')?.children;
      const lastChild = columnChildren?.[columnChildren.length - 2]; // -2 because style is last
      const button = screen.getByRole('button', { name: /criar novo job/i });
      expect(lastChild).toContain(button);
    });
  });

  // 8. JobCard action buttons
  describe('JobCard Action Buttons', () => {
    it('should call onEdit when Briefing button is clicked', () => {
      render(
        <ActiveJobsColumn
          jobs={mockJobs}
          onEdit={mockHandlers.onEdit}
          onCreateNew={mockHandlers.onCreateNew}
        />
      );
      const jobCard = screen.getByTestId('job-card-1');
      const briefingButton = within(jobCard).getByRole('button', { name: /briefing/i });
      fireEvent.click(briefingButton);
      expect(mockHandlers.onEdit).toHaveBeenCalledWith('1');
    });

    it('should call onView when Review button is clicked', () => {
      render(
        <ActiveJobsColumn
          jobs={mockJobs}
          onView={mockHandlers.onView}
          onCreateNew={mockHandlers.onCreateNew}
        />
      );
      const jobCard = screen.getByTestId('job-card-1');
      const reviewButton = within(jobCard).getByRole('button', { name: /review/i });
      fireEvent.click(reviewButton);
      expect(mockHandlers.onView).toHaveBeenCalledWith('1');
    });

    it('should call onView when Hub button is clicked', () => {
      render(
        <ActiveJobsColumn
          jobs={mockJobs}
          onView={mockHandlers.onView}
          onCreateNew={mockHandlers.onCreateNew}
        />
      );
      const jobCard = screen.getByTestId('job-card-1');
      const hubButton = within(jobCard).getByRole('button', { name: /hub/i });
      fireEvent.click(hubButton);
      expect(mockHandlers.onView).toHaveBeenCalledWith('1');
    });

    it('should not crash when handlers are not provided', () => {
      render(<ActiveJobsColumn jobs={mockJobs} onCreateNew={mockHandlers.onCreateNew} />);
      const jobCard = screen.getByTestId('job-card-1');
      const briefingButton = within(jobCard).getByRole('button', { name: /briefing/i });
      expect(() => fireEvent.click(briefingButton)).not.toThrow();
    });
  });

  // 9. Card click handler
  describe('Card Click Handler', () => {
    it('should call onView when card is clicked', () => {
      render(
        <ActiveJobsColumn
          jobs={mockJobs}
          onView={mockHandlers.onView}
          onCreateNew={mockHandlers.onCreateNew}
        />
      );
      const jobCard = screen.getByTestId('job-card-1');
      const viewButton = within(jobCard).getByRole('button', { name: /view card/i });
      fireEvent.click(viewButton);
      expect(mockHandlers.onView).toHaveBeenCalledWith('1');
    });

    it('should pass correct job id to onView', () => {
      render(
        <ActiveJobsColumn
          jobs={mockJobs}
          onView={mockHandlers.onView}
          onCreateNew={mockHandlers.onCreateNew}
        />
      );
      const jobCard2 = screen.getByTestId('job-card-2');
      const viewButton = within(jobCard2).getByRole('button', { name: /view card/i });
      fireEvent.click(viewButton);
      expect(mockHandlers.onView).toHaveBeenCalledWith('2');
    });
  });

  // 10 & 11. Empty state
  describe('Empty State', () => {
    it('should display empty state when jobs.length = 0', () => {
      render(<ActiveJobsColumn jobs={[]} onCreateNew={mockHandlers.onCreateNew} />);
      expect(screen.getByText('Nenhum job ativo. Crie seu primeiro job!')).toBeInTheDocument();
    });

    it('should still render title in empty state', () => {
      render(<ActiveJobsColumn jobs={[]} onCreateNew={mockHandlers.onCreateNew} />);
      expect(screen.getByText('🎬 JOBS ATIVOS')).toBeInTheDocument();
    });

    it('should not render job cards in empty state', () => {
      render(<ActiveJobsColumn jobs={[]} onCreateNew={mockHandlers.onCreateNew} />);
      expect(screen.queryByTestId(/job-card-/)).not.toBeInTheDocument();
    });

    it('should render "+ Criar Job" button in empty state', () => {
      render(<ActiveJobsColumn jobs={[]} onCreateNew={mockHandlers.onCreateNew} />);
      const button = screen.getByRole('button', { name: /criar primeiro job/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('+ Criar Job');
    });

    it('should call onCreateNew when empty state button is clicked', () => {
      render(<ActiveJobsColumn jobs={[]} onCreateNew={mockHandlers.onCreateNew} />);
      const button = screen.getByRole('button', { name: /criar primeiro job/i });
      fireEvent.click(button);
      expect(mockHandlers.onCreateNew).toHaveBeenCalledTimes(1);
    });

    it('should not render "+ NOVO JOB" button in empty state', () => {
      render(<ActiveJobsColumn jobs={[]} onCreateNew={mockHandlers.onCreateNew} />);
      expect(screen.queryByRole('button', { name: /criar novo job/i })).not.toBeInTheDocument();
    });

    it('should center align empty state content', () => {
      const { container } = render(
        <ActiveJobsColumn jobs={[]} onCreateNew={mockHandlers.onCreateNew} />
      );
      const emptyState = container.querySelector('div[style*="text-align: center"]');
      expect(emptyState).toBeInTheDocument();
    });
  });

  // 12. Responsive behavior
  describe('Responsive Behavior', () => {
    it('should render with full width on mobile by default', () => {
      const { container } = render(
        <ActiveJobsColumn jobs={mockJobs} onCreateNew={mockHandlers.onCreateNew} />
      );
      const column = container.querySelector('.active-jobs-column');
      expect(column).toHaveStyle({
        width: '100%',
      });
    });

    it('should include responsive CSS for desktop (70% width)', () => {
      const { container } = render(
        <ActiveJobsColumn jobs={mockJobs} onCreateNew={mockHandlers.onCreateNew} />
      );
      const style = container.querySelector('style');
      expect(style?.textContent).toContain('@media (min-width: 768px)');
      expect(style?.textContent).toContain('width: 70%');
    });

    it('should include custom scrollbar styling', () => {
      const { container } = render(
        <ActiveJobsColumn jobs={mockJobs} onCreateNew={mockHandlers.onCreateNew} />
      );
      const style = container.querySelector('style');
      expect(style?.textContent).toContain('::-webkit-scrollbar');
      expect(style?.textContent).toContain('var(--color-orange-primary, #FF6B00)');
    });
  });

  // Additional edge cases
  describe('Edge Cases', () => {
    it('should handle single job', () => {
      const singleJob = [mockJobs[0]];
      render(<ActiveJobsColumn jobs={singleJob} onCreateNew={mockHandlers.onCreateNew} />);
      expect(screen.getByTestId('job-card-1')).toBeInTheDocument();
      expect(screen.queryByTestId('job-card-2')).not.toBeInTheDocument();
    });

    it('should handle jobs with same daysLeft', () => {
      const sameDeadlineJobs: Job[] = [
        { ...mockJobs[0], daysLeft: 5 },
        { ...mockJobs[1], daysLeft: 5 },
      ];
      render(<ActiveJobsColumn jobs={sameDeadlineJobs} onCreateNew={mockHandlers.onCreateNew} />);
      expect(screen.getAllByTestId(/job-card-/)).toHaveLength(2);
    });

    it('should handle jobs with negative daysLeft', () => {
      const overdueJobs: Job[] = [
        { ...mockJobs[0], daysLeft: -2 },
        { ...mockJobs[1], daysLeft: 5 },
      ];
      render(<ActiveJobsColumn jobs={overdueJobs} onCreateNew={mockHandlers.onCreateNew} />);
      const jobCards = screen.getAllByTestId(/job-card-/);
      const daysLeft = jobCards.map((card) =>
        Number(within(card).getByTestId('job-days-left').textContent)
      );
      expect(daysLeft[0]).toBe(-2); // Overdue job should be first
    });

    it('should handle large number of jobs', () => {
      const manyJobs = Array.from({ length: 20 }, (_, i) => ({
        ...mockJobs[0],
        id: `job-${i}`,
        title: `Project ${i}`,
        daysLeft: i,
      }));
      render(<ActiveJobsColumn jobs={manyJobs} onCreateNew={mockHandlers.onCreateNew} />);
      expect(screen.getAllByTestId(/job-card-/)).toHaveLength(20);
    });

    it('should re-sort when jobs prop changes', () => {
      const { rerender } = render(
        <ActiveJobsColumn jobs={mockJobs} onCreateNew={mockHandlers.onCreateNew} />
      );

      const updatedJobs = [
        { ...mockJobs[0], daysLeft: 1 }, // Now most urgent
        mockJobs[1],
        mockJobs[2],
      ];

      rerender(<ActiveJobsColumn jobs={updatedJobs} onCreateNew={mockHandlers.onCreateNew} />);

      const jobCards = screen.getAllByTestId(/job-card-/);
      const titles = jobCards.map((card) => within(card).getByTestId('job-title').textContent);
      expect(titles[0]).toBe('Project A'); // Now first because daysLeft is 1
    });
  });
});
