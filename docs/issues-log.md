# Issues Log

Agent sessions should log UX and quality issues here as they are discovered.

## Format

```
### YYYY-MM-DD — [Session Topic]

| Status | File | Issue | Fix |
|--------|------|-------|-----|
| RESOLVED | `path/to/file.tsx` | Description | What was done |
| OPEN | `path/to/file.tsx` | Description | — |
```

## Log

### 2026-03-17 — Production Hardening

| Status   | File                                                        | Issue                                                      | Fix                                          |
| -------- | ----------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------- |
| RESOLVED | `components/CRM/PipelineKanban.tsx`                         | Duplicate WeightedPipelineHeader KPI cards                 | Removed from Kanban; parent page owns header |
| RESOLVED | `components/Layout/Header.tsx`                              | "Loading... Team Member" text in header                    | Replaced with skeleton shimmer               |
| RESOLVED | `components/Layout/QuickAccessToolbar.tsx`                  | Shows project actions on CRM pages                         | Made context-aware by pathname               |
| RESOLVED | `components/Layout/QuickAddFAB.tsx`                         | Path matching broken (uses startsWith instead of includes) | Fixed to check segment presence              |
| RESOLVED | `components/Layout/Navigation.tsx`                          | Admin nav uses legacy role check                           | Uses useUserRBAC().isAdmin                   |
| RESOLVED | `app/(dashboard)/org/[orgSlug]/crm/layout.tsx`              | Double header (CRM h1 + tab nav)                           | Removed h1/description block                 |
| RESOLVED | `app/(dashboard)/org/[orgSlug]/dashboard/DashboardView.tsx` | "Built by MKG Builds" footer                               | Removed                                      |
| RESOLVED | Lead detail `_page-content.tsx`                             | Uses window.prompt() for mark-lost reason                  | Replaced with ConfirmReasonDialog            |
| RESOLVED | Estimate `_page-content.tsx`                                | Uses window.prompt() for version reason                    | Replaced with ConfirmReasonDialog            |
| RESOLVED | Navigation                                                  | Half-baked features visible in nav                         | Feature flags gate all incomplete features   |
