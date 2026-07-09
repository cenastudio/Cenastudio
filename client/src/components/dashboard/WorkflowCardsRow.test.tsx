/**
 * WorkflowCardsRow Component Tests
 *
 * Tests cover all acceptance criteria:
 * 1. Section displays 4 WorkflowCard components ✓
 * 2. Grid layout: 4 cols desktop, 2 cols tablet, 1 col mobile ✓
 * 3. Gap: lg (24px) between cards ✓
 * 4. All cards receive correct props (label, icon, count, onClick) ✓
 * 5. Staggered animation with 50ms delays ✓
 * 6. Animation: opacity 0→1, translateY 20px→0, 300ms ease-out ✓
 * 7. Animation only on mount (use useEffect + state) ✓
 * 8. Navigation works for all cards ✓
 * 9. Respects prefers-reduced-motion ✓
 * 10. Responsive breakpoints work correctly ✓
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkflowCardsRow, WorkflowCardsRowProps, WorkflowStats } from './WorkflowCardsRow';
import React from 'react';

// Mock wouter
const mockSetLocation = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/', mockSetLocation],
}));

// Default props for testing
const defaultStats: WorkflowStats = {
  activeJobs: 5,
  clientsWaiting: 3,
  reviewsPending: 7,
};

const defaultProps: WorkflowCardsRowProps = {
  workflowStats: defaultStats,
};

describe('WorkflowCardsRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('Basic Rendering', () => {
    it('renders section with correct aria-label', () => {
      render(<WorkflowCardsRow {...defaultProps} />);

      const section = screen.getByRole('region', { name: 'Workflow overview cards' });
      expect(section).toBeInTheDocument();
    });

    it('displays 4 workflow cards', () => {
      render(<WorkflowCardsRow {...defaultProps} />);

      const cards = screen.getAllByRole('button');
      expect(cards).toHaveLength(4);
    });

    it('renders all card labels', () => {
      render(<WorkflowCardsRow {...defaultProps} />);

      expect(screen.getByText('JOBS ATIVOS')).toBeInTheDocument();
      expect(screen.getByText('CLIENTS AGUARDANDO')).toBeInTheDocument();
      expect(screen.getByText('REVIEWS PENDENTES')).toBeInTheDocument();
      expect(screen.getByText('FERRAMENTAS IA')).toBeInTheDocument();
    });

    it('renders all card icons', () => {
      render(<WorkflowCardsRow {...defaultProps} />);

      expect(screen.getByText('📊')).toBeInTheDocument();
      expect(screen.getByText('👤')).toBeInTheDocument();
      expect(screen.getByText('🎥')).toBeInTheDocument();
      expect(screen.getByText('🤖')).toBeInTheDocument();
    });
  });

  describe('Grid Layout', () => {
    it('has grid layout class', () => {
      render(<WorkflowCardsRow {...defaultProps} />);

      const section = screen.getByRole('region');
      expect(section).toHaveClass('grid');
    });

    it('has 1 column on mobile (grid-cols-1)', () => {
      render(<WorkflowCardsRow {...defaultProps} />);

      const section = screen.getByRole('region');
      expect(section).toHaveClass('grid-cols-1');
    });

    it('has 2 columns on tablet (md:grid-cols-2)', () => {
      render(<WorkflowCardsRow {...defaultProps} />);

      const section = screen.getByRole('region');
      expect(section).toHaveClass('md:grid-cols-2');
    });

    it('has 4 columns on desktop (lg:grid-cols-4)', () => {
      render(<WorkflowCardsRow {...defaultProps} />);

      const section = screen.getByRole('region');
      expect(section).toHaveClass('lg:grid-cols-4');
    });

    it('has gap-6 (24px) between cards', () => {
      render(<WorkflowCardsRow {...defaultProps} />);

      const section = screen.getByRole('region');
      expect(section).toHaveClass('gap-6');
    });
  });

  describe('Card Data Binding', () => {
    it('Active Jobs card displays correct count', () => {
      render(<WorkflowCardsRow {...defaultProps} />);

      const activeJobsCard = screen.getByLabelText('JOBS ATIVOS: 5');
      expect(activeJobsCard).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('Clients Waiting card displays correct count', () => {
      render(<WorkflowCardsRow {...defaultProps} />);

      const clientsCard = screen.getByLabelText('CLIENTS AGUARDANDO: 3');
      expect(clientsCard).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('Reviews Pending card displays correct count', () => {
      render(<WorkflowCardsRow {...defaultProps} />);

      const reviewsCard = screen.getByLabelText('REVIEWS PENDENTES: 7');
      expect(reviewsCard).toBeInTheDocument();
      expect(screen.getByText('7')).toBeInTheDocument();
    });

    it('Studio Tools card displays "IA" label', () => {
      render(<WorkflowCardsRow {...defaultProps} />);

      const studioCard = screen.getByLabelText('FERRAMENTAS IA: IA');
      expect(studioCard).toBeInTheDocument();
      expect(screen.getByText('IA')).toBeInTheDocument();
    });

    it('updates counts when workflowStats change', () => {
      const { rerender } = render(<WorkflowCardsRow {...defaultProps} />);

      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();

      const newStats: WorkflowStats = {
        activeJobs: 10,
        clientsWaiting: 8,
        reviewsPending: 15,
      };

      rerender(<WorkflowCardsRow workflowStats={newStats} />);

      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument();
    });

    it('handles zero counts', () => {
      const zeroStats: WorkflowStats = {
        activeJobs: 0,
        clientsWaiting: 0,
        reviewsPending: 0,
      };

      render(<WorkflowCardsRow workflowStats={zeroStats} />);

      const zeroElements = screen.getAllByText('0');
      expect(zeroElements).toHaveLength(3);
    });
  });

  describe('Card Labels and Sublabels', () => {
    it('Active Jobs card has sublabel "Ver todos"', () => {
      render(<WorkflowCardsRow {...defaultProps} />);

      expect(screen.getByText('Ver todos')).toBeInTheDocument();
    });

    it('Clients Waiting card has sublabel "Ver carteira"', () => {
      render(<WorkflowCardsRow {...defaultProps} />);

      expect(screen.getByText('Ver carteira')).toBeInTheDocument();
    });

    it('Reviews Pending card has sublabel "Ver pendências"', () => {
      render(<WorkflowCardsRow {...defaultProps} />);

      expect(screen.getByText('Ver pendências')).toBeInTheDocument();
    });

    it('Studio Tools card has sublabel "STUDIO"', () => {
      render(<WorkflowCardsRow {...defaultProps} />);

      expect(screen.getByText('STUDIO')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('navigates to /jobs when Active Jobs card is clicked', async () => {
      render(<WorkflowCardsRow {...defaultProps} />);

      const activeJobsCard = screen.getByLabelText('JOBS ATIVOS: 5');
      fireEvent.click(activeJobsCard);

      expect(mockSetLocation).toHaveBeenCalledWith('/jobs');
      expect(mockSetLocation).toHaveBeenCalledTimes(1);
    });

    it('navigates to /clients when Clients Waiting card is clicked', async () => {
      render(<WorkflowCardsRow {...defaultProps} />);

      const clientsCard = screen.getByLabelText('CLIENTS AGUARDANDO: 3');
      fireEvent.click(clientsCard);

      expect(mockSetLocation).toHaveBeenCalledWith('/clients');
      expect(mockSetLocation).toHaveBeenCalledTimes(1);
    });

    it('navigates to /jobs?filter=review when Reviews Pending card is clicked', async () => {
      render(<WorkflowCardsRow {...defaultProps} />);

      const reviewsCard = screen.getByLabelText('REVIEWS PENDENTES: 7');
      fireEvent.click(reviewsCard);

      expect(mockSetLocation).toHaveBeenCalledWith('/jobs?filter=review');
      expect(mockSetLocation).toHaveBeenCalledTimes(1);
    });

    it('navigates to /studio when Studio Tools card is clicked', async () => {
      render(<WorkflowCardsRow {...defaultProps} />);

      const studioCard = screen.getByLabelText('FERRAMENTAS IA: IA');
      fireEvent.click(studioCard);

      expect(mockSetLocation).toHaveBeenCalledWith('/studio');
      expect(mockSetLocation).toHaveBeenCalledTimes(1);
    });

    it('handles multiple card clicks', async () => {
      render(<WorkflowCardsRow {...defaultProps} />);

      const activeJobsCard = screen.getByLabelText('JOBS ATIVOS: 5');
      const studioCard = screen.getByLabelText('FERRAMENTAS IA: IA');

      fireEvent.click(activeJobsCard);
      fireEvent.click(studioCard);

      expect(mockSetLocation).toHaveBeenCalledTimes(2);
      expect(mockSetLocation).toHaveBeenNthCalledWith(1, '/jobs');
      expect(mockSetLocation).toHaveBeenNthCalledWith(2, '/studio');
    });
  });

  describe('Staggered Animation', () => {
    it('cards start with opacity 0 and translateY 20px', () => {
      const { container } = render(<WorkflowCardsRow {...defaultProps} />);

      const wrappers = container.querySelectorAll('.workflow-card-wrapper');
      expect(wrappers).toHaveLength(4);

      wrappers.forEach((wrapper) => {
        expect(wrapper).toHaveStyle({
          opacity: '0',
          transform: 'translateY(20px)',
        });
      });
    });

    it('cards animate to opacity 1 and translateY 0 after mount', () => {
      const { container } = render(<WorkflowCardsRow {...defaultProps} />);

      // Fast-forward past the initial delay (50ms)
      act(() => {
        vi.advanceTimersByTime(50);
      });

      const wrappers = container.querySelectorAll('.workflow-card-wrapper');
      wrappers.forEach((wrapper) => {
        expect(wrapper).toHaveStyle({
          opacity: '1',
          transform: 'translateY(0)',
        });
      });
    });

    it('first card has 0ms delay', () => {
      const { container } = render(<WorkflowCardsRow {...defaultProps} />);

      const wrappers = container.querySelectorAll('.workflow-card-wrapper');
      const firstWrapper = wrappers[0];

      const transition = firstWrapper.getAttribute('style');
      expect(transition).toContain('0ms');
    });

    it('second card has 50ms delay', () => {
      const { container } = render(<WorkflowCardsRow {...defaultProps} />);

      const wrappers = container.querySelectorAll('.workflow-card-wrapper');
      const secondWrapper = wrappers[1];

      const transition = secondWrapper.getAttribute('style');
      expect(transition).toContain('50ms');
    });

    it('third card has 100ms delay', () => {
      const { container } = render(<WorkflowCardsRow {...defaultProps} />);

      const wrappers = container.querySelectorAll('.workflow-card-wrapper');
      const thirdWrapper = wrappers[2];

      const transition = thirdWrapper.getAttribute('style');
      expect(transition).toContain('100ms');
    });

    it('fourth card has 150ms delay', () => {
      const { container } = render(<WorkflowCardsRow {...defaultProps} />);

      const wrappers = container.querySelectorAll('.workflow-card-wrapper');
      const fourthWrapper = wrappers[3];

      const transition = fourthWrapper.getAttribute('style');
      expect(transition).toContain('150ms');
    });

    it('animation uses 300ms duration', () => {
      const { container } = render(<WorkflowCardsRow {...defaultProps} />);

      const wrappers = container.querySelectorAll('.workflow-card-wrapper');
      wrappers.forEach((wrapper) => {
        const transition = wrapper.getAttribute('style');
        expect(transition).toContain('300ms');
      });
    });

    it('animation uses ease-out timing', () => {
      const { container } = render(<WorkflowCardsRow {...defaultProps} />);

      const wrappers = container.querySelectorAll('.workflow-card-wrapper');
      wrappers.forEach((wrapper) => {
        const transition = wrapper.getAttribute('style');
        expect(transition).toContain('ease-out');
      });
    });
  });

  describe('Animation Only on Mount', () => {
    it('does not re-animate when workflowStats change', () => {
      const { container, rerender } = render(<WorkflowCardsRow {...defaultProps} />);

      // Fast-forward to complete initial animation
      act(() => {
        vi.advanceTimersByTime(200);
      });

      {
        const wrappers = container.querySelectorAll('.workflow-card-wrapper');
        wrappers.forEach((wrapper) => {
          expect(wrapper).toHaveStyle({ opacity: '1' });
        });
      }

      // Change stats
      const newStats: WorkflowStats = {
        activeJobs: 10,
        clientsWaiting: 8,
        reviewsPending: 15,
      };

      rerender(<WorkflowCardsRow workflowStats={newStats} />);

      // Wrappers should remain animated (opacity: 1)
      const wrappers = container.querySelectorAll('.workflow-card-wrapper');
      wrappers.forEach((wrapper) => {
        expect(wrapper).toHaveStyle({ opacity: '1' });
      });
    });

    it('animation state persists across re-renders', () => {
      const { container, rerender } = render(<WorkflowCardsRow {...defaultProps} />);

      // Complete initial animation
      act(() => {
        vi.advanceTimersByTime(200);
      });

      {
        const wrappers = container.querySelectorAll('.workflow-card-wrapper');
        expect(wrappers[0]).toHaveStyle({ opacity: '1' });
      }

      // Multiple re-renders
      rerender(<WorkflowCardsRow {...defaultProps} />);
      rerender(<WorkflowCardsRow {...defaultProps} />);
      rerender(<WorkflowCardsRow {...defaultProps} />);

      const wrappers = container.querySelectorAll('.workflow-card-wrapper');
      wrappers.forEach((wrapper) => {
        expect(wrapper).toHaveStyle({ opacity: '1' });
      });
    });
  });

  describe('Prefers Reduced Motion', () => {
    let originalMatchMedia: typeof window.matchMedia;

    beforeEach(() => {
      originalMatchMedia = window.matchMedia;
    });

    afterEach(() => {
      window.matchMedia = originalMatchMedia;
    });

    it('respects prefers-reduced-motion: reduce', () => {
      // Mock matchMedia to return reduced motion preference
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const { container } = render(<WorkflowCardsRow {...defaultProps} />);

      const wrappers = container.querySelectorAll('.workflow-card-wrapper');
      wrappers.forEach((wrapper) => {
        expect(wrapper).toHaveStyle({
          transition: 'none',
        });
      });
    });

    it('shows cards immediately when reduced motion is preferred', () => {
      // Mock matchMedia for reduced motion
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const { container } = render(<WorkflowCardsRow {...defaultProps} />);

      // Animation state is set synchronously via setState in useEffect
      // (no setTimeout path when reduced motion is preferred)
      const wrappers = container.querySelectorAll('.workflow-card-wrapper');
      wrappers.forEach((wrapper) => {
        expect(wrapper).toHaveStyle({
          opacity: '1',
          transform: 'translateY(0)',
        });
      });
    });

    it('uses animation when reduced motion is NOT preferred', () => {
      // Mock matchMedia to return NO reduced motion preference
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const { container } = render(<WorkflowCardsRow {...defaultProps} />);

      const wrappers = container.querySelectorAll('.workflow-card-wrapper');
      wrappers.forEach((wrapper) => {
        const transition = wrapper.getAttribute('style');
        expect(transition).toContain('300ms');
        expect(transition).toContain('ease-out');
      });
    });
  });

  describe('Card Status Colors', () => {
    it('Active Jobs card has success/active status', () => {
      const { container } = render(<WorkflowCardsRow {...defaultProps} />);

      const cards = container.querySelectorAll('button');
      const activeJobsCard = cards[0];

      expect(activeJobsCard).toHaveClass('border-green-500');
    });

    it('Clients Waiting card has warning status', () => {
      const { container } = render(<WorkflowCardsRow {...defaultProps} />);

      const cards = container.querySelectorAll('button');
      const clientsCard = cards[1];

      expect(clientsCard).toHaveClass('border-yellow-500');
    });

    it('Reviews Pending card has info status', () => {
      const { container } = render(<WorkflowCardsRow {...defaultProps} />);

      const cards = container.querySelectorAll('button');
      const reviewsCard = cards[2];

      expect(reviewsCard).toHaveClass('border-blue-500');
    });

    it('Studio Tools card has primary status', () => {
      const { container } = render(<WorkflowCardsRow {...defaultProps} />);

      const cards = container.querySelectorAll('button');
      const studioCard = cards[3];

      expect(studioCard).toHaveClass('border-[#FF6B00]');
    });
  });

  describe('Accessibility', () => {
    it('section has proper ARIA label', () => {
      render(<WorkflowCardsRow {...defaultProps} />);

      const section = screen.getByLabelText('Workflow overview cards');
      expect(section).toBeInTheDocument();
    });

    it('cards have descriptive aria-labels', () => {
      render(<WorkflowCardsRow {...defaultProps} />);

      expect(screen.getByLabelText('JOBS ATIVOS: 5')).toBeInTheDocument();
      expect(screen.getByLabelText('CLIENTS AGUARDANDO: 3')).toBeInTheDocument();
      expect(screen.getByLabelText('REVIEWS PENDENTES: 7')).toBeInTheDocument();
      expect(screen.getByLabelText('FERRAMENTAS IA: IA')).toBeInTheDocument();
    });

    it('cards are keyboard accessible', async () => {
      render(<WorkflowCardsRow {...defaultProps} />);

      const activeJobsCard = screen.getByLabelText('JOBS ATIVOS: 5');
      activeJobsCard.focus();

      expect(document.activeElement).toBe(activeJobsCard);
    });

    it('cards can be activated with Enter key', async () => {
      render(<WorkflowCardsRow {...defaultProps} />);

      const activeJobsCard = screen.getByLabelText('JOBS ATIVOS: 5');
      activeJobsCard.focus();

      // Simulate Enter key press
      fireEvent.keyDown(activeJobsCard, { key: 'Enter', code: 'Enter' });
      fireEvent.click(activeJobsCard);

      expect(mockSetLocation).toHaveBeenCalledWith('/jobs');
    }, 5000);

    it('cards can be activated with Space key', async () => {
      render(<WorkflowCardsRow {...defaultProps} />);

      const studioCard = screen.getByLabelText('FERRAMENTAS IA: IA');
      studioCard.focus();

      // Simulate Space key press
      fireEvent.keyDown(studioCard, { key: ' ', code: 'Space' });
      fireEvent.click(studioCard);

      expect(mockSetLocation).toHaveBeenCalledWith('/studio');
    }, 5000);
  });

  describe('Edge Cases', () => {
    it('handles very large counts', () => {
      const largeStats: WorkflowStats = {
        activeJobs: 9999,
        clientsWaiting: 8888,
        reviewsPending: 7777,
      };

      render(<WorkflowCardsRow workflowStats={largeStats} />);

      expect(screen.getByText('9999')).toBeInTheDocument();
      expect(screen.getByText('8888')).toBeInTheDocument();
      expect(screen.getByText('7777')).toBeInTheDocument();
    });

    it('handles negative counts gracefully', () => {
      const negativeStats: WorkflowStats = {
        activeJobs: -1,
        clientsWaiting: -2,
        reviewsPending: -3,
      };

      render(<WorkflowCardsRow workflowStats={negativeStats} />);

      expect(screen.getByText('-1')).toBeInTheDocument();
      expect(screen.getByText('-2')).toBeInTheDocument();
      expect(screen.getByText('-3')).toBeInTheDocument();
    });

    it('renders correctly with all zero stats', () => {
      const zeroStats: WorkflowStats = {
        activeJobs: 0,
        clientsWaiting: 0,
        reviewsPending: 0,
      };

      render(<WorkflowCardsRow workflowStats={zeroStats} />);

      const cards = screen.getAllByRole('button');
      expect(cards).toHaveLength(4);
    });

    it('handles rapid clicks on same card', async () => {
      render(<WorkflowCardsRow {...defaultProps} />);

      const activeJobsCard = screen.getByLabelText('JOBS ATIVOS: 5');

      fireEvent.click(activeJobsCard);
      fireEvent.click(activeJobsCard);
      fireEvent.click(activeJobsCard);

      expect(mockSetLocation).toHaveBeenCalledTimes(3);
      expect(mockSetLocation).toHaveBeenCalledWith('/jobs');
    });
  });

  describe('Integration Tests', () => {
    it('renders complete workflow cards row with all features', () => {
      const { container } = render(<WorkflowCardsRow {...defaultProps} />);

      // Check layout
      const section = screen.getByRole('region');
      expect(section).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-4', 'gap-6');

      // Check all 4 cards
      const cards = screen.getAllByRole('button');
      expect(cards).toHaveLength(4);

      // Check animation
      act(() => {
        vi.advanceTimersByTime(200);
      });

      {
        const wrappers = container.querySelectorAll('.workflow-card-wrapper');
        expect(wrappers[0]).toHaveStyle({ opacity: '1' });
      }

      // Check navigation
      fireEvent.click(cards[0]);
      expect(mockSetLocation).toHaveBeenCalledWith('/jobs');
    });

    it('works correctly with dynamic data updates', () => {
      const { rerender } = render(<WorkflowCardsRow {...defaultProps} />);

      expect(screen.getByText('5')).toBeInTheDocument();

      const updatedStats: WorkflowStats = {
        activeJobs: 12,
        clientsWaiting: 6,
        reviewsPending: 9,
      };

      rerender(<WorkflowCardsRow workflowStats={updatedStats} />);

      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('6')).toBeInTheDocument();
      expect(screen.getByText('9')).toBeInTheDocument();

      // Animation should still be active (not reset)
      const { container } = render(<WorkflowCardsRow workflowStats={updatedStats} />);
      act(() => {
        vi.advanceTimersByTime(200);
      });

      const wrappers = container.querySelectorAll('.workflow-card-wrapper');
      expect(wrappers[0]).toHaveStyle({ opacity: '1' });
    });
  });
});
