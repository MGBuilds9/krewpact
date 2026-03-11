-- Migration: Fix missing RPC functions and krewpact_divisions() code-to-UUID resolution
--
-- Issues fixed:
-- 1. get_user_role_names() and get_user_permissions() RPCs did not exist
--    → /api/user/divisions and /api/rbac/permissions returned 500
--    → Dashboard crashed with "r.filter is not a function"
-- 2. krewpact_divisions() returned raw JWT codes (e.g., "contracting")
--    but leads.division_id contains UUIDs → RLS always blocked all leads

-- ============================================================
-- 1. CREATE MISSING RPC FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_role_names(p_user_id uuid)
RETURNS TABLE(role_name text, is_primary boolean)
LANGUAGE sql STABLE
AS $$
  SELECT r.role_name, ur.is_primary
  FROM user_roles ur
  JOIN roles r ON r.id = ur.role_id
  WHERE ur.user_id = p_user_id
  ORDER BY ur.is_primary DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_user_permissions(p_user_id uuid)
RETURNS TABLE(permission_name text)
LANGUAGE sql STABLE
AS $$
  SELECT DISTINCT p.permission_key AS permission_name
  FROM user_roles ur
  JOIN role_permissions rp ON rp.role_id = ur.role_id
  JOIN permissions p ON p.id = rp.permission_id
  WHERE ur.user_id = p_user_id
    AND rp.granted = true;
$$;

-- ============================================================
-- 2. FIX krewpact_divisions() — resolve division codes to UUIDs
-- ============================================================
-- JWT metadata.division_ids contains codes like ["contracting","homes"]
-- but DB tables use division UUIDs. This function now resolves codes
-- to UUIDs via the divisions table, while also accepting raw UUIDs.

CREATE OR REPLACE FUNCTION public.krewpact_divisions() RETURNS jsonb
  LANGUAGE sql STABLE
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
