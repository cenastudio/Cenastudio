import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Typography Primitive Component
 *
 * Plan-aware text component that uses plan tokens for sizing and colors.
 * Adapts typography scale based on user's plan (free/pro/studio).
 *
 * Plan Typography Scales:
 * - Free: 1.0x (base scale)
 * - Pro: 1.06x (slightly enhanced)
 * - Studio: 1.08x (premium scale)
 *
 * Features:
 * - Plan token integration for colors and scale
 * - Semantic heading levels (h1-h6)
 * - Body text variants (large, medium, small)
 * - Polymorphic component (asChild support)
 * - Accessible heading hierarchy
 * - Muted and accent color variants
 *
 * @example
 * ```tsx
 * // Headings
 * <Typography variant="h1">Main Title</Typography>
 * <Typography variant="h2">Section Title</Typography>
 *
 * // Body text
 * <Typography variant="body">Regular paragraph text</Typography>
 * <Typography variant="bodySmall" color="muted">
 *   Helper text or captions
 * </Typography>
 *
 * // Custom element
 * <Typography variant="h3" asChild>
 *   <a href="/projects">Projects</a>
 * </Typography>
 *
 * // Accent color (uses plan accent)
 * <Typography variant="body" color="accent">
 *   Highlighted text
 * </Typography>
 * ```
 */

const typographyVariants = cva("transition-colors duration-200", {
  variants: {
    variant: {
      // Headings - use plan typography scale
      h1: [
        "text-[length:calc(var(--plan-typography-scale)*2.25rem)]", // 36px base
        "font-bold leading-tight tracking-tight",
      ].join(" "),
      h2: [
        "text-[length:calc(var(--plan-typography-scale)*1.875rem)]", // 30px base
        "font-semibold leading-tight tracking-tight",
      ].join(" "),
      h3: [
        "text-[length:calc(var(--plan-typography-scale)*1.5rem)]", // 24px base
        "font-semibold leading-tight tracking-tight",
      ].join(" "),
      h4: [
        "text-[length:calc(var(--plan-typography-scale)*1.25rem)]", // 20px base
        "font-semibold leading-snug",
      ].join(" "),
      h5: [
        "text-[length:calc(var(--plan-typography-scale)*1.125rem)]", // 18px base
        "font-semibold leading-snug",
      ].join(" "),
      h6: [
        "text-[length:calc(var(--plan-typography-scale)*1rem)]", // 16px base
        "font-semibold leading-normal",
      ].join(" "),

      // Body text
      bodyLarge: [
        "text-[length:calc(var(--plan-typography-scale)*1.125rem)]", // 18px base
        "leading-relaxed",
      ].join(" "),
      body: [
        "text-[length:calc(var(--plan-typography-scale)*1rem)]", // 16px base
        "leading-normal",
      ].join(" "),
      bodySmall: [
        "text-[length:calc(var(--plan-typography-scale)*0.875rem)]", // 14px base
        "leading-normal",
      ].join(" "),

      // Labels and captions
      label: [
        "text-[length:calc(var(--plan-typography-scale)*0.875rem)]", // 14px base
        "font-medium leading-none",
      ].join(" "),
      caption: [
        "text-[length:calc(var(--plan-typography-scale)*0.75rem)]", // 12px base
        "leading-tight",
      ].join(" "),
    },
    color: {
      primary: "text-[var(--plan-text-primary)]",
      secondary: "text-[var(--plan-text-secondary)]",
      muted: "text-[var(--plan-text-muted)]",
      accent: "text-[var(--plan-accent-primary)]",
    },
    align: {
      left: "text-left",
      center: "text-center",
      right: "text-right",
    },
  },
  defaultVariants: {
    variant: "body",
    color: "primary",
    align: "left",
  },
});

// Map variants to semantic HTML elements
const variantToElement = {
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  h5: "h5",
  h6: "h6",
  bodyLarge: "p",
  body: "p",
  bodySmall: "p",
  label: "span",
  caption: "span",
} as const;

export interface TypographyProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "color">,
    VariantProps<typeof typographyVariants> {
  /**
   * Render as a child component
   */
  asChild?: boolean;
}

const Typography = React.forwardRef<HTMLElement, TypographyProps>(
  (
    { className, variant = "body", color, align, asChild = false, ...props },
    ref
  ) => {
    const Comp = asChild
      ? Slot
      : variantToElement[variant as keyof typeof variantToElement];

    return (
      <Comp
        className={cn(typographyVariants({ variant, color, align, className }))}
        ref={ref as React.Ref<never>}
        {...props}
      />
    );
  }
);
Typography.displayName = "Typography";

export { Typography, typographyVariants };
