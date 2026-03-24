# Playbook v2 + KrewPact Alignment — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the MKG-Builds-Dev-Playbook to a gold-standard template, then align KrewPact's docs, dev environment, and production readiness to that standard so real MDM Group users can use the app.

**Architecture:** Documentation-first approach. Phase 1 writes the generic playbook template. Phase 2 applies it to KrewPact and fixes dev environment gaps. Phase 2.5 is production readiness with human-in-the-loop steps for Clerk/Vercel/DNS configuration.

**Tech Stack:** Next.js 16, Supabase, Clerk, Vercel, Vitest, ESLint flat config, GitHub Actions

**Spec:** `docs/superpowers/specs/2026-03-23-playbook-v2-krewpact-alignment-design.md`

---

## Phase 1: Playbook v2

### Task 1: Write Playbook v2 CLAUDE.md Template

**Files:**

- Rewrite: `/Users/mkgbuilds/Downloads/MKG-Builds-Dev-Playbook/CLAUDE.md`

This is the core deliverable. Write the complete CLAUDE.md template with all 13 sections from the spec. The template must be project-agnostic — all project-specific content uses `[APP_NAME]` or `[CUSTOMIZE]` placeholders.

- [ ] **Step 1: Read the current Playbook v1 CLAUDE.md**

Read `/Users/mkgbuilds/Downloads/MKG-Builds-Dev-Playbook/CLAUDE.md` to preserve anything worth keeping.

- [ ] **Step 2: Read KrewPact's battle-tested configs as source material**

Read these files to extract proven patterns into the template:

- `/Users/mkgbuilds/Code/MDM-Projects/krewpact/eslint.config.mjs` (quality gates)
- `/Users/mkgbuilds/Code/MDM-Projects/krewpact/lib/feature-flags.ts` (feature flag pattern)
- `/Users/mkgbuilds/Code/MDM-Projects/krewpact/lib/supabase/server.ts` (auth pattern)
- `/Users/mkgbuilds/Code/MDM-Projects/krewpact/next.config.ts` (security headers)
- `/Users/mkgbuilds/Code/MDM-Projects/krewpact/.github/workflows/ci.yml` (CI template)
- `/Users/mkgbuilds/Code/MDM-Projects/krewpact/vitest.config.ts` (test config)

- [ ] **Step 3: Write the complete Playbook v2 CLAUDE.md**

Write to `/Users/mkgbuilds/Downloads/MKG-Builds-Dev-Playbook/CLAUDE.md`.

Structure (all 13 sections from spec):

```
# Project: [APP_NAME]
> Auto-generated from MKG Production App Playbook v2. Customize per-project.

## Stack                          ← Section 1.1
## Build / Test / Lint            ← Section 1.2
## Architecture Rules             ← Section 1.3
  ### Server Components (default)
  ### Project Structure
  ### File Placement Rules
  ### Data Fetching & Mutations
  ### Next.js 16 Rules
## Security                       ← Section 1.4
  ### Server Actions — CRITICAL SECURITY
  ### Security Headers
  ### Rate Limiting
## Auth Pattern (Clerk + Supabase) ← Section 1.5
  ### Server Client
  ### RLS Rules
## Quality Gates                  ← Section 1.6
  ### ESLint Configuration
  ### Testing
## Feature Flags                  ← Section 1.7
## Production Hardening           ← Section 1.8
## CI/CD                          ← Section 1.9
## Agent Rules                    ← Section 1.10
  ### Session Protocol
  ### Agent Research Protocol
## Conventions                    ← Section 1.11
## What NOT To Do                 ← Section 1.12
## AGENTS.md Integration          ← (footer)
```

Key content for each section — synthesize from:

- v1 playbook (keep: Server Action security pattern, project structure, data fetching, Supabase RLS, TypeScript strict, styling, testing, conventions, What NOT To Do)
- KrewPact battle-tested patterns (add: feature flags, production hardening, ESLint flat config with complexity/size limits, CI/CD template, security headers, auth pattern, BFF API pattern, queue processing)
- 2026 research (add: proxy.ts, async request APIs, `'use cache'`, Node 24, CSP nonces, SLO/error budget, subagent output contracts, negative coverage thresholds, React 19 hooks recommendation)

Replace all Supabase Auth references with Clerk Third-Party Auth pattern. Show both the manual Authorization header pattern (existing projects) and the `accessToken()` pattern (new projects).

