# API Routes — Conventions

## Pattern

All API routes follow the BFF (Backend for Frontend) pattern:

- Aggregate data from Supabase and/or ERPNext
- Transform responses for the frontend
- Authorize via Clerk `auth()` — every route starts with auth check
- Validate input with Zod schemas on all mutating routes

## Auth

```typescript
const { userId } = await auth();
if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
try {
  // ... operation
} catch (err: unknown) {
  console.error('Operation failed:', err);
  return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
}
```

Never expose raw database errors or stack traces to clients.

## File Organization

Routes are organized by domain: `api/crm/`, `api/projects/`, `api/estimates/`, etc.
Each domain directory mirrors the UI feature it serves.
