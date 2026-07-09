/**
 * JobCard Component Tests
 *
 * Comprehensive test suite for JobCard component covering:
 * - Component rendering and structure
 * - Title, client, deadline display
 * - Urgency indicator logic
 * - Status border colors
 * - Progress bar integration
 * - Quick action buttons
 * - Click event handling
 * - Hover animations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { JobCard, Job, JobStatus } from './JobCard';

// Mock child components
vi.mock('@/components/base/GlassCard', () => ({
  GlassCard: ({
    children,
    onClick,
    hover,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    hover?: boolean;
    className?: string;
    padding?: string;
    borderRadius?: string;
  }) => (
    <div onClick={onClick} data-hover={hover} data-testid="glass-card" className={className}>
      {children}
    </div>
  ),
}));

vi.mock('@/components/base/ProgressBar', () => ({
  ProgressBar: ({
    value,
    color,
    showPercentage,
  }: {
    value: number;
    color: string;
    showPercentage: boolean;
  }) => (
    <div data-testid="progress-bar" data-value={value} data-color={color} data-show-percentage={showPercentage}>
      Progress: {value}%
    </div>
  ),
}));

vi.mock('@/components/base/QuickActionButton', () => ({
  QuickActionButton: ({
    label,
    onClick,
    variant,
    size,
  }: {
    label: string;
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
    variant: string;
    size: string;
  }) => (
    <button onClick={onClick} data-variant={variant} data-size={size}>
      {label}
    </button>
  ),
}));

describe('JobCard', () => {
  const mockJob: Job = {
    id: '1',
    title: 'Product Launch Video',
    client: 'Acme Corp',
    status: 'production',
    deadline: '2024-12-31',
    daysLeft: 5,
    progress: 65,
    urgent: false,
  };

  const mockHandlers = {
    onQuickAction: vi.fn(),
    onCardClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Component rendering
  describe('Component Rendering', () => {
    it('should render without crashing', () => {
      expect(() => render(<JobCard job={mockJob} />)).not.toThrow();
    });

    it('should render within GlassCard wrapper', () => {
      render(<JobCard job={mockJob} />);
      expect(screen.getByTestId('glass-card')).toBeInTheDocument();
    });

    it('should enable hover effect on GlassCard', () => {
      render(<JobCard job={mockJob} />);
      const glassCard = screen.getByTestId('glass-card');
      expect(glassCard).toHaveAttribute('data-hover', 'true');
    });

    it('should accept className prop', () => {
      const { container } = render(<JobCard job={mockJob} className="custom-class" />);
      expect(container.querySelector('.job-card.custom-class')).toBeInTheDocument();
    });
  });

  // Title display
  describe('Title Display', () => {
    it('should display job title', () => {
      render(<JobCard job={mockJob} />);
      expect(screen.getByText('Product Launch Video')).toBeInTheDocument();
    });

    it('should render title as h3', () => {
      render(<JobCard job={mockJob} />);
      const title = screen.getByText('Product Launch Video');
      expect(title.tagName).toBe('H3');
    });

    it('should apply correct title styling', () => {
      render(<JobCard job={mockJob} />);
      const title = screen.getByText('Product Launch Video');
      expect(title).toHaveStyle({
        fontSize: '24px',
        fontWeight: '700',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      });
    });

    it('should truncate long titles with ellipsis', () => {
      const longTitleJob = { ...mockJob, title: 'This is a very long job title that should be truncated' };
      render(<JobCard job={longTitleJob} />);
      const title = screen.getByText(longTitleJob.title);
      expect(title).toHaveStyle({
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      });
    });

    it('should show full title in title attribute', () => {
      render(<JobCard job={mockJob} />);
      const title = screen.getByText('Product Launch Video');
      expect(title).toHaveAttribute('title', 'Product Launch Video');
    });
  });

  // Client display
  describe('Client Display', () => {
    it('should display client name with "Cliente:" prefix', () => {
      render(<JobCard job={mockJob} />);
      expect(screen.getByText('Cliente: Acme Corp')).toBeInTheDocument();
    });

    it('should apply correct client styling', () => {
      render(<JobCard job={mockJob} />);
      const client = screen.getByText('Cliente: Acme Corp');
      expect(client).toHaveStyle({
        fontSize: '14px',
      });
    });
  });

  // Deadline display
  describe('Deadline Display', () => {
    it('should display deadline with days left', () => {
      render(<JobCard job={mockJob} />);
      expect(screen.getByText(/Deadline: 2024-12-31 \(5 dias\)/)).toBeInTheDocument();
    });

    it('should display correct format', () => {
      const customJob = { ...mockJob, deadline: '2025-01-15', daysLeft: 20 };
      render(<JobCard job={customJob} />);
      expect(screen.getByText(/Deadline: 2025-01-15 \(20 dias\)/)).toBeInTheDocument();
    });
  });

  // Urgency indicator
  describe('Urgency Indicator', () => {
    it('should show red indicator when urgent=true', () => {
      const urgentJob = { ...mockJob, urgent: true, daysLeft: 2 };
      render(<JobCard job={urgentJob} />);
      const indicator = screen.getByRole('img', { name: /urgent/i });
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveTextContent('🔴');
    });

    it('should show red indicator when daysLeft < 3', () => {
      const urgentJob = { ...mockJob, urgent: false, daysLeft: 2 };
      render(<JobCard job={urgentJob} />);
      expect(screen.getByRole('img', { name: /urgent/i })).toBeInTheDocument();
    });

    it('should apply red text color when urgent', () => {
      const urgentJob = { ...mockJob, urgent: true, daysLeft: 2 };
      const { container } = render(<JobCard job={urgentJob} />);
      const deadlineText = container.querySelector('div[style*="color: #ef4444"]');
      expect(deadlineText).toBeInTheDocument();
    });

    it('should not show indicator when daysLeft >= 3', () => {
      const notUrgentJob = { ...mockJob, urgent: false, daysLeft: 5 };
      render(<JobCard job={notUrgentJob} />);
      expect(screen.queryByRole('img', { name: /urgent/i })).not.toBeInTheDocument();
    });

    it('should not show indicator when urgent=false and daysLeft >= 3', () => {
      render(<JobCard job={mockJob} />);
      expect(screen.queryByRole('img', { name: /urgent/i })).not.toBeInTheDocument();
    });
  });

  // Status border colors
  describe('Status Border Colors', () => {
    const statusTests: Array<{ status: JobStatus; color: string }> = [
      { status: 'briefing', color: '#f59e0b' },
      { status: 'production', color: '#FF6B00' },
      { status: 'review', color: '#3b82f6' },
      { status: 'delivered', color: '#10b981' },
    ];

    statusTests.forEach(({ status, color }) => {
      it(`should apply ${color} border for ${status} status`, () => {
        const statusJob = { ...mockJob, status };
        const { container } = render(<JobCard job={statusJob} />);
        const border = container.querySelector(`div[style*="background-color: ${color}"]`);
        expect(border).toBeInTheDocument();
      });
    });

    it('should render border as 2px solid', () => {
      const { container } = render(<JobCard job={mockJob} />);
      const border = container.querySelector('div[style*="width: 2px"]');
      expect(border).toBeInTheDocument();
    });

    it('should position border on left side', () => {
      const { container } = render(<JobCard job={mockJob} />);
      const border = container.querySelector('div[style*="left: -24px"]');
      expect(border).toBeInTheDocument();
    });
  });

  // Progress bar
  describe('Progress Bar', () => {
    it('should render ProgressBar component', () => {
      render(<JobCard job={mockJob} />);
      expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
    });

    it('should pass correct progress value', () => {
      render(<JobCard job={mockJob} />);
      const progressBar = screen.getByTestId('progress-bar');
      expect(progressBar).toHaveAttribute('data-value', '65');
    });

    it('should pass status-matched color', () => {
      render(<JobCard job={mockJob} />);
      const progressBar = screen.getByTestId('progress-bar');
      expect(progressBar).toHaveAttribute('data-color', '#FF6B00');
    });

    it('should show percentage', () => {
      render(<JobCard job={mockJob} />);
      const progressBar = screen.getByTestId('progress-bar');
      expect(progressBar).toHaveAttribute('data-show-percentage', 'true');
    });

    it('should match color with status border', () => {
      const reviewJob = { ...mockJob, status: 'review' as JobStatus };
      render(<JobCard job={reviewJob} />);
      const progressBar = screen.getByTestId('progress-bar');
      expect(progressBar).toHaveAttribute('data-color', '#3b82f6');
    });
  });

  // Quick action buttons
  describe('Quick Action Buttons', () => {
    it('should render three quick action buttons', () => {
      render(<JobCard job={mockJob} />);
      expect(screen.getByRole('button', { name: /briefing/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /review/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /hub/i })).toBeInTheDocument();
    });

    it('should render buttons with ghost variant', () => {
      render(<JobCard job={mockJob} />);
      const buttons = screen.getAllByRole('button');
      buttons.slice(0, 3).forEach((button) => {
        expect(button).toHaveAttribute('data-variant', 'ghost');
      });
    });

    it('should render buttons with sm size', () => {
      render(<JobCard job={mockJob} />);
      const buttons = screen.getAllByRole('button');
      buttons.slice(0, 3).forEach((button) => {
        expect(button).toHaveAttribute('data-size', 'sm');
      });
    });

    it('should call onQuickAction with briefing action', () => {
      render(<JobCard job={mockJob} onQuickAction={mockHandlers.onQuickAction} />);
      const briefingButton = screen.getByRole('button', { name: /briefing/i });
      fireEvent.click(briefingButton);
      expect(mockHandlers.onQuickAction).toHaveBeenCalledWith('briefing', '1');
    });

    it('should call onQuickAction with review action', () => {
      render(<JobCard job={mockJob} onQuickAction={mockHandlers.onQuickAction} />);
      const reviewButton = screen.getByRole('button', { name: /review/i });
      fireEvent.click(reviewButton);
      expect(mockHandlers.onQuickAction).toHaveBeenCalledWith('review', '1');
    });

    it('should call onQuickAction with hub action', () => {
      render(<JobCard job={mockJob} onQuickAction={mockHandlers.onQuickAction} />);
      const hubButton = screen.getByRole('button', { name: /hub/i });
      fireEvent.click(hubButton);
      expect(mockHandlers.onQuickAction).toHaveBeenCalledWith('hub', '1');
    });

    it('should not crash when onQuickAction is not provided', () => {
      render(<JobCard job={mockJob} />);
      const briefingButton = screen.getByRole('button', { name: /briefing/i });
      expect(() => fireEvent.click(briefingButton)).not.toThrow();
    });
  });

  // Card click handling
  describe('Card Click Handling', () => {
    it('should call onCardClick when card is clicked', () => {
      render(<JobCard job={mockJob} onCardClick={mockHandlers.onCardClick} />);
      const card = screen.getByTestId('glass-card');
      fireEvent.click(card);
      expect(mockHandlers.onCardClick).toHaveBeenCalledWith('1');
    });

    it('should pass correct job id to onCardClick', () => {
      const customJob = { ...mockJob, id: 'custom-id-123' };
      render(<JobCard job={customJob} onCardClick={mockHandlers.onCardClick} />);
      const card = screen.getByTestId('glass-card');
      fireEvent.click(card);
      expect(mockHandlers.onCardClick).toHaveBeenCalledWith('custom-id-123');
    });

    it('should not crash when onCardClick is not provided', () => {
      render(<JobCard job={mockJob} />);
      const card = screen.getByTestId('glass-card');
      expect(() => fireEvent.click(card)).not.toThrow();
    });

    it('should prevent card click when button is clicked (stopPropagation)', () => {
      render(
        <JobCard
          job={mockJob}
          onCardClick={mockHandlers.onCardClick}
          onQuickAction={mockHandlers.onQuickAction}
        />
      );
      const briefingButton = screen.getByRole('button', { name: /briefing/i });
      fireEvent.click(briefingButton);

      // onCardClick should not be called when button is clicked
      expect(mockHandlers.onQuickAction).toHaveBeenCalled();
      expect(mockHandlers.onCardClick).not.toHaveBeenCalled();
    });
  });

  // Edge cases
  describe('Edge Cases', () => {
    it('should handle 0 days left', () => {
      const zeroDaysJob = { ...mockJob, daysLeft: 0 };
      render(<JobCard job={zeroDaysJob} />);
      expect(screen.getByText(/0 dias/)).toBeInTheDocument();
    });

    it('should handle negative days left (overdue)', () => {
      const overdueJob = { ...mockJob, daysLeft: -5 };
      render(<JobCard job={overdueJob} />);
      expect(screen.getByText(/-5 dias/)).toBeInTheDocument();
    });

    it('should handle 0% progress', () => {
      const zeroProgressJob = { ...mockJob, progress: 0 };
      render(<JobCard job={zeroProgressJob} />);
      const progressBar = screen.getByTestId('progress-bar');
      expect(progressBar).toHaveAttribute('data-value', '0');
    });

    it('should handle 100% progress', () => {
      const completeJob = { ...mockJob, progress: 100 };
      render(<JobCard job={completeJob} />);
      const progressBar = screen.getByTestId('progress-bar');
      expect(progressBar).toHaveAttribute('data-value', '100');
    });

    it('should handle empty client name', () => {
      const noClientJob = { ...mockJob, client: '' };
      render(<JobCard job={noClientJob} />);
      expect(screen.getByText('Cliente:')).toBeInTheDocument();
    });

    it('should handle very long client name', () => {
      const longClientJob = { ...mockJob, client: 'Very Long Client Name Corporation International Limited' };
      render(<JobCard job={longClientJob} />);
      expect(screen.getByText(/Cliente: Very Long Client Name/)).toBeInTheDocument();
    });

    it('should handle all status types', () => {
      const statuses: JobStatus[] = ['briefing', 'production', 'review', 'delivered'];
      statuses.forEach((status) => {
        const { unmount } = render(<JobCard job={{ ...mockJob, status }} />);
        expect(screen.getByTestId('glass-card')).toBeInTheDocument();
        unmount();
      });
    });
  });

  // Layout and styling
  describe('Layout and Styling', () => {
    it('should apply correct gap between elements', () => {
      const { container } = render(<JobCard job={mockJob} />);
      const content = container.querySelector('div[style*="gap: 12px"]');
      expect(content).toBeInTheDocument();
    });

    it('should apply correct gap between buttons', () => {
      const { container } = render(<JobCard job={mockJob} />);
      const buttonContainer = container.querySelector('div[style*="gap: 8px"]');
      expect(buttonContainer).toBeInTheDocument();
    });

    it('should use flexbox layout', () => {
      const { container } = render(<JobCard job={mockJob} />);
      const content = container.querySelector('div[style*="display: flex"]');
      expect(content).toBeInTheDocument();
    });
  });
});
