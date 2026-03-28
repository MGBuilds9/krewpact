# Production Readiness Report — 2026-03-24

## Infrastructure: PASS

| Check             | Status      | Evidence                                                                                |
| ----------------- | ----------- | --------------------------------------------------------------------------------------- |
| Vercel deployment | READY       | Node 24, Turbopack, commit `a160d6f` deploying                                          |
| Domain            | krewpact.ca | DNS resolves, HTTPS active                                                              |
| Health endpoint   | OK          | `{"status":"ok","checks":{"supabase":"ok"}}`                                            |
| Security headers  | ALL PRESENT | CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy, X-Content-Type-Options |
| Clerk auth        | PRODUCTION  | M365 SSO configured for @yourdomain.com                                                 |
| Sentry            | CLEAN       | 0 issues in last 7 days, project `javascript-nextjs` under `mkg-builds`                 |
| Supabase          | OK          | Health check confirms connectivity                                                      |

## User Experience: ISSUES FOUND

Tested by project owner signing in with @yourdomain.com M365 account:

### Bug 1: Division codes shown instead of names

- **Where:** Throughout the app wherever divisions are displayed
- **Expected:** "MDM Contracting", "MDM Homes", "MDM Wood", etc.
- **Actual:** "contracting", "homes", "wood" (raw codes)
- **Impact:** HIGH — confusing for non-technical users
- **Fix:** Add division name lookup/mapping in UI components

### Bug 2: Cannot delete leads

- **Where:** Lead detail page, lead list
- **Expected:** Ability to delete manually created leads
- **Actual:** No delete action available (or action fails silently)
- **Impact:** HIGH — users can't clean up test/junk data
- **Fix:** Add delete endpoint + UI action, or verify existing endpoint works

### Bug 3: Cannot create Purchase Order — division select broken

- **Where:** Inventory → Purchase Orders → New
- **Expected:** Division dropdown populated with user's divisions
- **Actual:** Cannot select a division, blocking PO creation
- **Impact:** HIGH — core inventory workflow broken
- **Fix:** Debug division select component, verify data source

### Bug 4: Unknown additional issues

- **Note:** Owner reports "other things I'm sure I just haven't tried" — systematic UAT needed
- **Recommendation:** Create a UAT checklist covering all enabled features and walk through with a real user

## Feature Flags Verified

| Flag                 | Enabled | Service Dependency           | Status                        |
| -------------------- | ------- | ---------------------------- | ----------------------------- |
| ai_suggestions       | true    | GOOGLE_GENERATIVE_AI_API_KEY | Needs env var verification    |
| ai_insights          | true    | Same                         | Same                          |
| ai_daily_digest      | true    | Resend + cron                | Needs cron verification       |
| sequences            | true    | Resend                       | Needs Resend key verification |
| inventory_management | true    | Almyta data in Supabase      | PO creation broken (Bug 3)    |
| ai_takeoff           | true    | External service             | Needs service verification    |

## Verdict

**Infrastructure is production-ready.** Auth, deployment, security headers, monitoring — all green.

**UX has blocking bugs.** At least 3 confirmed issues that prevent core workflows. A focused bug-fix session is needed before inviting MDM staff beyond the project owner.

## Next Steps

1. Fix Bug 1 (division names) — likely a single component or utility fix
2. Fix Bug 2 (lead deletion) — add/fix delete action
3. Fix Bug 3 (PO division select) — debug select component
4. Systematic UAT — walk through all enabled features with checklist
5. Verify AI feature env vars are set in Vercel production
6. Verify cron jobs are running (check Vercel logs)
