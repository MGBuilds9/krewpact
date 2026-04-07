# Architecture Overview

## Stack

- Next.js 16 (App Router)
- Supabase (Postgres + RLS)
- Clerk (auth)
- ERPNext (external system)
- Vercel (deploy)

## High-Level Flow

1. User authenticates via Clerk
2. App queries Supabase with RLS policies
3. ERPNext accessed via API integration layer
4. UI renders in Next.js (server + client)

## Key Services

- Supabase: core data + storage
- Clerk: identity + sessions
- ERPNext: construction ops system of record
