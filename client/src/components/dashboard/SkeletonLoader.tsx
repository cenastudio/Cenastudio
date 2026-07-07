/**
 * SkeletonLoader Component
 *
 * Skeleton loading placeholders for all dashboard sections that match final layout
 * dimensions to prevent Cumulative Layout Shift (CLS).
 *
 * Features:
 * - Exact dimension matching to prevent CLS
 * - Pulse animation (opacity 1 → 0.5 → 1)
 * - Respects prefers-reduced-motion
 * - Muted gray background (--bg-tertiary)
 * - Border radius matches final components
 *
 * Components:
 * - GreetingSkeleton: Greeting section placeholder
 * - WorkflowCardSkeleton: Single card skeleton (use 4x in row)
 * - ChecklistItemSkeleton: Single checklist item (use 5x)
 * - JobCardSkeleton: Single job card (use 3x)
 * - FinanceStripSkeleton: Finance strip placeholder
 * - DashboardSkeleton: Composes all skeletons in correct layout
 *
 * @example
 * ```tsx
 * function Dashboard() {
 *   const { isLoading, data } = useDashboardData();
 *
 *   if (isLoading) {
 *     return <DashboardSkeleton />;
 *   }
 *
 *   return <DashboardLayout data={data} />;
 * }
 * ```
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonLoaderProps {
  className?: string;
}

export interface DashboardSkeletonProps {
  // No props needed - displays full skeleton layout
}

/**
 * Base skeleton element with pulse animation
 */
const SkeletonBase: React.FC<{
  className?: string;
  style?: React.CSSProperties;
  "aria-label"?: string;
}> = ({ className, style, "aria-label": ariaLabel }) => {
  return (
    <div
      className={cn("skeleton-pulse", className)}
      style={{
        backgroundColor: "var(--bg-tertiary, #e5e7eb)",
        ...style,
      }}
      aria-label={ariaLabel || "Loading..."}
      role="status"
    />
  );
};

/**
 * GreetingSkeleton - Greeting section placeholder
 *
 * Dimensions:
 * - Icon: 2rem circle
 * - Title: 2rem height, 300px width
 * - Subtitle: 1rem height, 400px width
 * - Date: 0.875rem height, 200px width
 * - Gap: 0.5rem between elements
 */
export const GreetingSkeleton: React.FC<SkeletonLoaderProps> = ({
  className,
}) => {
  return (
    <section
      className={cn("mb-6 p-6 rounded-2xl", className)}
      style={{
        marginBottom: "var(--space-lg)",
      }}
      aria-label="Loading greeting section"
    >
      {/* Icon + Title Row */}
      <div
        className="flex items-center gap-3 mb-2"
        style={{ marginBottom: "var(--space-sm)" }}
      >
        {/* Icon Circle */}
        <SkeletonBase
          className="rounded-full"
          style={{
            width: "2rem",
            height: "2rem",
            flexShrink: 0,
          }}
          aria-label="Loading greeting icon"
        />

        {/* Title */}
        <SkeletonBase
          className="rounded-lg"
          style={{
            width: "300px",
            height: "2rem",
          }}
          aria-label="Loading greeting title"
        />
      </div>

      {/* Subtitle */}
      <SkeletonBase
        className="rounded-lg mb-3"
        style={{
          width: "400px",
          height: "1rem",
          marginBottom: "var(--space-sm)",
          maxWidth: "100%",
        }}
        aria-label="Loading motivational message"
      />

      {/* Date */}
      <SkeletonBase
        className="rounded-lg"
        style={{
          width: "200px",
          height: "0.875rem",
          maxWidth: "100%",
        }}
        aria-label="Loading date"
      />
    </section>
  );
};

/**
 * WorkflowCardSkeleton - Single card skeleton
 *
 * Dimensions:
 * - Container: 24px border-radius, 200px height
 * - Icon: 2rem circle at top
 * - Number: 3rem height, 80px width
 * - Label: 0.75rem height, 120px width
 * - Sublabel: 0.875rem height, 100px width
 */
