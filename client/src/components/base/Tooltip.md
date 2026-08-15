# Tooltip Component

A reusable tooltip component for displaying contextual help on hover and focus.

## Features

- ✅ **TypeScript Interface**: Fully typed with `TooltipProps`
- ✅ **Hover Interaction**: Shows on mouseenter, hides on mouseleave
- ✅ **Keyboard Accessible**: Shows on focus, hides on blur
- ✅ **Configurable Position**: Top, bottom, left, right (default: top)
- ✅ **Arrow Pointer**: 6px triangle positioned correctly for each direction
- ✅ **Smooth Animation**: Opacity 0→1, translateY 4px→0, 150ms ease-out
- ✅ **Theme-Aware**: Dark background for light theme, light background for dark theme
- ✅ **Accessible**: Respects prefers-reduced-motion, proper ARIA roles
- ✅ **High z-index**: Positioned at z-index 1000

## Installation

The component is already part of the base components:

```tsx
import { Tooltip } from '@/components/base';
// or
import { Tooltip } from '@/components/base/Tooltip';
```

## API

### TooltipProps

```typescript
interface TooltipProps {
  children: React.ReactNode;     // Element to trigger the tooltip
  content: string;                // Tooltip text content
  position?: TooltipPosition;     // Position: 'top' | 'bottom' | 'left' | 'right' (default: 'top')
  className?: string;             // Optional custom class for wrapper
}

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';
```

## Usage Examples

### Basic Usage

```tsx
import { Tooltip } from '@/components/base';

function MyComponent() {
  return (
    <Tooltip content="This is helpful information">
      <button>Hover me</button>
    </Tooltip>
  );
}
```

### Different Positions

```tsx
<Tooltip content="Help text" position="top">
  <button>Top (default)</button>
</Tooltip>

<Tooltip content="Help text" position="bottom">
  <button>Bottom</button>
</Tooltip>

<Tooltip content="Help text" position="left">
  <button>Left</button>
</Tooltip>

<Tooltip content="Help text" position="right">
  <button>Right</button>
</Tooltip>
```

### Form Field Help

```tsx
<div>
  <label>
    Username
    <Tooltip content="Must be 3-20 characters">
      <span style={{ cursor: 'help' }}>(?)</span>
    </Tooltip>
  </label>
  <input type="text" />
</div>
```

### With Icons

```tsx
<Tooltip content="More information" position="right">
  <InfoIcon />
</Tooltip>
```

### Custom Styling

```tsx
<Tooltip
  content="Custom tooltip"
  className="my-custom-wrapper"
  position="bottom"
>
  <div>Custom element</div>
</Tooltip>
```

## Styling

### Theme Support

The component automatically adapts to the theme:

**Light Theme (Default)**:
- Background: `rgba(0, 0, 0, 0.9)` (dark background)
- Text: `white`
- Arrow: Matches background color

**Dark Theme**:
- Background: `rgba(255, 255, 255, 0.9)` (light background)
- Text: `black`
- Arrow: Matches background color

Dark theme is detected via `[data-theme="dark"]` or `.dark` class on parent elements.

### Dimensions

- **Padding**: `0.5rem 0.75rem` (8px 12px)
- **Border Radius**: `4px`
- **Font Size**: `0.75rem` (12px)
- **Arrow Size**: `6px` triangle
- **Z-Index**: `1000`

### Animation

- **Duration**: `150ms`
- **Easing**: `ease-out`
- **Transform**: `translateY(4px)` → `translateY(0)` (for top/bottom)
- **Transform**: `translateX(4px)` → `translateX(0)` (for left/right)
- **Opacity**: `0` → `1`

**Reduced Motion**: Animations are disabled when `prefers-reduced-motion: reduce` is set.

## Accessibility

### Keyboard Navigation

- Tooltips appear on keyboard focus (Tab key)
- Tooltips disappear on blur (Tab away)
- Focus indicators are visible (2px orange outline)

### ARIA

- Tooltip has `role="tooltip"` attribute
- Proper semantic HTML structure

### Motion

- Respects `prefers-reduced-motion` user preference
- Animations are disabled for users who prefer reduced motion

### Focus Management

- Focus-visible styles applied with orange outline
- Outline offset: `2px`
- Outline color: `var(--ds-primary)` (brand orange)

## Testing

The component has comprehensive test coverage:

```bash
npm test client/src/components/base/Tooltip.test.tsx
```

### Test Coverage

✅ 25 tests covering all acceptance criteria:

1. Component creation with TypeScript interface
2. Tooltip appears on hover (mouseenter)
3. Tooltip disappears on mouseleave
4. Position configurable (top, bottom, left, right, default)
5. Arrow pointer positioned correctly for each position
6. Animation with proper transitions
7. Background colors for light/dark themes
8. Text styling (color and font size)
9. Padding and border radius
10. Respects prefers-reduced-motion
11. Keyboard accessibility (focus/blur)

## Browser Support

- **Modern Browsers**: Full support with animations
- **Reduced Motion**: Instant show/hide without animations
- **Touch Devices**: Shows on focus (keyboard/touch)

## Performance

- **Minimal Re-renders**: Uses `useState` and `useRef` efficiently
- **No Layout Thrashing**: Absolute positioning without reflow
- **Animation Performance**: Uses transform for 60fps animations
- **Event Cleanup**: Properly removes event listeners

## Implementation Details

### Positioning Algorithm

The tooltip uses absolute positioning relative to its wrapper:

```typescript
// Top position
{
  bottom: '100%',
  left: '50%',
  transform: 'translateX(-50%)',
  marginBottom: '8px',
}
```

### Arrow Rendering

CSS borders create the arrow triangle:

```typescript
// Top arrow (points down)
{
  borderLeft: '6px solid transparent',
  borderRight: '6px solid transparent',
  borderTop: '6px solid rgba(0, 0, 0, 0.9)',
}
```

### Media Query Detection

```typescript
const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
setPrefersReducedMotion(mediaQuery.matches);
```

## Best Practices

### Do's ✅

- Use for contextual help and additional information
- Keep tooltip text concise (1-2 short sentences)
- Ensure the trigger element is keyboard-focusable
- Use appropriate position based on available space
- Test with keyboard navigation

### Don'ts ❌

- Don't use for critical information (tooltips can be missed)
- Don't include interactive content in tooltips
- Don't make tooltip text too long (use a modal instead)
- Don't rely solely on hover (keyboard users need access)
- Don't block important content with tooltip positioning

## Related Components

- **GlassCard**: For larger content containers
- **StatusBadge**: For status indicators
- **Popover**: For interactive content (future)

## Dependencies

- `react`: ^19.2.1
- `clsx`: ^2.1.1

## Future Enhancements

Potential improvements for future iterations:

- [ ] Rich content support (HTML/React nodes)
- [ ] Delay before showing/hiding
- [ ] Maximum width configuration
- [ ] Portal rendering for complex layouts
- [ ] Touch device long-press support
- [ ] Multiple tooltip instances management
- [ ] Tooltip arrow offset customization

## Changelog

### v1.0.0 (Task 1.1.6)

- ✅ Initial implementation
- ✅ TypeScript interface
- ✅ Hover and focus interactions
- ✅ Four position options
- ✅ Arrow pointer
- ✅ Smooth animations
- ✅ Theme support
- ✅ Accessibility features
- ✅ Comprehensive test coverage (25 tests)

## License

Part of the Cena Studio Platform - Rebrand Phase 1.1
