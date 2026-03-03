# Security Best Practices

## 1. Authentication & Authorization

- All API routes must verify auth via `auth()` from `@clerk/nextjs/server`
- Never trust client-side role checks alone — always verify server-side
- Use Clerk JWT claims for Supabase RLS (`krewpact_user_id`, `krewpact_org_id`, `krewpact_roles`)

## 2. Input Validation

- All mutating API routes use Zod schemas for input validation
- Validate on the server even if the client validates too
- Use `z.string().max()` to prevent oversized payloads

## 3. No Sensitive Data in Logs

- Never `console.log` user tokens, passwords, or PII
- Use `console.warn`/`console.error` for operational issues only
- ESLint `no-console` rule warns on bare `console.log`

## 4. Error Handling

- Never expose raw database errors or stack traces to clients
- Return structured error responses: `{ error: "Human-readable message" }`
- Log full errors server-side, return sanitized messages to client

## 5. CORS & Headers

- Do not widen CORS beyond what's needed
- Vercel handles security headers via `vercel.json`
- Never add `Access-Control-Allow-Origin: *` to API routes

## 6. Webhook Security

- All webhook endpoints verify signatures (Clerk: `svix`, BoldSign: HMAC)
- `WEBHOOK_SIGNING_SECRET` and `CLERK_WEBHOOK_SECRET` must be set
- Reject requests with invalid or missing signatures

## 7. Database Security

- Supabase RLS is deny-by-default — every table needs explicit policies
- All RLS policies must have tests
- Use `SUPABASE_SERVICE_ROLE_KEY` only in server-side code, never expose to client
- Use Supabase pooler (port 6543) from serverless, not direct connection

## 8. Environment Variables

- Never hardcode secrets in source code
- All secrets go in `.env.local` (gitignored)
- `.env.example` documents all required variables without values
- CI uses GitHub Secrets for sensitive values

## 9. Dependencies

- `npm audit` runs in CI to catch known vulnerabilities
- High/critical vulnerabilities block the build
- Review dependency changelogs before major version bumps

## 10. File Upload & Storage

- Supabase Storage buckets use RLS policies
- Validate file types and sizes before upload
- Never serve user-uploaded content without Content-Type validation

## PR Security Checklist

Every PR should verify:

- [ ] No `console.log` with sensitive data
- [ ] Server-side auth checks on new endpoints
- [ ] Webhook signatures verified (if applicable)
- [ ] No raw error details exposed to client
- [ ] CORS not widened
- [ ] Storage buckets use RLS (if applicable)
- [ ] Input validation on all user-facing endpoints
- [ ] No new `any` types (use proper TypeScript types)