Remove: `src/` prefix assumption (make configurable), Framer Motion template.tsx, docx WidthType gotcha (too specific), `ease-in-out` animation rule (too specific).

- [ ] **Step 4: Verify template is project-agnostic**

Grep the written file for "KrewPact", "MDM", "ERPNext", "krewpact" — none should appear. All project-specific content must use placeholders.

- [ ] **Step 5: Commit**

```bash
cd /Users/mkgbuilds/Downloads/MKG-Builds-Dev-Playbook
git add CLAUDE.md
git commit -m "feat: upgrade to Playbook v2 — gold-standard CLAUDE.md template"
```

---

### Task 2: Update Playbook SOURCES.md

**Files:**

- Modify: `/Users/mkgbuilds/Downloads/MKG-Builds-Dev-Playbook/SOURCES.md`

- [ ] **Step 1: Read current SOURCES.md**

Read `/Users/mkgbuilds/Downloads/MKG-Builds-Dev-Playbook/SOURCES.md`.

- [ ] **Step 2: Add 2026 sources**

Add new entries to relevant sections:

**Section 1 (Next.js):**

- Next.js 16 upgrade guide: `https://nextjs.org/docs/app/guides/upgrading/version-16`
- Next.js 16 release blog: `https://nextjs.org/blog/next-16`
- Next.js cache components: `https://nextjs.org/docs/app/getting-started/cache-components`

**Section 2 (Supabase):**

- Clerk Third-Party Auth + Supabase: `https://supabase.com/docs/guides/auth/third-party/clerk`
- Clerk changelog (native Supabase): `https://clerk.com/changelog/2025-03-31-supabase-integration`

**New Section 6 (Security):**

- Vercel production checklist: `https://vercel.com/docs/production-checklist`
- CVE-2025-55184 (RSC deserialization RCE): `https://react.dev/blog/2025/12/03/critical-security-vulnerability-in-react-server-components`
- CVE-2025-66478 (Server Component data leak): `https://nextjs.org/blog/security-update-2025-12-11`

**New Section 7 (CI/CD & Quality):**

- ESLint flat config: `https://advancedfrontends.com/eslint-flat-config-typescript-javascript/`
- Vitest coverage config: `https://vitest.dev/config/coverage`

- [ ] **Step 3: Commit**

```bash
cd /Users/mkgbuilds/Downloads/MKG-Builds-Dev-Playbook
git add SOURCES.md
git commit -m "docs: add 2026 sources — Next.js 16, Clerk Third-Party Auth, security advisories"
```

---

### Task 3: Add Playbook README.md

**Files:**

- Create: `/Users/mkgbuilds/Downloads/MKG-Builds-Dev-Playbook/README.md`

- [ ] **Step 1: Write README.md**

```markdown
# MKG Builds — Production App Playbook v2

Gold-standard CLAUDE.md template for all MKG Builds projects.

## How to Use

1. Copy `CLAUDE.md` into your project root
2. Find-and-replace `[APP_NAME]` with your project name
3. Customize `[CUSTOMIZE]` sections for your stack
4. Delete sections that don't apply (e.g., remove Queue section if no background jobs)
5. Commit to your repo

## What's Inside

- **13 sections** covering architecture, security, auth, quality gates, CI/CD, feature flags, production hardening, and agent rules
- **Battle-tested patterns** extracted from KrewPact (4,300+ tests, 344 API routes, production-ready)
- **2026 best practices** for Next.js 16, Clerk Third-Party Auth, Zod 4, Vitest, ESLint flat config

## Sources

See `SOURCES.md` for the authoritative sources behind every recommendation.

## Version History

- **v2** (2026-03-23): Major rewrite. Added Clerk auth, feature flags, production hardening, CI/CD, ESLint config, security headers. Removed Supabase Auth (replaced by Clerk). Updated for Next.js 16.
- **v1** (2026-02): Initial release.
```

- [ ] **Step 2: Commit**

```bash
cd /Users/mkgbuilds/Downloads/MKG-Builds-Dev-Playbook
git add README.md
git commit -m "docs: add README with usage instructions"
```

---

## Phase 2: KrewPact Alignment

### Task 4: Move KrewPact Session Logs to docs/session-log.md

**Files:**

