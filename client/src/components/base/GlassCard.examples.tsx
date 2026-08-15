import React from 'react';
import { GlassCard } from './GlassCard';

/**
 * GlassCard Examples
 *
 * This file demonstrates various usage patterns for the GlassCard component.
 * Use these examples as a reference for implementing glassmorphism in your UI.
 */

export const GlassCardExamples = () => {
  return (
    <div style={{
      padding: '40px',
      background: 'linear-gradient(135deg, var(--ds-stage-prospect) 0%, var(--ds-stage-qualified) 100%)',
      minHeight: '100vh',
    }}>
      <h1 style={{ color: 'white', marginBottom: '32px' }}>GlassCard Examples</h1>

      {/* Basic Example */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ color: 'white', marginBottom: '16px' }}>Basic Card</h2>
        <GlassCard>
          <h3 style={{ margin: 0, marginBottom: '8px' }}>Default Dark Card</h3>
          <p style={{ margin: 0 }}>
            This is a basic glass card with default settings (dark variant, medium padding, 24px radius).
          </p>
        </GlassCard>
      </section>

      {/* Variants */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ color: 'white', marginBottom: '16px' }}>Variants</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          <GlassCard variant="dark">
            <h3 style={{ margin: 0, marginBottom: '8px' }}>Dark Variant</h3>
            <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.9)' }}>
              Background: rgba(10, 10, 10, 0.6)<br />
              Border: rgba(255, 255, 255, 0.18)
            </p>
          </GlassCard>

          <GlassCard variant="light">
            <h3 style={{ margin: 0, marginBottom: '8px', color: 'var(--ds-dark-gray)' }}>Light Variant</h3>
            <p style={{ margin: 0, color: 'var(--ds-chart-reference)' }}>
              Background: rgba(255, 255, 255, 0.7)<br />
              Border: rgba(0, 0, 0, 0.08)
            </p>
          </GlassCard>
        </div>
      </section>

      {/* Border Radius */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ color: 'white', marginBottom: '16px' }}>Border Radius Options</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <GlassCard borderRadius="12px">
            <strong>12px</strong>
            <p style={{ margin: '8px 0 0', fontSize: '14px' }}>Subtle rounding</p>
          </GlassCard>

          <GlassCard borderRadius="16px">
            <strong>16px</strong>
            <p style={{ margin: '8px 0 0', fontSize: '14px' }}>Moderate rounding</p>
          </GlassCard>

          <GlassCard borderRadius="24px">
            <strong>24px (default)</strong>
            <p style={{ margin: '8px 0 0', fontSize: '14px' }}>Comfortable rounding</p>
          </GlassCard>

          <GlassCard borderRadius="32px">
            <strong>32px</strong>
            <p style={{ margin: '8px 0 0', fontSize: '14px' }}>Bold rounding</p>
          </GlassCard>
        </div>
      </section>

      {/* Padding */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ color: 'white', marginBottom: '16px' }}>Padding Options</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <GlassCard padding="sm">
            <strong>Small (12px)</strong>
            <p style={{ margin: '4px 0 0', fontSize: '12px' }}>Compact spacing</p>
          </GlassCard>

          <GlassCard padding="md">
            <strong>Medium (16px)</strong>
            <p style={{ margin: '4px 0 0', fontSize: '12px' }}>Default spacing</p>
          </GlassCard>

          <GlassCard padding="lg">
            <strong>Large (24px)</strong>
            <p style={{ margin: '4px 0 0', fontSize: '12px' }}>Generous spacing</p>
          </GlassCard>

          <GlassCard padding="xl">
            <strong>Extra Large (32px)</strong>
            <p style={{ margin: '4px 0 0', fontSize: '12px' }}>Maximum spacing</p>
          </GlassCard>
        </div>
      </section>

      {/* Hover Effect */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ color: 'white', marginBottom: '16px' }}>Hover Animation</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          <GlassCard hover={false}>
            <h3 style={{ margin: 0, marginBottom: '8px' }}>No Hover</h3>
            <p style={{ margin: 0 }}>Static card without hover effect</p>
          </GlassCard>

          <GlassCard hover>
            <h3 style={{ margin: 0, marginBottom: '8px' }}>With Hover</h3>
            <p style={{ margin: 0 }}>
              Hover me! Translates up 4px and increases shadow
            </p>
          </GlassCard>
        </div>
      </section>

      {/* Interactive (Clickable) */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ color: 'white', marginBottom: '16px' }}>Interactive Cards</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          <GlassCard
            hover
            onClick={() => alert('Card 1 clicked!')}
          >
            <h3 style={{ margin: 0, marginBottom: '8px' }}>Clickable Card</h3>
            <p style={{ margin: 0 }}>
              Click me or press Enter/Space when focused
            </p>
          </GlassCard>

          <GlassCard
            variant="light"
            hover
            onClick={() => alert('Card 2 clicked!')}
          >
            <h3 style={{ margin: 0, marginBottom: '8px', color: 'var(--ds-dark-gray)' }}>Light Clickable Card</h3>
            <p style={{ margin: 0, color: 'var(--ds-chart-reference)' }}>
              Fully keyboard accessible
            </p>
          </GlassCard>
        </div>
      </section>

      {/* Complex Content */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ color: 'white', marginBottom: '16px' }}>Complex Content</h2>
        <GlassCard
          variant="dark"
          padding="lg"
          borderRadius="24px"
          hover
        >
          <div style={{ display: 'flex', alignItems: 'start', gap: '16px' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'var(--ds-orange)',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
            }}>
              ✨
            </div>
            <div>
              <h3 style={{ margin: 0, marginBottom: '8px' }}>Feature Card</h3>
              <p style={{ margin: 0, marginBottom: '12px', opacity: 0.9 }}>
                GlassCard supports complex nested content including images, icons,
                buttons, and other components.
              </p>
              <button style={{
                padding: '8px 16px',
                background: 'var(--ds-orange)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 500,
              }}>
                Learn More
              </button>
            </div>
          </div>
        </GlassCard>
      </section>

      {/* Combination Example */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ color: 'white', marginBottom: '16px' }}>All Features Combined</h2>
        <GlassCard
          variant="light"
          padding="xl"
          borderRadius="32px"
          hover
          onClick={() => alert('Premium card clicked!')}
          className="premium-card"
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎬</div>
            <h3 style={{ margin: 0, marginBottom: '8px', color: 'var(--ds-dark-gray)', fontSize: '24px' }}>
              Premium Feature
            </h3>
            <p style={{ margin: 0, color: 'var(--ds-chart-reference)', lineHeight: 1.6 }}>
              This card combines all available features: light variant, extra-large padding,
              32px border radius, hover animation, click handler, and custom className.
            </p>
          </div>
        </GlassCard>
      </section>

      {/* Accessibility Note */}
      <GlassCard variant="light" padding="lg" borderRadius="16px">
        <h3 style={{ margin: 0, marginBottom: '12px', color: 'var(--ds-dark-gray)' }}>
          ♿ Accessibility Features
        </h3>
        <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--ds-chart-reference)', lineHeight: 1.8 }}>
          <li>Respects <code>prefers-reduced-motion</code> - animations disabled for users who prefer reduced motion</li>
          <li>Keyboard accessible - clickable cards can be activated with Enter or Space</li>
          <li>Focus visible outline for keyboard navigation</li>
          <li>Proper ARIA roles (button role when clickable)</li>
          <li>Backdrop-filter fallback for unsupported browsers</li>
        </ul>
      </GlassCard>
    </div>
  );
};

export default GlassCardExamples;
