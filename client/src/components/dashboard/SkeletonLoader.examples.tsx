/**
 * SkeletonLoader Examples
 *
 * Usage examples demonstrating skeleton loading states for dashboard components
 */

import * as React from "react";
import {
  GreetingSkeleton,
  WorkflowCardSkeleton,
  ChecklistItemSkeleton,
  JobCardSkeleton,
  FinanceStripSkeleton,
  DashboardSkeleton,
} from "./SkeletonLoader";

export default {
  title: "Dashboard/SkeletonLoader",
  component: DashboardSkeleton,
};

/**
 * Example 1: Full Dashboard Skeleton
 * Shows complete loading state for entire dashboard
 */
export function FullDashboardSkeleton() {
  return (
    <div style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto" }}>
      <h2 style={{ marginBottom: "2rem" }}>Full Dashboard Loading State</h2>
      <DashboardSkeleton />
    </div>
  );
}

/**
 * Example 2: Greeting Section Skeleton
 * Individual skeleton for greeting section
 */
export function GreetingSkeletonExample() {
  return (
    <div style={{ padding: "2rem", maxWidth: "800px" }}>
      <h2 style={{ marginBottom: "2rem" }}>Greeting Section Loading</h2>
      <GreetingSkeleton />
    </div>
  );
}

/**
 * Example 3: Workflow Cards Skeleton
 * Grid of workflow card skeletons
 */
export function WorkflowCardsSkeletonExample() {
  return (
    <div style={{ padding: "2rem", maxWidth: "1400px" }}>
      <h2 style={{ marginBottom: "2rem" }}>Workflow Cards Loading</h2>
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        }}
      >
        <WorkflowCardSkeleton />
        <WorkflowCardSkeleton />
        <WorkflowCardSkeleton />
        <WorkflowCardSkeleton />
      </div>
    </div>
  );
}

/**
 * Example 4: Checklist Items Skeleton
 * List of checklist item skeletons with varied widths
 */
export function ChecklistItemsSkeletonExample() {
  return (
    <div style={{ padding: "2rem", maxWidth: "600px" }}>
      <h2 style={{ marginBottom: "2rem" }}>Checklist Items Loading</h2>
      <div className="flex flex-col gap-3">
        <ChecklistItemSkeleton width="75%" />
        <ChecklistItemSkeleton width="60%" />
        <ChecklistItemSkeleton width="80%" />
        <ChecklistItemSkeleton width="70%" />
        <ChecklistItemSkeleton width="65%" />
      </div>
    </div>
  );
}

/**
 * Example 5: Job Cards Skeleton
 * Column of job card skeletons
 */
export function JobCardsSkeletonExample() {
  return (
    <div style={{ padding: "2rem", maxWidth: "600px" }}>
      <h2 style={{ marginBottom: "2rem" }}>Job Cards Loading</h2>
      <div className="flex flex-col gap-4">
        <JobCardSkeleton />
        <JobCardSkeleton />
        <JobCardSkeleton />
      </div>
    </div>
  );
}

/**
 * Example 6: Finance Strip Skeleton
 * Single finance strip skeleton
 */
export function FinanceStripSkeletonExample() {
  return (
    <div style={{ padding: "2rem", maxWidth: "1400px" }}>
      <h2 style={{ marginBottom: "2rem" }}>Finance Strip Loading</h2>
      <FinanceStripSkeleton />
    </div>
  );
}

/**
 * Example 7: Dashboard with Conditional Loading
 * Demonstrates typical usage in a component with loading state
 */
export function ConditionalLoadingExample() {
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    // Simulate data loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto" }}>
      <div style={{ marginBottom: "2rem", display: "flex", gap: "1rem" }}>
        <button
          onClick={() => setIsLoading(true)}
          style={{
            padding: "0.5rem 1rem",
            background: "#FF6B00",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Show Loading
        </button>
        <button
          onClick={() => setIsLoading(false)}
          style={{
            padding: "0.5rem 1rem",
            background: "#10b981",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Show Content
        </button>
      </div>

      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <div style={{ padding: "2rem", background: "#f5f5f5", borderRadius: "16px" }}>
          <h2>Dashboard Content Loaded ✓</h2>
          <p style={{ color: "#666", marginTop: "1rem" }}>
            Your dashboard content would appear here after loading.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Example 8: Partial Loading State
 * Shows loading only specific sections while others are loaded
 */
export function PartialLoadingExample() {
  return (
    <div style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto" }}>
      <h2 style={{ marginBottom: "2rem" }}>Partial Loading State</h2>

      {/* Greeting loaded */}
      <div
        style={{
          padding: "1.5rem",
          background: "#f0f0f0",
          borderRadius: "16px",
          marginBottom: "1.5rem",
        }}
      >
        <h3>✓ Greeting Loaded</h3>
      </div>

      {/* Workflow cards loading */}
      <div style={{ marginBottom: "1.5rem" }}>
        <p style={{ marginBottom: "1rem", color: "#666" }}>
          Workflow cards loading...
        </p>
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          }}
        >
          <WorkflowCardSkeleton />
          <WorkflowCardSkeleton />
          <WorkflowCardSkeleton />
          <WorkflowCardSkeleton />
        </div>
      </div>

      {/* Main content loaded */}
      <div
        style={{
          padding: "1.5rem",
          background: "#f0f0f0",
          borderRadius: "16px",
          marginBottom: "1.5rem",
        }}
      >
        <h3>✓ Main Content Loaded</h3>
      </div>

      {/* Finance strip loading */}
      <div>
        <p style={{ marginBottom: "1rem", color: "#666" }}>
          Finance data loading...
        </p>
        <FinanceStripSkeleton />
      </div>
    </div>
  );
}

/**
 * Example 9: Custom Styled Skeleton
 * Shows how to apply custom styling to skeletons
 */
export function CustomStyledSkeletonExample() {
  return (
    <div style={{ padding: "2rem", maxWidth: "800px" }}>
      <h2 style={{ marginBottom: "2rem" }}>Custom Styled Skeleton</h2>
      <GreetingSkeleton className="custom-skeleton" />
    </div>
  );
}

/**
 * Example 10: Responsive Skeleton Layout
 * Demonstrates responsive behavior of skeletons
 */
export function ResponsiveSkeletonExample() {
  return (
    <div style={{ padding: "2rem" }}>
      <h2 style={{ marginBottom: "2rem" }}>Responsive Skeleton Layout</h2>
      <div style={{ resize: "horizontal", overflow: "auto", maxWidth: "100%", border: "2px dashed #ccc", padding: "1rem" }}>
        <DashboardSkeleton />
      </div>
      <p style={{ marginTop: "1rem", color: "#666", fontSize: "0.875rem" }}>
        Drag the bottom-right corner to see responsive behavior
      </p>
    </div>
  );
}
