-- Migration: Fix RLS infinite recursion and SECURITY DEFINER helpers
--
-- Issues fixed:
-- 1. krewpact_org_id() fallback query hits organizations RLS → fails for non-admin users
--    → Made SECURITY DEFINER so subquery bypasses RLS
-- 2. krewpact_divisions() subquery hits divisions RLS → potential failures
--    → Made SECURITY DEFINER
-- 3. project_members_select policy self-references project_members → infinite recursion
--    when projects_select queries project_members
--    → Simplified to direct user_id check (no subquery)

-- ============================================================
-- 1. SECURITY DEFINER for helper functions
-- ============================================================

CREATE OR REPLACE FUNCTION public.krewpact_org_id() RETURNS text
  LANGUAGE sql STABLE SECURITY DEFINER
  AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json -> 'metadata' ->> 'krewpact_org_id',
    (SELECT id::text FROM organizations WHERE slug = 'default' LIMIT 1),
    ''
  );
$$;

CREATE OR REPLACE FUNCTION public.krewpact_divisions() RETURNS jsonb
  LANGUAGE sql STABLE SECURITY DEFINER
  AS $$
  SELECT COALESCE(
    (SELECT jsonb_agg(d.id)
     FROM divisions d
     WHERE d.code = ANY(
       ARRAY(SELECT jsonb_array_elements_text(
         COALESCE(
           (current_setting('request.jwt.claims', true)::json -> 'metadata' -> 'division_ids')::jsonb,
           '[]'::jsonb
         )
       ))
     )
     OR d.id::text = ANY(
       ARRAY(SELECT jsonb_array_elements_text(
         COALESCE(
           (current_setting('request.jwt.claims', true)::json -> 'metadata' -> 'division_ids')::jsonb,
           '[]'::jsonb
         )
       ))
     )
    ),
    '[]'::jsonb
  );
$$;

-- ============================================================
-- 2. Fix project_members_select to avoid self-referencing recursion
-- ============================================================

DROP POLICY IF EXISTS "project_members_select" ON project_members;
CREATE POLICY "project_members_select" ON project_members FOR SELECT
  USING (
    is_platform_admin()
    OR (user_id)::text = krewpact_user_id()
  );
