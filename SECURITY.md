# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| Latest on `main` | Yes |
| Previous deploys | Best-effort |

## Reporting a Vulnerability

If you discover a security vulnerability in KrewPact, please report it responsibly.

**Email:** security@krewpact.com

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

**Do NOT** open a public GitHub issue for security vulnerabilities.

## Response Timeline

- **Acknowledgment:** Within 48 hours of report
- **Initial assessment:** Within 5 business days
- **Fix timeline:** Critical vulnerabilities patched within 7 days; others within 30 days
- **Disclosure:** Coordinated disclosure after fix is deployed. Reporter credited unless they prefer anonymity.

## Scope

### In scope
- Authentication and authorization bypasses
- SQL injection, XSS, CSRF, SSRF
- RLS policy bypasses (Supabase)
- Sensitive data exposure (PII, credentials, JWT secrets)
- Insecure direct object references
- Privilege escalation between roles

### Out of scope
- Denial of service attacks
- Social engineering
- Issues in third-party services (Clerk, Supabase, Vercel) — report to those vendors directly
- Issues requiring physical access to infrastructure
- Automated scanner output without demonstrated impact

## Security Architecture

KrewPact follows defense-in-depth principles:
- **Auth:** Clerk (JWT-based, SSO support)
- **Database:** Supabase PostgreSQL with Row-Level Security on all tables
- **API:** Server-side validation with Zod, rate limiting via Upstash Redis
- **Infrastructure:** Cloudflare Tunnel for ERPNext, no direct port exposure
- **Compliance:** PIPEDA-aware, AODA/WCAG AA accessibility

See [docs/architecture/KrewPact-Security-and-Compliance-Framework.md](docs/architecture/KrewPact-Security-and-Compliance-Framework.md) for the full security framework.

## Notes
- No secrets in git — use `.env.local`
- RLS enforced in Supabase for all tenant data
- Use Clerk JWT claims for org scoping
- Webhooks must verify signatures
