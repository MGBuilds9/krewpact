# API Routes — Conventions

## Pattern

All API routes follow the BFF (Backend for Frontend) pattern:

- Aggregate data from Supabase and/or ERPNext
- Transform responses for the frontend
- Authorize via Clerk `auth()` — every route starts with auth check
- Validate input with Zod schemas on all mutating routes

## Size Limits

- **Max 200 lines** per route file (ESLint enforced at 300, aim for 200)
- Extract business logic to `lib/<domain>/` — routes are thin orchestrators
- Extract query builders to `lib/<domain>/<entity>-queries.ts`
- Extract webhook handlers to `lib/<domain>/webhook-handlers.ts`

## Auth

```typescript
const { userId } = await auth();
if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```

## Performance: Avoid Async Waterfalls

```typescript
// BAD: sequential fetches
const user = await getUser(userId);
const projects = await getProjects(userId);
const stats = await getStats(userId);

// GOOD: parallel fetches
const [user, projects, stats] = await Promise.all([
  getUser(userId),
  getProjects(userId),
  getStats(userId),
]);
```

## Supabase Client

- Use `createUserClient()` from `@/lib/supabase/server` for user-scoped queries (RLS applied)
- Use `createServiceClient()` only for admin operations (bypasses RLS)
- Org scoping: `getOrgIdFromAuth()` reads `krewpact_org_id` from JWT claims

## ERPNext Calls

- All ERPNext calls go through `lib/erp/client.ts`
- Auth: `Authorization: token {key}:{secret}` header
- Always `encodeURIComponent()` for document names
- Rate limit: 300 req/min

## Error Handling

```typescript
import { logger } from '@/lib/logger';

try {
  // ... operation
} catch (err: unknown) {
  logger.error('Operation failed:', err);
  return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
}
```

Never expose raw database errors or stack traces to clients.

## File Organization

Routes are organized by domain: `api/crm/`, `api/projects/`, `api/estimates/`, etc.
Each domain directory mirrors the UI feature it serves.
