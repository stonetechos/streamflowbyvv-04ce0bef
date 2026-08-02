-- Sprint 1.2 / Migration 002 — Identity & Preferences
-- Traceability: DB Spec §3.1, §5, §9, ADR-005, ADR-009, Foundation §17

REVOKE EXECUTE ON FUNCTION public.allocate_code(text) FROM anon, authenticated;

-- Security-definer role check (§9.1 rule 6, ADR-009)
CREATE OR REPLACE FUNCTION public.has_role(_profile_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE profile_id = _profile_id AND role = _role
  );
$$;
REVOKE ALL ON FUNCTION public.has_role(uuid, text) FROM PUBLIC, anon;

-- §3.1 profiles — the sole coupling to the auth provider (§1.1)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  auth_user_id uuid NOT NULL UNIQUE,
  display_name text NOT NULL,
  handle citext NOT NULL,
  avatar_url text,
  bio text,
  locale text NOT NULL DEFAULT 'en',
  timezone text NOT NULL DEFAULT 'UTC',
  status text NOT NULL DEFAULT 'active',
  last_seen_at timestamptz,
  onboarding_completed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT profiles_code_format_chk CHECK (code ~ '^USR-[0-9]{6,}$'),
  CONSTRAINT profiles_display_name_chk CHECK (length(btrim(display_name)) > 0),
  CONSTRAINT profiles_handle_chk CHECK (handle ~ '^[a-zA-Z0-9_]{3,30}$'),
  CONSTRAINT profiles_status_chk CHECK (status IN ('active','suspended','deactivated','deleted'))
);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_handle_lower_uq
  ON public.profiles (lower(handle::text)) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS profiles_last_seen_at_idx ON public.profiles (last_seen_at);

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Current caller's profile id, used by every downstream policy
CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE auth_user_id = auth.uid() AND deleted_at IS NULL;
$$;
REVOKE ALL ON FUNCTION public.current_profile_id() FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(public.current_profile_id(), 'admin');
$$;
REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC, anon;

-- §9 user_roles policies
DROP POLICY IF EXISTS user_roles_select_self ON public.user_roles;
CREATE POLICY user_roles_select_self ON public.user_roles
  FOR SELECT TO authenticated
  USING (profile_id = public.current_profile_id());

-- §9 profiles policies
DROP POLICY IF EXISTS profiles_select_self ON public.profiles;
CREATE POLICY profiles_select_self ON public.profiles
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

-- profiles_select_others is created in migration 008, once blocked_users exists
-- (§9.1 rule 4: block enforcement is bidirectional).

DROP POLICY IF EXISTS profiles_insert_self ON public.profiles;
CREATE POLICY profiles_insert_self ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth_user_id = auth.uid());

DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());
