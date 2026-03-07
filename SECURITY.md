# Security Notes

- No secrets in git — use `.env.local`
- RLS enforced in Supabase for all tenant data
- Use Clerk JWT claims for org scoping
- Webhooks must verify signatures
