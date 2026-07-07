# Implementation Plan: Client Hub Connected Workflows

## Overview

Transform `/clients/:id` into a bidirectional hub by expanding the API, upgrading ClientDetail, wiring pre-fill and deep-link patterns into destination pages, injecting client context into StudioShell, and covering all 10 correctness properties with fast-check property-based tests. Tasks follow a strict backend → frontend → tests order so each layer is ready before it's consumed.

## Tasks

- [x] 1. Expand `GET /api/clients/:id` — SQLite path
  - [x] 1.1 Add financial, files, and videoReviews queries to `getClient` (SQLite branch)
    - In `server/controllers/clientsController.ts`, inside the SQLite `getClient` branch, add three wrapped queries after the existing `interactions` query
    - Financial: `SELECT id, kind, description, amount, status, due_date, category FROM financial_entries WHERE client_id = ? ORDER BY due_date DESC`
    - Files: collect `projectIds` from `projects`, then `SELECT f.id, f.original_name, f.mime_type, f.created_at, f.project_id, p.name as project_name FROM files f JOIN projects p ON p.id = f.project_id WHERE f.project_id IN (...) ORDER BY f.created_at DESC LIMIT 100`
    - VideoReviews: same IN pattern — `SELECT vr.id, vr.project_id, p.name as project_name, vr.title, vr.status, vr.created_at FROM video_reviews vr JOIN projects p ON p.id = vr.project_id WHERE vr.project_id IN (...) ORDER BY vr.created_at DESC`
    - Wrap each query in its own `try/catch`; on failure push the section name to a `warnings: string[]` array and set the result to `[]`
    - Update the interactions LIMIT from 10 → 20 in the SQLite branch
    - Return the extended shape: `{ client, projects, opportunities, interactions, financial, files, videoReviews, ...(warnings.length ? { warnings } : {}) }`
    - _Requirements: 10.1, 10.3, 10.4, 10.5, 10.6, 5.5_

- [x] 2. Expand `GET /api/clients/:id` — Prisma path
  - [x] 2.1 Add financial, files, and videoReviews queries to `getClient` (Prisma branch)
    - After the existing `prisma.client.findFirst` with `include`, add three `prisma.financialEntry.findMany`, `prisma.file.findMany`, and `prisma.videoReview.findMany` calls filtered to the client's project IDs
    - Wrap each in its own `try/catch` with the same `warnings` accumulation pattern
    - Update the Prisma `interactions` `take` from `10` → `20` and add `orderBy: { createdAt: "desc" }` if not already present
    - Return the same extended shape matching the SQLite branch response
    - _Requirements: 10.1, 10.3, 10.4, 10.5, 10.6, 5.5_

  - [ ]* 2.2 Write property test — Property 1: Hub payload always contains all seven sections
    - File: `server/controllers/clientsController.test.ts`
    - **Property 1: Hub payload always contains all seven sections**
    - **Validates: Requirements 10.1**
    - Generate arbitrary valid client IDs with mocked DB; assert response `data` always contains keys: `client`, `projects`, `opportunities`, `interactions`, `financial`, `files`, `videoReviews`

  - [ ]* 2.3 Write property test — Property 2: Hub payload filtering correctness
    - File: `server/controllers/clientsController.test.ts`
    - **Property 2: Hub payload filtering correctness**
    - **Validates: Requirements 2.4, 3.2, 6.1, 6.5, 7.1, 8.3, 10.3, 10.4, 10.5**
    - Generate clients with N projects and cross-client data; assert every item in `opportunities`, `interactions`, `financial`, `files`, and `videoReviews` belongs only to the queried client

  - [ ]* 2.4 Write property test — Property 3: Interactions limited to 20, ordered descending
    - File: `server/controllers/clientsController.test.ts`
    - **Property 3: Interactions are limited to 20 and ordered descending**
    - **Validates: Requirements 5.1, 5.5**
    - Generate arbitrary interaction lists of length 0–200; assert `interactions.length <= 20` and each `created_at` is `>=` the next

  - [ ]* 2.5 Write property test — Property 4: Files capped at 100, ordered descending
    - File: `server/controllers/clientsController.test.ts`
    - **Property 4: Files are capped at 100 and ordered descending**
    - **Validates: Requirements 7.1**
    - Generate arbitrary file lists of length 0–500; assert `files.length <= 100` and descending `created_at` order

  - [ ]* 2.6 Write property test — Property 9: Partial failure resilience
    - File: `server/controllers/clientsController.test.ts`
    - **Property 9: Partial failure resilience — client always present in response**
    - **Validates: Requirements 10.6**
    - Generate arbitrary subsets of `{financial, files, videoReviews}` to throw; assert response still has `client`, failed sections are `[]`, and `warnings` lists exactly the failed section names

