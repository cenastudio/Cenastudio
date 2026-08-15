/**
 * StatusBadge Component Tests
 *
 * Tests cover all acceptance criteria:
 * 1. Component created with TypeScript interface ✓
 * 2. Color mapping correct for all 5 types ✓
 * 3. Background, border and text use the semantic status tokens ✓
 * 4. Text color token and bold weight ✓
 * 5. Border radius: 999px (pill), padding responsive to size prop ✓
 * 6. Optional icon renders before text ✓
 * 7. Pulse animation applies when pulse=true ✓
 * 8. Animation respects prefers-reduced-motion ✓
 * 9. Size variants: sm (0.75rem text), md (0.875rem text) ✓
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge, StatusType } from './StatusBadge';
import React from 'react';

// Mock icon component
const TestIcon = () => <svg data-testid="test-icon">Icon</svg>;

describe('StatusBadge', () => {
  describe('Basic Rendering', () => {
    it('renders with required props', () => {
      render(<StatusBadge type="success" text="Active" />);

      const badge = screen.getByTestId('status-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('Active');
    });

    it('applies correct data attributes', () => {
      render(<StatusBadge type="warning" text="Pending" size="sm" />);

      const badge = screen.getByTestId('status-badge');
      expect(badge).toHaveAttribute('data-type', 'warning');
      expect(badge).toHaveAttribute('data-size', 'sm');
    });

    it('accepts custom className', () => {
      render(<StatusBadge type="info" text="Info" className="custom-class" />);

      const badge = screen.getByTestId('status-badge');
      expect(badge).toHaveClass('custom-class');
    });
  });

  describe('Color Mapping - All 5 Types', () => {
    const colorTests: Array<{
      type: StatusType;
      expectedBg: string;
      expectedBorder: string;
      expectedText: string;
    }> = [
      {
        type: 'success',
        expectedBg: 'var(--status-success-bg)',
        expectedBorder: 'var(--status-success-border)',
        expectedText: 'var(--status-success)',
      },
      {
        type: 'warning',
        expectedBg: 'var(--status-warning-bg)',
        expectedBorder: 'var(--status-warning-border)',
        expectedText: 'var(--status-warning)',
      },
      {
        type: 'danger',
        expectedBg: 'var(--status-danger-bg)',
        expectedBorder: 'var(--status-danger-border)',
        expectedText: 'var(--status-danger)',
      },
      {
        type: 'info',
        expectedBg: 'var(--status-info-bg)',
        expectedBorder: 'var(--status-info-border)',
        expectedText: 'var(--status-info)',
      },
      {
        type: 'neutral',
        expectedBg: 'var(--status-neutral-bg)',
        expectedBorder: 'var(--status-neutral-border)',
        expectedText: 'var(--status-neutral)',
      },
    ];

    colorTests.forEach(({ type, expectedBg, expectedBorder, expectedText }) => {
      it(`renders ${type} type with correct colors`, () => {
        render(<StatusBadge type={type} text={type.toUpperCase()} />);

        const badge = screen.getByTestId('status-badge');
        expect(badge.style.getPropertyValue('--status-badge-bg')).toBe(expectedBg);
        expect(badge.style.getPropertyValue('--status-badge-border')).toBe(expectedBorder);
        expect(badge.style.getPropertyValue('--status-badge-text')).toBe(expectedText);
      });
    });
  });

  describe('Typography and Styling', () => {
    it('applies bold font weight', () => {
      render(<StatusBadge type="success" text="Bold Text" />);

      const badge = screen.getByTestId('status-badge');
      expect(badge).toHaveClass('font-bold');
    });

    it('has pill shape (rounded-full class)', () => {
      render(<StatusBadge type="success" text="Pill Shape" />);

      const badge = screen.getByTestId('status-badge');
      expect(badge).toHaveClass('rounded-full');
    });

    it('has border styling', () => {
      render(<StatusBadge type="success" text="Border" />);

      const badge = screen.getByTestId('status-badge');
      expect(badge).toHaveClass('border');
    });
  });

  describe('Size Variants', () => {
    it('applies small size (0.75rem text, 0.25rem 0.75rem padding)', () => {
      render(<StatusBadge type="success" text="Small" size="sm" />);

      const badge = screen.getByTestId('status-badge');
      const styles = window.getComputedStyle(badge);

      // fontSize: 0.75rem = 12px, padding will be computed
      expect(styles.fontSize).toMatch(/12px|0\.75rem/);
      expect(styles.padding).toMatch(/4px 12px|0\.25rem 0\.75rem/);
    });

    it('applies medium size (0.875rem text, 0.375rem 1rem padding)', () => {
      render(<StatusBadge type="success" text="Medium" size="md" />);

      const badge = screen.getByTestId('status-badge');
      const styles = window.getComputedStyle(badge);

      // fontSize: 0.875rem = 14px
      expect(styles.fontSize).toMatch(/14px|0\.875rem/);
      expect(styles.padding).toMatch(/6px 16px|0\.375rem 1rem/);
    });

    it('defaults to medium size when size prop is omitted', () => {
      render(<StatusBadge type="success" text="Default" />);

      const badge = screen.getByTestId('status-badge');
      const styles = window.getComputedStyle(badge);

      // fontSize: 0.875rem = 14px
      expect(styles.fontSize).toMatch(/14px|0\.875rem/);
      expect(styles.padding).toMatch(/6px 16px|0\.375rem 1rem/);
    });
  });

  describe('Icon Support', () => {
    it('renders without icon when icon prop is omitted', () => {
      render(<StatusBadge type="success" text="No Icon" />);

      const badge = screen.getByTestId('status-badge');
      expect(badge.querySelector('[data-testid="status-badge-icon"]')).not.toBeInTheDocument();
    });

    it('renders icon before text when icon prop is provided', () => {
      render(<StatusBadge type="success" text="With Icon" icon={<TestIcon />} />);

      const icon = screen.getByTestId('status-badge-icon');
      const iconSvg = screen.getByTestId('test-icon');

      expect(icon).toBeInTheDocument();
      expect(iconSvg).toBeInTheDocument();

      // Check icon is before text
      const badge = screen.getByTestId('status-badge');
      const children = Array.from(badge.children);
      const iconIndex = children.findIndex(child => child.getAttribute('data-testid') === 'status-badge-icon');
      expect(iconIndex).toBe(0); // Icon should be first child
    });

    it('icon has proper spacing from text', () => {
      render(<StatusBadge type="success" text="Spaced" icon={<TestIcon />} />);

      const badge = screen.getByTestId('status-badge');
      expect(badge).toHaveClass('gap-1.5'); // Tailwind gap class for spacing
    });
  });

  describe('Pulse Animation', () => {
    it('does not apply pulse animation by default', () => {
      render(<StatusBadge type="success" text="No Pulse" />);

      const badge = screen.getByTestId('status-badge');
      expect(badge).not.toHaveClass('animate-pulse-custom');
    });

    it('applies pulse animation when pulse=true', () => {
      render(<StatusBadge type="success" text="Pulsing" pulse={true} />);

      const badge = screen.getByTestId('status-badge');
      expect(badge).toHaveClass('animate-pulse-custom');
    });

    it('pulse animation is defined in document styles', () => {
      render(<StatusBadge type="success" text="Check Animation" pulse={true} />);

      // Check if style element was added to document
      const styleElement = document.getElementById('status-badge-pulse-animation');
      expect(styleElement).toBeTruthy();

      if (styleElement) {
        const styleContent = styleElement.textContent || '';

        // Check animation keyframes
        expect(styleContent).toContain('@keyframes pulse-custom');
        expect(styleContent).toContain('0%, 100%');
        expect(styleContent).toContain('opacity: 1');
        expect(styleContent).toContain('50%');
        expect(styleContent).toContain('opacity: 0.5');

        // Check animation class
        expect(styleContent).toContain('.animate-pulse-custom');
        expect(styleContent).toContain('animation: pulse-custom 2s infinite');
      }
    });

    it('respects prefers-reduced-motion media query', () => {
      render(<StatusBadge type="success" text="Reduced Motion" pulse={true} />);

      const styleElement = document.getElementById('status-badge-pulse-animation');
      expect(styleElement).toBeTruthy();

      if (styleElement) {
        const styleContent = styleElement.textContent || '';

        // Check prefers-reduced-motion rule
        expect(styleContent).toContain('@media (prefers-reduced-motion: reduce)');
        expect(styleContent).toContain('animation: none');
      }
    });
  });

  describe('Accessibility', () => {
    it('has inline-flex display for proper alignment', () => {
      render(<StatusBadge type="success" text="Aligned" />);

      const badge = screen.getByTestId('status-badge');
      expect(badge).toHaveClass('inline-flex');
      expect(badge).toHaveClass('items-center');
    });

    it('prevents text wrapping with whitespace-nowrap', () => {
      render(<StatusBadge type="success" text="Long text that should not wrap" />);

      const badge = screen.getByTestId('status-badge');
      expect(badge).toHaveClass('whitespace-nowrap');
    });
  });

  describe('Integration Tests', () => {
    it('renders multiple badges with different configurations', () => {
      const { container } = render(
        <div>
          <StatusBadge type="success" text="Success" size="sm" />
          <StatusBadge type="warning" text="Warning" icon={<TestIcon />} />
          <StatusBadge type="danger" text="Danger" pulse />
          <StatusBadge type="info" text="Info" size="md" />
          <StatusBadge type="neutral" text="Neutral" />
        </div>
      );

      const badges = container.querySelectorAll('[data-testid="status-badge"]');
      expect(badges).toHaveLength(5);

      // Verify each badge has correct type
      expect(badges[0]).toHaveAttribute('data-type', 'success');
      expect(badges[1]).toHaveAttribute('data-type', 'warning');
      expect(badges[2]).toHaveAttribute('data-type', 'danger');
      expect(badges[3]).toHaveAttribute('data-type', 'info');
      expect(badges[4]).toHaveAttribute('data-type', 'neutral');
    });

    it('combines all features: icon, pulse, custom size, and className', () => {
      render(
        <StatusBadge
          type="warning"
          text="Full Featured"
          icon={<TestIcon />}
          pulse={true}
          size="sm"
          className="custom-badge"
        />
      );

      const badge = screen.getByTestId('status-badge');

      // Check all features are applied
      expect(badge).toHaveTextContent('Full Featured');
      expect(badge).toHaveAttribute('data-type', 'warning');
      expect(badge).toHaveAttribute('data-size', 'sm');
      expect(badge).toHaveClass('animate-pulse-custom');
      expect(badge).toHaveClass('custom-badge');
      expect(screen.getByTestId('test-icon')).toBeInTheDocument();

      const styles = window.getComputedStyle(badge);
      expect(styles.fontSize).toMatch(/12px|0\.75rem/);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty text', () => {
      render(<StatusBadge type="success" text="" />);

      const badge = screen.getByTestId('status-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('');
    });

    it('handles very long text', () => {
      const longText = 'This is a very long text that should not break the badge layout';
      render(<StatusBadge type="success" text={longText} />);

      const badge = screen.getByTestId('status-badge');
      expect(badge).toHaveTextContent(longText);
      expect(badge).toHaveClass('whitespace-nowrap');
    });

    it('handles special characters in text', () => {
      const specialText = '< > & " \' /';
      render(<StatusBadge type="success" text={specialText} />);

      const badge = screen.getByTestId('status-badge');
      expect(badge).toHaveTextContent(specialText);
    });
  });
});
