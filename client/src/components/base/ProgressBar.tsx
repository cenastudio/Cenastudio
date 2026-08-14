/**
 * ProgressBar Component
 *
 * Reusable progress bar component showing completion percentage with smooth animation,
 * configurable color, and optional percentage label.
 *
 * Features:
 * - Smooth width transition animation (500ms ease-out)
 * - Configurable fill color (default: brand orange token)
 * - Optional percentage label display
 * - Theme-aware background colors
 * - ARIA attributes for accessibility
 * - Respects prefers-reduced-motion
 * - Value constrained to 0-100 range
 */

import React from 'react';

export interface ProgressBarProps {
  /** Current progress value */
  value: number;
  /** Maximum progress value (default: 100) */
  max?: number;
  /** Optional label text displayed next to the bar */
  label?: string;
  /** Fill color (CSS color value, default: var(--ds-orange)) */
  color?: string;
  /** Whether to show percentage label (default: false) */
  showPercentage?: boolean;
  /** Additional CSS class names */
  className?: string;
}

/**
 * ProgressBar Component
 *
 * Displays a horizontal progress bar with configurable value, color, and optional label.
 *
 * @example
 * ```tsx
 * <ProgressBar value={75} max={100} showPercentage />
 * <ProgressBar value={30} max={100} color="#3b82f6" label="Loading..." />
 * ```
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  label,
  color = 'var(--ds-orange)',
  showPercentage = false,
  className = '',
}) => {
  // Calculate percentage and constrain to 0-100 range
  const percentage = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div className={`progress-bar-container ${className}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      {/* Progress Bar */}
      <div
        className="progress-bar-track"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label || 'Progress'}
        style={{
          flex: 1,
          height: '8px',
          borderRadius: '9999px',
          backgroundColor: 'var(--progress-bg, rgba(0, 0, 0, 0.1))',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          className="progress-bar-fill"
          style={{
            height: '100%',
            width: `${percentage}%`,
            backgroundColor: color,
            borderRadius: '9999px',
            transition: 'width 500ms ease-out',
          }}
        />
      </div>

      {/* Optional Percentage Label */}
      {showPercentage && (
        <span
          className="progress-bar-percentage"
          style={{
            fontSize: '0.75rem',
            fontWeight: 500,
            color: 'var(--text-secondary)',
            minWidth: '3ch',
            textAlign: 'right',
          }}
        >
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
};

// Add theme-aware CSS variables via style tag
if (typeof document !== 'undefined') {
  const styleId = 'progress-bar-theme-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      :root[data-theme="light"] {
        --progress-bg: rgba(0, 0, 0, 0.1);
      }

      :root[data-theme="dark"] {
        --progress-bg: rgba(255, 255, 255, 0.1);
      }

      /* Default (light theme) */
      :root {
        --progress-bg: rgba(0, 0, 0, 0.1);
      }

      /* Respect prefers-reduced-motion */
      @media (prefers-reduced-motion: reduce) {
        .progress-bar-fill {
          transition: none !important;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

export default ProgressBar;
