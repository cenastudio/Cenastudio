import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Input Primitive Component
 *
 * Plan-aware text input that uses plan tokens for visual styling.
 * Adapts appearance based on user's plan (free/pro/studio).
 *
 * Features:
 * - Plan token integration for colors, borders, and focus states
 * - Consistent sizing across all plans
 * - Accessibility compliant (ARIA, labels, error states)
 * - Glow effects on focus for pro/studio plans
 * - Gold accent in studio financial context
 *
 * @example
 * ```tsx
 * // Basic input
 * <Input type="text" placeholder="Project name" />
 *
 * // With error state
 * <Input type="email" error placeholder="Email address" />
 *
 * // Studio financial context (gold focus ring)
 * <div data-context="financial">
 *   <Input type="number" placeholder="Budget" />
 * </div>
 * ```
 */

const inputVariants = cva(
  [
    "flex w-full rounded-lg",
    "bg-[var(--plan-surface-raised)]",
    "border border-[var(--plan-border-default)]",
    "px-3 py-2",
    "text-sm text-[var(--plan-text-primary)]",
    "placeholder:text-[var(--plan-text-muted)]",
    "shadow-[var(--plan-shadow-inset)]",
    "transition-all duration-200",
    "focus-visible:outline-none",
    "focus-visible:ring-2 focus-visible:ring-offset-2",
    "focus-visible:ring-[var(--plan-accent-primary)]",
    "focus-visible:border-[var(--plan-accent-primary)]",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "file:border-0 file:bg-transparent file:text-sm file:font-medium",
  ].join(" "),
  {
    variants: {
      size: {
        sm: "h-8 text-xs",
        md: "h-10 text-sm",
        lg: "h-12 text-base",
      },
      error: {
        true: [
          "border-red-500 focus-visible:ring-red-500",
          "focus-visible:border-red-500",
        ].join(" "),
      },
    },
    defaultVariants: {
      size: "md",
      error: false,
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, size, error, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ size, error, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input, inputVariants };
