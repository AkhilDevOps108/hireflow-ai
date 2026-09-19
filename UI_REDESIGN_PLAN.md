# UI REDESIGN PLAN

## Scope Guardrails
- Preserve existing backend functionality and API contracts.
- Do not rewrite backend architecture unless required for missing workflow APIs.
- Move from prototype tabbed UI to enterprise route-based recruiting workspace.
- Keep AI as embedded capability across workflows, not as the primary product surface.

## 1) Current Routes (As-Is)
### Frontend
- No URL routing system is implemented yet.
- Navigation is state-driven tabs in [frontend/src/App.tsx](frontend/src/App.tsx):
  - Dashboard
  - Jobs
  - Candidates
  - Vector Store
  - AI Assistant

### Backend
- Implemented API routes in [backend/app/main.py](backend/app/main.py):
  - `GET /health`
  - `GET /`
  - `POST /auth/login`
  - `POST /jobs`
  - `GET /jobs`
  - `GET /jobs/{job_id}`
  - `POST /jobs/{job_id}/analyze`
  - `POST /candidates/upload`
  - `GET /candidates`
  - `GET /candidates/{candidate_id}`
  - `GET /jobs/{job_id}/top-candidates`
  - `GET /jobs/{job_id}/candidates`
  - `POST /agent/chat`
  - `POST /interviews/generate`

## 2) Current Components (As-Is)
- Frontend is monolithic in [frontend/src/App.tsx](frontend/src/App.tsx).
- No reusable component folders exist yet.
- Global styling in [frontend/src/styles.css](frontend/src/styles.css).
- Entry in [frontend/src/main.tsx](frontend/src/main.tsx).

## 3) Current API Integration (As-Is)
- Direct fetch calls inside [frontend/src/App.tsx](frontend/src/App.tsx) to fixed base URL `http://localhost:8001`.
- No API service layer abstraction.
- No React Query usage despite dependency availability.
- No structured request lifecycle handling (query caching, invalidation, retry strategies).

## 4) Current Data Models (As-Is)
### Frontend local types
- `Job`
- `Candidate`
- `ChatMessage`

### Backend Pydantic models in [backend/app/models.py](backend/app/models.py)
- `Requirement`
- `Job`
- `Candidate`
- `MatchResult`
- `InterviewQuestion`
- `AuditEvent`

## 5) Current UI Problems
1. Information architecture is prototype-like (tabs in one file), not enterprise workflow-oriented.
2. "Vector Store" is recruiter-facing, exposing implementation terminology.
3. AI is over-surfaced as a standalone page pattern instead of contextual actions.
4. Dashboard relies on mixed placeholder metrics and does not prioritize recruiter throughput.
5. No route-level pages for key workflows (job detail, top candidates, candidate profile, interviews, evaluations).
6. Data density is low: lists are card-centric, not table-driven for recruiter operations.
7. No global top bar with search/notifications/org/profile context.
8. No reusable design system primitives; repeated UI patterns are embedded in one component.
9. No robust loading/empty/error patterns for each workflow pane.
10. Copilot interactions are text-first and not structured around result widgets (mini tables/cards/actions).

## 6) New Information Architecture (Target)
### Sidebar
- Overview
- WORKSPACE
  - Jobs
  - Talent Pool
  - Interviews
  - Evaluations
- INSIGHTS
  - Reports
- SYSTEM
  - Activity
  - Settings

### Global Elements
- Top context bar with search, notifications, org selector, profile.
- Floating/global AI Copilot (bee launcher) that opens a right-side panel.
- Copilot available on all routes with contextual awareness.

## 7) New Route Structure (Target)
- `/` (or `/dashboard`) -> Overview
- `/jobs`
- `/jobs/:id`
- `/jobs/:id/candidates`
- `/jobs/:id/requirements`
- `/candidates`
- `/candidates/:id`
- `/interviews`
- `/interviews/:id`
- `/evaluations`
- `/reports`
- `/activity`
- `/settings`
- `/settings/developer` (AI observability + diagnostics)

## 8) Components to Remove / De-emphasize
- Remove recruiter-facing "Vector Store" nav destination.
- Remove standalone "AI Assistant" primary page pattern.
- Remove giant textarea-centric assistant experience as the primary interaction.
- Remove dashboard metrics tied to infra internals (vector/chunk style terminology).
- Remove oversized decorative blocks without operational value.

## 9) Components to Create
### Shell / Navigation
- `AppShell`
- `Sidebar`
- `TopBar`
- `GlobalSearch`
- `PageHeader`

