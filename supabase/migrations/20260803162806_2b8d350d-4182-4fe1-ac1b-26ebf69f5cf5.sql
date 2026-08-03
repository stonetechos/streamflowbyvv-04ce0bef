CREATE OR REPLACE FUNCTION public.discover_room_by_code(_code text)
RETURNS TABLE (
  room_id uuid,
  room_name text,
  provider_id uuid,
  host_display_name text,
  member_count integer,
  capacity integer,
  status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id,
    r.name,
    r.provider_id,
    host.display_name,
    occupancy.seats::integer,
    r.max_members,
    r.status
  FROM public.rooms r
  LEFT JOIN public.profiles host
    ON host.id = r.host_profile_id AND host.deleted_at IS NULL
  CROSS JOIN LATERAL (
    SELECT count(*) AS seats
    FROM public.room_members m
    WHERE m.room_id = r.id
      AND m.state IN ('invited', 'joined')
  ) AS occupancy
  LEFT JOIN LATERAL (
    SELECT m.state
    FROM public.room_members m
    WHERE m.room_id = r.id
      AND m.profile_id = public.current_profile_id()
      AND m.state IN ('invited', 'joined')
    ORDER BY m.created_at DESC
    LIMIT 1
  ) AS viewer ON TRUE
  WHERE public.current_profile_id() IS NOT NULL
    AND r.code = _code
    AND r.deleted_at IS NULL
    AND r.ended_at IS NULL
    AND r.status IN ('lobby', 'active')
    AND (occupancy.seats < r.max_members OR viewer.state IS NOT NULL)
    AND (
      r.host_profile_id IS NULL
      OR viewer.state IS NOT NULL
      OR NOT public.is_block_between(r.host_profile_id, public.current_profile_id())
    )
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.discover_room_by_code(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.discover_room_by_code(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.discover_room_by_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.discover_room_by_code(text) TO service_role;