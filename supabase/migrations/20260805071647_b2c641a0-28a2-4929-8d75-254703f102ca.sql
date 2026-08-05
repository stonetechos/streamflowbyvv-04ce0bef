CREATE OR REPLACE FUNCTION public.allocate_profile_handle(_desired text, _profile_id uuid DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _base text;
  _candidate text;
  _suffix integer := 1;
BEGIN
  _base := lower(regexp_replace(coalesce(_desired, ''), '[^a-zA-Z0-9_]', '', 'g'));
  IF length(_base) < 3 THEN
    _base := _base || 'watcher';
  END IF;
  _base := left(_base, 24);

  -- Serialize allocations that share a base so two concurrent callers cannot
  -- both observe the same candidate as free.
  PERFORM pg_advisory_xact_lock(hashtext('profile_handle:' || _base));

  _candidate := _base;
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE lower(p.handle::text) = _candidate
        AND p.deleted_at IS NULL
        AND (_profile_id IS NULL OR p.id <> _profile_id)
    ) THEN
      RETURN _candidate;
    END IF;

    _suffix := _suffix + 1;
    IF _suffix > 999 THEN
      RETURN left(_base, 15) || '_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
    END IF;
    _candidate := left(_base, 24 - length(_suffix::text)) || _suffix::text;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.allocate_profile_handle(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.allocate_profile_handle(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.allocate_profile_handle(text, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.was_room_member(_room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_members rm
    WHERE rm.room_id = _room_id
      AND rm.profile_id = public.current_profile_id()
      AND rm.state <> 'removed'
  );
$$;

DROP POLICY IF EXISTS rooms_select_members ON public.rooms;
CREATE POLICY rooms_select_members ON public.rooms
FOR SELECT TO authenticated
USING (host_profile_id = public.current_profile_id() OR public.was_room_member(id));

DROP POLICY IF EXISTS room_members_select_members ON public.room_members;
CREATE POLICY room_members_select_members ON public.room_members
FOR SELECT TO authenticated
USING (
  profile_id = public.current_profile_id()
  OR public.is_room_member(room_id)
  OR public.was_room_member(room_id)
);