# KrewPact P2 Buildout — Master Plan

**Created:** 2026-03-29
**Scope:** All P2 features (ADP CSV, ERPNext mappings, Offline/PWA, Mobile Expo)
**Approach:** Phased agent teams with shared task list, fresh context per phase
**Prerequisites status:** All P0/P1 complete, 4,793 tests, 0 errors, 95/100 alignment

---

## Tool Decisions

| Tool                    | Decision          | Rationale                                                                                                                                                                                   |
| ----------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Repomix**             | **Install + use** | Domain-scoped context packs for fresh agents. Full repo too large (~1M tokens), but `--include` scoped packs (50-150K tokens) are perfect for giving each phase's agents focused context.   |
| **Codebase Memory MCP** | **Install + use** | Structural graph queries (`trace_call_path`, `detect_changes`) are valuable for 365-route codebase. Helps agents map blast radius before multi-file changes. Low-priority but worth having. |
| **Aider**               | **Skip**          | Claude Code subagents + worktrees + MCP already cover everything Aider does, with better orchestration. Only unique feature (repo map) doesn't justify a second uncoordinated tool.         |

---

## Dependency Graph

```
Phase 0: Tooling Setup
    │
    ├── Phase 1: ADP CSV Pipeline ─────────────────┐
    │   (independent, no deps)                      │
    │                                               │
    ├── Phase 2: ERPNext Extended Mappings ─────────┤
    │   (independent, ERPNext is live)              │
    │                                               │
    └── Phase 3: Offline/PWA Engine ────────────────┤
        (IndexedDB, sync, conflict resolution)      │
            │                                       │
            └── Phase 4: Mobile Expo App ───────────┘
                (depends on Phase 3 sync engine)
```

**Phases 1, 2, 3 can run in parallel.** Phase 4 depends on Phase 3.

---

## Phase 0: Tooling Setup (1 session, ~15 min)

### Goal

Install Repomix + Codebase Memory MCP. Generate baseline context packs. Index codebase.

### Steps

```bash
# 1. Install Repomix globally
npm install -g repomix

# 2. Create .repomixignore
cat > .repomixignore << 'EOF'
__tests__/
e2e/
mobile/
node_modules/
.next/
components/ui/
types/supabase.ts
supabase/migrations/
docs/audits/
scripts/ralph/
*.test.ts
*.test.tsx
*.spec.ts
EOF

# 3. Generate domain context packs for each phase
npx repomix --include "lib/services/payroll.ts,lib/erp/**,lib/queue/**,app/api/queue/**,CLAUDE.md,AGENTS.md" -o .repomix/adp-context.xml
npx repomix --include "lib/erp/**,lib/queue/**,app/api/erp/**,lib/validators/**,CLAUDE.md" -o .repomix/erpnext-context.xml
npx repomix --include "app/sw.ts,app/offline/**,app/manifest.ts,hooks/**,lib/supabase/**,CLAUDE.md" -o .repomix/offline-context.xml
npx repomix --include "mobile/**,CLAUDE.md,AGENTS.md,lib/validators/**,lib/api-client.ts" -o .repomix/mobile-context.xml

# 4. Add to .gitignore
echo ".repomix/" >> .gitignore

# 5. Install Codebase Memory MCP
# Follow: https://github.com/DeusData/codebase-memory-mcp#installation
# Adds MCP server to Claude Code config

# 6. Index the codebase
# (via MCP tool after installation)
```

### Verification

- `repomix --version` returns version
- `.repomix/` has 4 XML context packs, each < 150K tokens
- Codebase Memory MCP responds to `search_graph` queries

---

## Phase 1: ADP CSV Pipeline (2-3 sessions)

### Goal

Build CSV export/import pipeline for ADP payroll sync. No live API — CSV files are the transport.

### Agent Team (3 agents, 1 session)

