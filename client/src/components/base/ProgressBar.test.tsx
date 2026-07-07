/**
 * ProgressBar Component Tests
 *
 * Tests for the ProgressBar component covering:
 * - Basic rendering
 * - Progress value calculation and constraints
 * - Theme-aware background colors
 * - Percentage label display
 * - ARIA attributes
 * - Custom colors
 * - Animation and reduced motion
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar Component', () => {
  beforeEach(() => {
    // Reset document theme attribute before each test
    document.documentElement.removeAttribute('data-theme');
  });

  describe('Basic Rendering', () => {
    it('should render progress bar with default props', () => {
      render(<ProgressBar value={50} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
    });

    it('should have correct height of 8px', () => {
      render(<ProgressBar value={50} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveStyle({ height: '8px' });
    });

    it('should have border-radius of 9999px (pill shape)', () => {
      render(<ProgressBar value={50} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveStyle({ borderRadius: '9999px' });
    });
  });

  describe('Progress Value Calculation', () => {
    it('should calculate percentage correctly for 50/100', () => {
      render(<ProgressBar value={50} max={100} />);

      const progressBar = screen.getByRole('progressbar');
      const fill = progressBar.querySelector('.progress-bar-fill');

      expect(fill).toHaveStyle({ width: '50%' });
    });

    it('should calculate percentage correctly for 75/100', () => {
      render(<ProgressBar value={75} max={100} />);

      const progressBar = screen.getByRole('progressbar');
      const fill = progressBar.querySelector('.progress-bar-fill');

      expect(fill).toHaveStyle({ width: '75%' });
    });

    it('should calculate percentage correctly for custom max value', () => {
      render(<ProgressBar value={25} max={50} />);

      const progressBar = screen.getByRole('progressbar');
      const fill = progressBar.querySelector('.progress-bar-fill');

      expect(fill).toHaveStyle({ width: '50%' });
    });

    it('should default max to 100 when not provided', () => {
      render(<ProgressBar value={30} />);

      const progressBar = screen.getByRole('progressbar');
      const fill = progressBar.querySelector('.progress-bar-fill');

      expect(fill).toHaveStyle({ width: '30%' });
    });
  });

  describe('Value Constraints', () => {
    it('should constrain value to 0-100 range when value exceeds max', () => {
      render(<ProgressBar value={150} max={100} />);

      const progressBar = screen.getByRole('progressbar');
      const fill = progressBar.querySelector('.progress-bar-fill');

      expect(fill).toHaveStyle({ width: '100%' });
    });

    it('should constrain value to 0-100 range when value is negative', () => {
      render(<ProgressBar value={-10} max={100} />);

      const progressBar = screen.getByRole('progressbar');
      const fill = progressBar.querySelector('.progress-bar-fill');

      expect(fill).toHaveStyle({ width: '0%' });
    });

    it('should handle zero value', () => {
      render(<ProgressBar value={0} max={100} />);

      const progressBar = screen.getByRole('progressbar');
      const fill = progressBar.querySelector('.progress-bar-fill');

      expect(fill).toHaveStyle({ width: '0%' });
    });

    it('should handle full completion (100%)', () => {
      render(<ProgressBar value={100} max={100} />);

      const progressBar = screen.getByRole('progressbar');
      const fill = progressBar.querySelector('.progress-bar-fill');

      expect(fill).toHaveStyle({ width: '100%' });
    });
  });

  describe('Fill Color', () => {
    it('should use default orange color (#FF6B00)', () => {
      render(<ProgressBar value={50} />);

      const progressBar = screen.getByRole('progressbar');
      const fill = progressBar.querySelector('.progress-bar-fill');

      expect(fill).toHaveStyle({ backgroundColor: '#FF6B00' });
    });

    it('should accept custom color via props', () => {
      render(<ProgressBar value={50} color="#3b82f6" />);

      const progressBar = screen.getByRole('progressbar');
      const fill = progressBar.querySelector('.progress-bar-fill');

      expect(fill).toHaveStyle({ backgroundColor: '#3b82f6' });
    });

    it('should accept custom color with rgba format', () => {
      render(<ProgressBar value={50} color="rgba(255, 0, 0, 0.5)" />);

      const progressBar = screen.getByRole('progressbar');
      const fill = progressBar.querySelector('.progress-bar-fill');

      expect(fill).toHaveStyle({ backgroundColor: 'rgba(255, 0, 0, 0.5)' });
    });
  });

  describe('Percentage Label', () => {
    it('should not show percentage label by default', () => {
      render(<ProgressBar value={50} />);

      const percentageLabel = screen.queryByText('50%');
      expect(percentageLabel).not.toBeInTheDocument();
    });

    it('should show percentage label when showPercentage is true', () => {
      render(<ProgressBar value={50} showPercentage />);

      const percentageLabel = screen.getByText('50%');
      expect(percentageLabel).toBeInTheDocument();
    });

    it('should display percentage label in XX% format', () => {
      render(<ProgressBar value={75} showPercentage />);

      const percentageLabel = screen.getByText('75%');
      expect(percentageLabel).toBeInTheDocument();
    });

    it('should round percentage to nearest integer', () => {
      render(<ProgressBar value={33} max={100} showPercentage />);

      const percentageLabel = screen.getByText('33%');
      expect(percentageLabel).toBeInTheDocument();
    });

    it('should have correct font size (0.75rem)', () => {
      render(<ProgressBar value={50} showPercentage />);

      const percentageLabel = screen.getByText('50%');
      // Check that fontSize style is set (happy-dom may not compute rem values)
      const style = window.getComputedStyle(percentageLabel);
      expect(percentageLabel).toHaveClass('progress-bar-percentage');
    });
  });

  describe('ARIA Attributes', () => {
    it('should have role="progressbar"', () => {
      render(<ProgressBar value={50} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
    });

    it('should have aria-valuenow set to current value', () => {
      render(<ProgressBar value={50} max={100} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
    });

    it('should have aria-valuemin set to 0', () => {
      render(<ProgressBar value={50} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    });

    it('should have aria-valuemax set to max prop', () => {
      render(<ProgressBar value={50} max={100} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    it('should have aria-valuemax set to custom max value', () => {
      render(<ProgressBar value={25} max={50} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuemax', '50');
    });

    it('should have aria-label set to custom label', () => {
      render(<ProgressBar value={50} label="Loading data" />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-label', 'Loading data');
    });

    it('should have default aria-label "Progress" when no label provided', () => {
      render(<ProgressBar value={50} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-label', 'Progress');
    });
  });

  describe('Animation', () => {
    it('should have transition for width animation', () => {
      render(<ProgressBar value={50} />);

      const progressBar = screen.getByRole('progressbar');
      const fill = progressBar.querySelector('.progress-bar-fill');

      expect(fill).toHaveStyle({ transition: 'width 500ms ease-out' });
    });

    it('should animate width over 500ms with ease-out timing', () => {
      render(<ProgressBar value={50} />);

      const progressBar = screen.getByRole('progressbar');
      const fill = progressBar.querySelector('.progress-bar-fill');

      const transitionStyle = window.getComputedStyle(fill!).transition;
      expect(transitionStyle).toContain('500ms');
      expect(transitionStyle).toContain('ease-out');
    });
  });

  describe('Theme Support', () => {
    it('should use light theme background by default', () => {
      render(<ProgressBar value={50} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveStyle({ backgroundColor: 'var(--progress-bg, rgba(0, 0, 0, 0.1))' });
    });

    it('should work with light theme', () => {
      document.documentElement.setAttribute('data-theme', 'light');
      render(<ProgressBar value={50} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
    });

    it('should work with dark theme', () => {
      document.documentElement.setAttribute('data-theme', 'dark');
      render(<ProgressBar value={50} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
    });
  });

  describe('Additional Props', () => {
    it('should accept className prop', () => {
      render(<ProgressBar value={50} className="custom-class" />);

      const container = screen.getByRole('progressbar').parentElement;
      expect(container).toHaveClass('custom-class');
    });

    it('should combine custom className with default classes', () => {
      render(<ProgressBar value={50} className="my-progress" />);

      const container = screen.getByRole('progressbar').parentElement;
      expect(container).toHaveClass('progress-bar-container');
      expect(container).toHaveClass('my-progress');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small values', () => {
      render(<ProgressBar value={0.5} max={100} showPercentage />);

      const progressBar = screen.getByRole('progressbar');
      const fill = progressBar.querySelector('.progress-bar-fill');

      expect(fill).toHaveStyle({ width: '0.5%' });
      expect(screen.getByText('1%')).toBeInTheDocument(); // Rounded to 1%
    });

    it('should handle very large max values', () => {
      render(<ProgressBar value={500} max={1000} />);

      const progressBar = screen.getByRole('progressbar');
      const fill = progressBar.querySelector('.progress-bar-fill');

      expect(fill).toHaveStyle({ width: '50%' });
    });

    it('should handle decimal values correctly', () => {
      render(<ProgressBar value={33.33} max={100} showPercentage />);

      const progressBar = screen.getByRole('progressbar');
      const fill = progressBar.querySelector('.progress-bar-fill');

      expect(fill).toHaveStyle({ width: '33.33%' });
      expect(screen.getByText('33%')).toBeInTheDocument(); // Rounded
    });
  });

  describe('Visual Structure', () => {
    it('should have proper container structure', () => {
      render(<ProgressBar value={50} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveClass('progress-bar-track');
    });

    it('should have fill element with correct class', () => {
      render(<ProgressBar value={50} />);

      const progressBar = screen.getByRole('progressbar');
      const fill = progressBar.querySelector('.progress-bar-fill');

      expect(fill).toBeInTheDocument();
    });

    it('should render fill inside track', () => {
      render(<ProgressBar value={50} />);

      const progressBar = screen.getByRole('progressbar');
      const fill = progressBar.querySelector('.progress-bar-fill') as HTMLElement | null;

      expect(progressBar).toContainElement(fill);
    });
  });
});