- Create: `/Users/mkgbuilds/Code/MDM-Projects/krewpact/docs/session-log.md`
- Modify: `/Users/mkgbuilds/Code/MDM-Projects/krewpact/CLAUDE.md`

- [ ] **Step 1: Read current CLAUDE.md session log section**

Read `/Users/mkgbuilds/Code/MDM-Projects/krewpact/CLAUDE.md` — find the `## Session Log` section and everything after it.

- [ ] **Step 2: Create docs/session-log.md**

Move ALL session log entries from CLAUDE.md into `docs/session-log.md`. Format:

```markdown
# KrewPact Session Log

Archived session entries. Most recent first.

---

[paste all session log entries here, newest first]
```

- [ ] **Step 3: Trim CLAUDE.md session log**

Replace the session log section in CLAUDE.md with only the 2 most recent entries, plus a pointer:

```markdown
## Session Log

> Full log: `docs/session-log.md`

### [most recent entry]

### [second most recent entry]
```

- [ ] **Step 4: Verify CLAUDE.md line count reduced**

Run: `wc -l CLAUDE.md`
Target: under 300 lines (currently 379 — session log is ~80 lines, but KrewPact-specific sections are substantial). The full rewrite in Task 5 will further trim by deduplicating with `docs/local-dev.md`.

- [ ] **Step 5: Commit**

```bash
git add docs/session-log.md CLAUDE.md
git commit -m "docs: move session log to docs/session-log.md — slim CLAUDE.md"
```

---

### Task 5: Rewrite KrewPact CLAUDE.md from Playbook v2 Template

**Files:**

- Rewrite: `/Users/mkgbuilds/Code/MDM-Projects/krewpact/CLAUDE.md`

**Depends on:** Task 1 (Playbook v2 template), Task 4 (session log moved)

- [ ] **Step 1: Read the Playbook v2 template**

Read `/Users/mkgbuilds/Downloads/MKG-Builds-Dev-Playbook/CLAUDE.md`.

- [ ] **Step 2: Read KrewPact's current CLAUDE.md**

Read `/Users/mkgbuilds/Code/MDM-Projects/krewpact/CLAUDE.md` — identify all KrewPact-specific sections to preserve.

- [ ] **Step 3: Rewrite CLAUDE.md**

Apply the Playbook v2 structure, customized for KrewPact. Key decisions:

**From template (generic sections):** Stack, Build/Test/Lint, Architecture Rules, Security, Auth Pattern, Quality Gates, Feature Flags, Production Hardening, CI/CD, Agent Rules, Conventions, What NOT To Do.

**KrewPact-specific sections to ADD after generic sections:**

- `## Unified Architecture (MDM Growth Intelligence System)` — nucleus concept, division table
- `## Data Authority Rules` — ERPNext vs Supabase authoritative sources
- `## Clerk → Supabase Auth Bridge` — claim names, RLS paths
- `## ERPNext Integration` — mappers, GPL boundary, rate limits
- `## Sales AGI Layer` — tables, enrichment pipeline
- `## RAG / Knowledge Layer` — pgvector, embeddings
- `## Inventory System` — append-only ledger, fleet vehicles
- `## Compliance Context` — PIPEDA, Construction Act, AODA
- `## Scale Targets` — 300 users, uptime, RPO/RTO
- `## SLO` — 99.5% MVP, error budget
- `## Required Environment Variables`
- `## Planning Documents` — reference order
- `## Session Log` — last 2 entries + pointer to docs/session-log.md

**Fix stale content:**

- Remove `src/` prefix from file structure (KrewPact uses root-level `app/`, `lib/`, etc.)
- File structure diagram must match reality (no `src/`)
- Build commands match `package.json` exactly
- No mention of BullMQ (already cleaned, verify)
- Queue section says QStash (correct)
- Reference audit reports for current counts, not hardcoded numbers

- [ ] **Step 4: Verify no stale references**

