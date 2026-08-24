import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Badge Primitive Component
 * 
 * Plan-aware badge for labels, status indicators, and tags.
 * Adapts appearance based on user's plan (free/pro/studio).
 * 
 * Features:
 * - Plan token integration for colors and effects
 * - Multiple semantic variants (default, success, warning, error, info)
 * - Consistent sizing across all plans
 * - Glow effects for pro/studio plans
 * - Gold variant for studio financial context
 * 
 * @example
 * ```tsx
 * // Default badge (uses plan accent)
 * <Badge>New</Badge>
 * 
 * // Status badges
 * <Badge variant="success">Completed</Badge>
 * <Badge variant="warning">In Progress</Badge>
 * <Badge variant="error">Failed</Badge>
 * 
 * // Studio financial context (gold badge)
 * <div data-context="financial">
 *   <Badge variant="gold">Premium</Badge>
 * </div>
 * 
 * // Outline variant
 * <Badge variant="outline">Draft</Badge>
 * ```
 */

const badgeVariants = cva(
  [
    "inline-flex items-center gap-1",
    "rounded-sm px-2.5 py-0.5",
    "text-xs font-medium",
    "transition-[background-color,border-color,color,box-shadow] duration-200",
    "border",
  ].join(" "),
  {
    variants: {
      variant: {
        // Default - uses plan accent color
        default: [
          "bg-[var(--plan-accent-primary)]",
          "text-[var(--plan-accent-contrast)]",
          "border-transparent",
          "shadow-[var(--plan-shadow-xs)]",
        ].join(" "),

        // Success - green
        success: [
          "bg-green-500/10 text-green-600",
          "dark:bg-green-500/20 dark:text-green-400",
          "border-green-500/20",
        ].join(" "),

        // Warning - amber
        warning: [
          "bg-amber-500/10 text-amber-600",
          "dark:bg-amber-500/20 dark:text-amber-400",
          "border-amber-500/20",
        ].join(" "),

        // Error - red
        error: [
          "bg-red-500/10 text-red-600",
          "dark:bg-red-500/20 dark:text-red-400",
          "border-red-500/20",
        ].join(" "),

        // Info - blue
        info: [
          "bg-blue-500/10 text-blue-600",
          "dark:bg-blue-500/20 dark:text-blue-400",
          "border-blue-500/20",
        ].join(" "),

        // Gold - studio financial context
        gold: [
          "bg-[var(--plan-accent-secondary,#D8B343)]/10",
          "text-[var(--plan-accent-secondary,#D8B343)]",
          "border-[var(--plan-accent-secondary,#D8B343)]/20",
          "shadow-[var(--plan-glow-accent-sm,none)]",
        ].join(" "),

        // Outline - transparent background
        outline: [
          "bg-transparent",
          "text-[var(--plan-text-primary)]",
          "border-[var(--plan-border-default)]",
        ].join(" "),

        // Secondary - subtle background
        secondary: [
          "bg-[var(--plan-surface-overlay)]",
          "text-[var(--plan-text-secondary)]",
          "border-[var(--plan-border-default)]",
        ].join(" "),
      },
      size: {
        sm: "text-[10px] px-2 py-0.5",
        md: "text-xs px-2.5 py-0.5",
        lg: "text-sm px-3 py-1",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