| Agent    | Role               | Files                                                             |
| -------- | ------------------ | ----------------------------------------------------------------- |
| Agent 1A | Schema + migration | `supabase/migrations/`, `lib/validators/payroll.ts`               |
| Agent 1B | Service + queue    | `lib/services/payroll.ts`, `lib/queue/`, `app/api/queue/process/` |
| Agent 1C | API routes + UI    | `app/api/payroll/`, `app/(dashboard)/.../timesheets/`             |

### Shared Task List

```
1A-1: Create payroll_exports table (batch_id, format, status, file_url, row_count, error_log, created_at)
1A-2: Create payroll_export_rows table (export_id FK, employee_id, hours, cost_code, rate, status)
1A-3: Create adp_field_mappings table (internal_field, adp_field, transform_rule)
1A-4: Add Zod schemas to lib/validators/payroll.ts
1A-5: Apply migration to production Supabase → signal 1B to start
---
1B-1: [blocked by 1A-5] Implement PayrollExportService in lib/services/payroll.ts
       - buildExportBatch(dateRange, divisionIds) → aggregate time_entries + cost codes
       - generateCSV(batch) → format per ADP field mappings
       - uploadToStorage(csv, batchId) → Supabase Storage, return signed URL
1B-2: Add QStash job type 'payroll-csv-export' to lib/queue/types.ts
1B-3: Add processor handler in lib/queue/processor.ts
1B-4: Build reconciliation report (compare export rows vs ADP acknowledgment CSV)
---
1C-1: [blocked by 1B-1] POST /api/payroll/exports — trigger export batch
1C-2: GET /api/payroll/exports — list exports with status
1C-3: GET /api/payroll/exports/[id] — export detail + download link
1C-4: POST /api/payroll/exports/[id]/reconcile — upload ADP response CSV
1C-5: UI: Payroll export page with trigger button, status table, download links
```

### Pitfalls for Agents

- `time_entries` table has `project_id`, `task_id`, `cost_code` — join these for export
- ADP CSV format: employee_id, hours_regular, hours_overtime, cost_code, pay_rate, department
- Field mappings should be configurable (admin UI later), hardcoded for MVP
- Supabase Storage bucket needs creation: `payroll-exports` (private)
- RBAC: only `payroll_admin` and `platform_admin` can trigger exports

### Phase Gate

```bash
npm run lint && npm run typecheck && npm run test -- --run
# Must pass: all existing 4,793+ tests + new payroll tests
# Manual: trigger export, verify CSV format, verify reconciliation
```

### Context Handoff (for next session)

```bash
npx repomix --include "lib/services/payroll.ts,lib/queue/**,app/api/payroll/**,lib/validators/payroll.ts" -o .repomix/adp-phase1-complete.xml
```

---

## Phase 2: ERPNext Extended Mappings (3-4 sessions)

### Goal

Add 31 remaining ERPNext doctype mappings. ERPNext is live, tunnel is up.

### Agent Team (3 agents per batch, 4 batches)

**Batch strategy:** Group doctypes by dependency chain, 8 per batch.

| Batch | Doctypes                                                                                                                    | Dependencies                                     |
| ----- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| 2A    | Purchase Order, Purchase Receipt, Supplier Quotation, Request for Quotation, Material Request, Stock Entry, Warehouse, Item | Foundation — procurement chain                   |
| 2B    | Payment Entry, Journal Entry, GL Entry (read), Bank Account, Mode of Payment, Cost Center, Budget                           | Finance chain — depends on existing Invoice read |
| 2C    | BOM, Work Order, Quality Inspection, Serial No, Batch, UOM, Item Price, Price List                                          | Manufacturing/inventory chain                    |
| 2D    | Employee, Attendance, Leave Application, Holiday List, Designation, Department, HR Settings, Company                        | HR/org chain — feeds into ADP                    |

### Per-Batch Agent Team

| Agent           | Role                                                          |
| --------------- | ------------------------------------------------------------- |
| Agent 2X-Mapper | Add mapping to `lib/erp/client.ts` (CRUD methods for doctype) |
| Agent 2X-Sync   | Add QStash sync job type + processor + outbox/inbox logic     |
| Agent 2X-Test   | Write integration tests (mock ERPNext responses)              |

