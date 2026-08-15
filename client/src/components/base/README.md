# Base Components

Foundation UI components for the Cena Studio Platform rebrand (Phase 1).

## Overview

This directory contains low-level, reusable components that implement the design token system and provide consistent styling across the application. These components are the building blocks for more complex UI elements.

## Components

### StatusBadge ✅ Complete

**Purpose**: Display status information with semantic color coding

**Features**:
- 5 status types (success, warning, danger, info, neutral)
- Optional icon support
- Pulse animation
- Size variants (sm, md)
- Accessibility features (prefers-reduced-motion)

**Usage**:
```tsx
import { StatusBadge } from '@/components/base';

<StatusBadge type="success" text="Active" />
<StatusBadge type="warning" text="Pending" icon={<Icon />} pulse />
```

**Documentation**: See [StatusBadge.md](./StatusBadge.md)

**Task**: 1.1.3 in rebrand-fase1-fundacao spec

---

## Planned Components

The following components are planned as part of Phase 1.1:

### GlassCard (Task 1.1.2)
- Glassmorphism effect container
- Light/dark variants
- Configurable border radius
- Hover animations

### ProgressBar (Task 1.1.4)
- Linear progress indicator
- Percentage label
- Smooth animations
- Configurable colors

### QuickActionButton (Task 1.1.5)
- Ghost and solid variants
- Icon support
- Size variants
- Hover effects

### Tooltip (Task 1.1.6)
- Contextual help on hover/focus
- 4 position variants
- Arrow pointer
- Keyboard accessible

---

## Design System Integration

All base components follow the design token system established in Task 1.1.1:

### Color Usage
```tsx
import { colors } from '@/design-system/tokens';

// Semantic colors
colors.semantic.success  // success token
colors.semantic.warning  // warning token
colors.semantic.error    // danger token
colors.semantic.info     // info token

// Neutrals
colors.neutral.black     // surface token
colors.neutral.white     // text token
```

### Typography Scale
- hero: 4rem
- page: 2.5rem
- section: 2rem
- card: 1.5rem
- body: 1rem
- small: 0.875rem
- label: 0.75rem

### Spacing Scale
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 48px
- 3xl: 64px
- 4xl: 96px

### Border Radius Scale
- sm: 8px
- md: 12px
- lg: 16px
- xl: 24px
- 2xl: 32px
- full: 9999px (pill shape)

---

## Testing

All components include comprehensive test suites covering:

- ✅ Basic rendering
- ✅ Props validation
- ✅ Visual styling
- ✅ Accessibility
- ✅ Edge cases
- ✅ Integration scenarios

Run tests:
```bash
npm test components/base/
```

Run specific component tests:
```bash
npm test StatusBadge.test.tsx
```

---

## Usage Guidelines

### Importing

```tsx
// Named imports (recommended)
import { StatusBadge } from '@/components/base';

// Direct import
import { StatusBadge } from '@/components/base/StatusBadge';
```

### TypeScript

All components are fully typed:

```tsx
import type { StatusBadgeProps, StatusType } from '@/components/base';

const MyComponent: React.FC = () => {
  const status: StatusType = 'success';
  return <StatusBadge type={status} text="Active" />;
};
```

### Styling

Components use a combination of:
- Tailwind CSS utility classes
- Inline styles for dynamic values
- CSS modules for complex animations

Always prefer Tailwind utilities when possible.

---

## Accessibility

All base components follow WCAG 2.1 Level AA guidelines:

- **Color Contrast**: Minimum 4.5:1 for normal text
- **Keyboard Navigation**: All interactive elements are keyboard accessible
- **Screen Readers**: Proper ARIA labels and semantic HTML
- **Motion**: Respect `prefers-reduced-motion` media query
- **Focus Indicators**: Visible focus states for all interactive elements

---

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- iOS Safari (latest)
- Chrome Mobile (latest)

### Fallbacks

Components include fallbacks for:
- `backdrop-filter` (glassmorphism)
- CSS Grid (flexbox alternative)
- CSS Custom Properties (hardcoded values)

---

## Contributing

When adding new base components:

1. Follow the existing structure (Component.tsx, Component.test.tsx, Component.md)
2. Include comprehensive tests (aim for 90%+ coverage)
3. Document props with JSDoc comments
4. Add usage examples
5. Consider accessibility from the start
6. Support both light and dark themes
7. Export from index.ts barrel file

### Component Template

```tsx
/**
 * ComponentName Component
 *
 * Brief description
 *
 * @example
 * ```tsx
 * <ComponentName prop="value" />
 * ```
 */

import React from 'react';
import { clsx } from 'clsx';

export interface ComponentNameProps {
  /** Prop description */
  prop: string;
  /** Optional prop */
  optional?: boolean;
}

export const ComponentName: React.FC<ComponentNameProps> = ({
  prop,
  optional = false,
}) => {
  return (
    <div className={clsx('base-classes', optional && 'conditional-class')}>
      {prop}
    </div>
  );
};

export default ComponentName;
```

---

## Dependencies

```json
{
  "react": "^19.x",
  "clsx": "^2.x",
  "@/design-system/tokens": "workspace"
}
```

---

## Related Documentation

- [Design System Tokens](../../design-system/tokens/README.md)
- [Rebrand Spec](../../../../.kiro/specs/rebrand-fase1-fundacao/)
- [Component Design Guidelines](../../../../.kiro/specs/rebrand-fase1-fundacao/design.md)

---

## License

MIT © Cena Studio Platform
