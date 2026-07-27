# Task 20 Completion: Backend `breakdownService` with AI

## Summary

Successfully implemented Task 20 of the features-criticas-gap-analysis spec: Backend Script Breakdown service with structured AI prompts, following all requirements specified in the design document.

## Components Implemented

### 1. Service Layer (`server/services/breakdownService.ts`)
- **extractBreakdown**: AI-powered extraction using NVIDIA primary + Anthropic fallback
  - Structured JSON prompt requesting characters, locations, props, and wardrobe
  - Retry logic with reinforced prompt on first failure
  - Plan gating: Free users limited to 1 breakdown per account
  - Upsert pattern for 1:1 relationship with projects

- **getBreakdown**: Retrieves existing breakdown for a project

- **updateBreakdown**: Manual editing of breakdown data (inline edits from UI)

- **exportBreakdownPDF**: Generates PDF checklist grouped by department:
  - **Produção**: Locações (locations)
  - **Arte**: Props e Objetos (props)
  - **Figurino**: Roupas (wardrobe)
  - **Elenco**: Personagens (characters)
  - Each item rendered with checkbox for "Providenciado" tracking

- **validateBreakdownJSON**: Schema validation for AI responses

### 2. Controller Layer (`server/controllers/breakdownController.ts`)
Following the established pattern (similar to shotsController), implements 4 endpoints:
- `POST /api/breakdown/:projectId` - Extract breakdown from script
- `GET /api/breakdown/:projectId` - Get existing breakdown
- `PUT /api/breakdown/:projectId` - Update breakdown manually
- `GET /api/breakdown/:projectId/export` - Export PDF checklist

### 3. Routes (`server/routes/breakdown.ts`)
- All routes require authentication and operational plan
- Registered in main router at `/api/breakdown`

### 4. Comprehensive Tests (`server/services/breakdownService.test.ts`)
✅ All 13 tests passing:
- **validateBreakdownJSON** (3 tests):
  - Valid breakdown structure validation
  - Invalid structure rejection
  - Location type/time constraints

- **extractBreakdown** (4 tests):
  - NVIDIA extraction success
  - Anthropic fallback on NVIDIA failure
  - Free plan limits enforcement
  - Unauthorized project access rejection

- **getBreakdown** (2 tests):
  - Return existing breakdown
  - Return null when not found

- **updateBreakdown** (2 tests):
  - Update breakdown fields
  - Reject when breakdown doesn't exist

- **exportBreakdownPDF** (2 tests):
  - Generate PDF with all sections
  - Reject when breakdown doesn't exist

## Requirements Satisfied

✅ **Requirement 5.2**: AI-powered breakdown extraction
✅ **Requirement 5.3**: Structured JSON output (characters, locations, props, wardrobe)
✅ **Requirement 5.6**: PDF export grouped by department
✅ **Requirement 5.7**: Retry logic with fallback
✅ **Requirement 5.8**: Plan-based limits (Free: 1 breakdown, Pro/Studio: unlimited)

## Technical Details

### AI Integration
- **Primary**: NVIDIA API (`nvidia/nemotron-3-ultra-550b-a55b`)
- **Fallback**: Anthropic API (`claude-sonnet-4-20250514`)
- **Temperature**: 0.3 (for more consistent JSON output)
- **Timeout**: 90 seconds
- **Retry**: Automatic retry with reinforced prompt if JSON parsing fails

### JSON Structure
```typescript
interface BreakdownJSON {
  characters: Array<{
    name: string;
    description?: string;
    scenes: number[];
  }>;
  locations: Array<{
    name: string;
    type: "INT" | "EXT";
    time: "DIA" | "NOITE";
    address?: string;
  }>;
  props: Array<{
    name: string;
    scene: number;
    description?: string;
  }>;
  wardrobe: Array<{
    character: string;
    item: string;
    scene: number;
  }>;
}
```

### Database Schema
Uses existing `ScriptBreakdown` model from Task 19:
- 1:1 relationship with Project (unique projectId)
- JSON columns for characters, locations, props, wardrobe
- Stores original `scriptText` for re-extraction

### Plan Gating
Leverages `entitlementService` for consistent plan checking:
- **Free**: 1 breakdown total across all projects
- **Pro**: Unlimited breakdowns
- **Studio**: Unlimited breakdowns

### PDF Export
Generated with `jspdf`:
- Professional checklist format
- Grouped by department
- Checkbox for each item
- Automatic pagination
- Project name in header

## Integration Points

### Existing Services Used
- `prisma`: Database operations
- `entitlementService`: Plan limit checking
- `aiService` pattern: Followed same NVIDIA/Anthropic structure

### Routes Registered
Added to `server/router.ts`:
```typescript
import breakdownRoutes from "./routes/breakdown.js";
router.use("/breakdown", breakdownRoutes);
```

## Files Created/Modified

### Created:
1. `server/services/breakdownService.ts` (455 lines)
2. `server/services/breakdownService.test.ts` (368 lines)
3. `server/controllers/breakdownController.ts` (95 lines)
4. `server/routes/breakdown.ts` (30 lines)

### Modified:
1. `server/router.ts` (added import and route registration)

## Testing Results

```
✓ server/services/breakdownService.test.ts (13)
  Test Files  1 passed (1)
  Tests  13 passed (13)
  Duration  2.01s
```

## Build Verification

```bash
npm run build
# ✓ Build succeeded
# ✓ No TypeScript errors
# ✓ No runtime errors
```

## Next Steps (Task 21)

The backend is complete. Task 21 will implement the frontend:
- Integration in `Studio.tsx` (Roteiro tool)
- `BreakdownView` component with tabs
- Inline editing with "Providenciado" checkboxes
- Re-extract and Export buttons
- `useBreakdown` hook for state management

## Cost Analysis

**Per breakdown execution:**
- Script ~3000 tokens input
- Breakdown ~1000 tokens output
- NVIDIA: ~$0.0008 per extraction
- Anthropic fallback: ~$0.004 per extraction

**At scale (100 users, 2 breakdowns/month):**
- 200 breakdowns/month
- Estimated cost: $0.16-0.80/month
- ✅ Within "zero cost" budget (<$1/month)

## Notes

- Error handling includes user-friendly Portuguese messages
- AI timeout set to 90s to accommodate longer scripts
- PDF uses jspdf (already in package.json, no new dependency)
- All type safety maintained with proper Prisma JSON casting
- Tests use proper mocking with vitest
- Follows existing codebase patterns (shotsService, assetsService)

---

**Status**: ✅ COMPLETE
**Date**: 2025-01-XX
**Requirements**: 5.2, 5.3, 5.6, 5.7, 5.8 - All satisfied