### Shared Task List (per batch, example for 2A)

```
2A-MAP-1: Add PurchaseOrder doctype methods to lib/erp/client.ts (create, get, list, update)
2A-MAP-2: Add PurchaseReceipt doctype methods
2A-MAP-3: Add SupplierQuotation doctype methods
2A-MAP-4: ... (repeat for all 8 doctypes in batch)
2A-MAP-5: Add krewpact_* custom field specs to docs/architecture/KrewPact-ERPNext-Doctype-Field-Mapping.md
---
2A-SYNC-1: [blocked by MAP-1] Add 'erp-sync-purchase-order' job type
2A-SYNC-2: Add sync handler in lib/queue/processor.ts
2A-SYNC-3: Add outbox trigger (on Supabase purchase_orders insert/update → queue sync)
2A-SYNC-4: Add inbox handler (ERPNext webhook → upsert to Supabase)
---
2A-TEST-1: [blocked by MAP-1] Mock ERPNext responses for all 8 doctypes
2A-TEST-2: Test create + sync + conflict resolution
2A-TEST-3: Test error handling (ERPNext down, rate limit, invalid response)
```

### Pitfalls for Agents

- ALL calls through `lib/erp/client.ts` — the sole ERPNext access point
- Auth: `Authorization: token {key}:{secret}` header
- Rate limit: 300 req/min — batch sync must respect this
- Always `encodeURIComponent()` for document names with special chars
- Custom fields on ERPNext side must be prefixed `krewpact_*`
- Each sync job must be idempotent (upsert pattern, not insert)
- Dead-letter after 3 retries — write to `erp_sync_errors` table

### Phase Gate

Same lint/typecheck/test gate + manual ERPNext API smoke test per batch.

---

## Phase 3: Offline/PWA Engine (3-4 sessions)

### Goal

Build IndexedDB-based offline queue with sync engine and conflict resolution. This is the critical path — Phase 4 (Mobile) depends on it.

### Architecture Decision

```
┌──────────────────────────┐
│  Browser / React Native  │
│                          │
│  ┌────────────────────┐  │
│  │  Offline Queue     │  │
│  │  (IndexedDB/SQLite)│  │
│  │                    │  │
│  │  queue_items table │  │
│  │  - entity_type     │  │
│  │  - entity_id       │  │
│  │  - action (create/ │  │
│  │    update/delete)   │  │
│  │  - payload (JSON)  │  │
│  │  - status (pending/│  │
│  │    syncing/synced/  │  │
│  │    conflict/failed) │  │
│  │  - retry_count     │  │
│  │  - created_at      │  │
│  └────────┬───────────┘  │
│           │              │
│  ┌────────▼───────────┐  │
│  │  Sync Engine       │  │
│  │  - Online detector │  │
│  │  - Queue processor │  │
│  │  - Conflict resolver│ │
│  │  - Retry backoff   │  │
│  └────────┬───────────┘  │
└───────────┼──────────────┘
            │ HTTPS (when online)
            ▼
     Supabase API
```

### Agent Team (4 agents)

| Agent    | Role            | Files                                                                                  |
| -------- | --------------- | -------------------------------------------------------------------------------------- |
| Agent 3A | IndexedDB store | `lib/offline/store.ts`, `lib/offline/types.ts`                                         |
| Agent 3B | Sync engine     | `lib/offline/sync-engine.ts`, `lib/offline/conflict-resolver.ts`                       |
| Agent 3C | React hooks     | `hooks/use-offline-queue.ts`, `hooks/use-online-status.ts`, `hooks/use-sync-status.ts` |
| Agent 3D | Service worker  | `app/sw.ts` (enhance existing), `app/offline/page.tsx`                                 |

### Shared Task List

