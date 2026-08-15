/**
 * StatusBadge Component
 *
 * Reusable badge component with semantic color mapping for displaying status information.
 * Supports 5 status types: success, warning, danger, info, neutral
 *
 * Features:
 * - Semantic color mapping with proper opacity levels
 * - Pill-shaped design (border-radius: 999px)
 * - Optional icon support
 * - Optional pulse animation
 * - Size variants (sm, md)
 * - Respects prefers-reduced-motion
 *
 * @example
 * ```tsx
 * <StatusBadge type="success" text="Active" />
 * <StatusBadge type="warning" text="Pending" icon={<AlertIcon />} pulse />
 * <StatusBadge type="danger" text="Failed" size="sm" />
 * ```
 */

import React from 'react';
import { clsx } from 'clsx';

export type StatusType = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
export type StatusSize = 'sm' | 'md';

export interface StatusBadgeProps {
  /** Type of status badge (determines color) */
  type: StatusType;
  /** Text to display in the badge */
  text: string;
  /** Optional icon element to display before text */
  icon?: React.ReactNode;
  /** Enable pulse animation */
  pulse?: boolean;
  /** Size variant */
  size?: StatusSize;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Color mapping for status types
 * Each status has: base color, background (alpha 0.1), border (alpha 0.3), text (full opacity)
 */
const STATUS_COLORS: Record<StatusType, { base: string; bg: string; border: string; text: string }> = {
  success: {
    base: 'var(--status-success)',
    bg: 'var(--status-success-bg)',
    border: 'var(--status-success-border)',
    text: 'var(--status-success)',
  },
  warning: {
    base: 'var(--status-warning)',
    bg: 'var(--status-warning-bg)',
    border: 'var(--status-warning-border)',
    text: 'var(--status-warning)',
  },
  danger: {
    base: 'var(--status-danger)',
    bg: 'var(--status-danger-bg)',
    border: 'var(--status-danger-border)',
    text: 'var(--status-danger)',
  },
  info: {
    base: 'var(--status-info)',
    bg: 'var(--status-info-bg)',
    border: 'var(--status-info-border)',
    text: 'var(--status-info)',
  },
  neutral: {
    base: 'var(--status-neutral)',
    bg: 'var(--status-neutral-bg)',
    border: 'var(--status-neutral-border)',
    text: 'var(--status-neutral)',
  },
};

/**
 * Size configuration for padding and font size
 */
const SIZE_CONFIG: Record<StatusSize, { padding: string; fontSize: string }> = {
  sm: {
    padding: '0.25rem 0.75rem',
    fontSize: '0.75rem',
  },
  md: {
    padding: '0.375rem 1rem',
    fontSize: '0.875rem',
  },
};

/**
 * StatusBadge Component
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  type,
  text,
  icon,
  pulse = false,
  size = 'md',
  className,
}) => {
  const colors = STATUS_COLORS[type];
  const sizeConfig = SIZE_CONFIG[size];

  const badgeStyles = {
    "--status-badge-bg": colors.bg,
    "--status-badge-border": colors.border,
    "--status-badge-text": colors.text,
    backgroundColor: "var(--status-badge-bg)",
    borderColor: "var(--status-badge-border)",
    color: "var(--status-badge-text)",
    padding: sizeConfig.padding,
    fontSize: sizeConfig.fontSize,
  } as React.CSSProperties;

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5',
        'border font-bold',
        'rounded-full', // border-radius: 999px (pill shape)
        'whitespace-nowrap',
        pulse && 'animate-pulse-custom',
        className
      )}
      style={badgeStyles}
      data-testid="status-badge"
      data-type={type}
      data-size={size}
    >
      {icon && <span className="inline-flex items-center" data-testid="status-badge-icon">{icon}</span>}
      <span>{text}</span>
    </span>
  );
};

// Add keyframe animation to document if not already present
if (typeof document !== 'undefined') {
  const styleId = 'status-badge-pulse-animation';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes pulse-custom {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }

      .animate-pulse-custom {
        animation: pulse-custom 2s infinite;
      }

      /* Respect prefers-reduced-motion */
      @media (prefers-reduced-motion: reduce) {
        .animate-pulse-custom {
          animation: none;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

export default StatusBadge;
