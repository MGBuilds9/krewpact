# Domain Ownership Map

KrewPact is organized into independent feature domains. Each domain has its own UI, API routes, hooks, and tests. Developers work within their assigned domain on feature branches.

## Domains

| Domain             | UI Path                                      | API Path                                                                                               | Key Hooks                                              | Independent?          |
| ------------------ | -------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ | --------------------- |
| **CRM**            | `crm/`                                       | `api/crm/`, `api/web/`                                                                                 | `useCRM.ts`                                            | Yes                   |
| **Projects**       | `projects/`, `contracts/`, `schedule/`       | `api/projects/`, `api/tasks/`, `api/contracts/`, `api/proposals/`, `api/esign/`, `api/calendar/`       | `useProjects.ts`, `useTasks.ts`, `useContracting.ts`   | Yes                   |
| **Estimates**      | `estimates/`                                 | `api/estimates/`, `api/cost-catalog/`, `api/cost-codes/`, `api/estimate-templates/`, `api/assemblies/` | `useEstimates.ts`, `useEstimating.ts`                  | Yes                   |
| **Finance**        | `finance/`, `expenses/`, `timesheets/`       | `api/finance/`, `api/expenses/`, `api/timesheet-batches/`                                              | `useFinance.ts`, `useExpenses.ts`, `useTimeExpense.ts` | Yes                   |
| **Portals**        | `portals/`                                   | `api/portal/`, `api/portals/`                                                                          | `usePortals.ts`                                        | Yes                   |
| **Admin/Settings** | `admin/`, `settings/`, `team/`               | `api/rbac/`, `api/settings/`, `api/team/`, `api/users/`, `api/bcp/`, `api/privacy/`                    | `useRBAC.ts`, `useSystem.ts`, `useTeam.ts`             | Yes                   |
| **Documents**      | `documents/`                                 | `api/compliance/`, `api/governance/`                                                                   | `useDocuments.ts`, `useGovernance.ts`                  | Yes                   |
| **Notifications**  | `notifications/`                             | `api/notifications/`, `api/email/`                                                                     | `useNotifications.ts`, `useEmail.ts`                   | Yes                   |
| **Reports**        | `reports/`                                   | `api/reports/`, `api/dashboard/`                                                                       | `useReports.ts`, `useDashboard.ts`                     | Yes                   |
| **Shared/Core**    | `components/`, `contexts/`, `hooks/`, `lib/` | `api/org/`, `api/user/`, `api/system/`, `api/webhooks/`, `api/erp/`, `api/cron/`, `api/migration/`     | All shared hooks                                       | Requires coordination |

All UI paths above are relative to `app/(dashboard)/org/[orgSlug]/`.
All API paths are relative to `app/`.
Tests live in `__tests__/` mirroring the source structure.

## Branch Naming

```
feat/<domain>/<description>    # New feature work
fix/<domain>/<description>     # Bug fix
chore/<description>            # Non-domain-specific maintenance
```

Domains: `crm`, `projects`, `estimates`, `finance`, `portals`, `admin`, `documents`, `notifications`, `reports`, `shared`

Examples:

- `feat/crm/lead-scoring-v2`
- `fix/estimates/cost-catalog-rounding`
- `chore/update-dependencies`

## Rules

1. **Stay in your lane.** Domain devs modify only files within their domain paths.
2. **Shared/Core changes require PR review** from the project lead.
3. **Cross-domain features** (e.g., "link estimate to project") are coordinated by the project lead and implemented via API contracts, not direct imports.
4. **Tests are mandatory** for new API routes and business logic.
5. **No direct Supabase schema changes** — all migrations go through the project lead.
