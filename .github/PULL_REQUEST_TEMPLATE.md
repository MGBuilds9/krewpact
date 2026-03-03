## What

<!-- 1-2 sentence summary of the change -->

## Domain

<!-- Which domain does this PR affect? -->
<!-- crm | projects | estimates | finance | portals | admin | documents | reports | shared -->

## Changes

<!-- Bullet list of key changes -->

-

## Security Checklist

- [ ] No `console.log` with sensitive data
- [ ] Server-side auth checks on new endpoints
- [ ] Webhook signatures verified (if applicable)
- [ ] No raw error details exposed to client
- [ ] CORS not widened
- [ ] Storage buckets use RLS (if applicable)
- [ ] Input validation on all user-facing endpoints
- [ ] No new `any` types

## Test Plan

- [ ] Unit tests added/updated
- [ ] Existing tests still pass (`npm run test`)
- [ ] Typecheck passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