Grep for: `src/`, `BullMQ`, `bullmq`, `~40 endpoints`, `~314 endpoints`, `getServerSideProps`.
Expected: 0 matches (except in What NOT To Do for `getServerSideProps`).

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: rewrite CLAUDE.md from Playbook v2 template — fix stale content, add SLO"
```

---

### Task 6: Rewrite KrewPact AGENTS.md

**Files:**

- Rewrite: `/Users/mkgbuilds/Code/MDM-Projects/krewpact/AGENTS.md`

**Depends on:** Task 5 (CLAUDE.md rewrite — use as source material)

- [ ] **Step 1: Read the new CLAUDE.md**

Read `/Users/mkgbuilds/Code/MDM-Projects/krewpact/CLAUDE.md` — use as the source for AGENTS.md content.

- [ ] **Step 2: Rewrite AGENTS.md**

AGENTS.md is the slimmer version for non-Claude AI agents (Codex, Gemini, Cursor). It should contain:

- Project overview (1 paragraph)
- Tech stack (list)
- Architecture diagram (ASCII)
- Architecture table (layers)
- Key conventions (shortened)
- Build commands
- File structure (matching reality, no `src/`)
- Required environment variables
- Data authority rules
- ERPNext integration summary
- Compliance context (abbreviated)
- Scale targets

**Remove from AGENTS.md:**

- Session log (doesn't belong)
- Agent-specific rules (those go in CLAUDE.md only)
- Planning documents section (reference CLAUDE.md)
- Detailed Sales AGI / RAG / Inventory sections (reference docs/)

**Fix stale numbers:**

- ~40 endpoints → 344 routes
- ~25 features → 85+ features
- Update MVP scope table if it references old numbers

- [ ] **Step 3: Verify accuracy**

Check that all file paths, env var names, and tech versions mentioned in AGENTS.md match reality.

- [ ] **Step 4: Commit**

```bash
git add AGENTS.md
git commit -m "docs: rewrite AGENTS.md — fix stale numbers, align with Playbook v2"
```

---

### Task 7: Expand docs/contributing.md

**Files:**

- Rewrite: `/Users/mkgbuilds/Code/MDM-Projects/krewpact/docs/contributing.md`

- [ ] **Step 1: Read current contributing.md**

Read `/Users/mkgbuilds/Code/MDM-Projects/krewpact/docs/contributing.md` (currently a 4-line stub).

- [ ] **Step 2: Write expanded contributing.md**

````markdown
# Contributing to KrewPact

## Workflow

1. Branch from `main` — use conventional branch names: `feat/`, `fix/`, `refactor/`, `docs/`
2. Make changes — follow CLAUDE.md conventions
3. Run quality checks locally before pushing:
   ```bash
   npm run lint && npm run typecheck && npm run test && npm run build
   ```
````

4. Create a PR — CI must pass before merge
5. Keep PRs small and focused — one feature or fix per PR

## Commit Messages

Use conventional commits:

- `feat:` — new feature
- `fix:` — bug fix
- `refactor:` — code restructuring (no behavior change)
- `test:` — adding or updating tests
- `docs:` — documentation only
- `chore:` — tooling, deps, CI

## Testing

- All new code needs tests in `__tests__/` mirroring source structure
- Run `npm run test` before pushing
- RLS policy changes need dedicated RLS tests in `__tests__/rls/`
- Mock helpers: `__tests__/helpers/` (mockSupabaseClient, mockClerkAuth)

## Code Quality

See CLAUDE.md for full rules. Key points:

- No `console.log` — use `lib/logger.ts`
- No `any` type — use `unknown` with type guards
- File size limits enforced by ESLint (300 lines max)
- Import order enforced by simple-import-sort

## Local Setup

See `docs/local-dev.md` for environment setup instructions.

````

- [ ] **Step 3: Update Architecture Resolution doc with current counts**

Read `/Users/mkgbuilds/Code/MDM-Projects/krewpact/docs/architecture/KrewPact-Architecture-Resolution.md`. Find any sections with stale counts (original planning estimates like "~40 endpoints", "~314 endpoints", "25 features", "~30 forms") and update them with current actuals from the Mar 23 audit:
- 344 API routes
- 118 pages
- 303 components
- 171 lib files
- 67 hooks
- 60 migrations
- 4,306 tests
- 14 cron jobs

Add a note: "Counts updated 2026-03-23 from blueprint audit."

- [ ] **Step 4: Commit**

```bash
git add docs/contributing.md docs/architecture/KrewPact-Architecture-Resolution.md
git commit -m "docs: expand contributing guide, update architecture doc with current counts"
````

---

### Task 8: Fix Dev Environment

**Files:**