- [x] 3. Checkpoint — backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Upgrade `ClientDetail.tsx` — single fetch and new state
  - [x] 4.1 Replace multi-step data loading with a single hub fetch
    - Remove the two-step `loadAll` that calls `/api/analytics/finance` and per-project `/api/files/projects/:id`
    - Replace with a single `fetch(\`/api/clients/${clientId}\`, { credentials: "include" })` that reads all seven sections from the hub payload
    - Add state variables: `opportunities` (`OpportunityItem[]`) and `videoReviews` (`VideoReviewItem[]`)
    - Add interfaces `OpportunityItem` and `VideoReviewItem` as defined in the design document
    - Extend `FinancialItem` interface to include the `category` field
    - Extend `FileItem` interface to include `project_id` and `project_name` fields
    - _Requirements: 10.1, 10.7_

  - [x] 4.2 Add financial summary computation and header card
    - Add a `useMemo` that computes `totalIncome`, `totalExpenses`, and `netBalance` from `financial` entries filtered by `kind` and `status === "settled"`
    - Render a summary card row above the financial entry list in the Financeiro tab with three stat cells: Total Receitas (green), Total Despesas (red), Saldo Líquido (green if ≥ 0, red if < 0)
    - _Requirements: 6.2_

  - [ ]* 4.3 Write property test — Property 5: Financial summary math is always correct
    - File: `client/src/pages/ClientDetail.test.tsx`
    - **Property 5: Financial summary math is always correct**
    - **Validates: Requirements 6.2**
    - Generate arbitrary arrays of `FinancialEntry` objects with random `kind`, `status`, and `amount`; assert computed `totalIncome`, `totalExpenses`, and `netBalance` match independently hand-calculated values

  - [x] 4.4 Add Oportunidades tab content
    - Add `TabsTrigger` "Oportunidades" and `TabsContent` to the existing Tabs
    - Render each opportunity with: title, stage badge, estimated_value (formatted as BRL), expected_close_date, and probability
    - Clicking an opportunity navigates to `/pipeline?opportunityId={id}`
    - Empty state prompts "Nova Oportunidade" action navigating to `/pipeline?new=1&clientId=${clientId}`
    - _Requirements: 3.1, 3.4, 3.5_

  - [x] 4.5 Add Propostas tab — fetching saved proposals
    - Add a separate `useEffect` that fetches `GET /api/proposals?clientId=${clientId}` after the hub fetch completes (non-blocking)
    - Add state `proposals` (`SavedProposal[]`) with interface: `{ id, title, clientName, total, createdAt, status }`
    - Add `TabsTrigger` "Propostas" and `TabsContent` rendering title, total value, creation date, and status badge
    - Empty state shows message and "Gerar Proposta" button navigating to `/proposals?clientId=${clientId}`
    - _Requirements: 4.4, 4.5_

  - [x] 4.6 Add Vídeo Reviews tab content
    - Add `TabsTrigger` "Vídeo Reviews" and `TabsContent`
    - Render each video review with: title, status badge, project_name, and created_at date
    - Clicking a review navigates to `/video-reviews/${review.project_id}`
    - Empty state shows a message indicating no reviews exist
    - _Requirements: 8.1, 8.2, 8.4_

  - [x] 4.7 Add Studio contextual quick actions
    - Import `BriefcaseBusiness`, `Film` from lucide-react (alongside existing icons)
    - Add a visual separator and three buttons in the Quick Actions bar, one per Studio action: Briefing (`/studio/briefing?clientId=${clientId}`), Proposta (`/studio/proposta?clientId=${clientId}`), Roteiro (`/studio/roteiro?clientId=${clientId}`)
    - Label each button using the t() key pattern consistent with existing quick action buttons
    - _Requirements: 9.1, 9.2_

  - [ ]* 4.8 Write property test — Property 6: Navigation URLs always include clientId
    - File: `client/src/pages/ClientDetail.test.tsx`
    - **Property 6: Navigation URLs always include clientId**
    - **Validates: Requirements 2.3, 3.3, 4.1, 5.2, 6.3, 9.2**
    - Generate arbitrary positive integer clientIds; render ClientDetail quick-action buttons with that clientId; assert every `setLocation` call URL contains `clientId=${N}` as a query parameter

  - [x] 4.9 Update Arquivos tab to show project_name per file
    - Update the file list row in the Arquivos tab to display `file.project_name` alongside the mime_type and date
    - Ensure the download link still uses `/api/files/${file.id}/download`
    - _Requirements: 7.2_

