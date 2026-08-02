-- Sprint 1.3 / Migration 010 — Auth-principal portability shim
-- Traceability: Sprint 1.3 §4 (migration audit), Project Infrastructure Policy.
-- No schema change. No policy change. Identical behaviour on the current backend.

CREATE OR REPLACE FUNCTION public.current_auth_user_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid;
BEGIN
  -- Hosted auth (auth.uid()) when the schema exists; portable fallback otherwise.
  IF to_regproc('auth.uid') IS NOT NULL THEN
    EXECUTE 'SELECT auth.uid()' INTO _uid;
  END IF;

  IF _uid IS NULL THEN
    BEGIN
      _uid := nullif(current_setting('app.current_user_id', true), '')::uuid;
    EXCEPTION WHEN others THEN
      _uid := NULL;
    END;
  END IF;

  RETURN _uid;
END;
$$;

REVOKE ALL ON FUNCTION public.current_auth_user_id() FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.profiles
  WHERE auth_user_id = public.current_auth_user_id()
    AND deleted_at IS NULL;
$$;