- Modify: `/Users/mkgbuilds/Code/MDM-Projects/krewpact/.github/workflows/ci.yml`
- Modify: `/Users/mkgbuilds/Code/MDM-Projects/krewpact/tsconfig.json`
- Modify: `/Users/mkgbuilds/Code/MDM-Projects/krewpact/lib/validators/inventory-items.ts`
- Modify: `/Users/mkgbuilds/Code/MDM-Projects/krewpact/lib/queue/processor.ts`

- [ ] **Step 1: Validate Node 24 compatibility locally**

Run: `node --version` to check current local Node version.
Run: `npm run test` — verify all 4,306 tests pass.
Run: `npm run build` — verify build succeeds.

If local Node is not 24, note this — CI change is still safe as Vercel already runs Node 24.

- [ ] **Step 2: Update CI to Node 24 + add format check**

Edit `.github/workflows/ci.yml`:

In the `quality` job, change:

```yaml
node-version: 20
```

to:

```yaml
node-version: 24
```

Add after the "Type Check" step:

```yaml
- name: Format Check
  run: npm run format:check
```

In the `security` job and `mobile` job, also change `node-version: 20` → `node-version: 24`.

- [ ] **Step 3: Add coverage gate to vitest.config.ts**

Edit `vitest.config.ts` — the current thresholds are percentage-based (lines: 60, branches: 50). These are fine for now. Add a CI-specific check by ensuring the `--coverage` flag in CI fails on threshold breach. The existing config already has `thresholds` set, so verify:

```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'lcov'],
  thresholds: {
    lines: 60,
    branches: 50,
  },
},
```

If `thresholds` are present, Vitest already fails on breach when `--coverage` is passed. No change needed — just verify the CI step uses `npm run test -- --coverage` (already does). The gate is already wired.

- [ ] **Step 4a: Update tsconfig target**

Edit `tsconfig.json`:

Change:

```json
    "target": "ES2017",
```

to:

```json
    "target": "ES2022",
```

Also add `"ES2022"` to `lib` if not already present. The current `lib` array is `["dom", "dom.iterable", "esnext"]` — `esnext` already covers ES2022, so no `lib` change needed.

- [ ] **Step 4: Remove unused import in inventory validators**

Read `lib/validators/inventory-items.ts`, find the unused `nullableSafeString` import, remove it.

- [ ] **Step 5: Refactor lib/queue/processor.ts to reduce complexity**

Read `lib/queue/processor.ts` (101 lines, complexity 27).

The `processJob` function has a large switch/if-else chain handling different job types. Refactor to a lookup map pattern:

```typescript
const jobHandlers: Record<string, (job: Job) => Promise<void>> = {
  'erp-sync': handleErpSync,
  enrichment: handleEnrichment,
  // ... etc
};

export async function processJob(job: Job): Promise<void> {
  const handler = jobHandlers[job.type];
  if (!handler) throw new Error(`Unknown job type: ${job.type}`);
  return handler(job);
}
```

Extract each case into its own handler function in the same file (or split into `lib/queue/handlers/` if needed).

- [ ] **Step 6: Run full quality gate**

```bash
npm run lint && npm run typecheck && npm run test && npm run build
```

Expected: 0 errors, <225 warnings (should drop by at least 2: unused import + processor complexity).

- [ ] **Step 7: Commit**

```bash
git add .github/workflows/ci.yml tsconfig.json lib/validators/inventory-items.ts lib/queue/processor.ts
git commit -m "chore: upgrade CI to Node 24, add format check, fix lint warnings"
```

---

### Task 9: Production Readiness Verification

**Files:** No code changes — verification and configuration steps.

**Depends on:** Task 8 (dev env fixes must be complete and passing)

**IMPORTANT:** This task requires human interaction for Clerk dashboard, Vercel dashboard, and DNS configuration. The agent should guide the user through each step and verify outcomes.

- [ ] **Step 1: Verify Vercel deployment**

Check that the latest commit deploys successfully to Vercel:

```bash
git log --oneline -1
```

Check Vercel deployment status (if `vercel` CLI is linked):

```bash
vercel ls --limit 3
```

Or check via Vercel MCP if available.

- [ ] **Step 2: Verify DNS**

```bash
dig app.krewpact.com +short
```

Expected: CNAME or A record pointing to Vercel. If not configured, tell the user to add the domain in Vercel dashboard.

- [ ] **Step 3: Verify environment variables in Vercel**