export const WorkflowCardSkeleton: React.FC<SkeletonLoaderProps> = ({
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-start justify-between p-6 rounded-2xl",
        "border border-frame-gray-3 bg-frame-gray-2/40",
        className
      )}
      style={{
        height: "200px",
      }}
      aria-label="Loading workflow card"
    >
      {/* Icon Circle */}
      <SkeletonBase
        className="rounded-full mb-4"
        style={{
          width: "2rem",
          height: "2rem",
        }}
        aria-label="Loading icon"
      />

      <div className="flex flex-col gap-1 w-full">
        {/* Number */}
        <SkeletonBase
          className="rounded-lg mb-2"
          style={{
            width: "80px",
            height: "3rem",
          }}
          aria-label="Loading count"
        />

        {/* Label */}
        <SkeletonBase
          className="rounded"
          style={{
            width: "120px",
            height: "0.75rem",
          }}
          aria-label="Loading label"
        />

        {/* Sublabel */}
        <SkeletonBase
          className="rounded mt-1"
          style={{
            width: "100px",
            height: "0.875rem",
          }}
          aria-label="Loading sublabel"
        />
      </div>
    </div>
  );
};

/**
 * ChecklistItemSkeleton - Single checklist item
 *
 * Dimensions:
 * - Checkbox: 20px × 20px square with border-radius
 * - Text: 0.875rem height, variable width (60-80%)
 * - Layout: flex row with gap
 */
export const ChecklistItemSkeleton: React.FC<
  SkeletonLoaderProps & { width?: string }
> = ({ className, width = "70%" }) => {
  return (
    <div
      className={cn("flex items-center gap-2", className)}
      aria-label="Loading checklist item"
    >
      {/* Checkbox */}
      <SkeletonBase
        className="rounded"
        style={{
          width: "20px",
          height: "20px",
          flexShrink: 0,
        }}
        aria-label="Loading checkbox"
      />

      {/* Text */}
      <SkeletonBase
        className="rounded flex-1"
        style={{
          width: width,
          height: "0.875rem",
          maxWidth: "100%",
        }}
        aria-label="Loading text"
      />
    </div>
  );
};

/**
 * JobCardSkeleton - Single job card
 *
 * Dimensions:
 * - Container: 16px border-radius, 240px height
 * - Title: 1.5rem height, 200px width
 * - Client: 0.875rem height, 150px width
 * - Deadline: 0.875rem height, 180px width
 * - Progress bar: 8px height, full width
 * - Buttons: 3 × (32px height, 80px width)
 */
export const JobCardSkeleton: React.FC<SkeletonLoaderProps> = ({
  className,
}) => {
  return (
    <div
      className={cn(
        "p-6 rounded-2xl border border-frame-gray-3 bg-frame-gray-2/40",
        className
      )}
      style={{
        minHeight: "240px",
      }}
      aria-label="Loading job card"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {/* Title */}
        <SkeletonBase
          className="rounded-lg"
          style={{
            width: "200px",
            height: "1.5rem",
            maxWidth: "100%",
          }}
          aria-label="Loading job title"
        />

        {/* Client */}
        <SkeletonBase
          className="rounded"
          style={{
            width: "150px",
            height: "0.875rem",
            maxWidth: "100%",
          }}
          aria-label="Loading client name"
        />

        {/* Deadline */}
        <SkeletonBase
          className="rounded"
          style={{
            width: "180px",
            height: "0.875rem",
            maxWidth: "100%",
          }}
          aria-label="Loading deadline"
        />

        {/* Progress Bar */}
        <SkeletonBase
          className="rounded-full"
          style={{
            width: "100%",
            height: "8px",
          }}
          aria-label="Loading progress"
        />

        {/* Quick Action Buttons */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginTop: "8px",
          }}
        >
          <SkeletonBase
            className="rounded-lg"
            style={{
              width: "80px",
              height: "32px",
            }}
            aria-label="Loading button"
          />
          <SkeletonBase
            className="rounded-lg"
            style={{
              width: "80px",
              height: "32px",
            }}
            aria-label="Loading button"
          />
          <SkeletonBase
            className="rounded-lg"
            style={{
              width: "80px",
              height: "32px",
            }}
            aria-label="Loading button"
          />
        </div>
      </div>
    </div>
  );
};

/**
 * FinanceStripSkeleton - Finance strip placeholder
 *
 * Dimensions:
 * - Container: full width, 60px height
 * - Icon: 1.5rem circle
 * - Text blocks: 0.875rem height, various widths
 * - Layout: flex row with gap
 */
