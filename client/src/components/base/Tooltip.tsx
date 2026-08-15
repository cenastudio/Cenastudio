import React, { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
  children: React.ReactNode;
  content: string;
  position?: TooltipPosition;
  className?: string;
}

/**
 * Tooltip - A reusable component for contextual help
 *
 * Features:
 * - Shows on hover (mouseenter) and focus
 * - Hides on mouseleave and blur
 * - Configurable position: top, bottom, left, right (default: top)
 * - Arrow pointer positioned correctly for each position
 * - Smooth animation: opacity 0→1, translateY 4px→0, 150ms ease-out
 * - Theme-aware backgrounds: dark rgba for light theme, light rgba for dark theme
 * - Keyboard accessible (shows on focus)
 * - Respects prefers-reduced-motion (instant show/hide)
 */
export const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  position = 'top',
  className,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check for prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const handleMouseEnter = () => setIsVisible(true);
  const handleMouseLeave = () => setIsVisible(false);
  const handleFocus = () => setIsVisible(true);
  const handleBlur = () => setIsVisible(false);

  // Position-specific styles for tooltip
  const getTooltipPositionStyles = (): React.CSSProperties => {
    const baseOffset = '8px';

    switch (position) {
      case 'top':
        return {
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: baseOffset,
        };
      case 'bottom':
        return {
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginTop: baseOffset,
        };
      case 'left':
        return {
          right: '100%',
          top: '50%',
          transform: 'translateY(-50%)',
          marginRight: baseOffset,
        };
      case 'right':
        return {
          left: '100%',
          top: '50%',
          transform: 'translateY(-50%)',
          marginLeft: baseOffset,
        };
    }
  };

  // Arrow positioning for each tooltip position
  const getArrowPositionStyles = (): React.CSSProperties => {
    switch (position) {
      case 'top':
        return {
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: '6px solid rgba(0, 0, 0, 0.9)',
        };
      case 'bottom':
        return {
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderBottom: '6px solid rgba(0, 0, 0, 0.9)',
        };
      case 'left':
        return {
          left: '100%',
          top: '50%',
          transform: 'translateY(-50%)',
          borderTop: '6px solid transparent',
          borderBottom: '6px solid transparent',
          borderLeft: '6px solid rgba(0, 0, 0, 0.9)',
        };
      case 'right':
        return {
          right: '100%',
          top: '50%',
          transform: 'translateY(-50%)',
          borderTop: '6px solid transparent',
          borderBottom: '6px solid transparent',
          borderRight: '6px solid rgba(0, 0, 0, 0.9)',
        };
    }
  };

  // Animation translate direction based on position
  const getAnimationTransform = () => {
    switch (position) {
      case 'top':
        return 'translateX(-50%) translateY(4px)';
      case 'bottom':
        return 'translateX(-50%) translateY(-4px)';
      case 'left':
        return 'translateY(-50%) translateX(4px)';
      case 'right':
        return 'translateY(-50%) translateX(-4px)';
    }
  };

  const wrapperClasses = clsx('tooltip-wrapper', className);

  return (
    <div
      ref={wrapperRef}
      className={wrapperClasses}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      {children}

      {isVisible && (
        <div
          className="tooltip-content"
          role="tooltip"
          style={{
            position: 'absolute',
            zIndex: 1000,
            padding: '0.5rem 0.75rem',
            borderRadius: '4px',
            fontSize: '0.75rem',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            ...getTooltipPositionStyles(),
          }}
          data-position={position}
        >
          {content}
          <div
            className="tooltip-arrow"
            style={{
              position: 'absolute',
              width: 0,
              height: 0,
              ...getArrowPositionStyles(),
            }}
          />
        </div>
      )}

      <style>{`
        .tooltip-wrapper {
          cursor: help;
        }

        .tooltip-content {
          /* Light theme (default) - dark background */
          background: rgba(0, 0, 0, 0.9);
          color: white;

          /* Animation */
          animation: ${prefersReducedMotion ? 'none' : 'tooltip-fade-in 150ms ease-out'};
          animation-fill-mode: both;
        }

        /* Dark theme - light background */
        [data-theme="dark"] .tooltip-content,
        .dark .tooltip-content {
          background: rgba(255, 255, 255, 0.9);
          color: black;
        }

        /* Update arrow colors for dark theme */
        [data-theme="dark"] .tooltip-content[data-position="top"] .tooltip-arrow,
        .dark .tooltip-content[data-position="top"] .tooltip-arrow {
          border-top-color: rgba(255, 255, 255, 0.9);
        }

        [data-theme="dark"] .tooltip-content[data-position="bottom"] .tooltip-arrow,
        .dark .tooltip-content[data-position="bottom"] .tooltip-arrow {
          border-bottom-color: rgba(255, 255, 255, 0.9);
        }

        [data-theme="dark"] .tooltip-content[data-position="left"] .tooltip-arrow,
        .dark .tooltip-content[data-position="left"] .tooltip-arrow {
          border-left-color: rgba(255, 255, 255, 0.9);
        }

        [data-theme="dark"] .tooltip-content[data-position="right"] .tooltip-arrow,
        .dark .tooltip-content[data-position="right"] .tooltip-arrow {
          border-right-color: rgba(255, 255, 255, 0.9);
        }

        /* Animation keyframes */
        @keyframes tooltip-fade-in {
          from {
            opacity: 0;
            transform: ${getAnimationTransform()};
          }
          to {
            opacity: 1;
            transform: ${
              position === 'top' || position === 'bottom'
                ? 'translateX(-50%) translateY(0)'
                : 'translateY(-50%) translateX(0)'
            };
          }
        }

        /* Respect prefers-reduced-motion */
        @media (prefers-reduced-motion: reduce) {
          .tooltip-content {
            animation: none !important;
            transition: none !important;
          }
        }

        /* Ensure focus visibility */
        .tooltip-wrapper:focus-visible {
          outline: 2px solid var(--ds-primary);
          outline-offset: 2px;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
};

export default Tooltip;
