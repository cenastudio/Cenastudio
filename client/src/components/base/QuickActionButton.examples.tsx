/**
 * QuickActionButton Examples
 *
 * This file demonstrates various use cases for the QuickActionButton component.
 * It serves as both documentation and a visual reference for developers.
 */

import React from 'react';
import { QuickActionButton } from './QuickActionButton';
import { SITE_CONFIG } from '@shared/site';

// Mock icons for examples (in real usage, import from lucide-react or other icon library)
const PlayIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M3 2l10 6-10 6V2z" />
  </svg>
);

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5L13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5z" />
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
    <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4L4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z" />
  </svg>
);

const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z" />
    <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z" />
    <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z" />
  </svg>
);

/**
 * Example component showcasing all QuickActionButton variations
 */
export const QuickActionButtonExamples: React.FC = () => {
  const handleClick = (action: string) => {
    console.log(`${action} clicked`);
  };

  return (
    <div className="p-8 space-y-12 bg-[var(--bg-primary)]">
      <div>
        <h1 className="text-3xl font-bold mb-4 text-[var(--text-primary)]">
          QuickActionButton Component Examples
        </h1>
        <p className="text-[var(--text-secondary)] mb-8">
          Foundation component for the {SITE_CONFIG.brandName} rebrand with Liquid Glass aesthetic
        </p>
      </div>

      {/* Ghost Variant Examples */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 text-[var(--text-primary)]">
          Ghost Variant
        </h2>
        <p className="text-[var(--text-muted)] mb-4">
          Transparent background with border, perfect for secondary actions
        </p>
        <div className="flex flex-wrap gap-4">
          <QuickActionButton
            variant="ghost"
            size="sm"
            label="Briefing"
            icon={<PlayIcon />}
            onClick={() => handleClick('Briefing')}
          />
          <QuickActionButton
            variant="ghost"
            size="md"
            label="Review"
            icon={<EyeIcon />}
            onClick={() => handleClick('Review')}
          />
          <QuickActionButton
            variant="ghost"
            size="md"
            label="Hub"
            onClick={() => handleClick('Hub')}
          />
          <QuickActionButton
            variant="ghost"
            size="sm"
            label="Edit"
            icon={<EditIcon />}
            onClick={() => handleClick('Edit')}
          />
        </div>
      </section>

      {/* Solid Variant Examples */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 text-[var(--text-primary)]">
          Solid Variant
        </h2>
        <p className="text-[var(--text-muted)] mb-4">
          Filled background with lift hover effect, for primary actions
        </p>
        <div className="flex flex-wrap gap-4">
          <QuickActionButton
            variant="solid"
            size="sm"
            label="Create"
            onClick={() => handleClick('Create')}
          />
          <QuickActionButton
            variant="solid"
            size="md"
            label="Submit"
            onClick={() => handleClick('Submit')}
          />
          <QuickActionButton
            variant="solid"
            size="md"
            label="Download"
            icon={<DownloadIcon />}
            onClick={() => handleClick('Download')}
          />
          <QuickActionButton
            variant="solid"
            size="sm"
            label="Publish"
            onClick={() => handleClick('Publish')}
          />
        </div>
      </section>

      {/* Icon-Only Examples */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 text-[var(--text-primary)]">
          Icon-Only Mode
        </h2>
        <p className="text-[var(--text-muted)] mb-4">
          Compact buttons with only icons, perfect for toolbars and tight spaces
        </p>
        <div className="flex flex-wrap gap-4 items-center">
          <QuickActionButton
            variant="ghost"
            size="sm"
            icon={<EditIcon />}
            aria-label="Edit"
            onClick={() => handleClick('Edit icon')}
          />
          <QuickActionButton
            variant="ghost"
            size="md"
            icon={<EyeIcon />}
            aria-label="View"
            onClick={() => handleClick('View icon')}
          />
          <QuickActionButton
            variant="solid"
            size="sm"
            icon={<PlayIcon />}
            aria-label="Play"
            onClick={() => handleClick('Play icon')}
          />
          <QuickActionButton
            variant="solid"
            size="md"
            icon={<TrashIcon />}
            aria-label="Delete"
            onClick={() => handleClick('Delete icon')}
          />
        </div>
      </section>

      {/* Size Comparison */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 text-[var(--text-primary)]">
          Size Comparison
        </h2>
        <p className="text-[var(--text-muted)] mb-4">
          Small vs Medium sizes for different contexts
        </p>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <span className="text-[var(--text-secondary)] w-24">Small (sm):</span>
            <QuickActionButton
              variant="ghost"
              size="sm"
              label="Action"
              icon={<PlayIcon />}
              onClick={() => handleClick('Small')}
            />
            <QuickActionButton
              variant="solid"
              size="sm"
              label="Action"
              icon={<PlayIcon />}
              onClick={() => handleClick('Small solid')}
            />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[var(--text-secondary)] w-24">Medium (md):</span>
            <QuickActionButton
              variant="ghost"
              size="md"
              label="Action"
              icon={<PlayIcon />}
              onClick={() => handleClick('Medium')}
            />
            <QuickActionButton
              variant="solid"
              size="md"
              label="Action"
              icon={<PlayIcon />}
              onClick={() => handleClick('Medium solid')}
            />
          </div>
        </div>
      </section>

      {/* Job Card Context Example */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 text-[var(--text-primary)]">
          Job Card Context (Real Use Case)
        </h2>
        <p className="text-[var(--text-muted)] mb-4">
          How QuickActionButtons appear in a job card
        </p>
        <div className="max-w-md p-6 rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] backdrop-blur-xl">
          <h3 className="text-xl font-semibold mb-2 text-[var(--text-primary)]">
            Commercial Video - Brand X
          </h3>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            Cliente: Brand X | Deadline: 15/02/2024 (5 dias)
          </p>
          <div className="flex gap-2">
            <QuickActionButton
              variant="ghost"
              size="sm"
              label="Briefing"
              icon={<PlayIcon />}
              onClick={() => handleClick('Job briefing')}
            />
            <QuickActionButton
              variant="ghost"
              size="sm"
              label="Review"
              icon={<EyeIcon />}
              onClick={() => handleClick('Job review')}
            />
            <QuickActionButton
              variant="ghost"
              size="sm"
              label="Hub"
              onClick={() => handleClick('Job hub')}
            />
          </div>
        </div>
      </section>

      {/* Disabled State */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 text-[var(--text-primary)]">
          Disabled State
        </h2>
        <p className="text-[var(--text-muted)] mb-4">
          Buttons in disabled state with reduced opacity
        </p>
        <div className="flex flex-wrap gap-4">
          <QuickActionButton
            variant="ghost"
            size="md"
            label="Disabled Ghost"
            icon={<PlayIcon />}
            disabled
            onClick={() => handleClick('Should not fire')}
          />
          <QuickActionButton
            variant="solid"
            size="md"
            label="Disabled Solid"
            icon={<DownloadIcon />}
            disabled
            onClick={() => handleClick('Should not fire')}
          />
          <QuickActionButton
            variant="ghost"
            size="sm"
            icon={<EditIcon />}
            aria-label="Disabled icon"
            disabled
            onClick={() => handleClick('Should not fire')}
          />
        </div>
      </section>

      {/* Accessibility Notes */}
      <section className="border-t border-[var(--border-subtle)] pt-8">
        <h2 className="text-2xl font-semibold mb-4 text-[var(--text-primary)]">
          Accessibility Features
        </h2>
        <ul className="space-y-2 text-[var(--text-secondary)]">
          <li>✅ Keyboard navigation support (Tab, Enter, Space)</li>
          <li>✅ ARIA labels for icon-only buttons</li>
          <li>✅ Focus visible styles with ring</li>
          <li>✅ Disabled state properly communicated</li>
          <li>✅ Respects prefers-reduced-motion</li>
          <li>✅ Touch-friendly target sizes</li>
        </ul>
      </section>

      {/* Design Integration Notes */}
      <section className="border-t border-[var(--border-subtle)] pt-8">
        <h2 className="text-2xl font-semibold mb-4 text-[var(--text-primary)]">
          Design Token Integration
        </h2>
        <ul className="space-y-2 text-[var(--text-secondary)]">
          <li>🎨 Uses --color-orange-primary for consistent theming</li>
          <li>🌓 Automatically adapts to light/dark themes</li>
          <li>✨ Smooth 200ms transitions with ease-out timing</li>
          <li>📏 Border radius: --radius-md (12px) for sm, --radius-lg (16px) for md</li>
          <li>🎭 Ghost variant hover: background becomes primary, text becomes white</li>
          <li>🚀 Solid variant hover: translateY(-2px) with increased shadow</li>
        </ul>
      </section>
    </div>
  );
};

export default QuickActionButtonExamples;