- [x] 5. Checkpoint — ClientDetail tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement `useClientIdFromQuery` shared hook
  - [x] 6.1 Create the shared query-param hook
    - Create file `client/src/hooks/useClientIdFromQuery.ts`
    - Export `useClientIdFromQuery(): number | null` using `useSearch()` from wouter, parsing `clientId` with `new URLSearchParams`, returning the integer only if `Number.isInteger(parsed) && parsed > 0`, null otherwise
    - _Requirements: 4.2, 5.3, 6.4, 9.3_

  - [x]* 6.2 Write unit tests for `useClientIdFromQuery`
    - File: `client/src/hooks/useClientIdFromQuery.test.ts`
    - Test: returns `null` for missing param, non-numeric string, negative integer, float string, and zero
    - Test: returns the integer value for valid positive integer strings (e.g., `"1"`, `"999"`)

- [x] 7. Implement pre-fill pattern in `Proposals.tsx`
  - [x] 7.1 Read `clientId` query param and pre-fill proposal form
    - Import `useClientIdFromQuery` from `@/hooks/useClientIdFromQuery`
    - Add a `useEffect` that runs on mount: if `clientId` is non-null, call `GET /api/clients/${clientId}` and populate `form.clientName`, `form.company`, `form.email`, `form.phone` from the response
    - Also auto-select the client in the client dropdown if the component has one
    - On fetch failure: no-op, form stays empty
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ]* 7.2 Write property test — Property 8: Pre-fill populates form fields for valid clientId
    - File: `client/src/pages/Proposals.test.tsx`
    - **Property 8: Pre-fill populates form fields for valid clientId**
    - **Validates: Requirements 4.2, 5.3, 6.4**
    - Generate arbitrary client objects (name, company, email, phone); mock `GET /api/clients/:id` to return the generated client; assert rendered form fields match client data

- [x] 8. Implement pre-fill pattern in `Interactions.tsx`
  - [x] 8.1 Read `clientId` and `new` query params and pre-fill interaction form
    - Import `useClientIdFromQuery`
    - Add a `useEffect` that pre-selects the client in the interaction form's client select dropdown when `clientId` is valid
    - If `new=1` is also present in query params, auto-open the create interaction dialog
    - On fetch failure or missing clientId: no-op
    - _Requirements: 5.2, 5.3, 5.4_

- [x] 9. Implement pre-fill pattern in `Analytics.tsx`
  - [x] 9.1 Read `clientId` and `newEntry` query params and pre-fill financial entry form
    - Import `useClientIdFromQuery`
    - Add a `useEffect` that pre-sets `selectedClientId` in the new entry form when `clientId` is valid
    - If `newEntry=1` is also present in query params, auto-open the create entry dialog
    - On fetch failure or missing clientId: no-op
    - _Requirements: 6.3, 6.4_

