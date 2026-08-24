import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Card Primitive Components
 * 
 * Plan-aware card system that uses plan tokens for visual styling.
 * Adapts appearance based on user's plan (free/pro/studio).
 * 
 * Features:
 * - Plan token integration for colors, borders, and shadows
 * - Elevation variants (flat, raised, elevated)
 * - Consistent spacing and typography
 * - Glow effects for pro/studio plans
 * - Gold accents in studio financial context
 * - Interactive variants with hover states
 * 
 * @example
 * ```tsx
 * // Basic card
 * <Card>
 *   <CardHeader>
 *     <CardTitle>Project Overview</CardTitle>
 *     <CardDescription>Track your progress</CardDescription>
 *   </CardHeader>
 *   <CardContent>
 *     <p>Content goes here</p>
 *   </CardContent>
 *   <CardFooter>
 *     <Button>Save</Button>
 *   </CardFooter>
 * </Card>
 * 
 * // Interactive card (clickable)
 * <Card variant="interactive" onClick={handleClick}>
 *   <CardContent>Click me!</CardContent>
 * </Card>
 * 
 * // Studio financial context (gold border)
 * <div data-context="financial">
 *   <Card variant="elevated">
 *     <CardContent>Premium content</CardContent>
 *   </Card>
 * </div>
 * ```
 */

const cardVariants = cva(
  [
    "rounded-sm",
    "bg-[var(--plan-surface-raised)]",
    "border border-[var(--plan-border-default)]",
    "text-[var(--plan-text-primary)]",
    "transition-[background-color,border-color,box-shadow,transform] duration-200",
  ].join(" "),
  {
    variants: {
      variant: {
        // Flat - minimal shadow, subtle border
        flat: "shadow-[var(--plan-shadow-xs)]",

        // Raised - standard elevation (default)
        raised: "shadow-[var(--plan-shadow-md)]",

        // Elevated - prominent shadow, used for important content
        elevated: [
          "shadow-[var(--plan-shadow-lg)]",
          "border-[var(--plan-accent-primary)]/20",
        ].join(" "),

        // Interactive - hover states for clickable cards
        interactive: [
          "shadow-[var(--plan-shadow-md)]",
          "cursor-pointer",
          "hover:shadow-[var(--plan-shadow-lg)]",
          "hover:border-[var(--plan-accent-primary)]/40",
          "active:shadow-[var(--plan-shadow-sm)]",
          "active:scale-[0.99]",
        ].join(" "),
      },
    },
    defaultVariants: {
      variant: "raised",
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, className }))}
      {...props}
    />
  )
);
Card.displayName = "Card";

// CardHeader - contains title and description
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

// CardTitle - main heading
const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-[length:calc(var(--plan-typography-scale)*1rem)] font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

// CardDescription - subtitle/supporting text
const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-[var(--plan-text-secondary)]", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

// CardContent - main content area
const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

// CardFooter - action area (buttons, etc.)
const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  cardVariants,
};