export const FinanceStripSkeleton: React.FC<SkeletonLoaderProps> = ({
  className,
}) => {
  return (
    <section
      className={cn(
        "w-full flex flex-wrap items-center gap-2 rounded-2xl",
        className
      )}
      style={{
        background: "rgba(255, 255, 255, 0.05)",
        borderTop: "1px solid rgba(255, 255, 255, 0.1)",
        padding: "1rem 1.5rem",
        minHeight: "60px",
      }}
      aria-label="Loading finance strip"
    >
      {/* Icon */}
      <SkeletonBase
        className="rounded-full"
        style={{
          width: "1.5rem",
          height: "1.5rem",
          flexShrink: 0,
        }}
        aria-label="Loading icon"
      />

      {/* Revenue Text */}
      <SkeletonBase
        className="rounded"
        style={{
          width: "150px",
          height: "0.875rem",
        }}
        aria-label="Loading revenue"
      />

      {/* Separator */}
      <SkeletonBase
        className="rounded-full"
        style={{
          width: "4px",
          height: "4px",
          flexShrink: 0,
        }}
        aria-label="Separator"
      />

      {/* Jobs Completed Text */}
      <SkeletonBase
        className="rounded"
        style={{
          width: "120px",
          height: "0.875rem",
        }}
        aria-label="Loading jobs completed"
      />

      {/* Link */}
      <SkeletonBase
        className="rounded ml-auto"
        style={{
          width: "100px",
          height: "0.875rem",
        }}
        aria-label="Loading link"
      />
    </section>
  );
};

/**
 * DashboardSkeleton - Full dashboard skeleton layout
 *
 * Composes all skeleton components in the correct dashboard layout:
 * 1. GreetingSkeleton
 * 2. WorkflowCardsRow (4x WorkflowCardSkeleton)
 * 3. Main content grid (ChecklistColumn + ActiveJobsColumn)
 * 4. FinanceStripSkeleton
 */
export const DashboardSkeleton: React.FC<DashboardSkeletonProps> = () => {
  return (
    <div className="dashboard-skeleton w-full" aria-label="Loading dashboard">
      {/* Greeting Section */}
      <GreetingSkeleton />

      {/* Workflow Cards Row */}
      <div
        className="grid gap-4 mb-6"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          marginBottom: "var(--space-lg)",
        }}
        aria-label="Loading workflow cards"
      >
        <WorkflowCardSkeleton />
        <WorkflowCardSkeleton />
        <WorkflowCardSkeleton />
        <WorkflowCardSkeleton />
      </div>

      {/* Main Content Grid: Checklist + Active Jobs */}
      <div
        className="grid gap-6 mb-6"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          marginBottom: "var(--space-lg)",
        }}
        aria-label="Loading main content"
      >
        {/* Checklist Column Skeleton */}
        <div
          className="p-6 rounded-2xl border border-frame-gray-3 bg-frame-gray-2/40"
          aria-label="Loading checklist"
        >
          {/* Header */}
          <SkeletonBase
            className="rounded-lg mb-4"
            style={{
              width: "150px",
              height: "1.5rem",
            }}
            aria-label="Loading checklist title"
          />

          {/* Checklist Items */}
          <div className="flex flex-col gap-3">
            <ChecklistItemSkeleton width="75%" />
            <ChecklistItemSkeleton width="60%" />
            <ChecklistItemSkeleton width="80%" />
            <ChecklistItemSkeleton width="70%" />
            <ChecklistItemSkeleton width="65%" />
          </div>
        </div>

        {/* Active Jobs Column Skeleton */}
        <div
          className="p-6 rounded-2xl border border-frame-gray-3 bg-frame-gray-2/40"
          aria-label="Loading active jobs"
        >
          {/* Header */}
          <SkeletonBase
            className="rounded-lg mb-4"
            style={{
              width: "180px",
              height: "1.5rem",
            }}
            aria-label="Loading jobs title"
          />

          {/* Job Cards */}
          <div className="flex flex-col gap-4">
            <JobCardSkeleton />
            <JobCardSkeleton />
            <JobCardSkeleton />
          </div>
        </div>
      </div>

      {/* Finance Strip */}
      <FinanceStripSkeleton />
    </div>
  );
};

// Named exports
export default DashboardSkeleton;
