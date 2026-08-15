# Home Dashboard Examples

## Layout Overview

The Home dashboard integrates all five dashboard components into a responsive, production-ready layout.

## Visual Structure

```
┌─────────────────────────────────────────────────────────────┐
│                    CONTAINER (max 1400px)                    │
│                    padding: 32px (xl)                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 1. GREETING SECTION                                   │  │
│  │ ☀️ Bom dia, João!                                     │  │
│  │ Vamos criar algo incrível hoje!                       │  │
│  │ Hoje é Segunda, 23 de dezembro                        │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│                     gap: 24px (lg)                           │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 2. WORKFLOW CARDS ROW (4-column grid)                 │  │
│  │                                                         │  │
│  │ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐            │  │
│  │ │📊 5   │ │👤 3   │ │🎥 7   │ │🤖 IA  │            │  │
│  │ │JOBS   │ │CLIENTS│ │REVIEWS│ │STUDIO │            │  │
│  │ │ATIVOS │ │AGUARD.│ │PEND.  │ │       │            │  │
│  │ └───────┘ └───────┘ └───────┘ └───────┘            │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│                     gap: 24px (lg)                           │
│                                                               │
│  ┌────────────────────┬────────────────────────────────────┐│
│  │ 3a. CHECKLIST      │ 3b. ACTIVE JOBS COLUMN            ││
│  │     (30%)          │     (70%)                          ││
│  │                    │                                    ││
│  │ ✓ MINHAS TAREFAS   │ 🎬 JOBS ATIVOS                    ││
│  │                    │                                    ││
│  │ ☐ Review briefing  │ ┌────────────────────────────┐   ││
│  │ ☑ Approve budget   │ │ Product Launch Video       │   ││
│  │ ☐ Schedule meeting │ │ Acme Corp · 5 dias         │   ││
│  │ ☐ Finalize script  │ │ ▓▓▓▓▓▓▓░░░░ 65%           │   ││
│  │                    │ └────────────────────────────┘   ││
│  │ + Nova tarefa      │ ┌────────────────────────────┐   ││
│  │                    │ │ 🔴 Brand Campaign          │   ││
│  │                    │ │ Tech Startup · 2 dias      │   ││
│  │                    │ │ ▓▓▓░░░░░░░░ 30%           │   ││
│  │                    │ └────────────────────────────┘   ││
│  │                    │                                    ││
│  │                    │ [+ NOVO JOB]                      ││
│  └────────────────────┴────────────────────────────────────┘│
│                                                               │
│                     gap: 24px (lg)                           │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 4. FINANCE STRIP                                       │  │
│  │ 💰 R$ 45.000,00 este mês • 8 jobs faturados           │  │
│  │                                    → Ver Finance       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Responsive Layouts

### Desktop (> 1024px)
- Full layout as shown above
- Container: max 1400px, centered
- Checklist: 30% width
- ActiveJobs: 70% width
- WorkflowCards: 4 columns
- Padding: 32px

### Tablet (768px - 1024px)
```
┌───────────────────────────────────┐
│  GREETING SECTION                 │
├───────────────────────────────────┤
│  WORKFLOW CARDS                   │
│  ┌─────────┐ ┌─────────┐        │
│  │ Jobs    │ │ Clients │        │
│  └─────────┘ └─────────┘        │
│  ┌─────────┐ ┌─────────┐        │
│  │ Reviews │ │ Studio  │        │
│  └─────────┘ └─────────┘        │
├───────────────────────────────────┤
│  CHECKLIST (full width)           │
├───────────────────────────────────┤
│  ACTIVE JOBS (full width)         │
├───────────────────────────────────┤
│  FINANCE STRIP                    │
└───────────────────────────────────┘
```

### Mobile (< 768px)
```
┌─────────────────────┐
│  GREETING SECTION   │
├─────────────────────┤
│  WORKFLOW CARDS     │
│  ┌───────────────┐ │
│  │ Jobs Ativos   │ │
│  └───────────────┘ │
│  ┌───────────────┐ │
│  │ Clients       │ │
│  └───────────────┘ │
│  ┌───────────────┐ │
│  │ Reviews       │ │
│  └───────────────┘ │
│  ┌───────────────┐ │
│  │ Studio        │ │
│  └───────────────┘ │
├─────────────────────┤
│  CHECKLIST          │
│  (full width)       │
├─────────────────────┤
│  ACTIVE JOBS        │
│  (full width)       │
├─────────────────────┤
│  FINANCE STRIP      │
└─────────────────────┘
```

## Component Specifications

### 1. GreetingSection
- **Position**: Top of page
- **Width**: Full width
- **Margin**: 24px bottom
- **Props**:
  - userName: 'João Silva'
  - currentDate: new Date()
  - showGlassEffect: true

### 2. WorkflowCardsRow
- **Position**: Below greeting
- **Width**: Full width
- **Margin**: 24px bottom
- **Grid**: 4 columns (desktop), 2 columns (tablet), 1 column (mobile)
- **Props**:
  - workflowStats: { activeJobs: 5, clientsWaiting: 3, reviewsPending: 7 }

### 3. ChecklistColumn
- **Position**: Left side of main content
- **Width**: 30% (desktop), 100% (mobile/tablet)
- **Props**:
  - items: ChecklistTask[]
  - onToggle: (id) => void
  - onDelete: (id) => void
  - onCreate: (text) => void

### 4. ActiveJobsColumn
- **Position**: Right side of main content
- **Width**: 70% (desktop), 100% (mobile/tablet)
- **Props**:
  - jobs: Job[]
  - onEdit: (id) => void
  - onView: (id) => void
  - onCreateNew: () => void

### 5. FinanceStrip
- **Position**: Bottom of page
- **Width**: Full width
- **Margin**: 24px top
- **Props**:
  - monthlyRevenue: 45000
  - jobsCompleted: 8
  - onViewFinance: () => void

## User Interactions

### Checklist Interactions
1. **Toggle Task**: Click checkbox to mark as complete/incomplete
2. **Delete Task**: Click delete button to remove task
3. **Create Task**: Type text and press Enter to create new task

### Job Interactions
1. **View Job**: Click job card to view details
2. **Edit Job**: Click "briefing" quick action to edit
3. **Create Job**: Click "+ NOVO JOB" button

### Navigation Interactions
1. **Workflow Cards**: Click any card to navigate to that section
   - Jobs Active → /jobs
   - Clients Waiting → /clients
   - Reviews Pending → /jobs?filter=review
   - Studio Tools → /studio

2. **Finance Link**: Click "→ Ver Finance" to view full finance page

## Data Flow

```typescript
// Current (Mock Data)
const mockData: DashboardData = {
  user: { name: 'João Silva' },
  workflowStats: {
    activeJobs: 5,
    clientsWaiting: 3,
    reviewsPending: 7,
  },
  checklistItems: [...],
  activeJobs: [...],
  financeStrip: {
    monthlyRevenue: 45000,
    jobsCompleted: 8,
  },
};

