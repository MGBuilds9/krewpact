# Local Development

## Prereqs
- Node.js 20+
- npm
- Supabase project (dev)
- Clerk app (dev)
- ERPNext instance (dev or sandbox)

## Setup
1) Install deps:
```bash
npm ci
```

2) Create `.env.local` from `.env.example`:
```bash
cp .env.example .env.local
```

3) Fill in env vars:
- Supabase URL/keys
- Clerk keys + webhook secret
- ERPNext base URL + API key/secret
- Upstash Redis URL/token

4) Run the app:
```bash
npm run dev
```

## Tests
```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e
```

## Notes
- Keep secrets in `.env.local` only
- Use Clerk test keys in dev
- Use a dedicated Supabase dev project (never prod)