```
3A-1: Define OfflineQueueItem type (entity_type, entity_id, action, payload, status, retry_count, version, created_at)
3A-2: Implement IndexedDB store using idb library (open, add, getAll, update, delete, getByStatus)
3A-3: Add version tracking per entity (for conflict detection)
3A-4: Add storage quota monitoring (warn at 80%, block at 95%)
---
3B-1: [blocked by 3A-2] Implement SyncEngine class
       - processQueue(): dequeue pending → POST/PATCH/DELETE to API → mark synced/failed
       - handleConflict(item, serverVersion): apply conflict strategy
       - retryWithBackoff(item): exponential backoff, max 3 retries, then dead-letter
3B-2: Conflict strategies per entity type:
       - daily_logs: last_write_wins (append-only, low conflict risk)
       - time_entries: merge (sum hours if same day/project)
       - safety_forms: last_write_wins (form is atomic)
       - photos: always_keep_both (never delete user photos)
3B-3: Implement online/offline detector (navigator.onLine + heartbeat ping)
3B-4: Background sync registration (service worker BackgroundSync API)
---
3C-1: [blocked by 3B-1] useOfflineQueue() — enqueue mutations, read queue status
3C-2: useOnlineStatus() — reactive online/offline state
3C-3: useSyncStatus() — pending count, last sync time, conflict count
3C-4: Offline-aware mutation wrapper: try API → if offline, enqueue → return optimistic result
---
3D-1: Enhance sw.ts with cache strategies (stale-while-revalidate for API, cache-first for assets)
3D-2: Add BackgroundSync event handler
3D-3: Improve offline page with sync status and queue viewer
3D-4: Add install prompt (PWA A2HS)
```

### Pitfalls for Agents

- `idb` library (tiny IndexedDB wrapper) — don't use raw IndexedDB API
- Serwist is already configured (`@serwist/next` in devDeps) — enhance, don't replace
- Conflict resolution must be deterministic — same inputs always produce same output
- Version vectors: each entity has a `version` (incrementing integer) — compare on sync
- Service worker scope: `app/sw.ts` already exists — read it first before modifying
- Field data (daily logs, photos) is HIGH VALUE — never silently discard on conflict
- IndexedDB has no size limit on most browsers but iOS Safari caps at ~1GB
- Test offline behavior: Chrome DevTools → Network → Offline toggle

### Phase Gate

```bash
npm run lint && npm run typecheck && npm run test -- --run
# Additional: browser test with Network → Offline
# Test: create daily log offline → go online → verify sync → verify no data loss
```

---

## Phase 4: Mobile Expo App (4-5 sessions)

### Goal

Build field worker mobile app using Expo SDK 54. Shares offline engine from Phase 3.

### Prerequisites

- Phase 3 (Offline/PWA) complete — sync engine is the shared foundation
- `mobile/` directory already scaffolded with Expo SDK 54

### Agent Team (4 agents)

| Agent    | Role                 | Files                                               |
| -------- | -------------------- | --------------------------------------------------- |
| Agent 4A | Navigation + auth    | `mobile/app/`, Expo Router, Clerk auth              |
| Agent 4B | Core screens         | Daily logs, time entry, safety forms                |
| Agent 4C | Camera + offline     | Photo capture, offline queue (reuse Phase 3 engine) |
| Agent 4D | Sync + notifications | Background sync, push notifications                 |

### Shared Task List

```
4A-1: Set up Expo Router (tab navigation: Dashboard, Logs, Time, Safety, Photos)
4A-2: Integrate Clerk auth (EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY)
4A-3: Create shared API client (reuse lib/api-client.ts patterns)
4A-4: Create shared Zod validators (import from lib/validators/)
---
4B-1: [blocked by 4A-1] Daily Log screen (form + photo attach + GPS location)
4B-2: Time Entry screen (project picker, cost code, hours, notes)
4B-3: Safety Form screen (toolbox talk, inspection, incident report)
4B-4: Dashboard screen (today's tasks, sync status, notifications)
---
4C-1: [blocked by 4B-1] Camera integration (expo-camera)
4C-2: Photo annotation (draw on photo, add notes)
4C-3: Offline queue integration (port Phase 3 store to SQLite for React Native)
4C-4: Photo compression before upload (reduce bandwidth)
---
4D-1: [blocked by 4C-3] Background sync (expo-background-fetch)
4D-2: Push notifications (expo-notifications + Supabase Realtime)
4D-3: Sync conflict UI (show conflicts, allow manual resolution)
4D-4: App update check (expo-updates OTA)
```

