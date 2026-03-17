-- KrewPact Storage Buckets + RLS Policies
-- Purpose: Create storage buckets for project files, photos, contracts, and avatars.
-- Auth pattern: auth.jwt() ->> 'krewpact_user_id' for user identity (Clerk JWT bridge)
-- Org scoping: public.krewpact_org_id() + public.is_platform_admin() helpers from 00002/20260302

BEGIN;

-- =========================
-- BUCKETS
-- =========================
-- ON CONFLICT DO NOTHING makes this idempotent on re-run

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'project-files',
    'project-files',
    FALSE,
    52428800, -- 50 MB
    NULL      -- all mime types allowed
  ),
  (
    'project-photos',
    'project-photos',
    FALSE,
    10485760, -- 10 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
  ),
  (
    'contracts',
    'contracts',
    FALSE,
    26214400, -- 25 MB
    ARRAY['application/pdf', 'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'image/jpeg', 'image/png']
  ),
  (
    'avatars',
    'avatars',
    TRUE,     -- public: avatar URLs served without signed tokens
    5242880,  -- 5 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  )
ON CONFLICT (id) DO NOTHING;

-- =========================
-- RLS ON storage.objects
-- =========================
-- storage.objects already has RLS enabled by Supabase by default.
-- We add permissive policies per bucket using the bucket_id column.
--
-- Helper functions available (from 00002_rls_policies.sql + 20260311 fix):
--   public.krewpact_user_id()   → text  (Clerk user_id from JWT)
--   public.krewpact_org_id()    → text  (org_id, SECURITY DEFINER)
--   public.krewpact_roles()     → jsonb (role keys array)
--   public.is_platform_admin()  → bool
--
-- Storage object path convention:
--   project-files:   {org_id}/{project_id}/{filename}
--   project-photos:  {org_id}/{project_id}/{filename}
--   contracts:       {org_id}/{contract_id}/{filename}
--   avatars:         {user_id}/{filename}

-- -------------------------
-- project-files: read + write scoped to org via projects.division_id → divisions.org_id
-- -------------------------

-- SELECT: any authenticated user whose org matches the project's org
CREATE POLICY "project_files_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'project-files'
    AND (
      public.is_platform_admin()
      OR (storage.foldername(name))[1] = public.krewpact_org_id()
    )
  );

-- INSERT: any authenticated user in the org
CREATE POLICY "project_files_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'project-files'
    AND (
      public.is_platform_admin()
      OR (storage.foldername(name))[1] = public.krewpact_org_id()
    )
  );

-- UPDATE: only uploader or platform_admin
CREATE POLICY "project_files_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'project-files'
    AND (
      public.is_platform_admin()
      OR (
        (storage.foldername(name))[1] = public.krewpact_org_id()
        AND owner_id = public.krewpact_user_id()
      )
    )
  );

-- DELETE: only uploader or platform_admin
CREATE POLICY "project_files_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'project-files'
    AND (
      public.is_platform_admin()
      OR (
        (storage.foldername(name))[1] = public.krewpact_org_id()
        AND owner_id = public.krewpact_user_id()
      )
    )
  );

-- -------------------------
-- project-photos: same org-scoped pattern as project-files
-- -------------------------

CREATE POLICY "project_photos_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'project-photos'
    AND (
      public.is_platform_admin()
      OR (storage.foldername(name))[1] = public.krewpact_org_id()
    )
  );

CREATE POLICY "project_photos_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'project-photos'
    AND (
      public.is_platform_admin()
      OR (storage.foldername(name))[1] = public.krewpact_org_id()
    )
  );

CREATE POLICY "project_photos_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'project-photos'
    AND (
      public.is_platform_admin()
      OR (
        (storage.foldername(name))[1] = public.krewpact_org_id()
        AND owner_id = public.krewpact_user_id()
      )
    )
  );

CREATE POLICY "project_photos_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'project-photos'
    AND (
      public.is_platform_admin()
      OR (
        (storage.foldername(name))[1] = public.krewpact_org_id()
        AND owner_id = public.krewpact_user_id()
      )
    )
  );

-- -------------------------
-- contracts: org-scoped read for all authenticated; write restricted to
-- accounting, platform_admin, executive, operations_manager, project_manager
-- -------------------------

CREATE POLICY "contracts_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'contracts'
    AND (
      public.is_platform_admin()
      OR (storage.foldername(name))[1] = public.krewpact_org_id()
    )
  );

CREATE POLICY "contracts_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'contracts'
    AND (
      public.is_platform_admin()
      OR (
        (storage.foldername(name))[1] = public.krewpact_org_id()
        AND (
          public.krewpact_roles() ?| ARRAY[
            'accounting', 'executive', 'operations_manager',
            'project_manager', 'platform_admin'
          ]
        )
      )
    )
  );

CREATE POLICY "contracts_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'contracts'
    AND (
      public.is_platform_admin()
      OR (
        (storage.foldername(name))[1] = public.krewpact_org_id()
        AND (
          public.krewpact_roles() ?| ARRAY[
            'accounting', 'executive', 'operations_manager',
            'project_manager', 'platform_admin'
          ]
        )
      )
    )
  );

CREATE POLICY "contracts_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'contracts'
    AND (
      public.is_platform_admin()
      OR (
        (storage.foldername(name))[1] = public.krewpact_org_id()
        AND public.krewpact_roles() ? 'accounting'
      )
    )
  );

-- -------------------------
-- avatars: public bucket — anyone can read; users can only write their own
-- Path convention: {krewpact_user_id}/{filename}
-- -------------------------

-- Public read (no auth required — bucket is public, but policy still applies for anon role)
CREATE POLICY "avatars_select" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'avatars');

-- Users can only upload into their own folder
CREATE POLICY "avatars_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = public.krewpact_user_id()
  );

CREATE POLICY "avatars_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (
      public.is_platform_admin()
      OR (storage.foldername(name))[1] = public.krewpact_user_id()
    )
  );

CREATE POLICY "avatars_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (
      public.is_platform_admin()
      OR (storage.foldername(name))[1] = public.krewpact_user_id()
    )
  );

COMMIT;
