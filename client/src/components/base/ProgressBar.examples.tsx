/**
 * ProgressBar Component - Usage Examples
 *
 * This file demonstrates various usage patterns for the ProgressBar component.
 */

import React from 'react';
import { ProgressBar } from './ProgressBar';

export const ProgressBarExamples: React.FC = () => {
  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
        ProgressBar Component Examples
      </h1>

      {/* Example 1: Basic Progress Bar */}
      <section>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
          1. Basic Progress Bar
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Simple progress bar with 50% completion, no label.
        </p>
        <ProgressBar value={50} max={100} />
      </section>

      {/* Example 2: Progress Bar with Percentage */}
      <section>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
          2. Progress Bar with Percentage Label
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Shows the completion percentage next to the bar.
        </p>
        <ProgressBar value={75} max={100} showPercentage />
      </section>

      {/* Example 3: Custom Color */}
      <section>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
          3. Custom Color (Blue)
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Progress bar with custom blue color instead of default orange.
        </p>
        <ProgressBar value={60} max={100} color="var(--status-info)" showPercentage />
      </section>

      {/* Example 4: Success Color (Green) */}
      <section>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
          4. Success State (Green)
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Using green color for successful completion.
        </p>
        <ProgressBar value={100} max={100} color="var(--status-success)" showPercentage />
      </section>

      {/* Example 5: Warning State (Yellow) */}
      <section>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
          5. Warning State (Yellow)
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Using yellow/amber color to indicate warning state.
        </p>
        <ProgressBar value={25} max={100} color="var(--status-warning)" showPercentage />
      </section>

      {/* Example 6: Custom Max Value */}
      <section>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
          6. Custom Max Value
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Progress out of 200 instead of 100. Shows 50% (100/200).
        </p>
        <ProgressBar value={100} max={200} showPercentage />
      </section>

      {/* Example 7: Loading State */}
      <section>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
          7. Loading State
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Progress bar at start of loading process.
        </p>
        <ProgressBar value={10} max={100} label="Loading..." showPercentage />
      </section>

      {/* Example 8: Near Completion */}
      <section>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
          8. Near Completion
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Progress bar showing near completion at 95%.
        </p>
        <ProgressBar value={95} max={100} showPercentage />
      </section>

      {/* Example 9: Different Sizes with CSS */}
      <section>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
          9. Multiple Progress Bars (Job Status)
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Example showing multiple progress bars for different jobs.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <div style={{ marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
              Job 1: Pre-production
            </div>
            <ProgressBar value={30} max={100} color="var(--status-warning)" showPercentage />
          </div>
          <div>
            <div style={{ marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
              Job 2: Production
            </div>
            <ProgressBar value={65} max={100} color="var(--ds-orange-3)" showPercentage />
          </div>
          <div>
            <div style={{ marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
              Job 3: Post-production
            </div>
            <ProgressBar value={90} max={100} color="var(--status-info)" showPercentage />
          </div>
          <div>
            <div style={{ marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
              Job 4: Delivered
            </div>
            <ProgressBar value={100} max={100} color="var(--status-success)" showPercentage />
          </div>
        </div>
      </section>

      {/* Example 10: Edge Cases */}
      <section>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
          10. Edge Cases
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Various edge cases handled by the component.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <div style={{ marginBottom: '0.25rem', fontSize: '0.75rem' }}>Zero value (0%)</div>
            <ProgressBar value={0} max={100} showPercentage />
          </div>
          <div>
            <div style={{ marginBottom: '0.25rem', fontSize: '0.75rem' }}>
              Negative value (constrained to 0%)
            </div>
            <ProgressBar value={-10} max={100} showPercentage />
          </div>
          <div>
            <div style={{ marginBottom: '0.25rem', fontSize: '0.75rem' }}>
              Value exceeds max (constrained to 100%)
            </div>
            <ProgressBar value={150} max={100} showPercentage />
          </div>
          <div>
            <div style={{ marginBottom: '0.25rem', fontSize: '0.75rem' }}>
              Decimal value (33.33%)
            </div>
            <ProgressBar value={33.33} max={100} showPercentage />
          </div>
        </div>
      </section>

      {/* Example 11: Integration with Theme */}
      <section>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
          11. Theme Integration
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          The background color automatically adapts to light/dark theme via CSS variables.
          Try toggling the theme to see the background change.
        </p>
        <ProgressBar value={45} max={100} showPercentage />
      </section>

      {/* Usage Notes */}
      <section style={{ marginTop: '2rem', padding: '1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
          Usage Notes
        </h2>
        <ul style={{ fontSize: '0.875rem', lineHeight: '1.6', paddingLeft: '1.5rem' }}>
          <li>Values are automatically constrained to 0-100% range</li>
          <li>The fill animates smoothly with a 500ms ease-out transition</li>
          <li>Animation respects `prefers-reduced-motion` accessibility setting</li>
          <li>Background color adapts to light/dark theme automatically</li>
          <li>Fully accessible with ARIA attributes (role, aria-valuenow, etc.)</li>
          <li>Default color is the primary brand token</li>
          <li>Percentage label is optional via the `showPercentage` prop</li>
          <li>Custom max values can be used for non-percentage progress</li>
        </ul>
      </section>
    </div>
  );
};

export default ProgressBarExamples;