### Pitfalls for Agents

- React Native doesn't have IndexedDB — use `expo-sqlite` or `@op-engineering/op-sqlite`
- The sync engine interface from Phase 3 must be abstractable (IndexedDB for web, SQLite for mobile)
- Expo Router uses file-based routing like Next.js — leverage that familiarity
- Camera permissions must be requested at runtime (expo-camera)
- Background fetch on iOS is unreliable — can't guarantee sync timing
- Photos should be compressed to <2MB before queuing (bandwidth on job sites)
- GPS location: use `expo-location` with foreground permission only (no background tracking)
- Clerk Expo SDK: `@clerk/clerk-expo` — different from `@clerk/nextjs`

### Phase Gate

```bash
cd mobile && npx expo-doctor && npm run typecheck
# EAS Build (dev client) for iOS + Android
# Field test: create daily log with photo offline → sync when back online
```

---

## Session Management: Fresh Context Per Phase

### How to start each phase session

```bash
# 1. Generate fresh context pack for the phase
npx repomix --include "<phase-specific-files>" -o .repomix/phase-N-context.xml

# 2. Start new Claude Code session
claude

# 3. First message to Claude:
# "Starting Phase N of the P2 buildout. Read docs/plans/2026-03-29-p2-buildout-master-plan.md
#  Phase N section. The Repomix context pack is at .repomix/phase-N-context.xml.
#  Check the shared task list in the previous session's task output."
```

### How phases hand off to each other

Each phase ends with:

1. All tests passing (quality gate)
2. Session log written to CLAUDE.md
3. Updated Repomix context pack generated
4. Vault session note written
5. `/log-and-exit` executed

Each phase starts with:

1. Read master plan (this file)
2. Read previous phase's session log in CLAUDE.md
3. Read phase-specific Repomix context pack
4. Check MEMORY.md for any cross-session notes
5. Create task list from the phase's shared task list above

### Codebase Memory MCP between phases

After installation, each new session can:

```
# Query structural dependencies before making changes
search_graph("withApiRoute")  → find all routes using the wrapper
trace_call_path("lib/services/payroll.ts", "app/api/payroll/exports/route.ts")
detect_changes(git_diff)  → map blast radius before PR
```

---

## Timeline Estimate

| Phase             | Sessions  | Calendar Days | Parallel?       |
| ----------------- | --------- | ------------- | --------------- |
| Phase 0 (Tooling) | 1         | Day 1         | —               |
| Phase 1 (ADP CSV) | 2-3       | Days 2-4      | Yes, with 2 & 3 |
| Phase 2 (ERPNext) | 3-4       | Days 2-6      | Yes, with 1 & 3 |
| Phase 3 (Offline) | 3-4       | Days 2-6      | Yes, with 1 & 2 |
| Phase 4 (Mobile)  | 4-5       | Days 7-12     | After Phase 3   |
| **Total**         | **13-17** | **~12 days**  |                 |

---

## Success Criteria

| Metric              | Target                                                  |
| ------------------- | ------------------------------------------------------- |
| Tests               | 5,500+ (current 4,793 + ~150 per phase)                 |
| Type errors         | 0                                                       |
| Lint errors         | 0                                                       |
| ADP                 | CSV export + reconciliation working                     |
| ERPNext             | 43/43 doctype mappings (12 existing + 31 new)           |
| Offline             | Daily logs, time, safety, photos work offline with sync |
| Mobile              | Expo dev build on iOS + Android, field test passing     |
| Blueprint alignment | 98+/100                                                 |