### Data Display
- `MetricCard`
- `DataTable`
- `TableToolbar`
- `StatusBadge`
- `ScoreBadge`
- `AvatarCell`
- `EmptyState`
- `LoadingState`
- `ErrorState`

### Jobs / Matching
- `JobTable`
- `JobDetailHeader`
- `JobRequirementsPanel`
- `RequirementCoverageTable`
- `CandidateMatchingTable`
- `MatchScoreCell`
- `MatchAnalysisDrawer`

### Candidates / Evidence
- `TalentPoolTable`
- `CandidateProfileHeader`
- `CandidateOverviewPanel`
- `CandidateMatchesPanel`
- `EvidencePanel`
- `EvidenceItem`

### Interviews / Evaluations / Activity / Reports
- `InterviewTable`
- `InterviewDetailPanel`
- `EvaluationTable`
- `ActivityFeedTable`
- `ReportsChartsPanel`

### AI Copilot
- `AICopilotPanel`
- `AICopilotMessage`
- `AICopilotToolSteps`
- `AICopilotResultTable`
- `AICopilotContextBar`

## 10) API Dependencies for Redesign
### Reuse immediately
- Jobs list/detail/analyze
- Candidates list/detail/upload
- Job candidates and top candidates
- Agent chat
- Interview question generation

### Likely needed additions (incremental)
- Evidence endpoints:
  - `GET /candidates/{id}/evidence`
  - `GET /jobs/{id}/evidence`
- Interview analysis endpoint:
  - `POST /interviews/analyze`
- Evaluations summary endpoints
- Activity feed endpoint
- Reports aggregate endpoints
- AI observability endpoints for developer settings

## 11) Proposed Implementation Order
### Phase 1: Shell + Routing Foundation
- Introduce route-based architecture and app shell.
- Implement sidebar, top bar, global search frame.
- Migrate existing tabs to routes with parity views.

### Phase 2: Overview
- Replace current dashboard with data-dense recruiter overview:
  - active jobs table
  - recent candidate activity
  - recruitment funnel
  - recruiter-facing AI insights

### Phase 3: Jobs Workspace
- Jobs table + create-job wizard (multi-step, AI requirement extraction step).

### Phase 4: Job Detail
- Route `/jobs/:id` with tabs: overview, requirements, candidates, interviews, activity.

### Phase 5: Candidate Matching
- Matching controls, filters, sorting, compare flow.

### Phase 6: Top Candidates
- `/jobs/:id/candidates` table-first top candidates workflow + score click drawer.

### Phase 7: Talent Pool + Candidate Profile
- Global talent pool and `/candidates/:id` profile tabs.

### Phase 8: Evidence Experience
- Evidence panels and linked sources.

### Phase 9: Interviews
- Interview pipeline list and interview detail workspace.

### Phase 10: Evaluations
- Evaluation workspace with human-review status model.

### Phase 11: Global AI Copilot
- Right-side contextual copilot, structured responses, tool-step UI.

### Phase 12: Reports
- Recruiter analytics and job-level insights.

### Phase 13: Activity
- Operational activity feed for recruiter workflows.

### Phase 14: Developer AI Insights
- Move AI diagnostics under settings/developer.

### Phase 15: Responsive + Accessibility polish
- Keyboard nav, ARIA, tablet/mobile behavior, focus states.

### Phase 16: Testing
- Add frontend route/component tests + one end-to-end workflow.

## 12) File/Folder Refactor Plan
### Create
- `frontend/src/app/`
- `frontend/src/router/`
- `frontend/src/layout/`
- `frontend/src/components/`
- `frontend/src/features/jobs/`
- `frontend/src/features/candidates/`
- `frontend/src/features/interviews/`
- `frontend/src/features/evaluations/`
- `frontend/src/features/reports/`
- `frontend/src/features/activity/`
- `frontend/src/features/copilot/`
- `frontend/src/pages/`
- `frontend/src/api/`
- `frontend/src/types/`
- `frontend/src/hooks/`
- `frontend/src/utils/`

### Update
- [frontend/src/main.tsx](frontend/src/main.tsx)
- [frontend/src/App.tsx](frontend/src/App.tsx) (becomes thin router/shell entry)
- [frontend/src/styles.css](frontend/src/styles.css)

### Backend changes only when needed for missing workflows
- [backend/app/main.py](backend/app/main.py)
- [backend/app/services.py](backend/app/services.py)
- [backend/app/models.py](backend/app/models.py)

## 13) Non-Goals During Initial Redesign Pass
- No replacement of backend with a new architecture.
- No fabricated recruiter metrics where backend can provide real numbers.
- No exposure of vector/chunk/embedding terms in recruiter-first UI.
- No chatbot-first layout.
