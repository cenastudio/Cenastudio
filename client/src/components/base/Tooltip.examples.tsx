import React from 'react';
import { Tooltip } from './Tooltip';

/**
 * Tooltip Component Examples
 *
 * This file demonstrates various usage patterns for the Tooltip component.
 */

export function TooltipExamples() {
  return (
    <div style={{ padding: '4rem', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <section>
        <h2 style={{ marginBottom: '1rem' }}>Basic Usage</h2>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <Tooltip content="This is a helpful tooltip">
            <button>Hover me (default top)</button>
          </Tooltip>
        </div>
      </section>

      <section>
        <h2 style={{ marginBottom: '1rem' }}>Positions</h2>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <Tooltip content="Tooltip on top" position="top">
            <button>Top</button>
          </Tooltip>

          <Tooltip content="Tooltip on bottom" position="bottom">
            <button>Bottom</button>
          </Tooltip>

          <Tooltip content="Tooltip on left" position="left">
            <button>Left</button>
          </Tooltip>

          <Tooltip content="Tooltip on right" position="right">
            <button>Right</button>
          </Tooltip>
        </div>
      </section>

      <section>
        <h2 style={{ marginBottom: '1rem' }}>Keyboard Accessible</h2>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <p>Tab through these buttons to see tooltips appear on focus:</p>
          <Tooltip content="First button help text">
            <button>Button 1</button>
          </Tooltip>

          <Tooltip content="Second button help text">
            <button>Button 2</button>
          </Tooltip>

          <Tooltip content="Third button help text">
            <button>Button 3</button>
          </Tooltip>
        </div>
      </section>

      <section>
        <h2 style={{ marginBottom: '1rem' }}>With Different Elements</h2>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <Tooltip content="Help text for an icon">
            <span style={{ fontSize: '1.5rem', cursor: 'help' }}>ℹ️</span>
          </Tooltip>

          <Tooltip content="Additional information about this link">
            <a href="#" style={{ color: '#e85002' }}>Link with tooltip</a>
          </Tooltip>

          <Tooltip content="Click to perform an action" position="bottom">
            <button style={{
              background: '#e85002',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer'
            }}>
              Action Button
            </button>
          </Tooltip>
        </div>
      </section>

      <section>
        <h2 style={{ marginBottom: '1rem' }}>Custom Styling</h2>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <Tooltip
            content="Custom styled wrapper"
            className="my-custom-tooltip"
            position="right"
          >
            <div style={{
              padding: '1rem',
              background: '#121212',
              color: '#f9f9f9',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.12)'
            }}>
              Custom styled element
            </div>
          </Tooltip>
        </div>
      </section>

      <section>
        <h2 style={{ marginBottom: '1rem' }}>Form Field Help</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label htmlFor="username">Username</label>
            <Tooltip content="Your username must be 3-20 characters">
              <span style={{ cursor: 'help', color: '#666' }}>(?)</span>
            </Tooltip>
          </div>
          <input
            id="username"
            type="text"
            placeholder="Enter username"
            style={{
              padding: '0.5rem',
              borderRadius: '4px',
              border: '1px solid #ccc'
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label htmlFor="email">Email</label>
            <Tooltip content="We'll never share your email" position="right">
              <span style={{ cursor: 'help', color: '#666' }}>(?)</span>
            </Tooltip>
          </div>
          <input
            id="email"
            type="email"
            placeholder="Enter email"
            style={{
              padding: '0.5rem',
              borderRadius: '4px',
              border: '1px solid #ccc'
            }}
          />
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(var(--ds-orange-rgb), 0.1)', borderRadius: '8px' }}>
        <h3>Accessibility Notes</h3>
        <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
          <li>Tooltips show on both hover and keyboard focus</li>
          <li>Animations respect prefers-reduced-motion</li>
          <li>Focus indicators are visible for keyboard navigation</li>
          <li>Tooltips have proper ARIA role="tooltip"</li>
        </ul>
      </section>
    </div>
  );
}

export default TooltipExamples;
