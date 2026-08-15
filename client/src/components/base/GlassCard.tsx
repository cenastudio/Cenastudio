import React from 'react';
import { clsx } from 'clsx';

export interface GlassCardProps {
  children: React.ReactNode;
  variant?: 'light' | 'dark';
  padding?: 'sm' | 'md' | 'lg' | 'xl';
  borderRadius?: '12px' | '16px' | '24px' | '32px';
  hover?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * GlassCard - A reusable component with glassmorphism effect
 *
 * Features:
 * - Backdrop blur effect (20px)
 * - Semi-transparent backgrounds
 * - Configurable border radius
 * - Optional hover animations
 * - Light and dark variants
 * - Fallback for unsupported browsers
 * - Respects prefers-reduced-motion
 */
export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  variant = 'dark',
  padding = 'md',
  borderRadius = '24px',
  hover = false,
  onClick,
  className,
}) => {
  const [supportsBackdrop, setSupportsBackdrop] = React.useState(true);

  React.useEffect(() => {
    // Feature detection for backdrop-filter support
    if (typeof CSS !== 'undefined' && CSS.supports) {
      setSupportsBackdrop(
        CSS.supports('backdrop-filter', 'blur(20px)') ||
        CSS.supports('-webkit-backdrop-filter', 'blur(20px)')
      );
    }
  }, []);

  const paddingMap = {
    sm: '12px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  };

  const baseStyles: React.CSSProperties = {
    borderRadius,
    padding: paddingMap[padding],
    transition: 'all 300ms ease-out',
    willChange: hover ? 'transform, box-shadow' : 'auto',
  };

  // Light variant styles
  const lightStyles: React.CSSProperties = {
    background: supportsBackdrop
      ? 'rgba(255, 255, 255, 0.7)'
      : 'rgba(255, 255, 255, 0.85)', // Higher opacity fallback
    border: '1px solid rgba(0, 0, 0, 0.08)',
    backdropFilter: supportsBackdrop ? 'blur(20px)' : undefined,
    WebkitBackdropFilter: supportsBackdrop ? 'blur(20px)' : undefined,
  };

  // Dark variant styles
  const darkStyles: React.CSSProperties = {
    background: supportsBackdrop
      ? 'rgba(10, 10, 10, 0.6)'
      : 'rgba(10, 10, 10, 0.85)', // Higher opacity fallback
    border: '1px solid rgba(255, 255, 255, 0.18)',
    backdropFilter: supportsBackdrop ? 'blur(20px)' : undefined,
    WebkitBackdropFilter: supportsBackdrop ? 'blur(20px)' : undefined,
  };

  const variantStyles = variant === 'light' ? lightStyles : darkStyles;

  const combinedStyles: React.CSSProperties = {
    ...baseStyles,
    ...variantStyles,
  };

  const cardClasses = clsx(
    'glass-card',
    hover && 'glass-card--hover',
    onClick && 'glass-card--clickable',
    className
  );

  return (
    <div
      className={cardClasses}
      style={combinedStyles}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {children}
      <style>{`
        .glass-card {
          position: relative;
          cursor: ${onClick ? 'pointer' : 'default'};
        }

        .glass-card--hover:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.12);
        }

        .glass-card--clickable:focus-visible {
          outline: 2px solid var(--ds-primary);
          outline-offset: 2px;
        }

        /* Respect prefers-reduced-motion */
        @media (prefers-reduced-motion: reduce) {
          .glass-card {
            transition: none !important;
            will-change: auto !important;
          }

          .glass-card--hover:hover {
            transform: none !important;
          }
        }

        /* Ensure keyboard focus is visible */
        .glass-card--clickable:focus {
          outline: none;
        }
      `}</style>
    </div>
  );
};

export default GlassCard;
