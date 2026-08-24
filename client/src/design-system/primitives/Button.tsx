import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Button Primitive Component
 * 
 * Plan-aware button that uses plan tokens for visual styling.
 * Adapts appearance based on user's plan (free/pro/studio).
 * 
 * Features:
 * - Plan token integration for colors, shadows, and effects
 * - Consistent sizing across all plans
 * - Accessibility compliant (ARIA, keyboard nav, focus states)
 * - Glow effects for pro/studio plans (auto-enabled via plan tokens)
 * - Gold accent for studio financial context
 * 
 * @example
 * ```tsx
 * // Primary button (uses plan accent color)
 * <Button variant="primary">Save Project</Button>
 * 
 * // Ghost button with icon
 * <Button variant="ghost" size="sm">
 *   <Icon />
 *   Cancel
 * </Button>
 * 
 * // Studio financial context (gold accent)
 * <div data-context="financial">
 *   <Button variant="primary">Generate Invoice</Button>
 * </div>
 * ```
 */

const buttonVariants = cva(
  // Base styles - applied to all buttons
  [
    "inline-flex items-center justify-center gap-2",
    "rounded-sm font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "whitespace-nowrap",
  ].join(" "),
  {
    variants: {
      variant: {
        // Primary - uses plan accent color
        primary: [
          "bg-[var(--plan-accent-primary)]",
          "text-[var(--plan-accent-contrast)]",
          "shadow-[var(--plan-shadow-md)]",
          "hover:shadow-[var(--plan-shadow-lg)]",
          "active:shadow-[var(--plan-shadow-sm)]",
          "focus-visible:ring-[var(--plan-accent-primary)]",
        ].join(" "),

        // Secondary - uses surface colors
        secondary: [
          "bg-[var(--plan-surface-raised)]",
          "text-[var(--plan-text-primary)]",
          "border border-[var(--plan-border-default)]",
          "shadow-[var(--plan-shadow-sm)]",
          "hover:bg-[var(--plan-surface-overlay)]",
          "hover:shadow-[var(--plan-shadow-md)]",
          "focus-visible:ring-[var(--plan-accent-primary)]",
        ].join(" "),

        // Ghost - minimal styling, accent color on hover
        ghost: [
          "text-[var(--plan-text-primary)]",
          "hover:bg-[var(--plan-surface-raised)]",
          "hover:text-[var(--plan-accent-primary)]",
          "focus-visible:ring-[var(--plan-accent-primary)]",
        ].join(" "),

        // Destructive - danger actions
        destructive: [
          "bg-red-600 text-white",
          "shadow-[var(--plan-shadow-md)]",
          "hover:bg-red-700",
          "hover:shadow-[var(--plan-shadow-lg)]",
          "focus-visible:ring-red-600",
        ].join(" "),

        // Link - text only, no background
        link: [
          "text-[var(--plan-accent-primary)]",
          "underline-offset-4 hover:underline",
          "focus-visible:ring-[var(--plan-accent-primary)]",
        ].join(" "),
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /**
   * Render as a child component (e.g., Link from wouter)
   */
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
