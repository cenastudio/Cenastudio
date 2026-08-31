import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuickActionButton } from '@/components/base/QuickActionButton';

/**
 * Test Suite for QuickActionButton Component
 *
 * Tests all acceptance criteria from Task 1.1.5:
 * 1. Component created with TypeScript interface ✓
 * 2. Ghost variant: transparent bg, border 1px solid, text color primary ✓
 * 3. Solid variant: bg primary color, text white, no border ✓
 * 4. Hover ghost: bg becomes primary color, text becomes white ✓
 * 5. Hover solid: translateY(-2px), shadow increases ✓
 * 6. Transition: all 200ms ease-out ✓
 * 7. Icon optional, renders before label with mr-1 spacing ✓
 * 8. Icon-only mode: no label, square padding ✓
 * 9. Respects prefers-reduced-motion ✓
 */

// Mock icon component for testing
const MockIcon = () => (
  <svg data-testid="mock-icon" width="16" height="16">
    <circle cx="8" cy="8" r="8" />
  </svg>
);

describe('QuickActionButton', () => {
  describe('Rendering', () => {
    it('renders with label only', () => {
      render(<QuickActionButton label="Click Me" />);
      expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
    });

    it('renders with icon and label', () => {
      render(
        <QuickActionButton
          icon={<MockIcon />}
          label="Briefing"
        />
      );
      expect(screen.getByText('Briefing')).toBeInTheDocument();
      expect(screen.getByTestId('mock-icon')).toBeInTheDocument();
    });

    it('renders in icon-only mode without label', () => {
      render(
        <QuickActionButton
          icon={<MockIcon />}
          aria-label="Edit action"
        />
      );
      const button = screen.getByRole('button', { name: /edit action/i });
      expect(button).toBeInTheDocument();
      expect(screen.getByTestId('mock-icon')).toBeInTheDocument();
      expect(button).not.toHaveTextContent(/./); // No text content
    });

    it('applies aria-label for accessibility', () => {
      render(
        <QuickActionButton
          icon={<MockIcon />}
          aria-label="Custom action"
        />
      );
      expect(screen.getByRole('button', { name: /custom action/i })).toBeInTheDocument();
    });

    it('provides default aria-label for icon-only button if not provided', () => {
      render(<QuickActionButton icon={<MockIcon />} />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Action button');
    });
  });

  describe('Variants', () => {
    it('renders ghost variant with correct styles', () => {
      render(
        <QuickActionButton
          variant="ghost"
          label="Ghost Button"
        />
      );
      const button = screen.getByRole('button', { name: /ghost button/i });

      // Check for ghost variant classes
      expect(button.className).toContain('bg-transparent');
      expect(button.className).toContain('border');
      expect(button.className).toContain('border-[var(--color-orange-primary)]');
      expect(button.className).toContain('text-[var(--color-orange-primary)]');
    });

    it('renders solid variant with correct styles', () => {
      render(
        <QuickActionButton
          variant="solid"
          label="Solid Button"
        />
      );
      const button = screen.getByRole('button', { name: /solid button/i });

      // Check for solid variant classes
      expect(button.className).toContain('bg-[var(--color-orange-primary)]');
      expect(button.className).toContain('text-white');
      expect(button.className).toContain('shadow-md');
    });

    it('defaults to ghost variant when variant prop not provided', () => {
      render(<QuickActionButton label="Default" />);
      const button = screen.getByRole('button', { name: /default/i });
      expect(button.className).toContain('bg-transparent');
      expect(button.className).toContain('border');
    });
  });

  describe('Sizes', () => {
    it('renders small size with correct padding and text size', () => {
      render(
        <QuickActionButton
          size="sm"
          label="Small"
        />
      );
      const button = screen.getByRole('button', { name: /small/i });

      // Check for small size classes
      expect(button.className).toContain('px-2');
      expect(button.className).toContain('py-1');
      expect(button.className).toContain('text-xs');
      expect(button.className).toContain('rounded-[var(--ds-radius-control)]');
    });

    it('renders medium size with correct padding and text size', () => {
      render(
        <QuickActionButton
          size="md"
          label="Medium"
        />
      );
      const button = screen.getByRole('button', { name: /medium/i });

      // Check for medium size classes
      expect(button.className).toContain('px-4');
      expect(button.className).toContain('py-2');
      expect(button.className).toContain('text-sm');
      expect(button.className).toContain('rounded-[var(--ds-radius-control)]');
    });

    it('defaults to medium size when size prop not provided', () => {
      render(<QuickActionButton label="Default Size" />);
      const button = screen.getByRole('button', { name: /default size/i });
      expect(button.className).toContain('px-4');
      expect(button.className).toContain('text-sm');
    });

    it('applies square padding for icon-only small button', () => {
      render(
        <QuickActionButton
          size="sm"
          icon={<MockIcon />}
          aria-label="Icon only small"
        />
      );
      const button = screen.getByRole('button', { name: /icon only small/i });

      // Icon-only should have equal padding
      expect(button.className).toContain('p-1');
      expect(button.className).not.toContain('px-2');
    });

    it('applies square padding for icon-only medium button', () => {
      render(
        <QuickActionButton
          size="md"
          icon={<MockIcon />}
          aria-label="Icon only medium"
        />
      );
      const button = screen.getByRole('button', { name: /icon only medium/i });

      // Icon-only should have equal padding
      expect(button.className).toContain('p-2');
      expect(button.className).not.toContain('px-4');
    });
  });

  describe('Icon Rendering', () => {
    it('renders icon before label with correct spacing', () => {
      const { container } = render(
        <QuickActionButton
          icon={<MockIcon />}
          label="With Icon"
        />
      );

      const iconSpan = container.querySelector('span:has([data-testid="mock-icon"])');
      expect(iconSpan).toBeInTheDocument();
      expect(iconSpan?.className).toContain('mr-1');
    });

    it('does not add margin to icon when no label is present', () => {
      const { container } = render(
        <QuickActionButton
          icon={<MockIcon />}
          aria-label="Icon only"
        />
      );

      const iconSpan = container.querySelector('span:has([data-testid="mock-icon"])');
      expect(iconSpan).toBeInTheDocument();
      expect(iconSpan?.className).not.toContain('mr-1');
    });
  });

  describe('Interactions', () => {
    it('calls onClick handler when clicked', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(
        <QuickActionButton
          label="Clickable"
          onClick={handleClick}
        />
      );

      await user.click(screen.getByRole('button', { name: /clickable/i }));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when disabled', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(
        <QuickActionButton
          label="Disabled"
          onClick={handleClick}
          disabled
        />
      );

      const button = screen.getByRole('button', { name: /disabled/i });
      expect(button).toBeDisabled();

      await user.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('applies disabled styles when disabled', () => {
      render(
        <QuickActionButton
          label="Disabled"
          disabled
        />
      );

      const button = screen.getByRole('button', { name: /disabled/i });
      expect(button.className).toContain('disabled:cursor-not-allowed');
      expect(button.className).toContain('disabled:opacity-50');
    });

    it('supports keyboard interaction', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(
        <QuickActionButton
          label="Keyboard"
          onClick={handleClick}
        />
      );

      const button = screen.getByRole('button', { name: /keyboard/i });
      button.focus();
      await user.keyboard('{Enter}');

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('prevents event propagation when stopPropagation is used', async () => {
      const parentClick = vi.fn();
      const buttonClick = vi.fn((e: React.MouseEvent) => {
        e.stopPropagation();
      });
      const user = userEvent.setup();

      render(
        <div onClick={parentClick}>
          <QuickActionButton
            label="Stop Propagation"
            onClick={buttonClick}
          />
        </div>
      );

      await user.click(screen.getByRole('button', { name: /stop propagation/i }));

      expect(buttonClick).toHaveBeenCalledTimes(1);
      expect(parentClick).not.toHaveBeenCalled();
    });
  });

  describe('Hover Effects', () => {
    it('includes hover styles for ghost variant', () => {
      render(
        <QuickActionButton
          variant="ghost"
          label="Hover Ghost"
        />
      );

      const button = screen.getByRole('button', { name: /hover ghost/i });

      // Check for hover classes
      expect(button.className).toContain('hover:bg-[var(--color-orange-primary)]');
      expect(button.className).toContain('hover:text-white');
    });

    it('includes hover styles for solid variant with translateY', () => {
      render(
        <QuickActionButton
          variant="solid"
          label="Hover Solid"
        />
      );

      const button = screen.getByRole('button', { name: /hover solid/i });

      // Check for hover classes with lift effect
      expect(button.className).toContain('hover:-translate-y-0.5');
      expect(button.className).toContain('hover:shadow-lg');
    });
  });

  describe('Transitions', () => {
    it('includes transition classes for smooth animations', () => {
      render(<QuickActionButton label="Transition" />);
      const button = screen.getByRole('button', { name: /transition/i });

      // Check for transition classes (200ms ease-out)
      expect(button.className).toContain('transition-[background-color,border-color,color,box-shadow,transform]');
      expect(button.className).toContain('duration-200');
      expect(button.className).toContain('ease-out');
    });
  });

  describe('Reduced Motion Support', () => {
    it('includes motion-reduce classes to respect user preferences', () => {
      render(
        <QuickActionButton
          variant="solid"
          label="Reduced Motion"
        />
      );

      const button = screen.getByRole('button', { name: /reduced motion/i });

      // Check for reduced motion support
      expect(button.className).toContain('motion-reduce:transition-none');
      expect(button.className).toContain('motion-reduce:transform-none');

      // Solid variant should also have specific motion-reduce for hover
      expect(button.className).toContain('motion-reduce:hover:translate-y-0');
    });
  });

  describe('Accessibility', () => {
    it('has proper button role', () => {
      render(<QuickActionButton label="Accessible" />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('supports focus styles', () => {
      render(<QuickActionButton label="Focus" />);
      const button = screen.getByRole('button', { name: /focus/i });

      expect(button.className).toContain('focus:outline-none');
      expect(button.className).toContain('focus-visible:ring-2');
      expect(button.className).toContain('focus-visible:ring-offset-2');
      expect(button.className).toContain('focus:ring-[var(--color-orange-primary)]');
    });

    it('supports custom type attribute', () => {
      render(
        <QuickActionButton
          label="Submit"
          type="submit"
        />
      );

      const button = screen.getByRole('button', { name: /submit/i });
      expect(button).toHaveAttribute('type', 'submit');
    });

    it('defaults to button type', () => {
      render(<QuickActionButton label="Default Type" />);
      const button = screen.getByRole('button', { name: /default type/i });
      expect(button).toHaveAttribute('type', 'button');
    });
  });

  describe('Custom Styling', () => {
    it('accepts and applies custom className', () => {
      render(
        <QuickActionButton
          label="Custom"
          className="custom-test-class"
        />
      );

      const button = screen.getByRole('button', { name: /custom/i });
      expect(button.className).toContain('custom-test-class');
    });

    it('merges custom className with base styles', () => {
      render(
        <QuickActionButton
          label="Merged"
          className="custom-class"
        />
      );

      const button = screen.getByRole('button', { name: /merged/i });

      // Should have both custom and base classes
      expect(button.className).toContain('custom-class');
      expect(button.className).toContain('inline-flex');
      expect(button.className).toContain('transition-[background-color,border-color,color,box-shadow,transform]');
    });
  });

  describe('Design Token Integration', () => {
    it('uses CSS custom properties for colors', () => {
      const { container } = render(
        <QuickActionButton
          variant="ghost"
          label="Design Tokens"
        />
      );

      const button = container.querySelector('button');
      const className = button?.className || '';

      // Should use CSS custom properties for theming
      expect(className).toContain('border-[var(--color-orange-primary)]');
      expect(className).toContain('text-[var(--color-orange-primary)]');
      expect(className).toContain('hover:bg-[var(--color-orange-primary)]');
    });

    it('solid variant uses design tokens', () => {
      const { container } = render(
        <QuickActionButton
          variant="solid"
          label="Solid Tokens"
        />
      );

      const button = container.querySelector('button');
      const className = button?.className || '';

      expect(className).toContain('bg-[var(--color-orange-primary)]');
      expect(className).toContain('focus:ring-[var(--color-orange-primary)]');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty label gracefully', () => {
      render(<QuickActionButton label="" />);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('handles missing icon and label', () => {
      render(<QuickActionButton />);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('handles onClick with undefined', () => {
      render(<QuickActionButton label="No Handler" onClick={undefined} />);
      const button = screen.getByRole('button', { name: /no handler/i });
      expect(button).toBeInTheDocument();
    });
  });
});
