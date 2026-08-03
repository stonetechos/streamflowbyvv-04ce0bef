-- Sprint J.1 — admission read for a room the caller is about to join.
-- Discovery only: one room, by exact id, and only while it is joinable.
-- Room visibility rules are NOT widened; rooms remain unlistable to non-members.

CREATE OR REPLACE FUNCTION public.room_admission_row(_room_id uuid)
RETURNS SETOF public.rooms
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.*
  FROM public.rooms r
  CROSS JOIN LATERAL (
    SELECT count(*) AS seats
    FROM public.room_members m
    WHERE m.room_id = r.id
      AND m.state IN ('invited', 'joined')
  ) AS occupancy
  WHERE public.current_profile_id() IS NOT NULL
    AND r.id = _room_id
    AND r.deleted_at IS NULL
    AND r.ended_at IS NULL
    AND r.status IN ('lobby', 'active')
    AND occupancy.seats < r.max_members
    AND (
      r.host_profile_id IS NULL
      OR NOT public.is_block_between(r.host_profile_id, public.current_profile_id())
    )
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.room_admission_row(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.room_admission_row(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.room_admission_row(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.room_admission_row(uuid) TO service_role;