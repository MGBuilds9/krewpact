-- Fix two pre-existing issues:
-- 1. leads.deleted_at column missing (API queries .is('deleted_at', null))
-- 2. ensure_clerk_user RPC function missing (used by /api/user/current)

BEGIN;

-- 1. Add deleted_at soft-delete column to leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Create ensure_clerk_user function (upsert by clerk_user_id)
CREATE OR REPLACE FUNCTION public.ensure_clerk_user(
  p_clerk_id TEXT,
  p_email TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_avatar_url TEXT DEFAULT NULL
)
RETURNS SETOF users
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user users%ROWTYPE;
BEGIN
  -- Try to find existing user by clerk_user_id
  SELECT * INTO v_user FROM users WHERE clerk_user_id = p_clerk_id;

  IF FOUND THEN
    -- Update existing user
    UPDATE users SET
      email = p_email,
      first_name = p_first_name,
      last_name = p_last_name,
      avatar_url = COALESCE(p_avatar_url, avatar_url),
      updated_at = NOW()
    WHERE id = v_user.id
    RETURNING * INTO v_user;
  ELSE
    -- Try to find by email (user may exist without clerk_user_id)
    SELECT * INTO v_user FROM users WHERE email = p_email;

    IF FOUND THEN
      -- Link existing email user to clerk
      UPDATE users SET
        clerk_user_id = p_clerk_id,
        first_name = p_first_name,
        last_name = p_last_name,
        avatar_url = COALESCE(p_avatar_url, avatar_url),
        updated_at = NOW()
      WHERE id = v_user.id
      RETURNING * INTO v_user;
    ELSE
      -- Create new user
      INSERT INTO users (clerk_user_id, email, first_name, last_name, avatar_url)
      VALUES (p_clerk_id, p_email, p_first_name, p_last_name, p_avatar_url)
      RETURNING * INTO v_user;
    END IF;
  END IF;

  RETURN NEXT v_user;
END;
$$;

COMMIT;