// Future (Task 1.3.11)
const {
  user,
  workflowStats,
  checklistItems,
  activeJobs,
  financeData,
  handleChecklistToggle,
  handleChecklistDelete,
  handleChecklistCreate,
} = useDashboardData();
```

## Styling

### Colors
- Background: Dark theme (from design system)
- Text: Light/white text on dark background
- Accent: primary brand token for primary actions
- Glass effect: Subtle transparency on GreetingSection

### Typography
- Display font for greeting
- Mono font for labels (uppercase, tracking)
- Body font for content

### Spacing
- Container padding: 32px (desktop), 16px (mobile)
- Section gaps: 24px
- Internal component spacing: As per component specs

### Effects
- Glass card effect on GreetingSection
- Hover states on interactive elements
- Smooth transitions on all interactions
- Scroll behavior: smooth

## Routes

### Current Routes
- `/home` - New HOME dashboard (Task 1.3.10) ✅
- `/dashboard` - Legacy dashboard (existing)

### Navigation Targets
- `/jobs` - Jobs listing
- `/jobs/:id` - Job detail
- `/jobs/:id/edit` - Job edit
- `/jobs/new` - Create new job
- `/clients` - Clients listing
- `/jobs?filter=review` - Reviews filter
- `/studio` - Studio tools
- `/finance` - Finance page

## Implementation Notes

### State Management
- Local state for checklist items (temporary)
- Navigation handled via wouter's setLocation
- Mock data structure ready for API integration

### Performance
- All components are already optimized
- Minimal re-renders
- Efficient event handlers
- Proper React hooks usage

### Accessibility
- Semantic HTML structure
- ARIA labels on sections
- Keyboard navigation support
- Focus management

### Testing
- 18 test suites covering all aspects
- 30+ assertions
- Integration tests for component interactions
- User interaction tests
- Responsive behavior tests

## Next Steps

### Immediate (Task 1.3.11)
1. Create useDashboardData hook
2. Replace mock data with API calls
3. Add loading states
4. Add error handling

### Future Enhancements
1. Add animations and transitions
2. Implement real-time updates
3. Add filtering and search
4. User customization options
5. Advanced analytics integration