- [x] 10. Implement `ClientLink` component and deep links
  - [x] 10.1 Add `ClientLink` inline component and integrate into `ProjectHub.tsx`
    - Define the `ClientLink` component inline in `ProjectHub.tsx`: accepts `clientId: number | null` and `clientName?: string | null`; renders a `<button>` with `Building2` icon + clientName text, `onClick` stops propagation and calls `setLocation(\`/clients/${clientId}\`)`; returns `null` when either arg is falsy
    - Render `<ClientLink clientId={project.clientId} clientName={project.clientName} />` below the project name heading in each project card/row
    - _Requirements: 11.1, 11.5, 11.6_

  - [x] 10.2 Integrate `ClientLink` into `Pipeline.tsx`
    - Copy the same `ClientLink` component definition (or import if extracted) into `Pipeline.tsx`
    - Render on each opportunity Kanban card: `<ClientLink clientId={opp.client_id} clientName={opp.client_name} />`
    - Also render inside the opportunity detail modal if one exists
    - _Requirements: 11.2, 11.5, 11.6_

  - [x] 10.3 Integrate `ClientLink` into `Analytics.tsx`
    - Add `ClientLink` to `Analytics.tsx`
    - Render on each financial entry row: `<ClientLink clientId={entry.client_id} clientName={entry.client_name} />`
    - _Requirements: 11.3, 11.5_

  - [x] 10.4 Integrate `ClientLink` into `Interactions.tsx`
    - Add `ClientLink` to `Interactions.tsx`
    - Render on each interaction row: `<ClientLink clientId={interaction.clientId} clientName={interaction.client_name} />`
    - _Requirements: 11.4, 11.5_

  - [ ]* 10.5 Write property test — Property 7: ClientLink conditional rendering
    - File: `client/src/components/ClientLink.test.tsx`
    - **Property 7: Client link renders for entities with clientId and is absent when null**
    - **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5**
    - Generate arbitrary entity objects with random `client_id` values (including null) and random `clientName` values (including null/empty); assert `ClientLink` renders an anchor/button with `/clients/${clientId}` route iff both `clientId` is non-null and `clientName` is non-empty string

- [x] 11. Checkpoint — deep link and pre-fill tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Inject client context into `StudioShell.tsx`
  - [x] 12.1 Parse clientId from query params and fetch client context in StudioShell
    - Import `useClientIdFromQuery` and `useSearch` (wouter) in `StudioShell.tsx`
    - Add a `useEffect` that runs when `clientIdParam` or `activeToolId` changes: if `clientIdParam` is non-null and `!activeProject`, call `api.clients.get(clientIdParam)`, then call `buildStudioLinkedContext(activeToolId, null, details.client)` and set `linkedContext` and merge prefill into `formData` via `mergeStudioPrefill`
    - On API failure: catch and no-op (do not set any context)
    - _Requirements: 9.3, 9.4_

  - [x] 12.2 Offer active project context when client has non-archived projects
    - After fetching client details, filter `details.projects` for status not in `["archived", "cancelled"]`
    - If any qualifying projects exist, take the most recently created one and update `linkedContext.sourceLabel` to reflect the project name, enabling the existing "Apply context" button in the UI for the user
    - _Requirements: 9.5, 9.6_

  - [ ]* 12.3 Write property test — Property 10: Studio context injection preserves non-null fields only
    - File: `client/src/lib/studioContext.test.ts`
    - **Property 10: Studio context injection preserves non-null fields only**
    - **Validates: Requirements 9.3**
    - Generate arbitrary client objects with randomly null, empty-string, or populated fields (name, company, industry); call `buildStudioLinkedContext` with each; assert no null/undefined/empty-string value appears in the prefill output object

- [x] 13. Final checkpoint — all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at each architectural layer
- Property tests validate universal correctness properties using `fast-check` (already installed as a dev dependency)
- Unit tests validate specific examples and edge cases
- The `useClientIdFromQuery` hook must be implemented (task 6.1) before tasks 7, 8, 9, and 12 can start
- SQLite and Prisma paths (tasks 1 and 2) must be completed in parallel before ClientDetail (task 4) starts
- The Prisma `prisma.financialEntry`, `prisma.file`, and `prisma.videoReview` model names should be verified against the actual Prisma schema before writing queries

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["2.2", "2.3", "2.4", "2.5", "2.6", "6.1"] },
    { "id": 2, "tasks": ["4.1", "6.2"] },
    { "id": 3, "tasks": ["4.2", "4.4", "4.5", "4.6", "4.7", "4.9", "7.1", "8.1", "9.1"] },
    { "id": 4, "tasks": ["4.3", "4.8", "7.2", "10.1", "10.2", "10.3", "10.4"] },
    { "id": 5, "tasks": ["10.5", "12.1"] },
    { "id": 6, "tasks": ["12.2"] },
    { "id": 7, "tasks": ["12.3"] }
  ]
}
```
