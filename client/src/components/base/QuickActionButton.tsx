import React from 'react';
import { cn } from '@/lib/utils';

/**
 * QuickActionButton Props Interface
 */
export interface QuickActionButtonProps {
  /** Icon element to display (optional) */
  icon?: React.ReactNode;
  /** Button label text (optional for icon-only mode) */
  label?: string;
  /** Button size variant */
  size?: 'sm' | 'md';
  /** Button style variant */
  variant?: 'ghost' | 'solid';
  /** Click handler */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Additional CSS classes */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
  /** ARIA label for accessibility (recommended for icon-only buttons) */
  'aria-label'?: string;
  /** Type attribute for the button */
  type?: 'button' | 'submit' | 'reset';
}

/**
 * QuickActionButton Component
 *
 * Reusable button component for job cards and other quick actions with ghost/solid variants,
 * icon support, and hover effects. Follows the Liquid Glass aesthetic with smooth animations.
 *
 * Features:
 * - Ghost variant: transparent bg, border, text color primary
 * - Solid variant: bg primary color, text white, no border
 * - Hover effects: ghost changes bg to primary, solid lifts with shadow
 * - Icon support with optional icon-only mode
 * - Respects prefers-reduced-motion
 *
 * @example
 * // Ghost variant with icon and label
 * <QuickActionButton
 *   variant="ghost"
 *   icon={<PlayIcon />}
 *   label="Briefing"
 *   onClick={handleClick}
 * />
 *
 * @example
 * // Solid variant
 * <QuickActionButton
 *   variant="solid"
 *   label="Submit"
 *   size="md"
 *   onClick={handleSubmit}
 * />
 *
 * @example
 * // Icon-only mode
 * <QuickActionButton
 *   variant="ghost"
 *   icon={<EditIcon />}
 *   aria-label="Edit"
 *   onClick={handleEdit}
 * />
 */
export const QuickActionButton: React.FC<QuickActionButtonProps> = ({
  icon,
  label,
  size = 'md',
  variant = 'ghost',
  onClick,
  className,
  disabled = false,
  'aria-label': ariaLabel,
  type = 'button',
}) => {
  // Icon-only mode: no label provided
  const isIconOnly = !label && icon;

  // Base styles
  const baseStyles = cn(
    // Layout
    'inline-flex items-center justify-center gap-1',
    'font-medium',
    'transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    // Accessibility
    'disabled:cursor-not-allowed disabled:opacity-50',
    // Reduced motion support
    'motion-reduce:transition-none motion-reduce:transform-none'
  );

  // Size styles
  const sizeStyles = {
    sm: cn(
      isIconOnly ? 'p-1' : 'px-2 py-1',
      'text-xs', // 0.75rem
      'rounded-[var(--ds-radius-control)]'
    ),
    md: cn(
      isIconOnly ? 'p-2' : 'px-4 py-2',
      'text-sm', // 0.875rem
      'rounded-[var(--ds-radius-control)]'
    ),
  };

  // Variant styles
  const variantStyles = {
    ghost: cn(
      // Default state
      'bg-transparent',
      'border border-solid border-[var(--color-orange-primary)]',
      'text-[var(--color-orange-primary)]',
      // Hover state
      'hover:bg-[var(--color-orange-primary)]',
      'hover:text-white',
      // Focus state
      'focus:ring-[var(--color-orange-primary)]'
    ),
    solid: cn(
      // Default state
      'bg-[var(--color-orange-primary)]',
      'text-white',
      'border-none',
      'shadow-md',
      // Hover state
      'hover:-translate-y-0.5',
      'hover:shadow-lg',
      'motion-reduce:hover:translate-y-0',
      // Focus state
      'focus:ring-[var(--color-orange-primary)]'
    ),
  };

  // Combined class names
  const buttonClassName = cn(
    baseStyles,
    sizeStyles[size],
    variantStyles[variant],
    className
  );

  return (
    <button
      type={type}
      className={buttonClassName}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel || (isIconOnly ? 'Action button' : undefined)}
    >
      {icon && (
        <span
          className={cn(
            'inline-flex items-center justify-center',
            label && 'mr-1'
          )}
        >
          {icon}
        </span>
      )}
      {label && <span>{label}</span>}
    </button>
  );
};

export default QuickActionButton;