Check that critical env vars are set in production:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SECRET`
- `ERPNEXT_BASE_URL`
- `ERPNEXT_API_KEY`
- `ERPNEXT_API_SECRET`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `QSTASH_TOKEN`
- `RESEND_API_KEY`
- `SENTRY_DSN`
- `GOOGLE_GENERATIVE_AI_API_KEY` (for AI features)

Guide user: `vercel env ls` or check Vercel dashboard.

- [ ] **Step 4: Verify Clerk production readiness**

Guide user to check in Clerk dashboard (https://dashboard.clerk.com):

1. Is this a **production** instance (not development)?
2. Is M365 SSO configured for `@mdmgroupinc.ca`?
3. Is the webhook endpoint set to `https://app.krewpact.com/api/webhooks/clerk`?
4. Do test users have `public_metadata` with `krewpact_user_id`, `division_ids`, `role_keys`, `krewpact_org_id`?

- [ ] **Step 5: Verify feature flag state**

Read `lib/feature-flags.ts` — confirm the 6 enabled flags are correct for production:

- `ai_suggestions: true` — requires `GOOGLE_GENERATIVE_AI_API_KEY`
- `ai_insights: true` — same
- `ai_daily_digest: true` — requires Resend + cron running
- `sequences: true` — requires Resend
- `inventory_management: true` — requires Almyta data in Supabase
- `ai_takeoff: true` — requires external service

For each enabled flag, verify the required service is configured.

- [ ] **Step 5b: Evaluate enabling additional flags**

Review the 11 disabled flags. For each, determine if the feature is code-complete and ready for UAT:

- `finance` — code complete (12 routes, 4 pages). Needs: real invoice data from ERPNext. **Recommend: enable after ERPNext sync verified.**
- `portals` — code complete (21 routes, 6 pages). Needs: portal accounts created. **Recommend: enable for UAT.**
- `bidding` — code complete (7 routes). Needs: MERX import configured. **Recommend: defer.**
- `executive` — code complete (15 routes, 4 pages). Needs: exec-only. **Recommend: enable for platform_admin only.**
- `enrichment_ui` — code complete. Needs: Apollo API key. **Recommend: enable if Apollo configured.**
- All others (`migration_tool`, `schedule`, `documents_upload`, `safety`, `closeout`, `warranty`) — **Recommend: keep disabled until UAT planned.**

Discuss findings with user before enabling any flags.

- [ ] **Step 6: Run production health check**

```bash
npm run health
```

Or if deployed, check the health endpoint:

```bash
curl -s https://app.krewpact.com/api/health | jq .
```

- [ ] **Step 7: Verify monitoring**

Guide user to check:

1. **Sentry:** Go to sentry.io → KrewPact project → verify events are being received
2. **BetterStack:** Check uptime monitor for `app.krewpact.com`
3. **Vercel Analytics:** Check Vercel dashboard → Analytics tab

- [ ] **Step 8: End-to-end smoke test**

Guide user (or run via Playwright if E2E is configured for production):

1. Navigate to `https://app.krewpact.com`
2. Sign in with an `@mdmgroupinc.ca` email (operations_manager role)
3. Verify dashboard loads with real data
4. Navigate to CRM → Leads
5. Create a new lead
6. Verify lead appears in the list
7. Sign out → sign back in → lead still visible

- [ ] **Step 9: Document findings**

Create a production readiness report:

```bash
# Add to docs/audits/
echo "Findings from production verification" > docs/audits/2026-03-23-production-readiness.md
```

Document what passed, what failed, and any follow-up items.

- [ ] **Step 10: Commit any fixes**

If any config changes were needed during verification, add specific files:

```bash
git add [specific files changed]
git commit -m "fix: production readiness — [describe what was fixed]"
```

---

## Execution Notes

**Parallelization:**

- Tasks 1-3 (Playbook v2) must complete BEFORE Task 5 (KrewPact CLAUDE.md rewrite reads the template)
- Task 4 (session log move) can start immediately, in parallel with Tasks 1-3
- Tasks 6-7 (AGENTS.md, contributing, arch docs) can run in parallel with Task 8 (dev env)
- Task 9 (production readiness) depends on Task 8

**Human-in-the-loop:**

- Task 9 requires the user for Clerk dashboard, Vercel env vars, DNS, and manual smoke testing
- All other tasks can be executed by AI agents autonomously

**Estimated total:** 4-5 sessions
