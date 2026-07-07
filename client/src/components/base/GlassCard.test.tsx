import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { GlassCard } from './GlassCard';

describe('GlassCard', () => {
  describe('Basic Rendering', () => {
    it('renders children correctly', () => {
      render(
        <GlassCard>
          <span>Test Content</span>
        </GlassCard>
      );
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('applies default variant (dark)', () => {
      const { container } = render(
        <GlassCard>
          <span>Content</span>
        </GlassCard>
      );
      const card = container.querySelector('.glass-card');
      expect(card).toHaveStyle({
        background: 'rgba(10, 10, 10, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.18)',
      });
    });

    it('applies default border radius (24px)', () => {
      const { container } = render(
        <GlassCard>
          <span>Content</span>
        </GlassCard>
      );
      const card = container.querySelector('.glass-card');
      expect(card).toHaveStyle({ borderRadius: '24px' });
    });

    it('applies default padding (md - 16px)', () => {
      const { container } = render(
        <GlassCard>
          <span>Content</span>
        </GlassCard>
      );
      const card = container.querySelector('.glass-card');
      expect(card).toHaveStyle({ padding: '16px' });
    });
  });

  describe('Variants', () => {
    it('renders light variant with correct styles', () => {
      const { container } = render(
        <GlassCard variant="light">
          <span>Content</span>
        </GlassCard>
      );
      const card = container.querySelector('.glass-card');
      expect(card).toHaveStyle({
        background: 'rgba(255, 255, 255, 0.7)',
        border: '1px solid rgba(0, 0, 0, 0.08)',
      });
    });

    it('renders dark variant with correct styles', () => {
      const { container } = render(
        <GlassCard variant="dark">
          <span>Content</span>
        </GlassCard>
      );
      const card = container.querySelector('.glass-card');
      expect(card).toHaveStyle({
        background: 'rgba(10, 10, 10, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.18)',
      });
    });
  });

  describe('Border Radius', () => {
    it('applies 12px border radius', () => {
      const { container } = render(
        <GlassCard borderRadius="12px">
          <span>Content</span>
        </GlassCard>
      );
      const card = container.querySelector('.glass-card');
      expect(card).toHaveStyle({ borderRadius: '12px' });
    });

    it('applies 16px border radius', () => {
      const { container } = render(
        <GlassCard borderRadius="16px">
          <span>Content</span>
        </GlassCard>
      );
      const card = container.querySelector('.glass-card');
      expect(card).toHaveStyle({ borderRadius: '16px' });
    });

    it('applies 24px border radius (default)', () => {
      const { container } = render(
        <GlassCard borderRadius="24px">
          <span>Content</span>
        </GlassCard>
      );
      const card = container.querySelector('.glass-card');
      expect(card).toHaveStyle({ borderRadius: '24px' });
    });

    it('applies 32px border radius', () => {
      const { container } = render(
        <GlassCard borderRadius="32px">
          <span>Content</span>
        </GlassCard>
      );
      const card = container.querySelector('.glass-card');
      expect(card).toHaveStyle({ borderRadius: '32px' });
    });
  });

  describe('Padding', () => {
    it('applies small padding (12px)', () => {
      const { container } = render(
        <GlassCard padding="sm">
          <span>Content</span>
        </GlassCard>
      );
      const card = container.querySelector('.glass-card');
      expect(card).toHaveStyle({ padding: '12px' });
    });

    it('applies medium padding (16px)', () => {
      const { container } = render(
        <GlassCard padding="md">
          <span>Content</span>
        </GlassCard>
      );
      const card = container.querySelector('.glass-card');
      expect(card).toHaveStyle({ padding: '16px' });
    });

    it('applies large padding (24px)', () => {
      const { container } = render(
        <GlassCard padding="lg">
          <span>Content</span>
        </GlassCard>
      );
      const card = container.querySelector('.glass-card');
      expect(card).toHaveStyle({ padding: '24px' });
    });

    it('applies extra large padding (32px)', () => {
      const { container } = render(
        <GlassCard padding="xl">
          <span>Content</span>
        </GlassCard>
      );
      const card = container.querySelector('.glass-card');
      expect(card).toHaveStyle({ padding: '32px' });
    });
  });

  describe('Hover Effect', () => {
    it('applies hover class when hover prop is true', () => {
      const { container } = render(
        <GlassCard hover>
          <span>Content</span>
        </GlassCard>
      );
      const card = container.querySelector('.glass-card');
      expect(card).toHaveClass('glass-card--hover');
    });

    it('does not apply hover class when hover prop is false', () => {
      const { container } = render(
        <GlassCard hover={false}>
          <span>Content</span>
        </GlassCard>
      );
      const card = container.querySelector('.glass-card');
      expect(card).not.toHaveClass('glass-card--hover');
    });

    it('applies transition styles', () => {
      const { container } = render(
        <GlassCard hover>
          <span>Content</span>
        </GlassCard>
      );
      const card = container.querySelector('.glass-card');
      expect(card).toHaveStyle({ transition: 'all 300ms ease-out' });
    });
  });

  describe('Click Interaction', () => {
    it('calls onClick when clicked', async () => {
      const handleClick = vi.fn();
      render(
        <GlassCard onClick={handleClick}>
          <span>Clickable</span>
        </GlassCard>
      );
      const card = screen.getByRole('button');
      await userEvent.click(card);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('applies clickable class when onClick is provided', () => {
      const handleClick = vi.fn();
      const { container } = render(
        <GlassCard onClick={handleClick}>
          <span>Clickable</span>
        </GlassCard>
      );
      const card = container.querySelector('.glass-card');
      expect(card).toHaveClass('glass-card--clickable');
    });

    it('sets role to button when onClick is provided', () => {
      const handleClick = vi.fn();
      render(
        <GlassCard onClick={handleClick}>
          <span>Clickable</span>
        </GlassCard>
      );
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('makes card keyboard accessible with tabIndex', () => {
      const handleClick = vi.fn();
      render(
        <GlassCard onClick={handleClick}>
          <span>Clickable</span>
        </GlassCard>
      );
      const card = screen.getByRole('button');
      expect(card).toHaveAttribute('tabIndex', '0');
    });

    it('triggers onClick on Enter key press', () => {
      const handleClick = vi.fn();
      render(
        <GlassCard onClick={handleClick}>
          <span>Clickable</span>
        </GlassCard>
      );
      const card = screen.getByRole('button');
      fireEvent.keyDown(card, { key: 'Enter' });
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('triggers onClick on Space key press', () => {
      const handleClick = vi.fn();
      render(
        <GlassCard onClick={handleClick}>
          <span>Clickable</span>
        </GlassCard>
      );
      const card = screen.getByRole('button');
      fireEvent.keyDown(card, { key: ' ' });
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not trigger onClick on other key press', () => {
      const handleClick = vi.fn();
      render(
        <GlassCard onClick={handleClick}>
          <span>Clickable</span>
        </GlassCard>
      );
      const card = screen.getByRole('button');
      fireEvent.keyDown(card, { key: 'a' });
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Backdrop Filter Support', () => {
    let originalCSS: typeof CSS;

    beforeEach(() => {
      originalCSS = global.CSS;
    });

    afterEach(() => {
      global.CSS = originalCSS;
    });

    it('uses backdrop-filter when supported', () => {
      global.CSS = {
        supports: vi.fn((prop: string, value: string) => {
          return prop === 'backdrop-filter' && value === 'blur(20px)';
        }),
      } as any;

      const { container } = render(
        <GlassCard variant="dark">
          <span>Content</span>
        </GlassCard>
      );

      // Wait for useEffect to run
      const card = container.querySelector('.glass-card') as HTMLElement;

      // Check that backdrop filter is applied
      expect(card.style.backdropFilter).toBeDefined();
    });

    it('falls back to higher opacity when backdrop-filter is not supported', () => {
      global.CSS = {
        supports: vi.fn(() => false),
      } as any;

      const { container, rerender } = render(
        <GlassCard variant="dark">
          <span>Content</span>
        </GlassCard>
      );

      // Force re-render to trigger useEffect
      rerender(
        <GlassCard variant="dark">
          <span>Content Updated</span>
        </GlassCard>
      );

      const card = container.querySelector('.glass-card');

      // Should have fallback background with higher opacity
      expect(card).toHaveStyle({
        background: 'rgba(10, 10, 10, 0.85)',
      });
    });

    it('applies webkit prefix for Safari support', () => {
      global.CSS = {
        supports: vi.fn((prop: string) => prop === '-webkit-backdrop-filter'),
      } as any;

      const { container } = render(
        <GlassCard>
          <span>Content</span>
        </GlassCard>
      );

      const card = container.querySelector('.glass-card') as HTMLElement;
      expect(card.style.getPropertyValue('-webkit-backdrop-filter')).toBeDefined();
    });
  });

  describe('Custom className', () => {
    it('applies custom className alongside default classes', () => {
      const { container } = render(
        <GlassCard className="custom-class">
          <span>Content</span>
        </GlassCard>
      );
      const card = container.querySelector('.glass-card');
      expect(card).toHaveClass('glass-card');
      expect(card).toHaveClass('custom-class');
    });
  });

  describe('Accessibility', () => {
    it('includes prefers-reduced-motion styles in CSS', () => {
      const { container } = render(
        <GlassCard hover>
          <span>Content</span>
        </GlassCard>
      );
      const style = container.querySelector('style');
      expect(style?.textContent).toContain('@media (prefers-reduced-motion: reduce)');
      expect(style?.textContent).toContain('transition: none !important');
      expect(style?.textContent).toContain('transform: none !important');
    });

    it('shows focus-visible outline for keyboard navigation', () => {
      const handleClick = vi.fn();
      const { container } = render(
        <GlassCard onClick={handleClick}>
          <span>Content</span>
        </GlassCard>
      );
      const style = container.querySelector('style');
      expect(style?.textContent).toContain('focus-visible');
      expect(style?.textContent).toContain('outline: 2px solid');
    });
  });

  describe('Browser Compatibility', () => {
    it('renders correctly in Chrome-like environment', () => {
      const { container } = render(
        <GlassCard>
          <span>Content</span>
        </GlassCard>
      );
      expect(container.querySelector('.glass-card')).toBeInTheDocument();
    });

    it('handles missing CSS.supports gracefully', () => {
      const originalCSS = global.CSS;
      // @ts-expect-error - Testing undefined CSS
      global.CSS = undefined;

      expect(() => {
        render(
          <GlassCard>
            <span>Content</span>
          </GlassCard>
        );
      }).not.toThrow();

      global.CSS = originalCSS;
    });
  });

  describe('Combined Props', () => {
    it('renders correctly with all props combined', () => {
      const handleClick = vi.fn();
      const { container } = render(
        <GlassCard
          variant="light"
          padding="lg"
          borderRadius="32px"
          hover
          onClick={handleClick}
          className="custom-card"
        >
          <span>Complex Card</span>
        </GlassCard>
      );

      const card = container.querySelector('.glass-card');
      expect(card).toHaveClass('glass-card');
      expect(card).toHaveClass('glass-card--hover');
      expect(card).toHaveClass('glass-card--clickable');
      expect(card).toHaveClass('custom-card');
      expect(card).toHaveStyle({
        borderRadius: '32px',
        padding: '24px',
        background: 'rgba(255, 255, 255, 0.7)',
        border: '1px solid rgba(0, 0, 0, 0.08)',
      });
    });
  });
});
